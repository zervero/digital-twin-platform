# Contributing

How to land changes in this repo. Targeted at the **V1** setup: a single
human reviewer (you) plus your AI tooling. The workflow is designed so
that adding more reviewers later is a config change, not a rewrite.

## Branches

- `main` is the only long-lived branch. It is **protected** (see below).
- All work happens on short-lived feature branches:
  - `feat/<scope>-<short-desc>` — new feature
  - `fix/<scope>-<short-desc>` — bug fix
  - `refactor/<scope>-<short-desc>` — no behavior change
  - `docs/<short-desc>` — docs only
  - `chore/<short-desc>` — tooling, deps, CI
  - `test/<scope>-<short-desc>` — tests only
- `<scope>` is the affected package (e.g. `engine-sdk`, `bff`, `ui-kit`)
  when the change is scoped to one. Omit it for cross-cutting work.
- After a merge, delete the branch. Long-lived feature branches rot.

### Example branch names

```
feat/engine-sdk-pick-node
fix/bff-commands-validation
chore/deps-bump-vue
docs/adr-0004-release-flow
```

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/).
The `commitlint` lefthook will reject any commit that doesn't comply.

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type allowlist

`feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`,
`style`, `revert`.

### Subject rules

- Imperative mood ("add", not "added" / "adds")
- No trailing period
- Lowercase type
- Subject ≤ 72 characters
- Reference the affected package in `<scope>` when applicable

### Examples

```
feat(engine-sdk): add pickNode raycaster and selection highlight
fix(bff): return 400 on unknown command type instead of 500
chore(deps): bump vue to 3.5.13
docs(adr): record the 4th architecture decision
```

### Co-authored commits

When an AI agent contributes a meaningful part of a commit, credit it via
`Co-authored-by:` trailer so the trail is greppable:

```
feat(engine-sdk): add pickNode

Co-authored-by: dev-agent <noreply@local>
```

The `author` is always you. The agent is not a separate committer and does
not have a GPG key in this V1 setup.

## Pull requests

1. Push your feature branch and open a PR into `main`.
2. The PR title becomes the squash-merge commit subject, so write it in
   Conventional Commits format. The bot won't fix this for you.
3. CI must be green:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
4. Self-review using the [PR checklist](#pr-checklist) below.
5. Merge with **squash**. The squashed commit is what ends up in `main`
   and feeds release-please.

### PR checklist

Before you hit merge, run through this:

- [ ] `pnpm typecheck` is green locally
- [ ] `pnpm test` is green locally and you added tests for new behavior
- [ ] No new lint warnings (run `pnpm lint:fix` to auto-fix)
- [ ] No secrets, debug prints, or commented-out code in the diff
- [ ] If you touched `packages/contracts/`, you bumped the version or
      justified why not (any contract change is a `feat` or `fix` for
      consumers)
- [ ] If you added a dependency, you put it in the right package's
      `dependencies` (runtime) or `devDependencies` (build-time only)
- [ ] If you changed a package boundary, you updated
      `docs/architecture/workspace.md`
- [ ] If you made an architectural decision, you wrote an ADR under
      `docs/adr/`

## Branch protection on `main`

Apply these settings on GitHub (Settings → Branches → Branch protection
rules → `main`):

- [x] Require a pull request before merging
- [x] Require approvals: **1** (V1 — just you)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - Required check: `verify` (the single CI job)
- [x] Require linear history (squash or rebase; no merge commits)
- [ ] Include administrators — **off in V1** so you can hot-fix yourself
      without a PR. Turn this on in V2.
- [x] Do not allow force pushes
- [x] Do not allow deletions

## Releases

Releases are automated by [release-please](https://github.com/googleapis/release-please):

- Every push to `main` triggers release-please.
- It scans commits since the last release, computes the next semver
  (`feat` → minor, `fix` → patch, `BREAKING CHANGE:` → major), updates
  the root `package.json`, regenerates `CHANGELOG.md`, and opens a
  release PR.
- Review the release PR. If the version bump and changelog look right,
  merge it. That merge creates the git tag and GitHub release.

V1 ships at `0.1.0`. The first release PR will appear automatically after
the first `feat` lands on `main`.

## Local hooks

`lefthook` is installed automatically on `pnpm install` (via the
`prepare` script). The hooks that fire:

- **commit-msg**: runs `commitlint`. A non-conforming message rejects the
  commit. The hook skips during rebase so rewriting history is quiet.
- **pre-push**: runs `pnpm typecheck` in parallel. This is a quick local
  guard for the touched package(s); full typecheck is in CI.

To bypass a hook in an emergency:

```bash
git commit --no-verify -m "fix: ..."
git push --no-verify
```

Use sparingly and document it in the PR description.

## Documentation discipline

Every change is documented. The change itself does the work; the doc keeps
the next person from having to guess.

For each change, ask: **what doc captures this, and is it still right
after I'm done?**

| Change | Update |
| --- | --- |
| New package or moved boundary | `docs/architecture/workspace.md` |
| New public API in `@dt/engine-sdk` | `docs/architecture/engine-sdk.md` |
| New architecture decision | New ADR under `docs/adr/` |
| New env var, new script, new dev step | `README.md` + `docs/development/local-dev.md` |
| Process / workflow change | this file (`contributing.md`) |
| Anything else | the commit message (Conventional Commits) |

The full rule lives in `AGENTS.md` at the repo root. Both must stay in
sync.

## Working with AI agents

When you delegate a task to an AI agent:

- **Branch is yours**: open the branch yourself, the agent commits to it.
- **Author is yours**: don't let the agent `git config` change your
  identity. The `Co-authored-by:` trailer is the right place to credit
  the agent.
- **Tests are non-negotiable**: if the agent writes code without tests,
  the PR is not ready.
- **Boundary review**: changes in `packages/contracts/`,
  `packages/engine-sdk/`, or `packages/app-shell/` touch the platform
  contract — they deserve a careful human pass even in V1.
