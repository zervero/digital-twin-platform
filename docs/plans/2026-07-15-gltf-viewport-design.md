# High-Fidelity Viewport Assets (Scheme C) — Design

> Status: **approved** in design review (2026-07-15).  
> Branch: **`feat/viewport-gltf`**.  
> Scope: **方案 C** — glTF/GLB equipment assets + loader +
> host progress UX; procedural **A-light** primitives are
> **placeholders + fail-closed fallback**.  
> Extends: ADR 0002 (engine as SDK), ADR 0020 (V4 shell),  
> `docs/architecture/engine-sdk.md`.  
> Contrasts: Scheme A-as-primary and B (procedural layout extras) are
> **not** this milestone’s primary path.  
> Next: implementation plan →
> `docs/plans/2026-07-15-gltf-viewport.md`.

## Context

The ops center viewport still maps each `SceneNode` to a status-tinted
primitive (`BoxGeometry` / `SphereGeometry`) on a dark grid. That reads
as a topology sketch. Product feedback asks for something closer to
**real factory equipment**.

Three fidelity bands were compared (design chat schematics
`viewport-look-option-{a,b,c}-*.png`). **C — high-fidelity assets**
was chosen: load textured glTF/GLB models, with an explicit asset
pipeline and engine API growth that today’s “no asset loading”
boundary must absorb deliberately (see ADR impact below).

## §1 — Goals & non-goals

| Goal | Non-goal (this milestone) |
| --- | --- |
| Machines/sensors rendered from curated GLB assets | Photogrammetry of customer factories / per-tenant CAD ingest |
| Engine can load, cache, dispose, and place assets by node | Full digital-content marketplace inside ops |
| Progress + fail-closed UX so the stage never sticks blank | Automatic LOD generation or Draco pipeline DIY |
| Status / selection still readable on realistic meshes | Rewriting ops chrome or adding click-picking (unless trivial) |
| Package boundaries respected; Three.js stays in engine-sdk | Shipping huge unpaid commercial packs without license clarity |

## §2 — Product experience

### Happy path

1. User opens `/ops` with an authenticated tenant scene.
2. Viewport shows a muted floor while assets resolve (skeleton /
   progress in shell overlay — not blocking the whole app).
3. As each (or batched) GLB resolves, nodes appear at `position` with
   correct scale/orientation; status shown via a **standard accessory**
   (lamp / rim) parented by the engine — not by recoloring PBR albedos
   wholesale.
4. Tree selection → camera focus + selection accent on the accessory
   (and optional outline), same as today functionally.
5. Logout → `clearScene` disposes GPU resources and drops cache entries
   tied to that scene load (see §5).

### Fail paths

| Failure | UX |
| --- | --- |
| Asset 404 / decode error for one node | That node falls back to Scheme **A-light** procedural cabinet/sensor; toast or overlay line optional, not modal |
| Catalog base URL misconfigured | All nodes fallback; shell shows one recoverable error + retry |
| Slow network | Indeterminate or % progress for outstanding loads |
| WebGL context loss | Existing dispose/remount discipline; no special C path beyond clear |

### Visual tone

- Industrial realism inside the stage; product shell stays restrained
  SaaS (no neon / holographic overlays on the viewport).
- Prefer metallic / painted CNC looks; avoid toy-like low-poly packs
  that conflict with “high fidelity.”
- Semantic status colors remain distinct from brand accent (existing
  `--dt-status-*` / engine `STATUS_COLORS`).

## §3 — Information architecture (assets)

### Catalog model

Introduce a **host-owned asset catalog** (not plugin marketplace):

```
assetId → { url, kind, defaultScale?, yOffset?, licenseNote? }
```

- `kind`: `machine` \| `sensor` \| `area` \| `prop` (area may stay
  procedural pad in v1 of C).
- Default demo catalog ships with the monorepo under
  `apps/web/public/assets/viewport/` (or `packages/engine-assets/`
  static published by web) so `pnpm dev` works offline-ish after
  first fetch from same origin.
- Mapping from `SceneNode` → `assetId`:
  1. Optional `SceneNode.modelId?: string` (contracts addition), else
  2. Convention by `type` + `name` prefix, else
  3. Type default (`machine` → `dt.machine.cnc-v1`, `sensor` →
     `dt.sensor.probe-v1`).

BFF demo fixtures should set `modelId` for acme machines so the
happy path is deterministic without guessing.

### Licensing & size budget

| Rule | Detail |
| --- | --- |
| License | Only CC0 / MIT / purchase-with-redistribution or self-authored GLBs; note SPDX + source URL in `ASSETS.md` beside the catalog |
| Budget | Target **≤ ~8 MB** gzipped for the default kit (3–5 machine variants + 1–2 sensors) for first mile; document when exceeding |
| Format | Prefer **GLB** (single binary); optional Draco only if loader already supports and size requires it |
| No secrets | Assets are public static files in V1; auth CDN is a later track |

## §4 — Contracts

### Additive field (recommended)

```ts
// packages/contracts/src/scene.ts
export interface SceneNode {
  // ...existing fields...
  /**
   * Optional catalog id for Scheme C viewport assets.
   * Host resolves id → GLB URL. Unknown id → procedural fallback.
   */
  modelId?: string;
}
```

- Additive, optional → no break for existing clients.
- Document in `docs/architecture/engine-sdk.md` and ADR 0002
  amendment (or new ADR if reviewers prefer a dedicated decision).

### Non-changes

- `DigitalTwinCommand`, auth roles, admin marketplace DTOs unchanged.
- No requirement that BFF store binary models in V1.

## §5 — Engine SDK (`@dt/engine-sdk`)

### Public API additions

```ts
interface EngineOptions {
  // existing...
  /** Catalog base URL or resolve hook for asset ids. */
  assets?: {
    resolveUrl(modelId: string): string | null;
    /** Optional; default shared GLTFLoader. */
    loadGlb?(url: string): Promise<Object3D>;
  };
}

interface DigitalTwinEngine {
  // existing mount/loadScene/clearScene/select/focus/...
  /** Progress 0–1 for the in-flight scene asset batch; null when idle. */
  getAssetLoadProgress(): number | null;
  /** Subscribe to progress + terminal errors (per-node failures optional). */
  onAssetLoad?(listener: (ev: AssetLoadEvent) => void): () => void;
}

type AssetLoadEvent =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'node-fallback'; nodeId: string; reason: string }
  | { type: 'complete' };
```

`loadScene` becomes async with real I/O (already `Promise`):  
it places procedural placeholders immediately (optional) **or** waits for
batch — **decision: placeholders + progressive replace** so the stage
never stays empty.

### Internals (not exported)

- Single shared `GLTFLoader` (three/examples or `three/addons`).
- In-memory URL → cloned scene cache for the tab session;
  `clearScene` / `dispose` evicts or retains by policy
  (**policy: retain catalog cache across logout; dispose instance graphs**).
- Placement: set root position from `node.position`; apply
  `defaultScale` / `yOffset` from catalog metadata; up-axis normalize
  once at import if needed.
- Status accessory: small lamp mesh or emissive child tagged
  `userData.role = 'statusLamp'` attached under asset root by engine
  (so artists don’t encode status into albedo).
- Selection: boost lamp + optional subtle outline; do not flood albedo
  with `SELECTION_COLOR`.

### Procedural fallback (Scheme A-light)

Keep a thin procedural path inside factory for:

- missing `modelId` / resolve miss / load error  
- `factory` / `area` pads (may never need GLB in V1)

This is deliberate resilience, not a second product skin.

### Testing strategy

| Layer | Approach |
| --- | --- |
| Catalog resolve | Pure unit tests (no WebGL) |
| Placement math / accessory attach | Unit tests with stub `Object3D` trees |
| Loader | Mock `loadGlb` in engine tests; one optional smoke with tiny fixture GLB under `fixtures/` if CI WebGL unavailable — skip by default |
| Disposal | Assert cache + instance dispose hooks called |

Happy-dom does **not** provide WebGL; do not require real GLTFLoader
in CI default suite.

## §6 — App shell / web host

### `apps/web`

- Serve default kit from `public/assets/viewport/**`.
- Boot: `createEngine({ assets: { resolveUrl } })` where resolveUrl
  maps catalog ids to `/assets/viewport/...glb`.
- Document adding new models in `docs/development/local-dev.md` or
  `docs/development/viewport-assets.md`.

### `@dt/app-shell` `SceneViewport`

- Optional thin overlay: loading % / “部分设备使用简化模型”.
- Subscribe to `onAssetLoad` if engine exposes it; keep overlay
  tokens/`--dt-*` only.
- No Three.js imports in app-shell (boundary unchanged).

### Desktop (`apps/desktop`)

- Same static assets via web build; Tauri asset protocol follow-up if
  offline packaging requires it (call out as follow-up risk).

## §7 — BFF / demo data

- Extend acme (and other tenants) scene nodes with `modelId` for
  machines/sensors in `apps/bff/src/mock/demo-data.ts`.
- No binary upload API in this milestone.

## §8 — Package & docs impact (AGENTS checklist)

| Artifact | Action |
| --- | --- |
| `packages/contracts` | Optional `modelId` on `SceneNode` |
| `packages/engine-sdk` | Loader, cache, accessory, API + tests; dependency on three addons loader |
| `docs/architecture/engine-sdk.md` | Document assets option + progress API |
| ADR | Amend **0002** (engine SDK now loads assets) **or** add
  `0021-viewport-gltf-assets.md` — prefer **new ADR** for clear
  decision history |
| `docs/architecture/workspace.md` | Note web serves static viewport assets;
  engine-sdk does not import apps |
| `CHANGELOG` / release-please | Filled by conventional commits |
| Packaging | Watch desktop install size |

Dependency direction remains:

```
app-shell → engine-sdk → three (+ addons loader)
apps/web → engine-sdk (via app-shell) + static /public assets
```

Engine must **not** hardcode `/assets/...` paths; host injects
`resolveUrl`.

## §9 — Phased delivery

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| **C0** | ADR + contracts `modelId` + catalog JSON + 1–2 placeholder-quality GLBs (licensed) | Docs + fixtures exist |
| **C1** | Engine load/place/cache/fallback + demo `modelId` wiring | Acme machines show GLB or fallback; tests green |
| **C2** | Shell progress / fallback messaging | Slow network UX readable |
| **C3** (optional follow-up) | Env map / better lighting only if models look flat | No Scheme B layout scope creep |

Recommend shipping **C0–C2** as one product milestone on
**`feat/viewport-gltf`**. **C3** (env map) is an optional follow-up
after C0–C2 are accepted — not in the same first delivery.

## §9.1 — Locked product decisions (2026-07-15)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Branching | New branch **`feat/viewport-gltf`** (not continued solely on `feat/ui-product-v4`) |
| 2 | Placeholder while GLB loads | **A-light** procedural cabinet/sensor at node pose; swap to GLB on success; keep A-light on failure |
| 3 | Default kit authorship | **Buy or CC0**, start with **1 CNC + 1 sensor**; document SPDX + source in `ASSETS.md` |
| 4 | Environment map / studio IBL | **C3 only** — first milestone uses existing ambient + key light |

## §10 — Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| License / legal | ASSETS.md + SPDX; prefer self-made or clearly freer packs |
| Bundle / download weight | Size budget; progressive load; few default SKUs |
| Artist pipeline unknown to team | Start with 1 hero CNC + 1 sensor; quality over quantity |
| Status unreadable on dark metal | Engine-owned lamp accessory mandatory |
| CI can’t run WebGL | Mock loader; no mandatory GL smoke in CI |
| Scope creep into CAD ingest | Explicit non-goal; tenant upload later |
| Prior Scheme A experiment | Procedural path retained as fallback only |

## §11 — Acceptance

- [x] ADR accepted (new or amended) stating engine may load GLB via host-resolved URLs
- [x] `SceneNode.modelId?` in contracts + demo data populated for acme machines
- [x] Default catalog + ≥1 machine + ≥1 sensor GLB served by web
- [ ] `/ops` shows high-fidelity models for mapped nodes under mock/OIDC login
- [x] Unknown/failing asset → procedural fallback without crashing stage
- [x] Selection + status still obvious; camera helpers work
- [ ] Logout clears instance graphs; no permanent GPU leak in manual soak
- [x] `engine-sdk` unit tests + typecheck green; app-shell SceneViewport tests green
- [x] Docs: engine-sdk.md + viewport assets guide + AGENTS/ADR satisfied

## §12 — Open questions

All previously open items are **locked** in §9.1. Remaining only if
procurement blocks C0:

- Exact CC0 vs paid SKU URLs once purchased/chosen (fill `ASSETS.md`
  during C0; does not change architecture).

---

## Summary for reviewers

Scheme **C** on **`feat/viewport-gltf`**: host static catalog +
optional `modelId`, engine GLB loader with **A-light placeholders**,
status/selection accessories, C0–C2 delivery; **env map deferred to
C3**. ADR required for “engine may load assets.”

**Ready for implementation** via `docs/plans/2026-07-15-gltf-viewport.md`.
