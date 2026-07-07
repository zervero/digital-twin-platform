#!/usr/bin/env node
/**
 * Dev OIDC IdP — V3.0.
 *
 * A minimal Identity Provider for local development and CI
 * smoke runs. Listens on $DEV_OIDC_PORT (default 9999) and
 * speaks the OIDC Authorization Code + PKCE flow.
 *
 *   GET  /.well-known/openid-configuration
 *   GET  /.well-known/jwks.json
 *   GET  /authorize  (issues a code, redirects)
 *   POST /token      (exchanges code for id_token)
 *   GET  /userinfo
 *
 * The "user" is selected via the ?as=email query param on
 * /authorize; the script maps a small set of well-known
 * emails to fixed permission sets. Unknown emails get the
 * viewer set.
 *
 * Two run modes:
 *
 *   - Server mode (default): listens on $DEV_OIDC_PORT and
 *     serves the OIDC Authorization Code + PKCE flow used
 *     by the V3.0 `smoke:oidc` script and by `pnpm dev`
 *     when `AUTH_PROVIDER=oidc`.
 *
 *   - Mint mode (`mint` subcommand): signs an id_token with
 *     the in-memory RSA key and prints it to stdout, then
 *     exits. Used by the V3.3 `smoke:tenant` script to
 *     mint JWTs for specific tenants without driving the
 *     full OAuth dance. Flags:
 *
 *         node scripts/dev-oidc-idp.mjs mint \
 *           --tenant acme-corp      # default if neither flag is given
 *         node scripts/dev-oidc-idp.mjs mint --no-tenant  # missing-claim path
 *         node scripts/dev-oidc-idp.mjs mint --as viewer@example.com
 *
 *     The minted token's `iss` claim is the same value the
 *     server-mode listener advertises (`http://localhost:$DEV_OIDC_PORT`),
 *     so a BFF started against the same `OIDC_ISSUER_URL`
 *     will verify either path.
 *
 * V3.3 tenant claim: every minted id_token (server or mint
 * mode) carries the namespaced
 * `https://api.digital-twin-platform.local/tenant_id` claim
 * unless `--no-tenant` is passed to `mint`. This keeps the
 * existing V3.0 smoke (`smoke:oidc`) green under the new
 * `requiresTenantScope` middleware (V3.3 T4) without changing
 * that smoke script.
 *
 * This script is NOT for production. It uses an in-memory
 * RSA key pair generated at startup and never persists
 * anything. It exists so the V3.0 smoke (smoke:oidc) can
 * drive a real OIDC flow without depending on a hosted IdP.
 *
 * No vendor SDK is used; just `jose` for signing, served via
 * Node's built-in http module.
 */

import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose';

const PORT = Number(process.env.DEV_OIDC_PORT || '9999');
const ISSUER = `http://localhost:${PORT}`;
// V3.3 T8: persist the in-memory RSA keypair to a file so
// the CLI `mint` subcommand and the server mode (separate
// processes) share the same key. Without this, every mint
// invocation would generate a fresh keypair the BFF cannot
// verify against the JWKS the server exposes. Override with
// DEV_OIDC_KEY_FILE; the default lives in the OS tmpdir and
// is recreated on first run.
const KEY_FILE =
  process.env.DEV_OIDC_KEY_FILE ||
  path.join(os.tmpdir(), 'dev-oidc-keypair.json');

// V3.3: the canonical namespaced tenant claim, mirrored from
// `@dt/tenant`'s TENANT_ID_CLAIM constant. Hard-coded here
// (no env-var lookup) because the dev IdP is local-only and
// should match what the BFF verifies; the BFF reads
// OIDC_TENANT_CLAIM but defaults to this same value.
const TENANT_ID_CLAIM =
  'https://api.digital-twin-platform.local/tenant_id';
const DEFAULT_TENANT = 'acme-corp';

// User → permissions map. Add new test users here. The
// `viewer` and `admin` names mirror the @dt/contracts roles
// so the OIDC token carries permissions that round-trip to
// the existing role-based permission union.
const USER_PERMISSIONS = {
  'viewer@example.com': ['device:read', 'scene:read'],
  'operator@example.com': [
    'device:read', 'device:write',
    'scene:read',
    'command:send',
  ],
  'admin@example.com': [
    'device:read', 'device:write',
    'scene:read', 'scene:write',
    'command:send', 'auth:login',
  ],
};
const DEFAULT_PERMISSIONS = ['device:read', 'scene:read'];

// In-memory state. Code → email mapping; codes are random
// and short-lived (1 min).
const codes = new Map();
const CODE_TTL_MS = 60 * 1000;

/**
 * Load the RSA keypair from `KEY_FILE`, or generate a fresh
 * one and persist it. V3.3 T8: shared between the server
 * listener and the CLI mint subcommand so the JWKS exposed
 * at `/.well-known/jwks.json` matches the keys used to sign
 * CLI-minted tokens.
 */
async function loadOrCreateKeyPair() {
  try {
    const raw = await fs.readFile(KEY_FILE, 'utf8');
    const data = JSON.parse(raw);
    const privateKey = await importJWK(data.privateKey, 'RS256');
    const publicKey = await importJWK(data.publicKey, 'RS256');
    return { privateKey, publicKey };
  } catch {
    const kp = await generateKeyPair('RS256');
    const privateJwk = await exportJWK(kp.privateKey);
    const publicJwk = await exportJWK(kp.publicKey);
    await fs.writeFile(
      KEY_FILE,
      JSON.stringify(
        {
          privateKey: privateJwk,
          publicKey: publicJwk,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    return kp;
  }
}

const { publicKey, privateKey } = await loadOrCreateKeyPair();
const publicJwk = {
  ...(await exportJWK(publicKey)),
  kid: 'dev-oidc-kid',
  alg: 'RS256',
  use: 'sig',
};
const jwks = { keys: [publicJwk] };

function pickUser(reqUrl) {
  const as = reqUrl.searchParams.get('as');
  if (!as) return { email: 'viewer@example.com', permissions: DEFAULT_PERMISSIONS };
  return {
    email: as,
    permissions: USER_PERMISSIONS[as] ?? DEFAULT_PERMISSIONS,
  };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function randomString(bytes = 32) {
  const buf = new Uint8Array(bytes);
  // globalThis.crypto is the Web Crypto surface Node exposes
  // by default since v15; no import needed and the `node:`
  // prefix would trip the linter in this script's .mjs config.
  globalThis.crypto.getRandomValues(buf);
  return Buffer.from(buf).toString('base64url');
}

/**
 * Sign an id_token.
 *
 * V3.3: the `tenantId` argument controls whether the
 * namespaced tenant claim is included. Pass `undefined`
 * to omit the claim entirely (the `--no-tenant` mint
 * flag); pass `null` to default to `DEFAULT_TENANT` (the
 * server-mode flow); pass a string to use that tenant.
 *
 * The claim is added via a computed-key spread so an
 * `undefined` value never lands in the payload (jose would
 * happily serialize it, but downstream consumers should
 * not have to defend against `undefined` claims).
 */
async function issueIdToken({ email, permissions, tenantId }) {
  // V3.3 T8: `tenantId` is the literal value the caller
  // passes -- no ES6 default, which would otherwise
  // replace an explicit `undefined` with `DEFAULT_TENANT`
  // and silently re-introduce the tenant claim on a
  // `--no-tenant` mint. `null` and `undefined` both
  // mean "omit the claim entirely".
  const tenantClaim =
    tenantId === undefined || tenantId === null
      ? {}
      : { [TENANT_ID_CLAIM]: tenantId };
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    scope: permissions.join(' '),
    permissions,
    email,
    ...tenantClaim,
  })
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setIssuer(ISSUER)
    .setAudience('digital-twin-platform')
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60)
    .sign(privateKey);
}


// V3.3 T8: mint subcommand. Sign an id_token with the same
// in-process RSA key the server would use, print to stdout,
// exit. Does NOT start the HTTP listener.
//
// Implemented at top-level with `await` so the script
// terminates here before the server-mode block below
// registers an HTTP listener. A `.then().catch()` chain
// would race against `server.listen` and emit a stray
// "[dev-oidc] listening" line to stdout, which would
// break the smoke shell script's token capture.
if (process.argv[2] === 'mint') {
  const args = process.argv.slice(3);
  const tenantIdx = args.indexOf('--tenant');
  const tenantId = tenantIdx !== -1 ? args[tenantIdx + 1] : undefined;
  const noTenant = args.includes('--no-tenant');
  const asIdx = args.indexOf('--as');
  // Default to admin permissions so smoke:tenant can
  // exercise the `command:send` path; `--as` lets tests
  // override for permission-coverage scenarios.
  const email = asIdx !== -1 ? args[asIdx + 1] : 'admin@example.com';
  const permissions =
    USER_PERMISSIONS[email] ?? USER_PERMISSIONS['admin@example.com'];
  // If neither --tenant nor --no-tenant was passed, default
  // to DEFAULT_TENANT so the smoke can keep its old behavior
  // when the flag is forgotten.
  const resolvedTenantId = noTenant
    ? undefined
    : tenantId ?? DEFAULT_TENANT;
  try {
    const token = await issueIdToken({
      email,
      permissions,
      tenantId: resolvedTenantId,
    });
    process.stdout.write(token);
    process.exit(0);
  } catch (e) {
    process.stderr.write(
      `mint failed: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(1);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, ISSUER);

    if (url.pathname === '/.well-known/openid-configuration' && req.method === 'GET') {
      return json(res, 200, {
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/.well-known/jwks.json`,
        userinfo_endpoint: `${ISSUER}/userinfo`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'profile', 'email'],
      });
    }

    if (url.pathname === '/.well-known/jwks.json' && req.method === 'GET') {
      return json(res, 200, jwks);
    }

    if (url.pathname === '/authorize' && req.method === 'GET') {
      const code = randomString(24);
      const user = pickUser(url);
      codes.set(code, { email: user.email, permissions: user.permissions, issuedAt: Date.now() });
      const params = url.searchParams;
      const redirectUri = params.get('redirect_uri') ?? `${ISSUER}/callback`;
      const state = params.get('state') ?? '';
      const target = new URL(redirectUri);
      target.searchParams.set('code', code);
      if (state) target.searchParams.set('state', state);
      return redirect(res, target.toString());
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      const body = await readBody(req);
      const params = new URLSearchParams(body);
      const code = params.get('code') ?? '';
      const grantType = params.get('grant_type') ?? '';
      if (grantType !== 'authorization_code') {
        return json(res, 400, { error: 'unsupported_grant_type' });
      }
      const entry = codes.get(code);
      if (!entry) {
        return json(res, 400, { error: 'invalid_grant', error_description: 'unknown code' });
      }
      codes.delete(code);
      if (Date.now() - entry.issuedAt > CODE_TTL_MS) {
        return json(res, 400, { error: 'invalid_grant', error_description: 'code expired' });
      }
      const idToken = await issueIdToken(entry);
      return json(res, 200, {
        access_token: idToken,
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: 5 * 60,
        scope: entry.permissions.join(' '),
      });
    }

    if (url.pathname === '/userinfo' && req.method === 'GET') {
      return json(res, 200, { sub: 'viewer', email: 'viewer@example.com' });
    }

    if (url.pathname === '/_health' && req.method === 'GET') {
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: 'not_found', path: url.pathname });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { error: 'internal', message: msg });
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Periodically drop expired codes so the map can't grow.
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of codes.entries()) {
    if (now - entry.issuedAt > CODE_TTL_MS) codes.delete(code);
  }
}, CODE_TTL_MS).unref();

server.listen(PORT, () => {
  console.log(`[dev-oidc] listening on ${ISSUER}`);
});
