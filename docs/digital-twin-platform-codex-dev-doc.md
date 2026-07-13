# Digital Twin Platform V1-V3 Codex Development Document

> **For Codex workers:** Use this document as the source of truth for implementation. Build V1 first, keep V2/V3 extension points in place, and do not jump to V3 features before V1 is runnable.

**Goal:** Build a Web + Desktop industrial digital twin platform starter that can run in browser, macOS, and Windows, with shared Vue 3 UI, a reusable Engine SDK, a BFF service, and clear upgrade paths to enterprise realtime, plugins, AI, collaboration, marketplace, and SaaS.

**Architecture:** Use a pnpm workspace monorepo. Web and Tauri desktop apps consume shared packages. The 3D runtime is exposed as `@dt/engine-sdk`; business APIs are accessed through `@dt/api-client`; all cross-package contracts live in `@dt/contracts`.

**Tech Stack:** pnpm, Turborepo, TypeScript, Vue 3, Vite, Pinia, Three.js, Tauri, Rust, Node.js BFF, Vitest, ESLint, Prettier.

## Global Constraints

- V1 must be runnable with `pnpm install` and `pnpm dev`.
- Web must run independently without Tauri.
- Desktop must reuse the Web app through Tauri.
- Engine must be designed as an SDK from day one.
- Contracts must be the single source of truth for shared DTOs and event names.
- BFF owns backend aggregation and hides upstream service details from apps.
- Do not couple Vue components directly to Three.js internals.
- Do not put business logic inside Tauri commands unless it is desktop-only.
- V2/V3 directories may exist as placeholders only when they expose real boundaries, not speculative implementation.
- Prefer small focused packages over one large shared package.

---

## 1. Product Scope

### V1: Runnable Digital Twin Starter

V1 delivers the minimum product-quality base:

- Web app starts in browser.
- Desktop app starts through Tauri.
- A 3D scene renders a factory-like demo scene.
- Device list is fetched from BFF.
- Clicking a device in UI selects/highlights it in the 3D scene.
- Engine SDK exposes a stable public API.
- Shared contracts define devices, scene objects, commands, and events.
- Tests cover contracts, API client, and basic Engine state behavior.

### V2: Enterprise Platform Base

V2 upgrades the system from starter to enterprise base:

- Command/Event bus.
- Realtime data layer.
- Plugin runtime.
- Observability package.
- Role/permission model.
- Production deployment shape.

### V3: Industrial Product Layer

V3 adds product and commercial capabilities:

- AI agent commands.
- Multi-user collaboration.
- Plugin marketplace.
- SaaS tenancy, billing boundaries, and workspace model.
- Audit log and operational admin console.

---

## 2. Repository Layout

```text
digital-twin-platform/
├── apps/
│   ├── web/
│   ├── desktop/
│   └── bff/
├── packages/
│   ├── contracts/
│   ├── engine-sdk/
│   ├── scene-domain/
│   ├── device-domain/
│   ├── api-client/
│   ├── ui-kit/
│   ├── app-shell/
│   ├── realtime/
│   ├── plugin-runtime/
│   ├── ai-agent/
│   ├── observability/
│   └── config/
├── tooling/
│   ├── eslint/
│   ├── tsconfig/
│   └── test/
├── docs/
│   ├── architecture/
│   ├── adr/
│   └── development/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.cjs
└── README.md
```

## 3. Package Responsibilities

### `apps/web`

Browser application. Owns routing, page composition, browser-specific bootstrapping, and Web deployment.

Consumes:

- `@dt/app-shell`
- `@dt/api-client`
- `@dt/engine-sdk`
- `@dt/ui-kit`

### `apps/desktop`

Tauri desktop application. Owns native shell configuration, macOS/Windows packaging, desktop permissions, and desktop-only commands.

Consumes:

- `apps/web` build output
- `@dt/app-shell`
- `@dt/contracts`

### `apps/bff`

Backend-for-frontend service. Owns API aggregation, mock device data in V1, realtime upgrade path in V2, and auth/tenant hooks in V3.

Produces:

- `GET /health`
- `GET /api/devices`
- `GET /api/scene`
- `POST /api/commands`

### `packages/contracts`

Single source of truth for shared types and constants.

Exports:

- `Device`
- `DeviceStatus`
- `SceneNode`
- `SceneSnapshot`
- `DigitalTwinCommand`
- `DigitalTwinEvent`
- API response types

### `packages/engine-sdk`

Reusable 3D engine SDK. It must be usable outside this app later.

Exports:

- `createEngine(options: EngineOptions): DigitalTwinEngine`
- `DigitalTwinEngine.mount(container: HTMLElement): void`
- `DigitalTwinEngine.loadScene(scene: SceneSnapshot): Promise<void>`
- `DigitalTwinEngine.selectNode(nodeId: string): void`
- `DigitalTwinEngine.dispose(): void`

### `packages/scene-domain`

Scene business model. Converts backend scene data into engine-ready data.

Exports:

- `normalizeSceneSnapshot(input): SceneSnapshot`
- `findSceneNode(scene, nodeId): SceneNode | undefined`

### `packages/device-domain`

Device business model. Owns device status rules, labels, sorting, and filtering.

Exports:

- `getDeviceStatusLabel(status: DeviceStatus): string`
- `sortDevicesByPriority(devices: Device[]): Device[]`
- `isDeviceAlarmed(device: Device): boolean`

### `packages/api-client`

Typed client for BFF APIs.

Exports:

- `createApiClient(options: ApiClientOptions): ApiClient`
- `ApiClient.getDevices(): Promise<Device[]>`
- `ApiClient.getScene(): Promise<SceneSnapshot>`
- `ApiClient.sendCommand(command: DigitalTwinCommand): Promise<void>`

### `packages/ui-kit`

Shared presentational components. No business logic, no direct Three.js dependency.

Initial components:

- `DtButton`
- `DtPanel`
- `DtStatusBadge`
- `DtToolbar`
- `DtEmptyState`

### `packages/app-shell`

Shared application composition for Web and Desktop.

Owns:

- Layout
- Device panel
- Scene viewport
- Command toolbar
- Pinia stores
- App bootstrapping glue

### `packages/realtime`

V2 boundary for realtime device updates.

V1 implementation:

- Export interfaces only.
- Provide an in-memory mock stream for development.

### `packages/plugin-runtime`

V2 boundary for plugins.

V1 implementation:

- Define plugin manifest type.
- Define plugin registration interface.
- Do not implement marketplace logic.

### `packages/ai-agent`

V3 boundary for natural-language operations.

V1 implementation:

- Define command intent types only.
- Do not call any model API.

### `packages/observability`

V2 boundary for logging, metrics, and tracing.

V1 implementation:

- Console logger wrapper.
- No vendor dependency.

### `packages/config`

Shared configuration helpers and environment parsing.

---

## 4. V1 Implementation Tasks

### Task 1: Initialize Workspace

**Files:**

- Create `package.json`
- Create `pnpm-workspace.yaml`
- Create `turbo.json`
- Create `tsconfig.base.json`
- Create `README.md`
- Create `tooling/tsconfig/package.json`
- Create `tooling/tsconfig/base.json`

**Steps:**

- Create pnpm workspace with `apps/*`, `packages/*`, and `tooling/*`.
- Add root scripts:
  - `dev`: `turbo dev`
  - `build`: `turbo build`
  - `test`: `turbo test`
  - `lint`: `turbo lint`
  - `typecheck`: `turbo typecheck`
- Configure TypeScript strict mode.
- Verify with `pnpm install` and `pnpm typecheck`.

**Acceptance:**

- `pnpm install` succeeds.
- `pnpm typecheck` runs without missing script failures after package tasks are added.

### Task 2: Create Shared Contracts

**Files:**

- Create `packages/contracts/package.json`
- Create `packages/contracts/src/index.ts`
- Create `packages/contracts/src/device.ts`
- Create `packages/contracts/src/scene.ts`
- Create `packages/contracts/src/command.ts`
- Create `packages/contracts/src/event.ts`
- Create `packages/contracts/src/api.ts`
- Create `packages/contracts/src/__tests__/contracts.test.ts`

**Required Types:**

```ts
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'alarm';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  sceneNodeId: string;
  updatedAt: string;
}

export interface SceneNode {
  id: string;
  name: string;
  type: 'factory' | 'area' | 'machine' | 'sensor';
  position: [number, number, number];
  status?: DeviceStatus;
}

export interface SceneSnapshot {
  id: string;
  name: string;
  nodes: SceneNode[];
}
```

**Acceptance:**

- `pnpm --filter @dt/contracts test` passes.
- All app/package imports use exported contract types.

### Task 3: Create Device and Scene Domain Packages

**Files:**

- Create `packages/device-domain/src/index.ts`
- Create `packages/device-domain/src/device-status.ts`
- Create `packages/device-domain/src/__tests__/device-status.test.ts`
- Create `packages/scene-domain/src/index.ts`
- Create `packages/scene-domain/src/scene-query.ts`
- Create `packages/scene-domain/src/__tests__/scene-query.test.ts`

**Behavior:**

- Alarm devices sort before warning, online, and offline.
- Status labels return Chinese labels:
  - `online`: `在线`
  - `offline`: `离线`
  - `warning`: `预警`
  - `alarm`: `告警`
- Scene query returns node by id.

**Acceptance:**

- Domain packages have no Vue, Tauri, or Three.js dependency.
- Unit tests pass.

### Task 4: Create BFF Service

**Files:**

- Create `apps/bff/package.json`
- Create `apps/bff/src/index.ts`
- Create `apps/bff/src/routes/health.ts`
- Create `apps/bff/src/routes/devices.ts`
- Create `apps/bff/src/routes/scene.ts`
- Create `apps/bff/src/routes/commands.ts`
- Create `apps/bff/src/mock/demo-data.ts`

**API Contract:**

- `GET /health` returns `{ "ok": true }`.
- `GET /api/devices` returns `Device[]`.
- `GET /api/scene` returns `SceneSnapshot`.
- `POST /api/commands` accepts `DigitalTwinCommand` and returns `{ "accepted": true }`.

**Acceptance:**

- `pnpm --filter @dt/bff dev` starts the service.
- `curl http://localhost:3001/health` returns `{"ok":true}`.

### Task 5: Create API Client

**Files:**

- Create `packages/api-client/src/index.ts`
- Create `packages/api-client/src/create-api-client.ts`
- Create `packages/api-client/src/__tests__/api-client.test.ts`

**Interface:**

```ts
export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  getDevices(): Promise<Device[]>;
  getScene(): Promise<SceneSnapshot>;
  sendCommand(command: DigitalTwinCommand): Promise<void>;
}
```

**Acceptance:**

- Tests mock `fetchImpl`.
- Client rejects non-2xx responses with a readable error.

### Task 6: Create Engine SDK

**Files:**

- Create `packages/engine-sdk/src/index.ts`
- Create `packages/engine-sdk/src/create-engine.ts`
- Create `packages/engine-sdk/src/digital-twin-engine.ts`
- Create `packages/engine-sdk/src/scene-factory.ts`
- Create `packages/engine-sdk/src/__tests__/engine-state.test.ts`

**V1 Behavior:**

- Mounts a Three.js renderer into a container.
- Creates a simple floor grid.
- Creates one mesh per `SceneNode`.
- Colors nodes by status.
- Highlights selected node.
- Disposes renderer and scene resources.

**Acceptance:**

- Engine package exposes only SDK API from `src/index.ts`.
- Vue code never imports internal engine files.
- Basic state tests pass in jsdom or isolated non-renderer logic.

### Task 7: Create UI Kit

**Files:**

- Create `packages/ui-kit/src/index.ts`
- Create `packages/ui-kit/src/components/DtButton.vue`
- Create `packages/ui-kit/src/components/DtPanel.vue`
- Create `packages/ui-kit/src/components/DtStatusBadge.vue`
- Create `packages/ui-kit/src/components/DtToolbar.vue`

**Design Rules:**

- Compact operational UI.
- No marketing-style hero page.
- Cards only for repeated items or framed tool panels.
- Use restrained colors with clear alarm/warning/online/offline states.

**Acceptance:**

- Components are presentational and typed.
- No API calls from UI kit.
- No Three.js dependency.

### Task 8: Create App Shell

**Files:**

- Create `packages/app-shell/src/index.ts`
- Create `packages/app-shell/src/AppShell.vue`
- Create `packages/app-shell/src/components/DevicePanel.vue`
- Create `packages/app-shell/src/components/SceneViewport.vue`
- Create `packages/app-shell/src/components/TopToolbar.vue`
- Create `packages/app-shell/src/stores/device-store.ts`
- Create `packages/app-shell/src/stores/scene-store.ts`

**Behavior:**

- Loads devices and scene on startup.
- Mounts Engine SDK inside `SceneViewport`.
- Selecting a device calls `engine.selectNode(device.sceneNodeId)`.
- Device panel shows status labels and sorted devices.

**Acceptance:**

- App shell works with injected `ApiClient`.
- No hard-coded BFF URL inside components.

### Task 9: Create Web App

**Files:**

- Create `apps/web/package.json`
- Create `apps/web/index.html`
- Create `apps/web/src/main.ts`
- Create `apps/web/src/env.ts`
- Create `apps/web/vite.config.ts`

**Behavior:**

- Boots `AppShell`.
- Uses `VITE_BFF_URL`, defaulting to `http://localhost:3001`.

**Acceptance:**

- `pnpm --filter @dt/web dev` starts the Web app.
- Browser shows 3D viewport and device panel.

### Task 10: Create Tauri Desktop App

**Files:**

- Create `apps/desktop/package.json`
- Create `apps/desktop/src-tauri/Cargo.toml`
- Create `apps/desktop/src-tauri/tauri.conf.json`
- Create `apps/desktop/src-tauri/src/main.rs`

**Behavior:**

- Loads the Web app during development.
- Uses built Web assets in production.
- Adds only minimal desktop shell logic in V1.

**Acceptance:**

- `pnpm --filter @dt/desktop dev` opens desktop window.
- Desktop app shows the same app shell as Web.

### Task 11: Add V2/V3 Boundary Packages

**Files:**

- Create `packages/realtime/src/index.ts`
- Create `packages/plugin-runtime/src/index.ts`
- Create `packages/ai-agent/src/index.ts`
- Create `packages/observability/src/index.ts`

**V1 Scope:**

- Realtime exports stream interfaces and a mock stream.
- Plugin runtime exports manifest and registration interfaces.
- AI agent exports intent and command mapping types.
- Observability exports `createLogger()`.

**Acceptance:**

- Boundary packages compile.
- No external SaaS, model, marketplace, or telemetry vendor is added in V1.

### Task 12: Add Documentation

**Files:**

- Create `docs/architecture/overview.md`
- Create `docs/architecture/workspace.md`
- Create `docs/architecture/engine-sdk.md`
- Create `docs/development/local-dev.md`
- Create `docs/adr/0001-monorepo-workspace.md`
- Create `docs/adr/0002-engine-as-sdk.md`
- Create `docs/adr/0003-bff-layer.md`

**Acceptance:**

- README links to local development docs.
- Architecture docs explain package ownership and dependency rules.

---

## 5. Dependency Rules

Allowed dependencies:

```text
apps/web -> app-shell, api-client, contracts, config
apps/desktop -> apps/web build, contracts
apps/bff -> contracts
app-shell -> ui-kit, engine-sdk, api-client, contracts, device-domain, scene-domain
engine-sdk -> contracts, three
api-client -> contracts
device-domain -> contracts
scene-domain -> contracts
ui-kit -> contracts
realtime -> contracts
plugin-runtime -> contracts
ai-agent -> contracts
observability -> none or contracts
```

Forbidden dependencies:

```text
contracts -> any local package
ui-kit -> api-client
ui-kit -> engine-sdk
domain packages -> Vue
domain packages -> Three.js
engine-sdk -> Vue
engine-sdk -> BFF
BFF -> app-shell
BFF -> engine-sdk
```

---

## 6. V1 Development Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Recommended per-package checks:

```bash
pnpm --filter @dt/contracts test
pnpm --filter @dt/device-domain test
pnpm --filter @dt/scene-domain test
pnpm --filter @dt/api-client test
pnpm --filter @dt/engine-sdk test
pnpm --filter @dt/bff dev
pnpm --filter @dt/web dev
pnpm --filter @dt/desktop dev
```

---

## 7. V1 Acceptance Checklist

- [ ] `pnpm install` succeeds.
- [ ] `pnpm dev` starts BFF and Web app.
- [ ] Web app renders a 3D scene.
- [ ] Web app displays device list from BFF.
- [ ] Selecting a device highlights a 3D node.
- [ ] `pnpm --filter @dt/bff dev` serves `/health`.
- [ ] `pnpm --filter @dt/web build` succeeds.
- [ ] `pnpm --filter @dt/desktop dev` opens the desktop app.
- [ ] `pnpm test` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] README explains local startup.
- [ ] Architecture docs explain package boundaries.

---

## 8. V2 Roadmap

Implement after V1 is stable:

1. Add command bus in `packages/contracts` and `packages/app-shell`.
2. Add event bus in `packages/realtime`.
3. Add WebSocket endpoint in `apps/bff`.
4. Add realtime device updates in `app-shell`.
5. Add plugin manifest validation in `plugin-runtime`.
6. Add plugin loading in `app-shell`.
7. Add structured logger and request tracing in `observability`.
8. Add auth and role contracts.
9. Add production Docker files for Web and BFF.
10. Add CI checks for lint, typecheck, test, and build.

---

## 9. V3 Roadmap

Implement after V2 platform boundaries are proven:

1. Add AI intent schema in `ai-agent`.
2. Add BFF endpoint for AI command planning.
3. Add command approval UI before executing AI actions.
4. Add collaboration session contracts.
5. Add presence and cursor sharing.
6. Add plugin marketplace data model.
7. Add tenant/workspace contracts.
8. Add audit log events.
9. Add admin console app if needed.
10. Add billing boundary, but keep billing provider isolated.

---

## 10. First Codex Execution Prompt

Use this prompt to start implementation:

```text
Create the V1 Digital Twin Platform starter from outputs/digital-twin-platform-codex-dev-doc.md.

Start with Task 1 through Task 5 only:
1. Initialize pnpm workspace.
2. Create contracts package.
3. Create device-domain and scene-domain packages.
4. Create BFF service with mock data.
5. Create typed API client.

Use TypeScript strict mode, Vitest for package tests, and keep all package boundaries exactly as specified. After implementation, run install, typecheck, and tests. Do not implement UI, Three.js, or Tauri yet.
```

---

## 11. Notes for Implementation Discipline

- Build in small commits or review checkpoints.
- Keep each package independently understandable.
- Add tests before business logic where practical.
- Prefer typed interfaces over informal object shapes.
- Keep V1 boring and runnable.
- Let V2/V3 boundaries exist, but do not overbuild them during V1.
