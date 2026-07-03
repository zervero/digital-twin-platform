# ADR 0004 - Pin Node.js to >= 22.17.1

## Status

Accepted (V1).

## Context

`package.json` originally declared `engines.node: ">=20"`, following the
V1 stack of pnpm 11 + Turborepo + Hono + Vite 5. The expectation was
that any active Node LTS line (20.x or 22.x) would work.

In practice, on a fresh clone with Node **20.19.0** (the latest Node 20
active LTS as of 2025-11), `pnpm install` fails. The failure surfaces
inside pnpm's life-cycle scripts and `tsx watch` startup path; the
exact stack trace points at incompatibilities between Node 20.19's
V8 microtask scheduling and the pnpm 11.7 store linker's `worker_threads`
barrier, which is fixed only on Node >= 22.17.1.

We do not have a fix landing in Node 20.x, and pinning 20.x to a working
minor is fragile. The user verified that **Node 22.17.1** runs the
install, typecheck, test, build, and dev loops cleanly end to end.

## Decision

- `engines.node` in the root `package.json` becomes `">=22.17.1"`.
- CI pins `actions/setup-node` to `22.17.1`.
- The repo ships a `.nvmrc` set to `22.17.1` for `nvm` / `fnm` /
  `volta` auto-switching.
- `corepack enable` continues to pin pnpm to 11.7.0.

Anyone on Node 20.x must upgrade. We will revisit this ADR when:

- pnpm 11 ships a fix that backports to Node 20.x, **or**
- Node 22.x reaches EOL and a newer LTS is verified end to end.

## Consequences

- One less moving part on contributor machines: the Node version that
  works locally matches the Node version that runs in CI, and matches
  the version documented in `local-dev.md` and both READMEs.
- The `engines` floor is now an Active-LTS-line floor, not a wide
  `>=20` range. Slightly more restrictive, but the old floor did not
  work, so it was a false floor.
- Future Node major upgrades (24, 26) will continue to work as long as
  they are >= 22.17.1. The bound is intentionally a single floor, not
  a `^22` range, so the documentation can stay concrete.

## Notes

- `@types/node` in `apps/bff` and `packages/config` stays at
  `^22.10.0`. That is type-only and does not constrain runtime.
- Tauri desktop builds need a separate Rust toolchain; this ADR does
  not touch that.
