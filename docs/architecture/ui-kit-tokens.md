# @dt/ui-kit Design Tokens

## Status

Accepted. First introduced after the V1 closure as the minimal way to
keep the presentational layer theme-able without pulling in Tailwind or
any other CSS framework.

## Context

`@dt/ui-kit` is a small library of Vue SFCs that the web app, the
desktop Tauri shell, and any future V2 apps consume as raw `.vue`
files. In V1 the components hard-coded a GitHub-dark color palette
inline, which made:

- the visual language impossible to change without editing every
  component,
- it unclear which colors were "system" (used in multiple places) vs.
  local to one component,
- a future light theme a multi-file rewrite.

The question was how to introduce tokens with the minimum cost in
V1 — no new tooling, no new build step, no new dependency direction.

## Decision

Add a single CSS file at
[`packages/ui-kit/src/styles/tokens.css`](../../packages/ui-kit/src/styles/tokens.css)
that defines the visual language as CSS custom properties on `:root`,
and have the five components reference `var(--dt-*)` instead of
literal values. The tokens are consumed by importing
`@dt/ui-kit/styles` once at the application entry point.

### Token categories

| Group | Prefix | Examples |
| --- | --- | --- |
| Surfaces | `--dt-bg-*` | `base`, `elevated`, `surface`, `surface-hover`, `overlay` |
| Borders | `--dt-border-*` | `subtle`, `default`, `strong` |
| Text | `--dt-text-*` | `primary`, `secondary`, `muted`, `inverse` |
| Accents | `--dt-accent-*` | `primary`, `primary-hover`, `secondary`, `secondary-hover`, `danger`, `danger-hover` |
| Status | `--dt-status-*` | `online`, `offline`, `warning`, `alarm` (+ `-bg`, `-border`) |
| Spacing | `--dt-space-*` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` (4px grid) |
| Radii | `--dt-radius-*` | `sm`, `md`, `pill` (panels capped at 8px) |
| Typography | `--dt-text-{xs..2xl}`, `--dt-line-{tight,normal,relaxed}`, `--dt-weight-{regular,medium,semi}` |
| Font stacks | `--dt-font-ui`, `--dt-font-mono` | Inter + JetBrains Mono with system fallbacks |
| Shadows | `--dt-shadow-{sm,md,lg}` | low-opacity, used sparingly |
| Icons | `--dt-icon-{sm,md,lg,xl}` | 14 / 16 / 20 / 24 px |
| Motion | `--dt-ease-default`, `--dt-duration-{fast,base}` | shared timing tokens |

All names are namespaced with `--dt-` to avoid collisions with
app-level CSS variables. The current values are a single dark theme;
a future light theme is one extra `[data-theme="light"] { ... }`
block re-defining the same names.

### V4-prep token refresh (2026-07-09)

The token table above is the current shape. The V4-prep pass tightened
several groups without breaking the names:

- Surfaces moved to a warmer neutral stack (`#0F1115` base) so chrome
  reads as "tool" not "IDE"; the old cool greys were too close to
  GitHub dark palette and made `@dt/ui-kit` look like a clone.
- A new `--dt-accent-secondary` (teal) was added for realtime / live
  indicators so the primary blue can stay focused on actions.
- The radii scale was rebuilt around the AGENTS.md rule that panels
  cap at 8px: `--dt-radius-md` is now 8px, `--dt-radius-pill` is now
  999px (proper pill, not a softened rectangle).
- Typography gained a real type scale (`xs..2xl`), three line-height
  stops (`tight`, `normal`, `relaxed`) and three weights. The
  `--dt-font-ui` / `--dt-font-mono` stacks reference Inter and
  JetBrains Mono; **ui-kit does not bundle the fonts** — consumers
  that want the new type stack import `@fontsource/inter` and
  `@fontsource/jetbrains-mono` (apps/web does). Keeping the font out
  of the library keeps ui-kit embeddable in any typography.
- Added `--dt-shadow-*` and `--dt-icon-*` so component CSS does not
  invent ad-hoc sizes, and `--dt-ease-default` / `--dt-duration-*` so
  motion stays consistent across surfaces.

### Why CSS variables and not Tailwind / UnoCSS

Considered and rejected for V1:

- **Tailwind CSS**: requires a build plugin and (for a library
  consumed as raw SFCs) every consumer to set Tailwind up, or for
  the library to pre-compile a CSS bundle — both add friction the
  current zero-build library surface avoids.
- **UnoCSS**: lighter than Tailwind but the same consumer-coupling
  problem.
- **CSS-in-JS** (e.g. CSS Modules, vanilla-extract): adds a
  build-time dependency the rest of the repo does not need.

CSS custom properties are the lowest-overhead option: a single
file, no plugin, no new dependency direction, fully supported by
the existing Vite + Vue 3 setup.

## Consequences

- Changing a color is a one-line edit in `tokens.css`.
- Adding a light theme is one extra selector block; the components
  do not change.
- The token file is currently ~120 lines including comments. It will
  grow as V4 adds more components; if it exceeds ~200 lines, split
  by category (`tokens.colors.css`, `tokens.spacing.css`).
- A consumer that forgets to import `@dt/ui-kit/styles` will see
  the components render with no colors at all (CSS variables
  resolve to invalid/initial values). This is loud enough to catch
  immediately in development; we rely on the typecheck + smoke
  render to catch it.
- New typography / shadow / icon / motion tokens raise the
  "minimum viable consumer" cost slightly: apps that want the new
  look must also import `@fontsource/inter` and
  `@fontsource/jetbrains-mono`, or accept that the type stack will
  silently fall back to system-ui. The Inter fall-through is
  documented in `apps/web/src/main.ts`.

## Revisit when

- Components exceed ~15 (a 4x increase from V1) **and** the
  spacing scale becomes inconsistent — consider Tailwind or UnoCSS
  to enforce scale discipline.
- A second product (not web, not desktop) starts consuming
  `@dt/ui-kit` and needs its own theme.
- The design system gains more than color and spacing (motion,
  elevation, z-index) — at that point, split tokens into per-group
  files and document the system more formally.

## Consumer wiring

A consumer (e.g. `apps/web`) must declare `@dt/ui-kit` as a **direct**
dependency in its own `package.json`, not rely on it being pulled in
transitively. The reason is Vite's build (Rollup) and dev (esbuild)
resolvers handle nested `node_modules` symlinks differently:

- **Dev server** (esbuild) walks up `node_modules` and finds a
  transitive `@dt/ui-kit` symlinked under `@dt/app-shell/node_modules/`.
  The import resolves.
- **Build** (Rollup) does not walk up to a peer's `node_modules` for
  a `package.json` exports subpath. The same import fails with
  "Rollup failed to resolve import".

The fix is to make the dep explicit. This also documents the
dependency in the consumer's `package.json` rather than hiding it.

The `apps/web/package.json` `dependencies` block is the canonical
example.

## Cross-references

- Components: `packages/ui-kit/src/components/`
- Token source: `packages/ui-kit/src/styles/tokens.css`
- Workspace boundary: `docs/architecture/workspace.md`
- ADR 0006 (V1 closure): `docs/adr/0006-v1-closure.md`
