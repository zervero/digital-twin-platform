# ADR 0001 - Monorepo with pnpm + Turborepo

## Status

Accepted (V1).

## Context

We need to ship a Web app, a Tauri desktop app, and a BFF service that all
share the same TypeScript types and Vue components. We also need to grow
into a multi-package platform (engine SDK, domain packages, V2/V3
boundaries) without restructuring every time.

## Decision

Use a pnpm workspace with three groups:

- `apps/*` - runnable products.
- `packages/*` - shared libraries.
- `tooling/*` - dev tooling presets.

Use Turborepo for task pipelines (`dev`, `build`, `test`, `lint`,
`typecheck`).

## Consequences

- Single repo, single `pnpm install`, single PR for cross-cutting changes.
- Package boundaries are visible in the directory tree and enforced by
  dependency review (and, later, by a tooling check).
- Turborepo's caching speeds up CI once we have a real test suite.
- We accept the cost of managing workspace versions and dev-only tooling
  presets in `tooling/`.
