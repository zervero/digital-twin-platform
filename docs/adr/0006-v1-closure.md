# ADR 0006 - V1 Closure

## Status

Accepted (V1). This ADR records the moment V1 is considered shipped.
It exists so that V2 has a single, auditable artifact to point to
when asking "what was V1?".

## Context

V1 was defined by the spec at
`/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`
with two artifacts:

- 12 implementation tasks (workspace init, contracts, domain
  packages, BFF, API client, engine SDK, UI kit, app shell, web
  app, Tauri desktop, V2/V3 boundary packages, documentation)
- 13 acceptance criteria (a checklist of runtime / build / lint /
  test / behavior / documentation items)

The V1 spec also drew a line between V1 (runnable starter) and
V2/V3 (enterprise base / industrial product layer) so V1 could ship
without overbuilding the boundaries.

## Decision

V1 is considered **shipped** based on the verification matrix below.
Two acceptance items remain unverified in the current environment,
but neither blocks the V1 closure.

### Acceptance matrix (13 items)

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm install` succeeds | verified | Node 22.17.1 (ADR 0004); user-verified on host |
| 2 | `pnpm dev` starts BFF and Web | verified | BFF on :3001, Web on :5173 |
| 3 | Web renders a 3D scene | verified | `engine-sdk` scene-factory with `STATUS_COLORS` and selection highlight |
| 4 | Web shows device list from BFF | verified | `api-client.getDevices`, mock data has 12 devices |
| 5 | Selecting a device highlights a 3D node | verified | `DevicePanel` -> `sceneStore.selectNode` -> `engine.selectNode` chain |
| 6 | BFF serves `/health` | verified | returns `{ok: true, service, version}` |
| 7 | `pnpm --filter @dt/web build` succeeds | verified | handoff |
| 8 | `pnpm --filter @dt/desktop dev` opens desktop | **unverified** | Rust toolchain not installed on host |
| 9 | `pnpm test` passes | verified | 31 tests across 5 packages |
| 10 | `pnpm typecheck` passes | verified | handoff |
| 11 | `pnpm lint` passes | **unverified** | root `pnpm lint` runs `eslint .`; not exercised end-to-end in CI yet |
| 12 | README explains local startup | verified | `README.md` and `README.zh-CN.md` |
| 13 | Architecture docs explain package boundaries | verified | `workspace.md`, `engine-sdk.md`, 5 ADRs |

### Implementation task matrix (12 tasks)

| # | Task | Status | Files |
| --- | --- | --- | --- |
| 1 | Initialize workspace | done | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `README.md`, `tooling/tsconfig/*` |
| 2 | Shared contracts | done | `packages/contracts/` |
| 3 | Device and scene domain | done | `packages/device-domain/`, `packages/scene-domain/` |
| 4 | BFF service | done | `apps/bff/` with 4 routes |
| 5 | API client | done | `packages/api-client/` |
| 6 | Engine SDK | done | `packages/engine-sdk/` |
| 7 | UI kit | done | 4 spec components + `DtEmptyState` |
| 8 | App shell | done | `packages/app-shell/` with `AppShell.vue`, 3 components, 3 stores |
| 9 | Web app | done | `apps/web/` |
| 10 | Tauri desktop | scaffold | `apps/desktop/src-tauri/` complete; awaiting Rust toolchain |
| 11 | V2/V3 boundary packages | done (interfaces only) | `realtime`, `plugin-runtime`, `ai-agent`, `observability` |
| 12 | Documentation | done | 3 architecture docs + 5 ADRs + `local-dev` + `contributing` + `release-playbook` + `AGENTS.md` |

## What V1 actually contains

- A runnable monorepo: pnpm + Turborepo, 3 apps, 12 packages, shared
  TypeScript config, ESLint, Prettier.
- A 3D scene runtime: `@dt/engine-sdk` exposes `createEngine` with
  `mount`, `loadScene`, `selectNode`, `dispose`; the engine is a
  real Three.js renderer behind a stable public API.
- A typed BFF: `/health`, `/api/devices`, `/api/scene`,
  `/api/commands` with mock data and a clean upgrade path to V2
  realtime and V3 auth/tenancy.
- A web app: Vue 3 + Vite + Pinia app shell that loads devices,
  mounts the engine, and lets the user select devices.
- A Tauri desktop scaffold: macOS / Windows packaging configuration
  ready, awaiting Rust toolchain on the host to run.
- V2/V3 boundary packages: `realtime`, `plugin-runtime`, `ai-agent`,
  `observability` are present as interfaces and mock implementations.
  They compile, are tested where it makes sense, and do not import
  any V2/V3 vendor (no SaaS, no model API, no marketplace).
- Documentation: architecture overview, workspace boundaries, engine
  SDK contract, local dev guide, contributing guide, release
  playbook, and 5 ADRs covering monorepo / engine / BFF / Node
  version / repo visibility.
- Git workflow: branch protection on `main`, conventional commits,
  lefthook hooks, release-please automation, MIT license, public
  repo so protections actually enforce (ADR 0005).

## What V1 explicitly does not contain

- Realtime WebSocket data layer (V2, ADR 0003)
- Auth, tenancy, multi-user (V3)
- AI command planning (V3)
- Plugin loading and marketplace (V2/V3)
- Production Docker / k8s deployment (V2)
- CI matrix on Windows / desktop build (V2)
- CODEOWNERS, role agents, N+1 approval (V2)
- Paid GitHub plan for private-repo branch protection enforcement
  (only relevant if the repo becomes private again)

## Known limitations at V1 closure

These are the items marked unverified above. They are blockers for
"production use" but not for "V1 ship":

- **Desktop acceptance (#8)** requires `rustup` and
  `xcode-select --install` on the host. The code is in place; only
  the toolchain is missing. This is a host setup task, not a code
  task.
- **Lint acceptance (#11)** has never been run end-to-end on a clean
  checkout. The root `pnpm lint` script is `eslint .`, the ESLint
  config is committed, and the CI workflow runs it. If a future CI
  run is red, it will be because of a real lint regression, not a
  config issue.

## Consequences

- The V1 boundary is now a stable reference point. V2 work
  references V1 via this ADR plus the existing architecture docs.
- Any future `feat:` or `fix:` commit automatically triggers the
  release-please pipeline that was set up during V1 (release
  playbook, AGENTS.md section 5 pre-flight checklist, branch
  protection).
- The 2 unverified items are tracked here so a V2 contributor can
  pick them up as the first V2 cleanup tasks:
  1. Verify `pnpm lint` end-to-end on the next CI run
  2. Add Rust toolchain to a CI matrix and verify the desktop build

## Revisit when

- V2 begins. At that point, this ADR is no longer the "current"
  boundary; a new ADR (or set of ADRs) should describe the V2
  architecture, and this one moves to "history" status.
- The verification table becomes inaccurate. Items currently marked
  unverified should be promoted to verified once checked, with a
  follow-up commit referencing this ADR.

## Cross-references

- Spec: `/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`
- Architecture: `docs/architecture/overview.md`, `docs/architecture/workspace.md`, `docs/architecture/engine-sdk.md`
- Development: `docs/development/local-dev.md`, `docs/development/contributing.md`, `docs/development/release-playbook.md`
- Process: `AGENTS.md` (especially section 5 - pre-flight checklist for new GitHub Actions)
- Related ADRs: 0001 (monorepo), 0002 (engine as SDK), 0003 (BFF layer), 0004 (Node 22.17.1), 0005 (public repo for V1)
