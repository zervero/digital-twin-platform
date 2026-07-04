# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions are produced by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) history.

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
