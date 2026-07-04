# ADR 0005 - Keep the V1 repository public

## Status

Accepted (V1). Revisit at the V1 → V2 transition, or when the project
gains any non-public dependency.

## Context

GitHub Free enforces a tier-based matrix on server-side branch
protection:

| Plan | Public repo | Private repo |
| --- | --- | --- |
| Free | enforced | **silently NOT enforced** |
| Team ($4/user/mo) | enforced | enforced |
| Enterprise | enforced | enforced |

The repository is currently a starter scaffold (monorepo, mock data,
no customer code, no proprietary dependencies). When we tried to enable
branch protection on `main` while the repo was private, GitHub surfaced
the warning:

> "Your protected branch rules for your branch won't be enforced on
> this private repository until you move to a GitHub Team or Enterprise
> organization account."

That means the seven rules in [contributing.md](../development/contributing.md)
(`Require pull request`, `Require approvals`, `Require status checks`,
`Require linear history`, `Do not allow force pushes`, `Do not allow
deletions`, `Include administrators: off`) are **decorative** on a
private repo under the Free plan — they appear configured in the UI
but do not actually block pushes. CI alone, plus the local `lefthook`
pre-push hook, would be the only real guard.

That is a regression from the workflow we documented. The V1 starter
has no private content to protect, so the cheapest fix is to flip the
repository to public. Branch protection starts enforcing immediately,
no other config changes needed.

## Decision

Keep the V1 repository **public** on the GitHub Free plan. Specifically:

- The repo at `github.com/zervero/digital-twin-platform` stays public
  for the entirety of V1.
- All branch protection rules documented in
  [contributing.md](../development/contributing.md) rely on
  enforcement, which now happens because the repo is public.
- No `LICENSE` change is required for visibility. A future
  V1-shipped LICENSE will live alongside this decision.
- If at any point in V1 we add a non-public dependency (e.g. a
  private registry, a customer-specific data fixture, a paid
  plugin), we revisit and either split the repo or upgrade to
  GitHub Team.

## Consequences

- Branch protection on `main` is enforced by GitHub. The seven
  rules in `contributing.md` actually block bad pushes, merges, and
  force-pushes.
- The full commit history, including any local-only commit messages
  and review comments, is visible to the world. Commit messages are
  short, formal, and free of customer references per the project's
  Conventional Commits discipline — this is fine.
- Public repos get more aggressive GitHub tooling (Insights,
  Dependency graph, Code scanning alerts) which we get for free.
- If we ever need to keep something private, we cannot do it inside
  this repo on the Free plan. The escape hatch is one of:
  1. Upgrade to GitHub Team and flip this repo private.
  2. Move the private bit into a separate private repo and consume
     it as a workspace / git submodule.
  3. Wait for V2, when budget exists for Team.
- README and `local-dev.md` already document how a fresh contributor
  clones, builds, and runs. Visibility being public is the natural
  end of that on-ramp.

## Revisit when

- The project transitions from V1 (scaffold) to V2 (commercial
  platform base) and customer code starts landing.
- The project is acquired by an organization whose policy requires
  private repositories by default.
- GitHub changes its Free-tier rules to enforce protection on
  private repos.
