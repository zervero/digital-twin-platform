/**
 * Plugin manifest validation.
 *
 * The validator is a pure function over `unknown`. It never
 * throws and never reads the network / filesystem / env. The
 * BFF and the app shell both call it; the registry calls it
 * before admitting a registration.
 *
 * The permission check uses the V2.1 `Permission` union from
 * `@dt/contracts` as the source of truth. Adding a permission
 * to the union is enough to make it acceptable in a manifest.
 * V3.4 added the three marketplace permissions (`plugin:read`,
 * `plugin:install`, `plugin:publish`) to the runtime's known
 * set so a manifest that declares one of them validates
 * without a runtime upgrade.
 *
 * The `PluginManifest` shape itself moved to `@dt/contracts`
 * in V3.4 T3 so the marketplace DTOs in `plugins.ts` can
 * reference it without violating the `@dt/contracts`
 * import-boundary rule. This file re-exports the type for
 * V2.2-V3.3 back-compat.
 */

import type { Permission, PluginManifest } from '@dt/contracts';
// V3.4: `PluginManifest` shape lives in `@dt/contracts`.
// The runtime imports it locally for the validator and
// re-exports it for V2.2-V3.3 back-compat (consumers can
// still `import type { PluginManifest } from '@dt/plugin-runtime'`).
export type { PluginManifest } from '@dt/contracts';

const ID_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const KNOWN_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'device:read',
  'device:write',
  'scene:read',
  'scene:write',
  'command:send',
  'auth:login',
  'plugin:read',
  'plugin:install',
  'plugin:publish',
]);

export interface PluginManifestError {
  code:
    | 'INVALID_ID'
    | 'INVALID_VERSION'
    | 'UNKNOWN_PERMISSION'
    | 'MISSING_FIELD'
    | 'INVALID_TYPE';
  message: string;
  field?: string;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export type ValidateResult =
  | { ok: true; manifest: PluginManifest }
  | { ok: false; errors: PluginManifestError[] };

export function validatePluginManifest(input: unknown): ValidateResult {
  const errors: PluginManifestError[] = [];
  const obj = asObject(input);
  if (!obj) {
    return { ok: false, errors: [{ code: 'INVALID_TYPE', message: 'manifest must be an object' }] };
  }

  const id = obj.id;
  if (!isString(id) || id.length === 0) {
    errors.push({ code: 'MISSING_FIELD', message: 'id is required', field: 'id' });
  } else if (!ID_RE.test(id)) {
    errors.push({
      code: 'INVALID_ID',
      message: 'id must start with a-z and contain only a-z, 0-9, and `-`',
      field: 'id',
    });
  }

  const name = obj.name;
  if (!isString(name) || name.length === 0) {
    errors.push({ code: 'MISSING_FIELD', message: 'name is required', field: 'name' });
  }

  const version = obj.version;
  if (!isString(version) || version.length === 0) {
    errors.push({ code: 'MISSING_FIELD', message: 'version is required', field: 'version' });
  } else if (!SEMVER_RE.test(version)) {
    errors.push({
      code: 'INVALID_VERSION',
      message: 'version must be a semver string (e.g. 1.2.3 or 1.2.3-beta.1)',
      field: 'version',
    });
  }

  const vendor = obj.vendor;
  if (!isString(vendor) || vendor.length === 0) {
    errors.push({ code: 'MISSING_FIELD', message: 'vendor is required', field: 'vendor' });
  }

  const description = obj.description;
  if (description !== undefined && !isString(description)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'description must be a string when present',
      field: 'description',
    });
  }

  const entry = obj.entry;
  if (entry !== undefined && !isString(entry)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'entry must be a string when present',
      field: 'entry',
    });
  }

  const permissions = obj.permissions;
  const perms: Permission[] = [];
  if (!Array.isArray(permissions)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'permissions must be an array of strings',
      field: 'permissions',
    });
  } else {
    permissions.forEach((p, i) => {
      if (!isString(p)) {
        errors.push({
          code: 'INVALID_TYPE',
          message: 'permission must be a string',
          field: `permissions[${i}]`,
        });
        return;
      }
      if (!KNOWN_PERMISSIONS.has(p as Permission)) {
        errors.push({
          code: 'UNKNOWN_PERMISSION',
          message: `unknown permission: ${p}`,
          field: `permissions[${i}]`,
        });
        return;
      }
      perms.push(p as Permission);
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    manifest: {
      id: id as string,
      name: name as string,
      version: version as string,
      vendor: vendor as string,
      permissions: perms,
      ...(description !== undefined ? { description: description as string } : {}),
      ...(entry !== undefined ? { entry: entry as string } : {}),
    },
  };
}
