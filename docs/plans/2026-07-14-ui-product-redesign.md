# UI Product Redesign (V4) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the approved product shell — ops/admin mode switch, enterprise ops workspace, full admin IA with parallel APIs, and user-configurable accent — per [`2026-07-14-ui-product-redesign-design.md`](./2026-07-14-ui-product-redesign-design.md).

**Architecture:** Keep package boundaries: presentational primitives in `@dt/ui-kit`, layout/stores/routing in `@dt/app-shell`, 3D only via `SceneViewport` → `@dt/engine-sdk`, HTTP in `@dt/api-client` + `apps/bff`. Introduce `vue-router` at the web entry; `AppShell` becomes a layout host with `/ops` and `/admin/*` child routes. Brand accent is applied by writing `--dt-accent-*` on `document.documentElement` from a preference store.

**Tech Stack:** Vue 3.5, Pinia, vue-router 4, Vitest + `@vue/test-utils` + happy-dom, existing `--dt-*` tokens, Hono BFF, `@dt/contracts` RBAC.

**Branch:** `feat/ui-product-v4` (from `main` @ 4.5.3).

**Design spec:** [`docs/plans/2026-07-14-ui-product-redesign-design.md`](./2026-07-14-ui-product-redesign-design.md)

**Skills while executing:** `@vue-best-practices`, `@vue-testing-best-practices`, `@vue-router-best-practices`, `@frontend-design` (visual only after structure lands).

---

## Task map

| # | Task | Depends on | Acceptance (short) |
| --- | --- | --- | --- |
| T0 | Commit design doc on branch | — | Design markdown tracked |
| T1 | Accent preference + applyAccent CSS helper | — | Unit tests; tokens never hard-code brand in new components |
| T2 | ui-kit primitives batch A (Segmented, Tabs, SideNav, StatCard) | — | Exported + component tests |
| T3 | ui-kit primitives batch B (Tree, AppCard, ToolStrip) | T2 | Exported + component tests |
| T4 | Add `vue-router`; refactor AppShell to layout + routes | T2 | `/ops` default; admin routes gated |
| T5 | TopToolbar: mode switch, locale before user, factory chip | T2, T4 | Order + permissions match §2/§3 |
| T6 | Ops workspace: device tree + context drawer | T3, T4 | Marketplace gone from ops right rail |
| T7 | Viewport tool strip wired to engine | T6 | Buttons call engine/scene commands |
| T8 | Relocate plugin panel hosts | T6 | No raw permission dump in primary chrome |
| T9 | Admin shell + marketplace card grid | T3, T4 | Cards install via existing marketplace API |
| T10 | Appearance settings (accent presets + custom) | T1, T9 | Persist + contrast guard |
| T11 | Contracts + BFF: users/roles + audit APIs | — | Parallel track; tests green |
| T12 | Admin pages: users, audit (+ stubs→real) | T9, T11 | Primary paths work for admin |
| T13 | Remaining admin nav modules | T12 | Org/assets/alarms/overview either live or release-blocked |
| T14 | Docs: tokens, contributing, ADR if needed | T1–T13 | AGENTS.md checklist satisfied |
| T15 | Verification gate | all | typecheck/lint/test/build; acceptance §4 |

Execute **T1–T3** and **T11** in parallel if staffing allows. Do **not** merge incomplete admin modules that still show “under construction” into a release.

---

### Task 0: Track the design doc

**Files:**
- Track: `docs/plans/2026-07-14-ui-product-redesign-design.md`
- Track: `docs/plans/2026-07-14-ui-product-redesign.md` (this file)

**Steps:**

1. `git add docs/plans/2026-07-14-ui-product-redesign-design.md docs/plans/2026-07-14-ui-product-redesign.md`
2. Commit:

```bash
git commit -m "$(cat <<'EOF'
docs(plans): add V4 UI product redesign design and implementation plan

Lock IA (ops/admin toggle), configurable accent, and parallel admin API scope before coding.
EOF
)"
```

---

### Task 1: Accent preference store + CSS apply helper

**Files:**
- Create: `packages/app-shell/src/stores/appearance-store.ts`
- Create: `packages/app-shell/src/theme/apply-accent.ts`
- Create: `packages/app-shell/src/theme/accent-presets.ts`
- Create: `packages/app-shell/src/theme/__tests__/apply-accent.test.ts`
- Create: `packages/app-shell/src/stores/__tests__/appearance-store.test.ts`
- Modify: `packages/app-shell/src/index.ts` (export if needed)
- Modify: `apps/web/src/main.ts` (call `applyAccent` after pinia)

**Step 1: Write failing tests for contrast + apply**

```ts
// packages/app-shell/src/theme/__tests__/apply-accent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyAccent, contrastRatio, isAccentUsable } from '../apply-accent.js';

describe('applyAccent', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
  });

  it('writes --dt-accent-primary and hover on :root', () => {
    applyAccent('#2DD4BF');
    expect(
      document.documentElement.style.getPropertyValue('--dt-accent-primary').trim(),
    ).toBe('#2DD4BF');
  });

  it('rejects accents that fail AA against white label on primary button', () => {
    expect(isAccentUsable('#EEEEEE')).toBe(false);
    expect(isAccentUsable('#1D4ED8')).toBe(true);
  });
});
```

**Step 2:** `pnpm --filter @dt/app-shell test -- src/theme/__tests__/apply-accent.test.ts`  
Expected: FAIL (module missing).

**Step 3: Minimal implementation**

- `accent-presets.ts`: named presets `{ id, label, primary, hover }[]` (blue, teal, indigo, amber, rose, …).
- `apply-accent.ts`: set `--dt-accent-primary` / `--dt-accent-primary-hover`; derive hover by lightening if not provided; `contrastRatio` WCAG relative luminance; `isAccentUsable` requires ≥4.5:1 vs `#FFFFFF` **or** vs `#0F1115` (pick label color automatically later in button if needed — for V1 require ≥4.5:1 vs white).
- `appearance-store.ts`: `accentId | customHex`, load/save `localStorage` key `dt.appearance.v1`, `setPreset`, `setCustom` (no-op/throw if `!isAccentUsable`).

**Step 4:** Re-run tests → PASS.

**Step 5:** Wire `main.ts` after pinia: `useAppearanceStore().hydrate()` → `applyAccent(...)`.

**Step 6: Commit** `feat(app-shell): add user accent preference and CSS apply helper`

---

### Task 2: ui-kit primitives — Segmented, Tabs, SideNav, StatCard

**Files:**
- Create: `packages/ui-kit/src/components/DtSegmentedControl.vue`
- Create: `packages/ui-kit/src/components/DtTabs.vue`
- Create: `packages/ui-kit/src/components/DtSideNav.vue`
- Create: `packages/ui-kit/src/components/DtStatCard.vue`
- Create: `packages/ui-kit/src/components/__tests__/DtSegmentedControl.test.ts` (and peers as needed)
- Modify: `packages/ui-kit/src/index.ts`
- Modify: `docs/architecture/ui-kit-tokens.md` (list new components; note accent is variable)

**Rules:**
- Only `--dt-*` tokens for color (including `var(--dt-accent-primary)` for selected states).
- No i18n inside ui-kit (labels via props/slots).
- Props are presentational only.

**DtSegmentedControl API (target):**

```ts
defineProps<{
  modelValue: string;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
}>();
defineEmits<{ 'update:modelValue': [string] }>();
```

**Steps:** failing mount tests → implement → export → `pnpm --filter @dt/ui-kit test` (add vitest if ui-kit lacks it; if no test script yet, add vitest mirroring app-shell) → commit  
`feat(ui-kit): add segmented control, tabs, side nav, and stat card`

---

### Task 3: ui-kit primitives — Tree, AppCard, ToolStrip

**Files:**
- Create: `packages/ui-kit/src/components/DtTree.vue`
- Create: `packages/ui-kit/src/components/DtAppCard.vue`
- Create: `packages/ui-kit/src/components/DtToolStrip.vue`
- Tests + `index.ts` exports

**DtTree:** recursive nodes `{ id, label, status?: 'online'|'warning'|'alarm'|'offline', children?: Node[] }`; emit `select`.

**DtAppCard:** title, description, tag, primary action slot/button props.

**DtToolStrip:** horizontal icon button group; `aria-label` required per button.

Commit: `feat(ui-kit): add tree, app card, and tool strip`

---

### Task 4: vue-router + AppShell layout split

**Files:**
- Modify: `packages/app-shell/package.json` — add `vue-router` dependency
- Modify: `apps/web/package.json` — add `vue-router` (direct dep for Vite resolution if required)
- Create: `packages/app-shell/src/router/routes.ts`
- Create: `packages/app-shell/src/router/guards.ts`
- Create: `packages/app-shell/src/workspaces/OpsWorkspace.vue`
- Create: `packages/app-shell/src/workspaces/AdminWorkspace.vue`
- Modify: `packages/app-shell/src/AppShell.vue` — toolbar + `<RouterView />` only
- Modify: `apps/web/src/main.ts` — `app.use(router)`
- Create: `packages/app-shell/src/router/__tests__/guards.test.ts`

**Routes:**

```ts
[
  { path: '/', redirect: '/ops' },
  { path: '/ops', name: 'ops', component: OpsWorkspace },
  {
    path: '/admin',
    component: AdminWorkspace,
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: 'marketplace' },
      { path: 'marketplace', name: 'admin-marketplace', component: AdminMarketplacePage },
      { path: 'installed', ... },
      { path: 'publish', ... },
      { path: 'users', ... },
      { path: 'audit', ... },
      { path: 'tenant', ... },
      { path: 'appearance', ... },
      // overview, org, assets, models, alarms — add as pages land
    ],
  },
]
```

**Guard:** if `meta.requiresAdmin` and user lacks admin role (or a dedicated permission), redirect to `/ops`.

**Interim:** `OpsWorkspace` may still embed old DevicePanel + SceneViewport + empty right drawer stub until T6; **remove** `MarketplacePanel` from ops layout in this task (move file usage to admin page even if page is thin).

Commit: `feat(app-shell): introduce vue-router with ops and admin workspaces`

---

### Task 5: TopToolbar product chrome

**Files:**
- Modify: `packages/app-shell/src/components/TopToolbar.vue`
- Modify: i18n dictionaries under `packages/i18n/src/locales/{en,zh-CN}/` for new keys
- Create tests as needed under `packages/app-shell/src/components/__tests__/`

**Required chrome order (right cluster):**  
`Search (optional stub) · Notifications (stub) · Help (stub) · [EN | 中文] · User`

**Center:** `DtSegmentedControl` options `ops` / `admin`.  
- Switching `ops` → `router.push('/ops')`  
- Switching `admin` → `router.push` last admin path or `/admin/marketplace`  
- If not admin: hide admin option **or** disable with tooltip (prefer hide for viewer/operator).

**Left:** brand, version chip, factory/tenant label (read from auth/tenant context; dropdown may be visual-only until multi-factory API exists).

Commit: `feat(app-shell): add mode switch and reorder toolbar locale before user`

---

### Task 6: Ops workspace — device tree + context drawer

**Files:**
- Create: `packages/app-shell/src/components/DeviceTreePanel.vue` (replace or wrap `DevicePanel.vue`)
- Create: `packages/app-shell/src/components/DeviceDetailDrawer.vue`
- Modify: `packages/app-shell/src/workspaces/OpsWorkspace.vue`
- Modify: `packages/device-domain` only if tree grouping helpers are pure domain logic (no Vue)
- i18n keys for drawer tabs / empty states

**Behavior:**
- Build tree from devices (group by a `line`/`area` field if present; otherwise flat under tenant/site root).
- Select device → update device-store + scene select/focus (existing patterns in `DevicePanel.vue`).
- Drawer: status pill, `DtTabs`, `DtStatCard` row (mock KPIs acceptable behind a `// TODO(telemetry)` until API exists), telemetry list from device fields.
- Right rail is **drawer only** — not marketplace.

Commit: `feat(app-shell): ship ops device tree and detail drawer`

---

### Task 7: Viewport tool strip

**Files:**
- Modify: `packages/app-shell/src/components/SceneViewport.vue`
- Modify: `packages/engine-sdk/src/types.ts` + `digital-twin-engine.ts` if new camera helpers are required (`resetView`, `fitAll` — map to existing `reset-view` command path where possible)
- Tests in engine-sdk / app-shell

Use `DtToolStrip` overlays (top-right + bottom-center). Wire:
- reset / fit → scene command or engine method
- focus selected → existing focus command
- layers/settings may stub with disabled + aria until real

Commit: `feat(app-shell): add viewport tool strips for camera actions`

---

### Task 8: Plugin host relocation + error UX

**Files:**
- Modify: `packages/app-shell/src/components/PluginPanelHost.vue` (migrate hardcoded hex → tokens)
- Modify: `OpsWorkspace.vue` — render hosts under left rail below tree
- Modify: errored plugin UI to use `DtEmptyState` / muted inline alert (no raw permission strings as page hero)

Commit: `fix(app-shell): relocate plugin panels and tokenize plugin host`

---

### Task 9: Admin marketplace as card grid

**Files:**
- Create: `packages/app-shell/src/pages/admin/AdminMarketplacePage.vue`
- Create: `packages/app-shell/src/pages/admin/AdminInstalledPage.vue`
- Create: `packages/app-shell/src/pages/admin/AdminPublishPage.vue`
- Modify/reuse: logic from `MarketplacePanel.vue` / `useMarketplaceInstall.ts` (prefer extract composables, then delete or thin-wrap old panel)
- Modify: `AdminWorkspace.vue` — `DtSideNav` + `<RouterView />` + optional right overview card

**UI:** filter tabs (全部/官方/第三方/我的 — map to data if fields exist; else 全部 + 我的/已装). Grid of `DtAppCard` with Install/Activate actions gated by `plugin:install` / `plugin:publish`.

Commit: `feat(app-shell): rebuild admin marketplace as app card grid`

---

### Task 10: Appearance settings page

**Files:**
- Create: `packages/app-shell/src/pages/admin/AdminAppearancePage.vue` (also link from 系统设置; allow **all logged-in users** to open appearance — either under `/ops` settings drawer **or** `/admin/appearance` with guard relaxed to authenticated).  
  **Decision for implementers:** put personal appearance at `/settings/appearance` accessible to all roles (add route outside `requiresAdmin`), and keep admin system settings separate. Update router accordingly.
- Wire presets UI to `appearance-store`

Commit: `feat(app-shell): add appearance settings for accent presets and custom color`

---

### Task 11: Contracts + BFF — users/roles + audit (parallel)

**Files (expected; adjust names to match BFF style):**
- Modify: `packages/contracts/src/auth.ts` (DTOs for user list / role assignment if missing)
- Create: `packages/contracts/src/audit.ts` (audit event type)
- Create: `apps/bff/src/routes/admin-users.ts`
- Create: `apps/bff/src/routes/admin-audit.ts`
- Modify: `apps/bff/src/server.ts` — mount routes with tenant + admin permission middleware
- Create: `apps/bff/src/__tests__/admin-users.test.ts`, `admin-audit.test.ts`
- Modify: `packages/api-client` — client methods for new endpoints

**Minimum API:**

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/users` | list users in tenant |
| PATCH | `/api/admin/users/:id/roles` | set roles (admin only) |
| GET | `/api/admin/audit` | paginated audit events |
| POST | (internal) | record audit on publish/install/role change |

Dev/mock auth must seed at least two users for UI demos.

Commit: `feat(bff): add admin users and audit APIs` (+ contracts/api-client commits as needed)

---

### Task 12: Admin users + audit pages

**Files:**
- Create: `packages/app-shell/src/pages/admin/AdminUsersPage.vue`
- Create: `packages/app-shell/src/pages/admin/AdminAuditPage.vue`
- Composables + tests

Primary paths: list users, change role, list audit entries filtered by type.

Commit: `feat(app-shell): add admin users and audit pages`

---

### Task 13: Remaining admin nav modules

**Files:** pages under `packages/app-shell/src/pages/admin/` for overview, org, assets, models, alarms, tenant — **only ship with real or honestly mocked BFF**.  
If a module lacks API by freeze date: remove from side nav for release (do not leave “建设中” in production acceptance).

Commit per module or one `feat(app-shell): complete admin navigation modules` when ready.

---

### Task 14: Documentation

**Files:**
- Modify: `docs/architecture/ui-kit-tokens.md` — accent override contract, new components
- Modify: `docs/development/contributing.md` — branch/plan pointers if needed
- Create (if decision non-obvious): `docs/adr/0019-v4-ui-product-shell.md` — router + ops/admin split + accent preference
- Modify: `README.md` / `README.zh-CN.md` only if dev-loop entry changes

Commit: `docs: document V4 product shell, accent theming, and admin APIs`

---

### Task 15: Verification gate

Run from repo root:

```bash
pnpm typecheck   # or turbo equivalent used in CI
pnpm lint
pnpm test
pnpm build
```

Manual checklist from design §4 acceptance:

1. Default landing `/ops` for all roles; non-admin cannot open `/admin/*`.
2. Locale control immediately before user; switch updates copy without reload.
3. Accent change applies across segmented/nav/buttons; survives reload; status colors unchanged.
4. Ops has tree + drawer; marketplace not on ops right rail.
5. Admin marketplace cards install/activate against BFF.
6. Users/audit primary paths work for admin.
7. Boundaries: ui-kit still has no api-client/engine-sdk imports.

Final commit only if fixes were needed: `test: close V4 UI product redesign verification gaps`

---

## Execution notes

- Prefer **small commits** per task message above (Conventional Commits).
- Do not expand into light theme or mobile layout.
- When unsure about engine camera API, prefer scene commands already in `@dt/contracts` over new Three.js leaks into Vue.
- Keep plugin permission errors out of the global hero chrome.

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-07-14-ui-product-redesign.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — fresh subagent per task, review between tasks  
2. **Parallel Session (separate)** — new session with `executing-plans` on `feat/ui-product-v4`

Which approach?
