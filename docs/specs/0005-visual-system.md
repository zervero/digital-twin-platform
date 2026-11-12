# SPEC 0005 - Visual system refresh

## Status

`accepted` (2026-11-12)

## Goal

Raise the perceived quality of the product chrome, `@dt/ui-kit`, and
document workbench so they share one current operations-console
language: 8px spacing, readable type, visible focus, and form controls
that are not raw browser widgets.

## Non-goals

- Replacing vxe-table or Element Plus.
- A marketing landing page.
- Changing information architecture or routes.
- Bundling a new webfont (keep Inter / JetBrains Mono).

## Acceptance criteria

- [ ] Tokens use an 8px spacing rhythm, a 14px body size, a 36px
      control height, and a shared focus ring.
- [ ] `DtButton`, `DtSideNav`, and `DtDialog` show hover, pressed, and
      keyboard focus without layout shift. Dialog close uses an icon.
- [ ] Side-nav selection is a tinted row, not a solid accent block.
- [ ] `DtTextField`, `DtSelect`, and `DtButton` are Element Plus
      controls, so focus and height match `DtDatePicker`. Document
      filters and detail fields use them.
- [ ] Document list pager uses `DtSelect` and `DtButton`, not native
      `<select>` / `<button>`.
- [ ] `DtDatePicker` uses `--dt-control-height` (Element default 32px
      does not).
- [ ] Light and dark keep using the same token names.

## Affected packages / surfaces

| Area | Change |
| --- | --- |
| `@dt/ui-kit` | Tokens, button / nav / dialog, text field, select |
| `@dt/document-shell` | Filters and detail fields use the new controls |
| `docs/architecture/ui-kit-tokens.md` | Rhythm note |

## Related

- SPEC 0002 (color mode)
- SPEC 0003 (Element controls)
- ui-ux-pro-max: operations dashboard, high contrast, scannable density
