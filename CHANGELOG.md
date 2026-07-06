# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions are produced by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) history.

## [2.0.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v1.0.2...digital-twin-platform-v2.0.0) (2026-07-06)


### ⚠ BREAKING CHANGES

* **release:** DigitalTwinEvent variants now require a timestamp field; @hono/node-server v1 to v2 has incompatible WS helper signatures.

### Features

* **app-shell:** useDeviceStream composable wires websocket to store ([21fcaac](https://github.com/zervero/digital-twin-platform/commit/21fcaacd984ddf7d477b516ed64ee886f6aab1bc))
* **bff:** add /api/stream websocket endpoint and dev mock source ([ffae7d7](https://github.com/zervero/digital-twin-platform/commit/ffae7d771fecddf8246eddada3625396af580af3))
* **bff:** request-id middleware and structured http logger ([21bb3d9](https://github.com/zervero/digital-twin-platform/commit/21bb3d95803d9e6d8e8ba8d8143d090830bfeed6))
* **contracts:** timestamp envelope and ping/pong on DigitalTwinEvent ([a37c668](https://github.com/zervero/digital-twin-platform/commit/a37c668d98daa7effad8264adbe5c23d90ee7a76))
* **observability:** structured JSON logger with pretty mode for dev ([1c74200](https://github.com/zervero/digital-twin-platform/commit/1c742005baf096d4cb0150e217dba6929804bcae))
* **realtime:** websocket stream with exponential reconnect backoff ([4524696](https://github.com/zervero/digital-twin-platform/commit/452469629c2194a753e4cb746d3984b3a98baddc))


### Bug Fixes

* **observability:** include vitest config and lockfile update from T2 ([30f14ad](https://github.com/zervero/digital-twin-platform/commit/30f14ad8df7ef05041d67c22e4a39c98f80fc3ac))
* **realtime:** drop dom event types so node consumers can typecheck ([7cf2ffc](https://github.com/zervero/digital-twin-platform/commit/7cf2ffcac5cc7071f6d8d47690701d151ff866fb))
* **realtime:** hoist Device to top-level type import for lint ([684ccf5](https://github.com/zervero/digital-twin-platform/commit/684ccf53f0bdcf11d9ed0ad83c3e4af8607be85e))
* **smoke:** detect port collisions, bind to own bff, force dev mode ([d441923](https://github.com/zervero/digital-twin-platform/commit/d441923e93ef3377ecbc34972d337e43ec091de1))


### Documentation

* **release:** mark v2.0.0 transition for the realtime release ([78429ec](https://github.com/zervero/digital-twin-platform/commit/78429ec228b8862c088e5edab628f276a9da8e6d))

## [1.0.2](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v1.0.1...digital-twin-platform-v1.0.2) (2026-07-05)


### Bug Fixes

* **ui-kit:** make tokens.css resolvable by Vite production build ([000e6f8](https://github.com/zervero/digital-twin-platform/commit/000e6f862fceee1d7d04a05c395b2ed04cb0c3c2))

## [1.0.1](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v1.0.0...digital-twin-platform-v1.0.1) (2026-07-04)


### Bug Fixes

* **desktop:** ship RGBA icons and resolve dev:all port race ([38f76d3](https://github.com/zervero/digital-twin-platform/commit/38f76d33d0f01b58682aa554eca7d8e0e9c62cbe))

## 1.0.0 (2026-07-04)


### Features

* ship V1 with MIT license ([#2](https://github.com/zervero/digital-twin-platform/issues/2)) ([348eff1](https://github.com/zervero/digital-twin-platform/commit/348eff176a96acf770c26c0257a9d5e0bb310630))

## [Unreleased]

### Added

- Initial V1 scaffold: monorepo, `@dt/contracts`, `@dt/device-domain`,
  `@dt/scene-domain`, `@dt/bff`, `@dt/api-client`, `@dt/engine-sdk`,
  `@dt/ui-kit`, `@dt/app-shell`, `@dt/web` (Vite), `@dt/desktop` (Tauri).
- V2/V3 boundary packages: `@dt/realtime`, `@dt/plugin-runtime`,
  `@dt/ai-agent`, `@dt/observability`, `@dt/config`.
- Documentation: `docs/architecture/`, `docs/adr/`, `docs/development/`.
- Bilingual README (`README.md`, `README.zh-CN.md`).
- GitHub Actions CI (lint / typecheck / test / build) and release-please
  automation.
- commitlint + lefthook for Conventional Commits enforcement.
