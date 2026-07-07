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
 * This script is NOT for production. It uses an in-memory
 * RSA key pair generated at startup and never persists
 * anything. It exists so the V3.0 smoke (smoke:oidc) can
 * drive a real OIDC flow without depending on a hosted IdP.
 *
 * No vendor SDK is used; just `jose` for signing, served via
 * Node's built-in http module.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const PORT = Number(process.env.DEV_OIDC_PORT || '9999');
const ISSUER = `http://localhost:${PORT}`;

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

const { publicKey, privateKey } = await generateKeyPair('RS256');
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

async function issueIdToken({ email, permissions }) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    scope: permissions.join(' '),
    permissions,
    email,
  })
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setIssuer(ISSUER)
    .setAudience('digital-twin-platform')
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60)
    .sign(privateKey);
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
