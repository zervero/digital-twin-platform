# ADR 0025 - Element Plus as shared control kit (via `@dt/ui-kit`)

## Status

Accepted (2026-11-11).

## Context

Document workbench and Admin chrome need ERP-grade controls (date
pickers, selects, dialogs, messages) beyond the small presentational
set in `@dt/ui-kit`. Editable grids already use **vxe-table** inside
`@dt/document-shell` (ADR 0024). Recreating every form control in
`ui-kit` is slow; DevExtreme remains rejected for licensing.

The product owner also wants Element Plus available **through
`ui-kit`**, not only inside the document island, so Admin and单据 can
share the same control vocabulary.

## Decision

1. **Allow `@dt/ui-kit` → `element-plus`.** Form / feedback / overlay
   controls may be implemented as `Dt*` wrappers that compose Element
   Plus internally.
2. **Public API stays `Dt*` first.** Callers should import from
   `@dt/ui-kit`. Raw `el-*` usage in apps is discouraged; if needed
   temporarily, it still must sit under the shared Element theme
   bridge (no second skin).
2a. **Element-backed `Dt*` wrappers preserve the underlying Element
   component API** — props, events/listeners, slots, and `expose`d
   methods. Product defaults (e.g. `value-format`, width class) may
   be applied but must remain overridable by the caller. Do not ship
   a narrowed prop surface as the public contract.
3. **Theme bridge maps Element CSS variables to `--dt-*`** (including
   light/dark from SPEC 0002). Do not ship a separate Element brand
   palette as the product skin.
4. **Grid engine remains vxe-table** for document list / line grids
   (ADR 0024). Do **not** adopt Element Plus Table as the单据 grid.
5. **`ui-kit` still must not depend on** `document-shell`, `vxe-table`,
   `engine-sdk`, or `api-client`.
6. Prefer **on-demand** component imports (no full
   `app.use(ElementPlus)` unless a follow-up ADR says otherwise).
7. **i18n**: do not global-`app.use(ElementPlus, { locale })`. Use
   `ElConfigProvider` (exported as `DtConfigProvider`) bound to the
   product locale from `@dt/i18n`, and set Day.js locale for date/time
   components (Element Plus i18n guide).

Behavior / first slice: **SPEC 0003**.

## Consequences

- `docs/architecture/workspace.md` records `ui-kit → element-plus`.
- Apps import `@dt/ui-kit/styles` (tokens) **and** the Element theme
  bridge stylesheet from ui-kit.
- Bundle size grows; mitigate with per-component imports.
- Visual parity with Element defaults is not a goal — `--dt-*` wins.
- Agents: wrap new Element controls as `Dt*` before exposing widely;
  do not add DevExtreme; do not replace vxe grids with `el-table`.
