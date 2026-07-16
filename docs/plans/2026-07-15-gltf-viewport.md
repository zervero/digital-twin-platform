# High-Fidelity Viewport (Scheme C / glTF) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Load curated GLB equipment into the ops 3D stage via host-resolved catalog URLs, with **A-light** procedural placeholders/fallback, status/selection lamps, and shell load progress — per approved Scheme C design.

**Architecture:** Optional `SceneNode.modelId` in contracts; `@dt/engine-sdk` owns GLTFLoader + cache + instance graph + A-light recipes; `apps/web` serves static kit under `public/assets/viewport/` and injects `resolveUrl`; `SceneViewport` shows progress overlay. Env map is **C3 / out of this plan**.

**Tech Stack:** Three.js `GLTFLoader` (addons), Vitest (mocked loader), Vue overlay tokens.

**Branch:** `feat/viewport-gltf`

**Design:** [`docs/plans/2026-07-15-gltf-viewport-design.md`](./2026-07-15-gltf-viewport-design.md)

**Skills:** `@verification-before-completion`, `@vue-testing-best-practices` (overlay only)

---

## Task map

| # | Phase | Task | Depends | Acceptance (short) |
| --- | --- | --- | --- | --- |
| T0 | C0 | Status + ADR 0021 | — | ADR accepted text in repo |
| T1 | C0 | `modelId?` on `SceneNode` + tests | T0 | Contracts typecheck/tests |
| T2 | C0 | Catalog JSON + ASSETS.md + 1 CNC + 1 sensor GLB | T0 | Files served from web public path |
| T3 | C0 | Demo BFF nodes set `modelId` | T1–T2 | Acme machines/sensors reference kit ids |
| T4 | C1 | A-light recipes (if missing) + attach status lamp | — | Unit-testable procedural groups |
| T5 | C1 | Engine asset resolve/load/cache/place/fallback | T1,T4 | Mocked-loader tests green |
| T6 | C1 | Wire `createEngine({ assets })` in `apps/web` | T2,T5 | Dev boot resolves `/assets/viewport/...` |
| T7 | C2 | SceneViewport progress / fallback copy | T5 | Overlay reacts to load events |
| T8 | C2 | Docs (engine-sdk.md, viewport-assets.md, local-dev) | T6–T7 | AGENTS checklist |
| T9 | — | Verification gate | T0–T8 | Package tests + typecheck |

**Ordering note:** T4 can start in parallel with T0–T3. Prefer **not** to buy assets inside the agent session — implementer must either (a) add clearly licensed CC0 GLBs with `ASSETS.md`, or (b) temporarily commit **tiny self-authored GLB fixtures** (boxes exported once) and leave a tracked TODO for swapping commercial/CC0 heroes before release acceptance.

---

### Task 0: ADR 0021 — engine may load GLB

**Files:**
- Create: `docs/adr/0021-viewport-gltf-assets.md`
- Modify: `docs/plans/2026-07-15-gltf-viewport-design.md` status if needed (already approved)

**Content (required decisions):**

- Problem: primitives insufficient; “no asset loading” in engine-sdk.md / ADR 0002 spirit blocks C.
- Decision: host injects `resolveUrl(modelId)`; engine loads GLB, caches by URL, places at node pose, attaches status lamp; A-light fallback; no env map in V1 of this ADR.
- Alternatives rejected: Scheme A-only, CAD ingest, bake models into BFF.
- Consequences: three addons loader dep; static kit size; license diligence via `ASSETS.md`.

**Commit:**

```bash
git add docs/adr/0021-viewport-gltf-assets.md
git commit -m "$(cat <<'EOF'
docs(adr): allow engine-sdk GLB loading via host catalog

ADR 0021 records Scheme C: resolveUrl injection, A-light fallback,
env map deferred.
EOF
)"
```

---

### Task 1: Contracts — `modelId?`

**Files:**
- Modify: `packages/contracts/src/scene.ts`
- Modify: `packages/contracts/src/__tests__/contracts.test.ts`

**Step 1 — failing test:** build a `SceneNode` with `modelId: 'dt.machine.cnc-v1'` and assert field round-trips in object literal typing.

**Step 2 — implementation:**

```ts
  /** Optional viewport asset catalog id (Scheme C). */
  modelId?: string;
```

**Step 3 — verify:**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
pnpm --filter @dt/contracts test
pnpm --filter @dt/contracts typecheck
```

**Commit:** `feat(contracts): add optional SceneNode.modelId for viewport assets`

---

### Task 2: Default kit + ASSETS.md

**Files:**
- Create: `apps/web/public/assets/viewport/catalog.json`
- Create: `apps/web/public/assets/viewport/ASSETS.md`
- Create: `apps/web/public/assets/viewport/dt.machine.cnc-v1.glb`
- Create: `apps/web/public/assets/viewport/dt.sensor.probe-v1.glb`
- Optional: `docs/development/viewport-assets.md` (can wait until T8)

**catalog.json shape:**

```json
{
  "dt.machine.cnc-v1": {
    "url": "/assets/viewport/dt.machine.cnc-v1.glb",
    "kind": "machine",
    "defaultScale": 1,
    "yOffset": 0
  },
  "dt.sensor.probe-v1": {
    "url": "/assets/viewport/dt.sensor.probe-v1.glb",
    "kind": "sensor",
    "defaultScale": 1,
    "yOffset": 0
  }
}
```

**ASSETS.md:** SPDX / source URL / author / whether temporary fixture.

**Asset acquisition (human or agent with approval):**

1. Prefer a small **CC0** CNC + sensor from a trusted source; OR
2. Export minimal GLBs from Blender (cube CNC + pole sensor) as **dev fixtures**, labeled TEMPORARY in ASSETS.md until replaced.

Do **not** commit assets with unknown / non-redistributable licenses.

**Commit:** `chore(web): add viewport GLB kit catalog and license notes`

---

### Task 3: Demo data `modelId`

**Files:**
- Modify: `apps/bff/src/mock/demo-data.ts` (acme + other tenants’ machine/sensor nodes)

Set e.g. machines → `dt.machine.cnc-v1`, sensors → `dt.sensor.probe-v1`. Keep positions/status unchanged.

**Verify:** existing BFF demo-data / tenant tests still pass.

**Commit:** `feat(bff): map demo scene nodes to viewport modelIds`

---

### Task 4: A-light procedural recipes

**Files:**
- Modify or create helpers in `packages/engine-sdk/src/scene-factory.ts` (and `colors.ts` if needed)
- Tests in `packages/engine-sdk/src/__tests__/…`

If stilized Scheme A code is **not** on this branch (likely — branch cut before A landing), implement a **minimal** A-light:

- Machine: pedestal + cabinetBody + statusLamp (names stable)
- Sensor: pole + statusLamp
- Area/factory: quiet pads
- `applySelection` / status color **on lamp only**

**Commit:** `feat(engine-sdk): add A-light procedural node recipes for fallback`

---

### Task 5: Engine GLB load path

**Files:**
- Modify: `packages/engine-sdk/src/types.ts` (`EngineOptions.assets`, progress types)
- Create: `packages/engine-sdk/src/asset-loader.ts` (resolve + load + cache)
- Modify: `packages/engine-sdk/src/digital-twin-engine.ts` (`loadScene` places A-light first, async replaces; `clearScene` disposes instances; progress listeners)
- Modify: `packages/engine-sdk/src/index.ts` exports for new types if public
- Tests with **mocked** `loadGlb`

**Behavior checklist:**

1. `loadScene`: for each node with resolvable `modelId`, show A-light immediately; kick load; on success replace; on fail emit `node-fallback`, keep A-light.
2. Nodes without `modelId` / unmapped type → A-light / pad only.
3. Attach status lamp accessory after GLB attach (engine-owned).
4. Session URL cache; instance dispose on `clearScene`; catalog cache may retain parsed templates.
5. `getAssetLoadProgress()` + `onAssetLoad` per design.

**Do not** import from `apps/`. Host passes `resolveUrl`.

**Verify:**

```bash
pnpm --filter @dt/engine-sdk test
pnpm --filter @dt/engine-sdk typecheck
```

**Commit:** `feat(engine-sdk): load GLB assets with A-light placeholder fallback`

---

### Task 6: Web boot wiring

**Files:**
- Modify: `apps/web/src/main.ts` (or shell bootstrap options) to pass:

```ts
assets: {
  resolveUrl(modelId) {
    // read catalog.json once or hard-map kit ids → `/assets/viewport/...glb`
  },
}
```

Ensure `bootstrapAppShell` / `createEngine` call sites receive options (may need a small app-shell API to forward `EngineOptions` — keep minimal).

**Commit:** `feat(web): wire viewport asset catalog resolveUrl into engine`

---

### Task 7: Shell progress UX (C2)

**Files:**
- Modify: `packages/app-shell/src/components/SceneViewport.vue`
- Modify: i18n `en`/`zh-CN` for loading / partial-fallback strings
- Tests: assert overlay appears when progress &lt; 1 (mock engine events if needed)

Overlay: muted pill consistent with existing viewport chrome; `--dt-*` only; no Three imports.

**Commit:** `feat(app-shell): show viewport asset load progress overlay`

---

### Task 8: Documentation

**Files:**
- Modify: `docs/architecture/engine-sdk.md` (assets API; remove absolute “no glTF”)
- Create: `docs/development/viewport-assets.md` (add model, license, catalog)
- Modify: `docs/development/local-dev.md` (short pointer)
- Modify: `docs/architecture/workspace.md` if static assets note needed
- Modify: `docs/development/contributing.md` Related guides (one line)

**Commit:** `docs: document viewport GLB catalog and engine asset API`

---

### Task 9: Verification gate

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
pnpm --filter @dt/contracts test && pnpm --filter @dt/contracts typecheck
pnpm --filter @dt/engine-sdk test && pnpm --filter @dt/engine-sdk typecheck
pnpm --filter @dt/bff test -- src/__tests__/demo-data.test.ts  # or full if needed
pnpm --filter @dt/app-shell test -- src/components/__tests__/SceneViewport.test.ts
pnpm --filter @dt/web typecheck
```

Manual (dev up): login → `/ops` → CNC GLB or A-light; throttle network → progress; break URL → fallback message; logout → stage clears.

Tick design §11 acceptance boxes when done.

---

## Out of scope

- Env map / IBL (C3)
- Scheme B conveyors / lanes
- Tenant CAD upload / model marketplace
- Click picking / orbit controls (unless already present)

## Execution handoff

**Which mode?**

1. **Agent executes here** (T0→T9)
2. **Subagent-driven** (review between tasks)
3. **Pause**

Reply `1` / `2` / `3`.
