/**
 * /api/plugins marketplace routes -- V3.4 T3.
 *
 *   GET    /api/plugins                       list the local registry
 *   POST   /api/plugins                       publish a new version
 *   GET    /api/plugins/:id                   get one plugin (all versions)
 *   POST   /api/plugins/:id/install           install for the caller's tenant
 *   GET    /api/plugins/:id/installed         list the caller's installed versions
 *   PUT    /api/plugins/:id/activate          activate an installed version
 *   DELETE /api/plugins/:id/installed/:ver    uninstall a version
 *
 * The minimum gate for every route is `plugin:read` -- the
 * V3.4 T6 `canInstallForTenant` / `canPublish` policy
 * adds the explicit admin-only enforcement on install /
 * activate / uninstall / publish. T3 ships the routes
 * with the loose gate so the path is plumbed end-to-end;
 * T6 tightens it.
 *
 * Storage: `pluginStore` is the V3.4 T1 `PluginStore`
 * interface; T3 wires an in-memory implementation
 * (`MemoryPluginStore`) for the BFF's startup, T4 swaps
 * it for `FilePluginStore`. The route handlers are
 * agnostic to which implementation is behind the
 * interface.
 *
 * Registry: `index` is the V3.4 T2 `RegistryIndex`; the
 * BFF wires `createInMemoryPluginIndex` in T3, T4 (or a
 * V3.4.x follow-up) swaps it for a file-backed index.
 */

import { Hono } from 'hono';

import type {
  ActivatePluginRequest,
  InstallPluginRequest,
  PublishPluginRequest,
} from '@dt/contracts';
import type { PluginStore } from '@dt/plugin-runtime';
import type { RegistryIndex } from '@dt/plugin-registry';

import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';
import { canInstallForTenant, canPublish } from '../plugins/policy.js';

export interface MarketplaceRoutesOptions {
  authStore: AuthStore;
  pluginStore: PluginStore;
  registryIndex: RegistryIndex;
}

export function marketplaceRoutes(opts: MarketplaceRoutesOptions): Hono {
  const { authStore, pluginStore, registryIndex } = opts;
  const app = new Hono();

  // GET /api/plugins -- list the local registry.
  // `plugin:read` is the gate; viewers + operators + admins
  // can list. The minimum-gate rationale: the registry is
  // global (not tenant-scoped at the route layer), so any
  // authenticated user with `plugin:read` can browse it.
  app.get(
    '/plugins',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => c.json(await registryIndex.list()),
  );

  // POST /api/plugins -- publish a new version.
  // `plugin:read` is the minimum gate; T6's `canPublish`
  // enforces `plugin:publish` (admin-only) explicitly
  // before the index.publish call. For T3 the gate is
  // loose so the route is reachable end-to-end.
  app.post(
    '/plugins',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      // V3.4 T6: operators / viewers have `plugin:read`
      // but not `plugin:publish`. The minimum gate passes
      // them through; the explicit `canPublish` check
      // is what keeps publish behind admin.
      const pubPolicy = await canPublish(authStore, c.req.raw.headers);
      if (!pubPolicy.allowed) {
        return c.json(
          { error: 'PLUGIN_PERMISSION_DENIED', message: pubPolicy.reason },
          403,
        );
      }
      const body = (await c.req.json()) as PublishPluginRequest;
      // Validate the manifest at the route layer so a
      // bad shape surfaces as 400 before reaching storage.
      // The BFF is the trust boundary; the runtime's
      // validator is the source of truth for the shape.
      const { validatePluginManifest } = await import('@dt/plugin-runtime');
      const result = validatePluginManifest(body.manifest);
      if (!result.ok) {
        return c.json(
          {
            error: 'PLUGIN_MANIFEST_INVALID',
            message: result.errors.map((e) => `${e.field ?? '?'}: ${e.message}`).join('; '),
          },
          400,
        );
      }
      // V3.4 T5/T6: write the on-disk artifact (signed
      // HMAC + manifest.json + signature.txt) before
      // admitting the version into the in-memory
      // registry. The returned paths come from the
      // storage layer so the on-disk shape and the
      // registry view stay in lockstep.
      const { writePluginArtifact } = await import('../plugins/storage.js');
      const { artifactPath, signaturePath } = await writePluginArtifact(body);
      const published = await registryIndex.publish({
        pluginId: body.manifest.id,
        version: body.manifest.version,
        manifest: result.manifest,
        artifactPath,
        signaturePath,
        publishedAt: new Date().toISOString(),
      });
      return c.json(published, 201);
    },
  );

  // GET /api/plugins/:id -- get one plugin.
  app.get(
    '/plugins/:id',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      const id = c.req.param('id');
      const plugin = await registryIndex.get(id);
      if (!plugin) {
        return c.json({ error: 'PLUGIN_NOT_FOUND', message: id }, 404);
      }
      return c.json(plugin);
    },
  );

  // POST /api/plugins/:id/install -- install for the caller's tenant.
  // `plugin:read` minimum gate; T6's `canInstallForTenant`
  // enforces `plugin:install` (admin-only).
  app.post(
    '/plugins/:id/install',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      // requiresTenantScope sets c.var.tenant before next();
      // the non-null assertion is the explicit acknowledgement.
      const tenant = c.var.tenant!;
      // V3.4 T6: operators / viewers have `plugin:read`
      // but not `plugin:install`. The minimum gate passes
      // them through; the explicit `canInstallForTenant`
      // check is what keeps install behind admin and
      // stops cross-tenant installs (the helper's
      // tenantId equality check).
      const instPolicy = await canInstallForTenant(
        authStore,
        c.req.raw.headers,
        tenant.tenant.id,
      );
      if (!instPolicy.allowed) {
        return c.json(
          { error: 'PLUGIN_PERMISSION_DENIED', message: instPolicy.reason },
          403,
        );
      }
      const id = c.req.param('id');
      const body = (await c.req.json()) as InstallPluginRequest;
      const plugin = await registryIndex.get(id);
      if (!plugin) {
        return c.json({ error: 'PLUGIN_NOT_FOUND', message: id }, 404);
      }
      const version = plugin.versions.find((v) => v.version === body.version);
      if (!version) {
        return c.json(
          { error: 'PLUGIN_VERSION_NOT_FOUND', message: body.version },
          404,
        );
      }
      // Reject duplicate installs at the route layer.
      // The PluginStore.putVersion also throws, but a 409
      // here gives the client a clearer error than a 500.
      const existing = await pluginStore.listVersions(tenant.tenant.id, id);
      if (existing.some((v) => v.version === body.version)) {
        return c.json(
          {
            error: 'PLUGIN_ALREADY_INSTALLED',
            message: `${id}@${body.version}`,
          },
          409,
        );
      }
      const record = await pluginStore.putVersion({
        pluginId: id,
        version: body.version,
        tenantId: tenant.tenant.id,
        installedAt: new Date().toISOString(),
        manifestPath: version.artifactPath.replace(/artifact\.tgz$/, 'manifest.json'),
        artifactPath: version.artifactPath,
        signaturePath: version.signaturePath,
        active: existing.length === 0,
      });
      return c.json(record, 201);
    },
  );

  // GET /api/plugins/:id/installed -- list the caller's installed versions.
  app.get(
    '/plugins/:id/installed',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      const tenant = c.var.tenant!;
      const id = c.req.param('id');
      const versions = await pluginStore.listVersions(tenant.tenant.id, id);
      return c.json(versions);
    },
  );

  // PUT /api/plugins/:id/activate -- activate an installed version.
  app.put(
    '/plugins/:id/activate',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      const tenant = c.var.tenant!;
      // V3.4 T6: activation is a write -- gate on
      // `plugin:install` for the caller's tenant.
      const actPolicy = await canInstallForTenant(
        authStore,
        c.req.raw.headers,
        tenant.tenant.id,
      );
      if (!actPolicy.allowed) {
        return c.json(
          { error: 'PLUGIN_PERMISSION_DENIED', message: actPolicy.reason },
          403,
        );
      }
      const id = c.req.param('id');
      const body = (await c.req.json()) as ActivatePluginRequest;
      const versions = await pluginStore.listVersions(tenant.tenant.id, id);
      if (!versions.some((v) => v.version === body.version)) {
        return c.json(
          { error: 'PLUGIN_VERSION_NOT_FOUND', message: body.version },
          404,
        );
      }
      const activated = await pluginStore.setActive(
        tenant.tenant.id,
        id,
        body.version,
      );
      return c.json(activated);
    },
  );

  // DELETE /api/plugins/:id/installed/:version -- uninstall.
  app.delete(
    '/plugins/:id/installed/:version',
    requiresTenantScope(authStore, 'plugin:read'),
    async (c) => {
      const tenant = c.var.tenant!;
      // V3.4 T6: uninstall is a write -- gate on
      // `plugin:install` for the caller's tenant.
      const uninstPolicy = await canInstallForTenant(
        authStore,
        c.req.raw.headers,
        tenant.tenant.id,
      );
      if (!uninstPolicy.allowed) {
        return c.json(
          { error: 'PLUGIN_PERMISSION_DENIED', message: uninstPolicy.reason },
          403,
        );
      }
      const id = c.req.param('id');
      const version = c.req.param('version');
      const removed = await pluginStore.removeVersion(
        tenant.tenant.id,
        id,
        version,
      );
      if (!removed) {
        return c.json(
          { error: 'PLUGIN_VERSION_NOT_FOUND', message: version },
          404,
        );
      }
      return c.json({ ok: true });
    },
  );

  return app;
}
