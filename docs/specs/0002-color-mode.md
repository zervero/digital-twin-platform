# SPEC 0002 - Light / dark color mode

## Status

`accepted` (2026-11-11)

## Goal

Let users switch the product chrome between **light**, **dark**, and
**system** (follow OS preference). Preference persists with the existing
appearance settings (accent) so Admin / Ops / document island all share
one color mode.

## Non-goals

- Per-workspace or per-tenant themes.
- Separate accent palettes per mode (same accent vars; only surface /
  text / border / shadow tokens flip).
- Rewriting Three.js scene clear color / HDRI for light mode (viewport
  may stay dark-biased in V1).
- Blocking FOUC with an inline boot script (nice-to-have follow-up).
- Changing vxe enterprise skins; island already maps `--vxe-*` to
  `--dt-*`.

## Acceptance criteria

- [ ] `@dt/ui-kit` `tokens.css` defines a light theme by reassigning the
      same `--dt-*` surface/text/border/shadow variables under
      `[data-theme="light"]` (dark remains the `:root` default).
- [ ] Appearance store persists `colorMode: 'light' | 'dark' | 'system'`
      alongside accent under `dt.appearance.v1` without wiping either
      field when the other changes.
- [ ] Applying mode sets `document.documentElement.dataset.theme` to the
      **resolved** `light` or `dark`, and sets `color-scheme` accordingly.
- [ ] `system` tracks `prefers-color-scheme` and updates when OS preference
      changes (while still on `system`).
- [ ] Appearance settings UI offers Light / Dark / System controls.
- [ ] Boot path (`apps/web` appearance hydrate) applies color mode before
      mount together with accent.
- [ ] Default for new users remains **dark** (current shipped look).
- [ ] Unit tests cover persist/hydrate of `colorMode` and applying
      `data-theme` for light and dark.
- [ ] `docs/architecture/ui-kit-tokens.md` documents the color-mode
      contract.

## Affected packages / surfaces

| Area | Change |
| --- | --- |
| `@dt/ui-kit` | Light token block in `tokens.css` |
| `@dt/app-shell` | `applyTheme` / store / appearance form |
| `@dt/i18n` | Appearance copy for color mode |
| `apps/web` | Hydrate applies theme |
| `docs/architecture/ui-kit-tokens.md` | Contract update |
| `docs/specs/README.md` | Index |

## Boundaries

- No new package. Theme resolution stays in `app-shell`; tokens stay in
  `ui-kit`.
- Semantic status tokens may keep similar hues; do not invent a second
  accent system.
- Document island continues to consume `--dt-*` only.

## Related

- Tokens design: [ui-kit-tokens.md](../architecture/ui-kit-tokens.md)
- Appearance accent: existing V4 appearance dialog / `applyAccent`

## Notes

- Agents: do not hard-code hex in new chrome; use `--dt-*`.
- Accent contrast check remains against white primary-button labels
  (buttons still use `--dt-text-inverse` on accent fills).
