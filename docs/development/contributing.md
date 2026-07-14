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
- Version-name subjects use lowercase (`v3`, `v2.3`, never `V3`
  or `V2.3`). commitlint's subject-case rule trips on a leading
  capital letter even when it's a version digit, so capital
  versions leak through only when the lefthook hook is
  bypassed with `--no-verify`. Stick to lowercase so the
  hook stays useful as a gate.

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

## CI

Three parallel jobs run on every PR and every push to `main`:

- **`verify`** — `ubuntu-latest`, runs `pnpm install --frozen-lockfile`
  then `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` +
  `pnpm smoke:v2`. The V2 smoke boots the BFF against the freshly
  built repo and exercises `/health`, `/api/stream`, and the
  structured logger. This is the single signal that the realtime
  path is end-to-end healthy before a release-please PR is merged.
- **`chart`** — `ubuntu-latest`, installs `helm` and `kubeconform`
  from upstream releases, then runs `pnpm chart:lint:strict`. The
  script exercises both the default values path AND the
  cert-manager overlay path, and `kubeconform` validates every
  emitted manifest against the k8s OpenAPI schema (with the
  datreeio CRD catalog as a fallback for cert-manager CRDs).
  Required for V3.1+ PRs that touch `tooling/k8s/`.
- **`windows`** — `windows-latest`, runs `pnpm lint` + `pnpm typecheck`
  + `pnpm test` only. No build, no smoke. The V2 smoke and the Tauri
  build on Windows (signed `.msi` / `.exe`) are V3 follow-ups; see
  [`docs/plans/v2.3-implementation-plan.md`](../plans/v2.3-implementation-plan.md)
  for the scope split.

Both jobs share the workflow-level `concurrency:` group, so an
in-progress run for the same ref is cancelled when a new commit
pushes to that ref.

### Workflow defaults

The workflow pins `bash` as the run-shell via a top-level
`defaults.run.shell` block. Linux defaults to bash anyway; on
Windows it overrides the PowerShell default that would otherwise
fire every `pnpm …` invocation that hits a Unix-style snippet.

### Action versions

All three setup actions are pinned to `@v5` (checkout, pnpm
setup, node setup). v5 targets Node 24 natively, which avoids the
"Node.js 20 is deprecated" warning that previous versions emitted
on every run. When bumping the major tag, scan the file for all
`@vN` references and update them in one commit, not per-warning.

The full pre-flight checklist for new GitHub Actions lives in
`AGENTS.md` at the repo root (section 5).

## Repository visibility

The repository **must be public** for the branch protection rules
below to be enforced by GitHub. The Free plan silently does not
enforce branch protection on private repositories — the rules
appear configured in the UI but do not actually block pushes.

This is the V1 trade-off. See [ADR 0005](../adr/0005-public-repo-for-v1.md)
for why we accept it and under what conditions we revisit. If the
project later needs to be private, upgrade to GitHub Team
($4/user/month) before flipping the visibility — the rules below
will keep working without re-configuration.

## Branch protection on `main`

Apply these settings on GitHub (Settings → Branches → Branch protection
rules → `main`):

- [x] Require a pull request before merging
- [x] Require approvals: **1** (V1 — just you)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - Required checks: `verify`, `chart`
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

V1 shipped at `1.0.0` (tag `digital-twin-platform-v1.0.0`). Note
that release-please reads the manifest at `.release-please-manifest.json`
to decide the next version. Because the manifest started at `0.0.0`,
the first `feat:` triggered a major bump to `1.0.0` rather than
the expected `0.1.0`. This is release-please's default behavior for
a `0.0.0` starting point, not a bug. To pin V1 to `0.1.0` in the
future, the manifest would need to start at `0.0.1` or higher.
For a full walkthrough of the release procedure, see
[release-playbook.md](release-playbook.md).

For a step-by-step release procedure (pre-flight checks, merge, tag
verification, smoke test, retrospective), see
[release-playbook.md](release-playbook.md). Read it before merging
the first release PR you cut.

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
| Marketplace / plugin persistence change (route, store, signing) | `docs/development/marketplace.md` (+ `contributing.md` if the dev loop changed) |
| New i18n key (UI copy in `@dt/app-shell`) | `packages/i18n/src/locales/<locale>/<ns>.json` (+ the same key in the other locale) and `docs/development/i18n.md` if the key is non-obvious |
| Process / workflow change | this file (`contributing.md`) |
| New prod deployment concern (Dockerfile, env, health, shutdown) | `docs/development/deployment.md` |
| Helm chart / values / template change | `docs/development/production-platform.md` (and run `pnpm chart:lint:strict` before pushing) |
| OpenTelemetry env var or wiring change | `apps/bff/.env.example.otel` (and `production-platform.md` if cluster-side) |
| Desktop app / Tauri release | `docs/development/desktop-releases.md` |
| Desktop code-signing setup | `docs/development/desktop-signing.md` |
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

## Related guides

- [Local development](./local-dev.md) — how to run `pnpm dev` on a fresh checkout.
- [Deployment](./deployment.md) — production-shape Dockerfiles, compose stack,
  env vars, health checks, graceful shutdown, pre-release pre-flight.
- [OIDC](./oidc.md) — `AUTH_PROVIDER=oidc`, dev IdP, production env vars,
  JWT claim shape, troubleshooting.
- [Production platform](./production-platform.md) — V3.1 helm chart, TLS via
  cert-manager, OTel, operations runbook.
- [Release playbook](./release-playbook.md) — release-please cadence, manifest,
  PR review and merge steps.
- [V2 overview](../plans/v2-overview.md) — V2 (realtime + observability + auth +
  plugins + production deploy) tracks, ordering, ship status.
- [V3 overview](../plans/v3-overview.md) — V3 (real auth + production platform +
  Tauri releases + multi-tenant + plugin marketplace) tracks, ordering,
  open questions.
- [UI product redesign (V4)](../plans/2026-07-14-ui-product-redesign-design.md)
  — ops/admin IA, accent preference, admin API parallel track; implementation
  on `feat/ui-product-v4` per
  [`2026-07-14-ui-product-redesign.md`](../plans/2026-07-14-ui-product-redesign.md);
  shell decisions in [ADR 0020](../adr/0020-v4-ui-product-shell.md).
- [Multi-tenant data model](./multi-tenant.md) — V3.3 model, JWT claim
  shape, dev IdP `mint` flow, troubleshooting tree for the four
  tenant-boundary error codes.
- [Plugin marketplace + persistence](./marketplace.md) — V3.4 file-based
  plugin store, HMAC signing, dev loop, troubleshooting tree for the
  marketplace error codes.
- [Internationalization (`@dt/i18n`)](./i18n.md) — V3.5 self-hosted
  locale layer, two locales (`en` / `zh-CN`), how to add a new key,
  the dictionary-completeness test, and what stays untranslated.
