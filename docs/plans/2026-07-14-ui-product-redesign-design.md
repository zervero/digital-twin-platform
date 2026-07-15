# UI Product Redesign (V4) — Design

> Status: approved in design review (2026-07-14).  
> Next: implementation plan via `writing-plans` → `docs/plans/2026-07-14-ui-product-redesign.md`.

## Context

The shipped shell (`@dt/app-shell`) is a single-page three-column layout: device list | 3D viewport | plugin marketplace. It works as a technical demo but is weak as a product: marketplace competes with the twin stage, admin and operator share one crowded chrome, and the visual language under-delivers versus industrial SaaS expectations.

**Decisions locked in brainstorming:**

| Topic | Choice |
| --- | --- |
| Scope | Product-level redesign (IA + shell + admin), not reskin-only |
| Personas | Operator and admin are equally important |
| Entry | Scheme 2 — everyone lands on Twin ops; top-bar **操作 \| 管理** toggle |
| Admin depth | Full admin IA (marketplace, installed, publish, users/roles, audit, org, etc.) |
| Delivery | UI shell and missing admin APIs in the **same milestone** (parallel tracks) |
| Visual tone | Restrained enterprise SaaS (dark, mid density, 8px radius) — not SCADA-dense, not dual-skin |
| Accent | User-configurable brand primary (not hard-coded steel blue) |
| Locale chrome | Language switch sits **immediately before** the user menu |

Reference structure (ops tree + viewport tools + detail KPIs; admin side-nav + app-market cards) was validated against an Option-2 concept mock; effect mockups live under the Cursor project assets folder for this session.

## §1 — Information architecture & shell

### Product shape

One Web + Desktop app (shared `@dt/app-shell`). Persistent top-bar mode switch: **操作 | 管理**. After login, **all roles default to 操作** (Twin workspace).

```
┌─ Digital Twin · Factory ▾ · [操作|管理] · search/notify/help · EN|中文 · User ─┐
│  操作: 设备树 | 3D Stage + tool strips | 设备详情抽屉                           │
│  管理: 侧导航 | 内容区 (市场/用户/审计…) | 可选右栏概览                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Mode | Visibility | Content |
| --- | --- | --- |
| **操作** | All roles | Collapsible **device tree**; full-bleed 3D stage with floating tool strips; **context drawer** (tabs, KPIs, telemetry). Plugin `ui-panel` mounts under the left rail or in drawer extension slots — **not** competing with marketplace on the right. |
| **管理** | `admin` only (hidden or disabled + tooltip otherwise) | Side nav: overview, users & roles, org, equipment/assets, data/models, **app market**, alarms, system settings, audit. Main pane is the active module; optional right rail for settings shortcuts / system stats. |

### Routing

Introduce `vue-router` (none today):

- `/ops` — default
- `/admin/marketplace`, `/admin/installed`, `/admin/publish`, `/admin/users`, `/admin/audit`, `/admin/tenant`, plus other admin modules as they land
- Mode toggle = navigate between `/ops` and last `/admin/*` (fallback `/admin/marketplace`)

### Package boundaries (unchanged)

- Layout & stores: `@dt/app-shell`
- Presentational primitives: `@dt/ui-kit` (no API / engine / Vue business logic leakage)
- 3D only via `SceneViewport` → `@dt/engine-sdk`

## §2 — Visual system, tokens, key components

### Principles

| Principle | Practice |
| --- | --- |
| Hierarchy | base → elevated panel → KPI/card surface; enough contrast to avoid a flat black slab |
| Brand accent | Components read `--dt-accent-primary` / `-hover` only — **never** hard-coded brand hex |
| Semantic status | online / warning / alarm tokens stay fixed; they do **not** follow brand accent |
| Density | One mid SaaS density for ops and admin (no dual-skin) |
| Stage | Ops center must show a readable twin scene, not an empty canvas; viewport owns floating tools |
| Motion | Mode cross-fade, drawer/tree expand, live pulse; respect `prefers-reduced-motion` |
| No-go | Glassmorphism, purple gradients, decorative neon glow |

### Top bar — right cluster order (fixed)

```
… · Search · Notifications · Help · [EN | 中文] · User avatar/menu
```

Language control uses existing `@dt/i18n` (EN / zh-CN). Search / notifications / help may ship as chrome with stub handlers until backends exist.

### User-configurable accent

| Layer | Behavior |
| --- | --- |
| Tokens | `--dt-accent-primary` and `-hover` remain the single source of truth |
| Settings UI | **Shared dialog** (`DtDialog` + `AppearanceSettingsForm`), not a full page |
| Entries | (1) Admin left nav 「外观」 (2) Toolbar 「外观」 for **anonymous + all logged-in roles** |
| Persistence | Preference in `localStorage` first; sync to account/tenant settings API when available |
| Apply | On boot and on change, set CSS variables on `document.documentElement` (and/or `data-accent`) |
| Guardrail | Contrast check before save; auto-pick inverse label color on primary buttons |
| Deep links | `/settings/appearance` and `/admin/appearance` open the dialog then return to `/ops` / marketplace |

Default preset may be blue for first boot; product capability is **switchable**. Teal (or any preset) in mockups only demonstrates theming.

### Ops layout (target)

- Left: searchable **device tree** (site → line → device) with status dots  
- Center: 3D viewport + floating orbit/pan/fit/layers tool strips wired to engine commands  
- Right: device detail — status pill, tabs (概览 / 运行 / 告警 / 维保 / 文档), KPI cards, realtime table + sparkline  

### Admin layout (target)

- Left: **管理中心** side nav (full IA)  
- Center: module content — **应用市场** as filter tabs + **app card grid** + install CTA (replaces the old right-rail list)  
- Right (where useful): system settings shortcuts + overview stats  

### ui-kit additions (presentational)

`DtSegmentedControl`, `DtTree`, `DtTabs`, `DtStatCard`, `DtSideNav`, `DtAppCard` (+ grid), `DtToolStrip`, `DtDialog`; extend existing `DtPanel` / `DtEmptyState` / `DtStatusBadge` / `DtButton` / table patterns.

Light theme: leave `[data-theme="light"]` hook; not a required deliverable this milestone.

## §3 — Data flow, permissions, errors

### Data flow

```
Login → /ops
  ├─ device-store / scene-store / realtime (as today)
  ├─ tree select → engine select/focus
  └─ drawer ← device + telemetry (KPI may mock until real sources)

Toggle 管理 → /admin/*
  ├─ marketplace / installed / publish ← existing BFF
  ├─ users / roles / audit / org / … ← new APIs (parallel track)
  └─ accent preference ← local → optional settings API
```

### Permission matrix (shell)

| Capability | viewer | operator | admin |
| --- | --- | --- | --- |
| Ops, locale, personal accent | ✓ | ✓ | ✓ |
| Device commands / scene write | read-only | ✓ | ✓ |
| Enter 管理 | ✗ | ✗ | ✓ |
| Install / activate / uninstall / publish | ✗ | ✗ | ✓ |
| Users, roles, audit, org admin | ✗ | ✗ | ✓ |

Unauthenticated users keep the existing login gate; admin mode is not rendered.

### Errors & empty states

| Scenario | UX |
| --- | --- |
| Plugin missing permission | Omit panel from ops; admin empty state with clear copy (no raw `auth:login` dumps in primary chrome) |
| Empty market/list | Empty state + primary CTA when allowed |
| API failure | In-page banner/toast + retry; do not brick the 3D stage |
| WS disconnect | Top-bar live → reconnecting; last frame remains |
| Admin page API not ready | Nav allowed during parallel build; in-page “under construction” — must not ship in release acceptance |
| Accent fails contrast | Block save with inline explanation |

### Plugin slots

- `ui-panel` → under left rail or drawer extension (not marketplace column)  
- `menu-item` → overflow / ops tool strip — must not displace **操作 \| 管理**

## §4 — Milestone scope, risks, acceptance

### In scope (same milestone, parallel tracks)

| Track | Deliverables |
| --- | --- |
| Shell | `vue-router`; mode toggle; locale before user; factory selector; optional stub global tools |
| Ops | Device tree; viewport tool strips; detail drawer; relocated plugin mounts |
| Admin | Side nav; card marketplace; installed/publish; users/roles, audit, and other admin pages **with** APIs |
| Theme | Configurable `--dt-accent-*`; presets + custom + contrast; persistence |
| ui-kit | New primitives listed in §2 |
| Docs | This design; implementation plan; update `docs/architecture/ui-kit-tokens.md` (and ADR if boundaries change) |

### Out of scope

- Full light theme  
- Mobile-specific layout  
- Multi-factory backend (selector UI ok; single-tenant data until ready)  
- Replacing the Three.js engine stack  

### Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Admin APIs slip | Ship nav + page shells early; per-module demo gates; incomplete modules fail release acceptance |
| Oversized PR | Branch `feat/ui-product-v4`; land ui-kit + shell before admin API packs |
| Accent harms readability | Mandatory contrast check; status colors independent of brand |
| Plugin slot move breaks hosts | Compatibility note / short deprecation window |

### Acceptance criteria

1. All roles land on ops; only admin can enter management.  
2. Top bar includes **language immediately before user**; locale switches apply immediately.  
3. User can change accent; preference survives reload; no hard-coded brand primary in components.  
4. Ops has tree / viewport tools / detail structure; marketplace is **not** the ops right rail.  
5. Admin app market is a card grid; users/audit (and agreed modules) complete primary paths against live APIs.  
6. Monorepo build and package boundaries (`ui-kit` ↛ engine/api) remain green.

## Implementation follow-up

1. Create feature branch / worktree `feat/ui-product-v4`.  
2. Write bite-sized implementation plan: `docs/plans/2026-07-14-ui-product-redesign.md`.  
3. Execute ui-kit → shell/router → ops → admin+API → accent settings → docs/ADR as needed.

## Related docs

- `docs/architecture/ui-kit-tokens.md`  
- `docs/architecture/workspace.md`  
- `docs/development/marketplace.md`  
- `docs/adr/0018-v3.5-i18n.md`  
- `AGENTS.md` (documentation discipline & boundaries)
