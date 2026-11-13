# SPEC 0001 - Configurable document workbench

## Status

`accepted` (2026-11-10) — implementation in progress on `main-table`

<!-- Mark `implemented` when AC are green on main. -->

## Goal

Deliver a **reusable, schema-driven document workbench** so product can
add many单据 types without cloning list/detail pages. Operators and
admins can: query a list, create a document, open **one** page that is
both detail and edit (master header + editable lines), save/discard
dirty state, and run common toolbar actions (delete / audit where
configured).

First consumer (follow-up spec or same delivery slice): a sow-death–
shaped demo type that proves the schema path end-to-end. This SPEC
owns the **framework**, not every livestock field forever.

## Non-goals

- Pixel-perfect clone of 企联网 / DevExtreme look-and-feel.
- Introducing DevExtreme (see ADR 0024).
- vxe-table **enterprise**-only features (cell range, Excel paste,
  embedded charts, etc.).
- Replacing Ops 3D viewport or `@dt/ui-kit` twin chrome.
- A universal multi-tenant document store in V1 (per-type BFF adapters
  are enough for the first slice).
- Offline / mobile-native document clients.

## Acceptance criteria

### Schema & packages

- [ ] `@dt/document-schema` exists: types for document definition
      (id, title, list filters/columns, header fields, line fields,
      field editors, validation rules, toolbar actions, status/audit
      flags). No Vue / vxe imports.
- [ ] `@dt/document-shell` exists: Vue list + unified detail/edit
      runtime driven only by a document definition + data ports
      (loadList / loadOne / create / update / remove / audit hooks).
- [ ] At least one **fixture definition** (demo or sow-death-shaped)
      registers and renders without forking shell components.
- [ ] `docs/architecture/workspace.md` documents the new packages and
      allowed dependency edges.

### List page

- [ ] Renders filters from schema (date range, text, select at minimum).
- [ ] Query / reset reload the grid via the list port.
- [ ] vxe-table grid shows schema columns; supports selection,
      pagination, and row actions configured in schema (e.g. edit,
      delete).
- [ ] Toolbar actions from schema: create; bulk delete / audit only
      when selected rows and schema allow them.
- [ ] Opening **edit** navigates to the unified detail route with the
      document id (or equivalent key).

### Unified detail / edit page

- [ ] Same route/component for create and edit; mode distinguished by
      presence of id (create has no persisted id / placeholder doc no.).
- [ ] Header fields from schema (required markers honored).
- [ ] Line grid from schema: add/remove rows; required line columns
      validated before save.
- [ ] Toolbar: save and discard (撤销) **disabled until dirty**;
      enabled after user edits; discard restores last loaded snapshot.
- [ ] Delete / audit available when schema + document status allow
      (create mode: delete disabled or hidden as configured).
- [ ] Optional remark field and attachment slot **hook** (attachment
      storage may be stubbed in V1 if port returns empty).

### Hosting & theme

- [ ] Workbench mounted under a dedicated route island (not inside the
      3D ops canvas).
- [ ] vxe styles scoped to that island; Ops/Admin twin chrome does not
      globally inherit vxe theme.
- [ ] Primary accents prefer `--dt-*` tokens where practical.

### Quality bar

- [ ] Unit tests for schema parsing/validation helpers and dirty-state
      helpers; at least one shell smoke test (list renders fixture;
      detail toggles dirty → save enabled).
- [ ] No `devextreme` / `devextreme-vue` dependency in the workspace
      lockfile for this feature.

## Affected packages / surfaces

| Area | Change |
| --- | --- |
| `@dt/document-schema` | **New** — pure schema types + helpers |
| `@dt/document-shell` | **New** — list + detail/edit Vue runtime (vxe-table) |
| `@dt/ui-kit` | Consume only; no vxe dependency |
| `@dt/app-shell` / `apps/web` | Route island + bootstrap registration |
| `apps/bff` + `@dt/contracts` | Ports for first document type (may land in same or follow-up PR) |
| `docs/architecture/workspace.md` | New edges |
| ADR 0024 | Architecture decision (accepted) |

## Boundaries

- `document-schema` → no Vue, no vxe, no `api-client`.
- `document-shell` → may use Vue, vxe-table, ui-kit, document-schema;
  must not import `engine-sdk` or Three.js.
- `ui-kit` → must not import `document-shell` or vxe-table.
- BFF remains free of Vue / vxe.

See [ADR 0024](../adr/0024-document-framework-vxe-table.md).

## Related

- ADR: [0024-document-framework-vxe-table](../adr/0024-document-framework-vxe-table.md)
- ADR: [0023-lightweight-sdd](../adr/0023-lightweight-sdd.md)
- Reference UX (external): 企联网 `sow-death` list + `/sow-death/detail`
  (`$open=0` edit, `$open=1` create)

## Notes

### List column floating filters

List grids may expose a header **floating filter row** (toolbar funnel
toggle). That toggle **only shows or hides** the floating row; it must not
clear per-column filter values or remove client-side filter logic while hidden.
Per-column control is declared on `ColumnDefinition.listFilter`
in `document-modules` (`editor`: `text` | `select` | `date` |
`dateRange` | `dateTimeRange`, plus `options` for select). `document-shell`
maps editors to vxe floating filters and applies **current-page** client
matching only (independent of top `list.filters` query bar). Floating-filter
UI is **not** vxe form controls: shell registers `DtList*` vxe renderers that
mount `@dt/ui-kit` via `DtListColumnFilter`. **Text** and **number** columns use
the operator menu (text default **contains**; number: = ≠ &lt; &gt; ≤ ≥).
Date, datetime range, and select columns show only the value control; clear
via control `clearable`. **Clear this column** in the menu applies to
text/number only.

### Suggested schema sketch (non-normative)

```ts
type DocumentDefinition = {
  id: string
  title: string
  list: { filters: Field[]; columns: Column[]; rowActions: Action[]; toolbar: Action[] }
  detail: {
    header: Field[]
    lines: { columns: Column[]; minRows?: number }
    footer?: { remark?: boolean; attachments?: boolean }
    toolbar: Action[]
  }
  status?: { supportsAudit?: boolean }
}
```

### AI-agent constraints

- Implement against this SPEC only after status is `accepted`.
- Do not add DevExtreme to satisfy grid parity.
- Prefer extending the schema over one-off `if (docType === …)` in shell.
- First vertical slice may mock BFF ports; mark deferred AC explicitly
  in the PR if API is out of scope for that PR.
