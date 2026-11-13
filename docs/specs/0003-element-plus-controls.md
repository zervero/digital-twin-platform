# SPEC 0003 - Element Plus controls via `@dt/ui-kit`

## Status

`accepted` (2026-11-11)

## Goal

Introduce **Element Plus** as the shared implementation kit for complex
form / overlay controls, exposed primarily as **`Dt*` wrappers** from
`@dt/ui-kit`, themed with `--dt-*` (including light/dark). First slice:
`DtDatePicker`, usable from document shell and Admin chrome.

## Non-goals

- Replacing vxe-table grids with Element Table (ADR 0024 / 0025).
- Full `app.use(ElementPlus)` global registration in V1 of this spec.
- Pixel-perfect Element default theme; `--dt-*` wins.
- Replacing navigation chrome (side nav, tabs, trees, segmented
  controls) or `<input type="color">` swatches with Element.
- Replacing document grids (still vxe-table).
- DevExtreme.

## Acceptance criteria

- [ ] ADR 0025 accepted; `workspace.md` allows `ui-kit → element-plus`
      and still forbids `ui-kit → vxe-table` / `document-shell`.
- [ ] `element-plus` is a dependency of `@dt/ui-kit` (not of `ui-kit`
      consumers as a required direct dep for `DtDatePicker`).
- [ ] Element theme bridge CSS maps core Element variables to `--dt-*`
      and is loaded with ui-kit styles.
- [ ] `DtDatePicker` wraps `ElDatePicker` and **forwards the full
      Element API** (props, events, slots, expose). Product defaults:
      `value-format="YYYY-MM-DD"` when unset, `dt-date-picker` width
      class — both overridable.
- [ ] Unit smoke test: picker mounts and updates `modelValue`.
- [ ] Document list filter date / dateRange fields use `DtDatePicker`
      instead of native `<input type="date">`.
- [ ] `DtConfigProvider` forwards full `ElConfigProvider` API; app
      shell maps `@dt/i18n` → Element `Language` via `elementLocaleOf`
      and Day.js stays in sync (Element Plus i18n guide).
- [ ] Agents: new Element-backed `Dt*` controls must passthrough
      props / events / slots / expose (ADR 0025 §2a).
- [ ] Docs: ui-kit tokens / workspace note the Element bridge.

## Affected packages / surfaces

| Area | Change |
| --- | --- |
| `@dt/ui-kit` | `element-plus` dep, `@vueuse/shared` (Select types), bridge CSS, `Dt*` form controls |
| `@dt/document-shell` | Filter bar uses `DtDatePicker` |
| `apps/web` | Styles import picks up bridge |
| `docs/architecture/workspace.md` | Edge update |
| ADR 0025 | Architecture decision |

## Boundaries

- See [ADR 0025](../adr/0025-element-plus-in-ui-kit.md).
- `document-schema` remains free of Vue / Element / vxe.

## Related

- ADR 0024 (vxe document grid)
- ADR 0025 (Element in ui-kit)
- SPEC 0002 (color mode)

## Notes

- Agents: form controls (input, textarea, select, date, button)
  are Element Plus via `Dt*` wrappers so focus, hover, and height
  match. Do not add new native `<input>` / `<select>` / `<textarea>`
  for data entry. Navigation chrome (side nav, tabs, trees) stays
  custom. Preserve the Element component’s props, events, slots, and
  expose API (defaults may be set, not locked).
- `DtDateRangePicker` wraps `ElDatePicker` `daterange` /
  `datetimerange` (grid column filters, future top-bar range fields).
