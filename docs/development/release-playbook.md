# Release Playbook

> How to cut a release in V1, from "release-please PR exists" to
> "vX.Y.Z verified end to end". Codified from the V1 v0.1.0 cut on
> 2026-07-04. Expected time: 5-10 minutes for a normal release,
> 15-20 minutes including the optional smoke test.

## When to use this

A release-please PR is open, CI is green, and you want to ship
vX.Y.Z. Do not use this doc for ad-hoc hot-fix tags or manually
pushed tags - those go through the manual fallback described in
[contributing.md](contributing.md#releases).

## The 9 steps

### Step 1 - Pre-flight (30 seconds)

```bash
gh pr list --state open --search "release in:title"
gh pr view <PR-number> --json title,files
```

Verify the 6-item pre-merge checklist in
[contributing.md](contributing.md#branch-protection-on-main) is all
green:

- [ ] PR title is `chore(main): release X.Y.Z`
- [ ] `package.json` version is `X.Y.Z`
- [ ] `.release-please-manifest.json` is `{".": "X.Y.Z"}`
- [ ] `CHANGELOG.md` has the new `## [X.Y.Z]` entry
- [ ] PR body lists the expected commits
- [ ] `verify` CI job is green

If any of these is off, stop and investigate before merging - the
release will be wrong.

### Step 2 - Merge the release PR (30 seconds)

```bash
gh pr merge <PR-number> --squash --delete-branch
```

This lands a single `chore(main): release X.Y.Z` commit on `main`.
The push triggers the release-please workflow to re-run. V1 admin
bypass is in effect (the PR author is the repo owner), so no
separate Approve is needed.

### Step 3 - Watch the re-run (1-2 minutes)

```bash
gh run list --workflow=release-please.yml --limit 3 --watch
```

Expected: the new run ends with `conclusion: "success"`. This is
the run that actually creates the git tag and GitHub Release, so
do not skip it.

### Step 4 - Verify tag and release exist (30 seconds)

```bash
git ls-remote --tags origin | grep "v<X.Y.Z>$"
gh release view "v<X.Y.Z>" --json name,tagName,url,isPrerelease,isDraft
```

Expected:

- [ ] Tag `vX.Y.Z` exists at `refs/tags/vX.Y.Z`
- [ ] GitHub Release exists, not draft, not prerelease
- [ ] `url` points to `https://github.com/zervero/digital-twin-platform/releases/tag/vX.Y.Z`

### Step 5 - Verify CHANGELOG is in the release body (30 seconds)

```bash
gh release view "v<X.Y.Z>" --json body | jq -r '.body' | head -40
```

Expected: the release body has a `## [X.Y.Z]` section that lists
this release's commits, in the order they were merged.

### Step 6 - Smoke test (3-5 minutes, only for minor or major releases)

Skip for patch releases unless the change touched runtime code.
For a `BREAKING CHANGE:`, never skip.

```bash
TMPDIR=$(mktemp -d)
git clone --depth 1 --branch "v<X.Y.Z>" \
  https://github.com/zervero/digital-twin-platform.git "$TMPDIR"
cd "$TMPDIR"

nvm use               # picks up .nvmrc
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build

# Boot the dev stack briefly
pnpm dev &
DEV_PID=$!
sleep 10
curl -sf http://localhost:3001/health > /dev/null && echo "BFF: ok"
curl -sf http://localhost:5173 > /dev/null && echo "Web: ok"
kill $DEV_PID 2>/dev/null || true
cd /
rm -rf "$TMPDIR"
```

Expected: every command exits 0, both endpoints respond. If
anything fails, the release is broken - revert the tag and the
release, fix, then re-run release-please.

### Step 7 - Housekeeping (1 minute)

- [ ] Close any related GitHub issues that this release resolves
      (use `Closes #N` in the release PR, or close them now)
- [ ] For a `BREAKING CHANGE:` release, update
      `docs/architecture/overview.md` to mark the breaking change
- [ ] If a GitHub milestone was tied to this release, close it
- [ ] For a first-of-version-line release (e.g. v0.2.0 after
      v0.1.x), update version callouts in `README.md` and
      `README.zh-CN.md`

### Step 8 - Announce (optional, 30 seconds)

If the project has external visibility (it does in V1 since the
repo is public):

- [ ] Post a one-line note in any relevant chat or mailing list
- [ ] Update project boards

### Step 9 - Retrospective (only if friction was real)

This is **not** a regular post-release activity. Run it only if
one of the trigger conditions below applies.

Trigger conditions (any one):

- A step in this playbook was wrong, missing, or misleading
- A new class of mistake was discovered (like the GitHub "Allow
  create PR" toggle that bit us on v0.1.0)
- The release took more than 30 minutes total
- A new dependency, workflow, or automation was added as part of
  the release

If a trigger applies, open the doc the lesson should land in:

```bash
$EDITOR docs/development/release-playbook.md   # if the playbook itself was wrong
$EDITOR AGENTS.md                              # if it is a process rule for AI agents
$EDITOR docs/adr/NNNN-<slug>.md                # for a real architecture decision
$EDITOR docs/development/contributing.md       # for a contributor-facing rule change
```

Questions to answer before editing:

1. Which step failed or took too long, and why?
2. Was this a one-off, or a class of mistakes we should expect
   again?
3. Where does the lesson belong: the playbook, AGENTS.md, a new
   ADR, or a code comment?

Then commit the doc change with a Conventional Commits message
that explains the **why**:

```bash
git add <doc-file>
git commit -m "docs: capture <lesson> from v<X.Y.Z> release"
```

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Merge done but no tag after 5 minutes | release-please workflow did not re-run | `gh run rerun <id>` |
| Tag exists but no GitHub Release | Workflow missing `permissions: contents: write` | Add it to `.github/workflows/release-please.yml` |
| Release PR title is `0.2.0` not `0.1.0` | `feat:` was minor-bumped from manifest | Adjust `release-please-config.json` or accept v0.2.0 |
| CHANGELOG has no new entry | release-please did not detect the commit type | Check commit follows Conventional Commits; rerun release-please |
| `pnpm install` fails on the fresh clone | Node version mismatch | Verify `.nvmrc` matches `engines.node` in `package.json` |
| GitHub Release notes are empty | release-please config not pointing at the right commit history | Re-check `release-please-config.json` `changelog-path` |

## Related docs

- [contributing.md](contributing.md) - Branch protection, releases
  overview, hooks
- [AGENTS.md](../../AGENTS.md) - Section 5 has the GitHub Actions
  pre-flight checklist
- [local-dev.md](local-dev.md) - Prerequisites, install, dev stack
- [release-please docs](https://github.com/googleapis/release-please) -
  Tool reference
- ADRs 0001-0005 in `docs/adr/` - Project decisions that affect
  what goes into each release
