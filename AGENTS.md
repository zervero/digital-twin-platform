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

## 5. Adding a new GitHub Action

Workflow files are not the whole story. GitHub Actions has repo-level
and runner-level concerns the YAML cannot see. Run this checklist
**before** writing the workflow file, because the fix for some items
lives in GitHub's UI, not in the repo:

- [ ] **Repo-level settings** (Settings → Actions → General):
  - [ ] "Allow GitHub Actions to create and approve pull requests"
        is ON if the action opens or approves PRs. This is OFF by
        default for new repos and is independent of the workflow's
        `permissions:` block. The first time a release-please or
        dependency-bot style action fails with "GitHub Actions is
        not permitted to create or approve pull requests", this is
        why.
  - [ ] "Workflow permissions" is set to "Read and write" if the
        action needs more than read access to `GITHUB_TOKEN`.
- [ ] **Action version**: pin to a major tag (`@v5`) unless there is
      a specific reason not to. Check the action's recent releases
      for Node runtime deprecation warnings - GitHub-hosted runners
      are deprecating Node 20 in 2025, and `@vN` series older than
      the cut-off emit warnings on every run. When bumping, scan
      the whole workflow file for all `@vN` references and update
      them together, not per-warning, so a second cleanup commit
      is not needed.
- [ ] **Permission scope**: grant only what the action needs. Start
      with the minimum scope, add `pull-requests: write` only if
      the action opens PRs, `id-token: write` only for OIDC. Comment
      each non-obvious grant inline so future readers know why it
      is there.
- [ ] **Action-specific config files**: many actions need a
      companion file in the repo before they will run. Examples
      that bit us in V1: `release-please` v17+ requires
      `.release-please-manifest.json`; `pnpm/action-setup` reads the
      version from `packageManager` in `package.json` (and barfs if
      the workflow YAML also specifies a different version). Read
      the action's "Getting started" docs, do not just copy an
      example.
- [ ] **Concurrency and timeout**: for long or repeating workflows,
      set `concurrency:` to cancel in-progress runs on the same ref,
      and `timeout-minutes` so a hung action does not eat minutes.
- [ ] **First-run verification**: after the workflow lands, read
      the full log of the first run, not just the green/red status.
      A green run with a deprecation warning or a "Multiple versions
      of X specified" error is a future failure, not a clean bill
      of health.
- [ ] **Documentation**: if the action is contributor-facing (CI,
      releases, dependency updates), update
      `docs/development/contributing.md` with the new command, the
      expected PR cadence, and any bypass rules. For a new class of
      automation, write an ADR explaining why this tool over the
      alternatives.

## 6. What this file is not

- Not a style guide (Prettier + ESLint handle that).
- Not a tutorial (see `docs/architecture/` and `README.md`).
- Not a status report (see `CHANGELOG.md` and the commit log).

If a rule here conflicts with `contributing.md`, the older one wins until
both are reconciled. The two should not drift apart for long.
