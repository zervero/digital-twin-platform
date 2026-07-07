# Desktop Releases (V3.2 / Track H)

> Comprehensive guide for the Tauri desktop distribution
> pipeline that V3.2 ships. Covers what gets built, how a
> release flows end-to-end, and the manual operator
> steps that the CI doesn't (yet) cover.

## What ships in V3.2

V3.2 graduates the V1 "Tauri runs locally" story into a
signed, auto-updating desktop distribution. Three platform
artifacts plus an in-app update channel:

| Platform | Artifact | Code-signed | Notarized |
| --- | --- | --- | --- |
| macOS (universal2) | `.dmg` | yes (Developer ID) | yes (Apple notary) |
| Windows | `.msi` | yes (Authenticode); unsigned fallback allowed for dev releases | n/a |
| Linux | `.AppImage` + `.deb` + `.rpm` | no (V3.2.x follow-up adds GPG) | n/a |

All three platforms upload their artifacts to a single
GitHub Release tagged by release-please. The in-app
updater reads `releases/latest/download/latest.json` to
discover new versions and verifies the signature against
the public key in `apps/desktop/src-tauri/tauri.conf.json`.

The signing side is governed by three secret sets
documented in [desktop-signing.md](./desktop-signing.md):
macOS Developer ID, Windows Authenticode, and the Tauri
updater ed25519 keypair. None of the secrets are
mandatory for a contributor to build the app locally;
they are required only for tag-triggered releases that
ship through CI.

## Local build (macOS dev)

A contributor with the Rust toolchain installed can
build a desktop bundle without going through CI:

```bash
pnpm --filter @dt/desktop exec tauri build
```

This produces an unsigned `.app` bundle under
`apps/desktop/src-tauri/target/release/bundle/`. The
bundle is fine for local testing but cannot be
distributed - unsigned `.app` triggers Gatekeeper
warnings, and no `.dmg` / `.msi` / `.AppImage` is
emitted without the platform tooling that CI installs.

Useful for:

- Iterating on desktop-specific UI changes that need a
  real webview instead of `pnpm --filter @dt/web dev`.
- Smoke-testing the updater wrapper locally: install an
  unsigned `.app`, then run `pnpm --filter @dt/desktop
  exec tauri dev` and inspect the `checkForUpdate()` log
  line (see `apps/desktop/src/index.ts` for the boot
  hook).
- Verifying that a Tauri config change (e.g.
  `tauri.conf.json` schema) parses correctly without
  waiting for CI.

## Local build (cross-platform via CI)

If you want a signed bundle without setting up all the
operator secrets locally, push a tag:

```bash
git tag v5.0.0-rc1 HEAD
git push origin v5.0.0-rc1
```

This triggers `.github/workflows/desktop-build.yml` on
the tag. All four jobs run in CI: macos / windows /
linux in parallel, then `release` to finalize the GitHub
Release. The `-rc1` suffix is fine; release-please
itself is not involved at this point - the tag is a
manual push, and the resulting release becomes a public
GitHub Release that downstream `pnpm install` + the
updater can resolve.

## Release flow (release-please-driven)

The canonical V3.2 release flow piggybacks on the
existing release-please machinery:

1. Land all V3.2 commits on `main` (T1-T8 already done).
   release-please runs on every push to `main` and
   opens a PR titled
   `chore(main): release digital-twin-platform X.Y.Z`.
2. Review the release-please PR. Confirm:
   - `package.json` version matches the planned V3.2
     bump (5.0.0 per the V3-era major policy in
     [ADR 0012](../adr/0012-v3-roadmap.md)).
   - `CHANGELOG.md` lists the V3.2 tasks (T1-T8).
   - The `verify` and `chart` CI jobs are green.
3. Merge the release PR. release-please pushes the
   `vX.Y.Z` tag automatically.
4. The tag triggers `.github/workflows/desktop-build.yml`.
   The macos / windows / linux jobs run in parallel
   (~10-15 min each, 30-min timeout).
5. After all three succeed, the `release` job promotes
   the draft GitHub Release to public.

Full release-please flow: [release-playbook.md](./release-playbook.md).

## Manual release cut (operator-only fallback)

If release-please is broken or you need to re-run a
specific release build:

```bash
gh workflow run desktop-build.yml -r vX.Y.Z
```

This re-runs the workflow against the existing tag
without going through release-please. Useful for
retries after a transient signing / notarization
failure, or for testing the workflow shape before
release-please pushes the real tag.

The `tag` input on `workflow_dispatch` (see the
workflow file's `on.workflow_dispatch.inputs.tag`)
defaults to empty (build HEAD); pass a tag there if you
want to target a specific ref.

## Auto-update verification (manual)

V3.2 does **not** run an automated end-to-end updater
smoke in CI - the download-and-install path needs a
real GUI runner, which the GH-hosted runners are not.
The contract is a manual smoke documented here:

1. Install the previous public release on a real
   desktop OS (macOS / Windows / Linux - any one).
2. Push a new release through the release-please flow
   above. Wait for the `release` job to flip the draft
   to public.
3. Launch the installed previous-release app. The
   `checkForUpdate()` boot call in
   `apps/desktop/src/index.ts` fires; check the
   webview devtools console for the
   `[updater] X.Y.Z -> A.B.C available` log line.
4. Verify the new release shows up in the GitHub
   Releases page; click an artifact to confirm the
   `latest.json` index is present and the matching
   `.sig` signature is also attached.

A future V3.2.x may add a CI-side smoke using a
self-hosted GUI runner. For V3.2, manual verification
is the contract.

## Troubleshooting

Common failure modes the operator may hit on the first
tag-triggered run, with the fix per case:

### macOS job: "APPLE_CERTIFICATE is not set"

The Apple signing secret bundle is missing. Generate
the `.p12` from the Apple Developer portal (see
[desktop-signing.md](./desktop-signing.md) "macOS"),
base64-encode it, and add to GH Actions secrets. The
other 4 Apple secrets (`APPLE_CERTIFICATE_PASSWORD`,
`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) need
the same treatment.

### macOS job: notarization timeout

Apple's notary service occasionally hits back-pressure.
The retry strategy is operator-driven: rerun the
workflow via `gh workflow run desktop-build.yml -r vX.Y.Z`
or re-push the tag (release-please allows tag deletion
+ re-push via the standard `git push --delete` +
`git push origin vX.Y.Z` sequence). V3.2 does not have
auto-retry; a V3.2.x follow-up adds `attempts:` style
retry on the tauri-action step.

### Windows job: SmartScreen warning on first launch

The Windows code-signing cert is missing or has no
EV / OV reputation. End users will see a SmartScreen
warning on first launch. The fix is operator-driven:
procure a cert from a public CA (Sectigo / DigiCert)
and store it in GH secrets. Unsigned dev releases are
intentionally allowed.

### Linux job: "webkit2gtk-4.1 not found"

The `Install system deps` apt-get step failed. Check
the runner's apt mirror availability; the package list
is pinned to Tauri's official Linux guide. A Tauri
minor version bump is the only normal cause for needing
to update the package list.

### Release job: "gh: release not found"

The draft release wasn't created by any of the three
platform jobs. Look at the failing job's log for the
tauri-action step - usually a 401 from GitHub when
`GITHUB_TOKEN` lacks `contents: write` (the workflow
top-level permissions should grant this; if they don't,
the `gh release view` step also fails).

### Release job: partial failure (one platform OK, others failed)

The release job's `if` chain skips, the draft stays as
a draft, and the failing platform's artifacts are
attached but the release is not promoted. Operator
choices: (a) re-run the failing platform via
`gh workflow run desktop-build.yml -r vX.Y.Z`; (b)
delete the draft and re-tag after the fix is in; (c)
accept partial release and document the gap in the
V3.2 closure ADR.

### All platforms succeed but updater doesn't detect the new release

The `latest.json` index didn't resolve. Check that:

- The release is **not a draft** (the `release` job
  should have flipped it; check `gh release view vX.Y.Z`
  and verify `isDraft: false`).
- The updater's `endpoints` list in `tauri.conf.json`
  matches the repo URL (`https://github.com/zervero/
  digital-twin-platform/releases/latest/download/
  latest.json`).
- The committed `pubkey` in `tauri.conf.json` matches
  the public half of the `TAURI_SIGNING_PRIVATE_KEY`
  secret (operator must regenerate the keypair before
  the first prod release; see desktop-signing.md).

## What's not in V3.2

- **iOS / Android mobile binaries** - dev spec defers
  these to V4+. Tauri's mobile story is mature enough
  that the V4 work is mostly CI configuration, not
  Rust changes.
- **Linux GPG signing** - V3.2 ships `.AppImage`,
  `.deb`, `.rpm` unsigned. Trust relies on GitHub
  Release provenance. A V3.2.x follow-up adds GPG
  signing.
- **Staged rollouts / release channels** - one
  `latest` channel only. No `beta`, `nightly`, or
  percentage-based rollout.
- **Delta updates** - each release ships the full
  bundle. Tauri 2's updater protocol supports delta
  updates but enabling them adds non-trivial bundle
  size work that V3.2 defers.
- **Updater key rotation** - the keypair is regenerated
  only when compromised. The rotation sketch in
  [desktop-signing.md](./desktop-signing.md) is the
  V3.2.x contract; V3.2 itself does not implement it.
- **CI-side updater smoke** - the install-and-check
  path needs a real GUI runner. Manual verification is
  the V3.2 contract.
- **Notarization auto-retry** - operator reruns on
  Apple notary back-pressure.

## Related docs

- [desktop-signing.md](./desktop-signing.md) - the
  operator handoff for the three secret sets
- [release-playbook.md](./release-playbook.md) - the
  release-please-driven release flow that triggers
  `desktop-build.yml`; **Step 10 - Desktop release**
  is the V3.2-specific subsection
- [production-platform.md](./production-platform.md) -
  V3.1 sibling guide; same operator-handoff shape
- [local-dev.md](./local-dev.md) - one-paragraph section
  on generating a local updater keypair
- [AGENTS.md](../../AGENTS.md) - §5 has the GitHub
  Actions pre-flight checklist that
  `desktop-build.yml` was built against
- [docs/plans/v3.2-implementation-plan.md](../plans/v3.2-implementation-plan.md) -
  the 8-task plan that delivered this work
- Tauri 2 updater docs:
  <https://v2.tauri.app/plugin/updater/>
- tauri-action reference:
  <https://github.com/tauri-apps/tauri-action>
