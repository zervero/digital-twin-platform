# App-shell atomic utilities (`dt-*`)

## Status

Accepted for `@dt/app-shell` layout/chrome (2026-07-22). Inspired by
UnoCSS / Tailwind utility style, **without** adding UnoCSS or Tailwind.

## Decision

Ship a curated global stylesheet:

[`packages/app-shell/src/styles/utilities.css`](../../packages/app-shell/src/styles/utilities.css)

- Class names are always prefixed **`dt-`** (avoids collisions).
- Values reference `@dt/ui-kit` **`--dt-*` tokens only**.
- Imported once from `AppShell.vue` so all shell pages/components see them.
- TypeScript: `src/css-modules.d.ts` declares `*.css` (vue-lib tsconfig
  does not include `vite/client`).

## When to use

| Use `dt-*` utilities | Keep scoped CSS |
| --- | --- |
| Flex layout, gap, padding, truncate | Gradients, keyframes |
| Text size / color / weight | Complex `:deep()` component overrides |
| Standard control height (`dt-h-control`) | Optical absolute centering quirks |
| Borders / radii / surfaces | One-off selectors (`.locale__opt.is-active`) |

Prefer **ui-kit components** (`DtButton`, `DtPanel`, …) for interactive
primitives; utilities compose *around* them, they do not replace them.

## Do not

- Put these utilities inside `@dt/ui-kit` (design system stays token + SFC).
- Invent one-off colors in utilities — extend `tokens.css` first if needed.
- Grow an unbounded class zoo; add a utility only when ≥2 call sites need it.

## Example

```html
<div class="dt-inline-flex dt-items-center dt-gap-md dt-h-control">
  <span class="dt-text-sm dt-text-secondary dt-truncate">acme-corp</span>
</div>
```

## Scope in `@dt/app-shell`

Shell workspaces, admin pages, and chrome components compose layout with
`dt-*` classes. Scoped CSS remains for grids with fixed tracks, hover/focus
variants, `:deep()` overrides, and one-off chrome (backdrop blur, accent
swatches, optical centering).
