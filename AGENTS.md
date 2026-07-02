# Agent Operating Rules

> Persistent rulebook for AI agents (and humans) working in this repo.
> Read this at the start of every session before making changes.

## 1. Documentation discipline (hard rule)

**Every change must be documented.** The size of the change does not matter;
even a one-line fix is a change.

Where the documentation goes, in order of preference:

| Change type | Document it in |
| --- | --- |
| Any code/config change | Conventional Commits message (the commit IS the log) |
| New package or moved boundary | `docs/architecture/workspace.md` |
| New architecture decision | New ADR under `docs/adr/NNNN-<slug>.md` |
| Engine SDK public API change | `docs/architecture/engine-sdk.md` |
| Dev workflow change | `docs/development/contributing.md` |
| User-facing change worth announcing | `CHANGELOG.md` (release-please auto-fills; only edit if release-please is disabled) |
| Dev-loop / quickstart change | `README.md` and `README.zh-CN.md` |

If none of the above fits, write a one-paragraph note in the commit body.
**"Self-evident" is not an excuse.** The next person to look at the diff
in six months does not have your context.

## 2. Before any edit

1. Identify which docs above are affected. Update them **first** if the
   change crosses a boundary (new package, new dep direction, new env var,
   new public API).
2. Then make the code change.
3. Then make the commit, using a Conventional Commits message that
   describes the **why**, not just the **what**.

## 3. Boundaries to respect

These are enforced socially in V1 and by tooling in V2. Violations are a
reason to block a PR.

- `packages/contracts/` may not import any other local package.
- `packages/ui-kit/` may not import `engine-sdk`, `api-client`, or any
  domain package.
- Domain packages may not import `vue` or `three`.
- `engine-sdk` may not import `vue`, `pinia`, or `api-client`.
- BFF may not import anything from `apps/` or any UI-side package.

See `docs/architecture/workspace.md` for the full graph and the rationale.

## 4. After any edit

Before reporting back, run this checklist mentally:

- [ ] If the change adds a new dependency: it's in the right package's
      `dependencies` (runtime) or `devDependencies` (build-time only).
- [ ] If the change touches `packages/contracts/`: a corresponding
      `docs/architecture/engine-sdk.md` or `workspace.md` update exists
      (or an ADR was written).
- [ ] If the change affects how a developer runs the project: README and
      `docs/development/local-dev.md` are still accurate.
- [ ] If the change is a workflow/process change: `contributing.md` is
      still accurate.
- [ ] Commit message uses a Conventional Commits type and a scoped
      subject under 72 chars.

## 5. What this file is not

- Not a style guide (Prettier + ESLint handle that).
- Not a tutorial (see `docs/architecture/` and `README.md`).
- Not a status report (see `CHANGELOG.md` and the commit log).

If a rule here conflicts with `contributing.md`, the older one wins until
both are reconciled. The two should not drift apart for long.
