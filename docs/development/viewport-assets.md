# Viewport GLB assets (Scheme C)

Ops viewport models are resolved by **`@dt/asset-system`** (ADR 0022), then
decoded by **`@dt/engine-sdk`** (ADR 0021).

## Flow (V1)

```
modelId → manifest URL → cache hit?
  → yes: local readable URL (blob: / file)
  → no:  download → put cache → local URL
→ engine GLTFLoader
```

## Kit location (dev fixtures)

| Path | Role |
| --- | --- |
| `apps/web/public/assets/viewport/catalog.json` | `modelId` → url / **version** / kind |
| `apps/web/public/assets/viewport/*.glb` | Dev / same-origin bytes |
| `apps/web/public/assets/viewport/ASSETS.md` | License / SPDX / TEMPORARY notes |

Production **desktop** should use CDN (or other remote) URLs in the manifest
and a **disk** `ByteCache` (`createDiskByteCache`) so large GLBs are not
shipped inside the installer. Dev may keep same-origin fixtures.

## Adding a model

1. Add a redistributable GLB (CC0 / purchase-with-redistribution / self-authored).
2. Record SPDX + source in `ASSETS.md`.
3. Add a `catalog.json` entry with `url`, **`version`**, `kind`, optional scale/offset.
4. Point demo or tenant `SceneNode.modelId` at the catalog id.
5. Bump `version` when replacing bytes so caches invalidate.

## Failure behaviour

Unknown id, HTTP failure, or decode error → that node keeps the **A-light**
procedural placeholder; shell may show a fallback count.

## Env map

IBL / HDR environment maps remain **C3** (out of asset-system V1 loaders).
