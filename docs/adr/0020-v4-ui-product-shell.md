# ADR 0020 - V4 UI product shell (ops/admin + accent)

## Status

Accepted (V4 product-shell milestone on `feat/ui-product-v4`).

> Numbering note: the implementation plan draft named this document
> `0019-v4-ui-product-shell.md`, but ADR 0019 was already claimed by
> the V3.5 closure. This decision is therefore ADR 0020.

## Context

After V3.5 (i18n + CORS unblocker), the shipped shell was still a
single three-column layout: device list | 3D viewport | marketplace.
That layout is fine as a technical demo and weak as a product:

- Marketplace competes with the twin stage on the primary surface.
- Operators and admins share one crowded chrome.
- Brand accent is a fixed steel-blue token; sites cannot match
  tenant branding without forking `tokens.css`.

Design review locked a product-level redesign:
[`docs/plans/2026-07-14-ui-product-redesign-design.md`](../plans/2026-07-14-ui-product-redesign-design.md).
This ADR records the non-obvious architecture choices that the
implementation plan executes against.

## Decision

### 1. Vue Router hosts ops and admin workspaces

Introduce `vue-router` inside `@dt/app-shell` (`createAppRouter`).
`AppShell` is toolbar + `RouterView` only.

| Route | Audience | Role |
| --- | --- | --- |
| `/` → `/ops` | All roles | Default landing after login (and for anonymous demo) |
| `/ops` | All roles | Device tree + full-bleed stage + context drawer |
| `/admin/*` | `admin` role only (`meta.requiresAdmin`) | Side nav + admin pages |
| `/settings/appearance` | All roles | Deep link: opens appearance **dialog**, then replaces to `/ops` |
| `/admin/appearance` | admin | Deep link: opens appearance **dialog**, then replaces to marketplace |

Non-admin navigation to `/admin/*` redirects to `/ops`. Admin mode
in the top toolbar is hidden for non-admin roles. Last visited
`/admin/*` child is restored when switching back to admin mode.

### Appearance UI is a shared dialog (amendment)

Initial T10 shipped `/settings/appearance` as a full page. Product
follow-up moved it into a modal so accent changes do not leave the
current workspace:

- Presentational shell: `@dt/ui-kit` `DtDialog`.
- Form + dialog chrome: `AppearanceSettingsForm` /
  `AppearanceSettingsDialog` in `@dt/app-shell` (mounted on
  `AppShell`).
- **Entries (both open the same dialog):**
  1. Admin left nav 「外观」/ Appearance — stays visible; click
     opens dialog without changing the current `/admin/*` page.
  2. Top toolbar appearance control — available to **anonymous**
     and all authenticated roles (viewer / operator / admin).
- Open/close state lives on `useAppearanceStore().dialogOpen`
  (`openDialog` / `closeDialog`).
- Deep links above remain supported for bookmarks and tests.
- Sign-in also uses a `DtDialog` (mock email form or OIDC CTA);
  the toolbar trigger is an outlined pill button rather than an
  inline-expanding form.

### 2. Ops / admin mode split (Scheme 2)

Persistent top-bar segmented control: **Ops | Admin**. Everyone
defaults to ops. Locale control sits immediately before the user
control. Marketplace lives under `/admin/marketplace`, not on the
ops right rail.

Admin side nav ships only modules with real or honestly mocked BFF
(or session-honest pages such as `/admin/tenant`). Incomplete
modules are removed from the nav rather than left as “建设中”
stubs for release acceptance.

### 3. Brand accent is a user preference, not a ui-kit fork

- Defaults remain in `@dt/ui-kit` `tokens.css`.
- Runtime override writes `--dt-accent-primary` /
  `--dt-accent-primary-hover` on `:root` via `applyAccent`.
- Preference persists in `localStorage` (`dt.appearance.v1`);
  account/tenant sync is a later follow-up.
- Custom hex must pass WCAG AA (≥4.5:1) against white primary-
  button labels; semantic `--dt-status-*` colors are never
  rewritten.
- New ui-kit interactive components must read accent tokens, not
  hard-coded brand hexes. ui-kit still must not import
  `api-client` or `engine-sdk`.

### 4. Admin APIs stay on the contracts → api-client → BFF path

Users/roles and audit land as typed contracts and BFF routes in
the same milestone as the admin pages. Presentational ui-kit
pieces (`DtAppCard`, `DtSideNav`, …) stay agnostic of those APIs;
composables in app-shell own the client calls.

## Consequences

- Apps (web/desktop) must install the app-shell router; deep links
  to `/ops` and `/admin/*` become first-class.
- Package boundary docs (`workspace.md`) document the
  vue-router ownership and admin page ownership.
- Accent theming is documented in
  [`docs/architecture/ui-kit-tokens.md`](../architecture/ui-kit-tokens.md)
  under “Accent override contract (V4)”.
- Release acceptance fails if unfinished admin modules still appear
  in the side nav with under-construction copy.

## Revisit when

- A multi-factory selector needs server-side tenant settings (move
  accent / factory preference off localStorage).
- Admin modules (org, assets, models, alarms, overview KPIs) gain
  honest BFF surfaces and re-enter the side nav.
- A second product shell consumes ui-kit without app-shell (then
  extract `applyAccent` to a shared theme helper).

## Cross-references

- Design: `docs/plans/2026-07-14-ui-product-redesign-design.md`
- Plan: `docs/plans/2026-07-14-ui-product-redesign.md`
- Tokens: `docs/architecture/ui-kit-tokens.md`
- Workspace graph: `docs/architecture/workspace.md`
- Prior i18n chrome order: ADR 0018 / ADR 0019 (V3.5)
