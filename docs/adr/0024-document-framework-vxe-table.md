# ADR 0024 - Configurable document workbench (vxe-table, not DevExtreme)

## Status

Accepted (2026-11-10).

## Context

We need a **reusable document (单据) workbench**: list query, create,
and a single page that serves as both detail and edit. Many document
types will follow; the first reference UX is 企联网「母猪死亡」
(`sow-death` list + `/detail` with master header + editable lines).

Reference stack is Angular + DevExtreme. This monorepo is Vue 3 +
`@dt/ui-kit` for the digital-twin shell. Options considered:

1. **DevExtreme Vue** — closest grid/tooling parity to the reference,
   but commercial per-seat licensing; v23.2+ enforces license keys.
   Downgrading below 23.2 does **not** remove the EULA obligation for
   commercial use.
2. **Grow `@dt/ui-kit` into a full editable grid** — keeps one design
   system, but recreating ERP-grade editable grids is multi-quarter
   work and distracts from twin chrome.
3. **vxe-table (Vue 3 / v4, MIT)** — configuration-driven editable
   tables, toolbar, pager, validation, virtual scroll; common in
   domestic ERP-style UIs. Core table is MIT; some Excel-like / chart
   extras are enterprise-only and are **out of V1 scope**.

We also need the **configuration** (columns, filters, header fields,
line fields, actions, audit states) to live outside any one UI library
so additional document types are data/schema, not forked pages.

## Decision

1. Build a **schema-driven document workbench**, not one-off pages per
   document type.
2. **Table / editable grid engine = `vxe-table` (Vue 3 v4 line).** Do
   **not** introduce DevExtreme for this workbench.
3. Package split:
   - **`@dt/document-schema`** — pure TypeScript: document type id,
     list filters/columns, header fields, line fields, validators,
     toolbar actions, audit/status rules. No Vue, no vxe-table.
   - **`@dt/document-shell`** — Vue runtime: list page + unified
     detail/edit page; renders via vxe-table + `@dt/ui-kit` for
     non-grid chrome (buttons, dialogs, layout). Depends on
     `document-schema`, `ui-kit`, `vxe-table` (and companion UI bits
     only as needed).
   - Concrete documents (e.g. sow-death) ship as **schema + API
     adapters**, not new page trees.
4. **`@dt/ui-kit` must not depend on vxe-table.** Twin Ops/Admin chrome
   stays free of the grid stack. Document routes mount under a
   dedicated island (e.g. admin or `/documents/*`) so vxe CSS/theme
   scoping does not leak into the 3D shell.
5. Theme: map workbench accents to existing `--dt-*` tokens where
   practical; do not adopt a second global brand skin.
6. Licensing posture: rely on vxe-table MIT core. Do not take a hard
   dependency on vxe **enterprise** features in V1 (cell range select,
   Excel-grade copy/paste, built-in charts, etc.). If those become
   required later, open a new ADR.

Behavior contract for the workbench itself: **SPEC 0001**.

## Consequences

- `docs/architecture/workspace.md` must gain the new packages and
  edges when they are added (`document-shell` → `document-schema`,
  `ui-kit`, `vxe-table`; apps → `document-shell`).
- BFF / contracts grow document list/detail/command APIs per type (or
  a generic document API later); schema stays UI-agnostic so the same
  definitions can drive tests and future hosts.
- Visual parity with 企联网 will be approximate (vxe ≠ DevExtreme),
  which is accepted in exchange for MIT licensing and Vue-native APIs.
- Agents implementing features must read SPEC 0001 (once accepted) and
  must not add DevExtreme without superseding this ADR.
