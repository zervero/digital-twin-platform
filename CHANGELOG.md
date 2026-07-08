# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions are produced by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) history.

## [4.2.1](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v4.2.0...digital-twin-platform-v4.2.1) (2026-07-08)


### Bug Fixes

* **desktop-build:** widen tag pattern + record V3.3 published ([320612e](https://github.com/zervero/digital-twin-platform/commit/320612ebad592e621f2bcdeec5d3e5f7d32be77b))

## [4.2.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v4.1.0...digital-twin-platform-v4.2.0) (2026-07-08)


### Features

* **auth-oidc:** surface tenantId in VerifiedSession (V3.3 T3) ([9d9997a](https://github.com/zervero/digital-twin-platform/commit/9d9997a62c07675ee3c2f00c1997a2f1f3043c38))
* **bff:** split mock data into three tenants (V3.3 T5) ([b78995c](https://github.com/zervero/digital-twin-platform/commit/b78995c58183dd944e03f8bdca4d3756c52e7384))
* **bff:** tenant scope middleware + registry placeholder (V3.3 T4) ([14eeda3](https://github.com/zervero/digital-twin-platform/commit/14eeda3f20ffb2dbd5a11f1279fdf84c6e5e61de))
* **bff:** tenant-scope realtime broadcaster (V3.3 T7) ([22b27e2](https://github.com/zervero/digital-twin-platform/commit/22b27e2f1362904be78d1c3eeef3b68020abc0b0))
* **bff:** tenant-scope routes (V3.3 T6) ([2fafea5](https://github.com/zervero/digital-twin-platform/commit/2fafea5b0b235109959640b1205a0260ea159086))
* **contracts:** add tenantId to scoped DTOs (V3.3 T1) ([aba38a3](https://github.com/zervero/digital-twin-platform/commit/aba38a3cb23309cf1f9dc9c18ec47ff66391ea56))
* **desktop:** add tauri updater config + plugin deps (V3.2 T1) ([16b1ed4](https://github.com/zervero/digital-twin-platform/commit/16b1ed4d0bbc6e3fb37b464de7101a0b9fd8f650))
* **desktop:** wire tauri updater plugin + frontend wrapper (V3.2 T2) ([78bb033](https://github.com/zervero/digital-twin-platform/commit/78bb03304f802e77e1f80f1ccd5b70d33f123d20))
* **dev-oidc:** add mint subcommand + shared keypair ([ffcc79f](https://github.com/zervero/digital-twin-platform/commit/ffcc79fe5999bc5d6548218b6de51acac970365a))
* **smoke:** tenant isolation smoke + ci job (V3.3 T8) ([118bb8b](https://github.com/zervero/digital-twin-platform/commit/118bb8b131bd370934bdd00b8cdee358f2b73bb4))
* **tenant:** add @dt/tenant package (V3.3 T2) ([ce0a620](https://github.com/zervero/digital-twin-platform/commit/ce0a62041f053b577c5fd3f6f4d0e1912997cd60))


### Bug Fixes

* **smokes:** close V3.3 closure-time smoke regressions + update ADR 0016 ([6057ab6](https://github.com/zervero/digital-twin-platform/commit/6057ab6c5b35ce4a77495e68779ac5d7c151e55b))

## [4.1.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v4.0.0...digital-twin-platform-v4.1.0) (2026-07-07)


### Features

* **helm:** cert-manager ingress + tls termination (V3.1 T5) ([8fe12b0](https://github.com/zervero/digital-twin-platform/commit/8fe12b07a83678474cde85c79da54443310299b6))
* **helm:** prod/staging/oidc value overlays + secret template (V3.1 T6) ([6c2dc52](https://github.com/zervero/digital-twin-platform/commit/6c2dc5266b93347adca2bbc238c9e3c4e6fa09ab))

> **Note:** `4.0.0` is a release-please state-machine artifact,
> not an intentional major bump. The previous release-please PR (#12,
> which produced `3.1.0`) merged with an empty body and didn't update
> the tool's "consumed commits" state, so the next run (#13) re-scanned
> from `3.0.0` and re-emitted the V3.0 BREAKING CHANGE footers
> (`AuthStore interface refactored to headers-based`,
> `DigitalTwinEvent variants now require a timestamp field`).
> Those same breaking changes are already documented under
> [3.0.0](#300) below -- this section is a duplicate. The actual
> feature work for V3.1 is in [3.1.0](#310) (T1-T4) and
> [4.1.0](#410) (T5-T6). The release notes for T7/T8 are queued
> for the next release-please run.

## [4.0.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v3.1.0...digital-twin-platform-v4.0.0) (2026-07-07)


### ⚠ BREAKING CHANGES

* **release:** AuthStore interface refactored to be headers-based; AuthSession.permissions is now optional; @dt/auth-oidc is the canonical OIDC integration surface.
* **release:** DigitalTwinEvent variants now require a timestamp field; @hono/node-server v1 to v2 has incompatible WS helper signatures.

### Features

* **api-client:** auth methods (getMe, login, logout) with bearer token ([596f29d](https://github.com/zervero/digital-twin-platform/commit/596f29d0780278964b35d7ba8011222d8bbb7bfd))
* **app-shell:** auth store, useCurrentUser, usePermission composables ([33eb274](https://github.com/zervero/digital-twin-platform/commit/33eb2743aa15a1e26349faf999354d31915d3eac))
* **app-shell:** bootstrap activates plugins and renders slots ([85ef2ad](https://github.com/zervero/digital-twin-platform/commit/85ef2ada787c88b61d00a5ae3b7796626bf44224))
* **app-shell:** plugin store and panel/menu composables ([0049754](https://github.com/zervero/digital-twin-platform/commit/00497549c0dd5744b09a742ae21047e40c6fea18))
* **app-shell:** useDeviceStream composable wires websocket to store ([21fcaac](https://github.com/zervero/digital-twin-platform/commit/21fcaacd984ddf7d477b516ed64ee886f6aab1bc))
* **app-shell:** useOIDCStart composable + LoginButton (V3.0 T6) ([de33fa8](https://github.com/zervero/digital-twin-platform/commit/de33fa894f31a0e03d4a572b299dc526557d5ff6))
* **auth-oidc:** new package @dt/auth-oidc + ALL_PERMISSIONS export ([f98e6d1](https://github.com/zervero/digital-twin-platform/commit/f98e6d1087ef1e1975da3df73679f8d2d2457ee8))
* **bff:** add /api/stream websocket endpoint and dev mock source ([ffae7d7](https://github.com/zervero/digital-twin-platform/commit/ffae7d771fecddf8246eddada3625396af580af3))
* **bff:** graceful shutdown and /ready endpoint ([b80c250](https://github.com/zervero/digital-twin-platform/commit/b80c2509354bbd69ff887adb2f27dc6dad4fa4e8))
* **bff:** mock auth store and /api/auth endpoints ([a397ec3](https://github.com/zervero/digital-twin-platform/commit/a397ec3c32c9106d44d0eb061bfbc1fd28356d17))
* **bff:** multi-stage Dockerfile with tini + healthcheck ([7e08e38](https://github.com/zervero/digital-twin-platform/commit/7e08e38ec8916fafee81e07500b0b24340fb7055))
* **bff:** oidc auth store + headers-based AuthStore (V3.0 T3) ([01c5786](https://github.com/zervero/digital-twin-platform/commit/01c5786b9cb0239630b490cb131fe12291db412d))
* **bff:** oidc redirect routes /start + /callback (V3.0 T4) ([db6e863](https://github.com/zervero/digital-twin-platform/commit/db6e863d9b6822ca68cb6c86ed2e74feab6b5034))
* **bff:** otel sdk lifecycle in bootstrap (V3.1 T2) ([68da4f9](https://github.com/zervero/digital-twin-platform/commit/68da4f9b2d5efed0d379472aac4fb93f5488396f))
* **bff:** permission gates on /devices, /scene, /commands (V3.0 T5) ([75f92b5](https://github.com/zervero/digital-twin-platform/commit/75f92b59513b459aaa6ed0af08ab86dcab17ed96))
* **bff:** request-id middleware and structured http logger ([21bb3d9](https://github.com/zervero/digital-twin-platform/commit/21bb3d95803d9e6d8e8ba8d8143d090830bfeed6))
* **bff:** requiresPermission middleware with role-based access ([f154daf](https://github.com/zervero/digital-twin-platform/commit/f154daf3a872744e9eb124a1c26e7e448013e924))
* **config:** oidc env vars + OidcConfig on AppEnv (V3.0 T2) ([cd68c8f](https://github.com/zervero/digital-twin-platform/commit/cd68c8fe66f96c79682549c8fc1ed57822d87a69))
* **config:** production env validation and AUTH_PROVIDER ([b4b8906](https://github.com/zervero/digital-twin-platform/commit/b4b8906204d9e79e7de6e61d1adbe26ddefe79b7))
* **contracts:** auth and role types for V2.1 ([5913a07](https://github.com/zervero/digital-twin-platform/commit/5913a072511737e7fed08dabe92560fcef80458c))
* **contracts:** timestamp envelope and ping/pong on DigitalTwinEvent ([a37c668](https://github.com/zervero/digital-twin-platform/commit/a37c668d98daa7effad8264adbe5c23d90ee7a76))
* **deploy:** docker compose for BFF + web (v2.3) ([58ed51b](https://github.com/zervero/digital-twin-platform/commit/58ed51b5703966e36b8f15c0ac8ffeb96e6ab61c))
* **helm:** umbrella chart with bff + web subcharts (V3.1 T4) ([692cd68](https://github.com/zervero/digital-twin-platform/commit/692cd683d0a144477f2dfc3945622de46300abb7))
* **observability:** structured JSON logger with pretty mode for dev ([1c74200](https://github.com/zervero/digital-twin-platform/commit/1c742005baf096d4cb0150e217dba6929804bcae))
* **otel:** new package @dt/otel (V3.1 T1) ([7b97780](https://github.com/zervero/digital-twin-platform/commit/7b9778019d8d6d7de4e6640ba767c055fd0dc4fa))
* **plugin-runtime:** manifest validator with permission union check ([ce2af40](https://github.com/zervero/digital-twin-platform/commit/ce2af40f96d4e04f56f046012e94b4fd28f0001a))
* **plugin-runtime:** plugin registry with permission-gated activation ([9144dea](https://github.com/zervero/digital-twin-platform/commit/9144dea9562d4ec618af3dfb003a1e2e861e2d80))
* **realtime:** websocket stream with exponential reconnect backoff ([4524696](https://github.com/zervero/digital-twin-platform/commit/452469629c2194a753e4cb746d3984b3a98baddc))
* **samples:** hello plugin + bootstrap integration test ([c0ec10a](https://github.com/zervero/digital-twin-platform/commit/c0ec10ac3deb9fbae23d9b3eed832ba41610babc))
* ship V1 with MIT license ([#2](https://github.com/zervero/digital-twin-platform/issues/2)) ([348eff1](https://github.com/zervero/digital-twin-platform/commit/348eff176a96acf770c26c0257a9d5e0bb310630))
* **tools:** dev oidc idp + e2e smoke (V3.0 T7) ([b6a5e4f](https://github.com/zervero/digital-twin-platform/commit/b6a5e4f60be0ce2f96d160ef9b9d2b92122d835f))
* **web:** multi-stage Dockerfile with nginx + /api proxy ([3ae9f99](https://github.com/zervero/digital-twin-platform/commit/3ae9f99be5848d811e873ba6eb27446113cf2a13))


### Bug Fixes

* **desktop:** ship RGBA icons and resolve dev:all port race ([38f76d3](https://github.com/zervero/digital-twin-platform/commit/38f76d33d0f01b58682aa554eca7d8e0e9c62cbe))
* **lint:** clean ci lint blockers from V3.0 work ([af8aafc](https://github.com/zervero/digital-twin-platform/commit/af8aafcb2afc398ccb3286c85a198922628eac6b))
* **observability:** include vitest config and lockfile update from T2 ([30f14ad](https://github.com/zervero/digital-twin-platform/commit/30f14ad8df7ef05041d67c22e4a39c98f80fc3ac))
* **otel:** pin resources to 1.x to match sdk-node internal api ([e26e204](https://github.com/zervero/digital-twin-platform/commit/e26e2045d068fa74b0c66a7c212b95e83279af59))
* **realtime:** drop dom event types so node consumers can typecheck ([7cf2ffc](https://github.com/zervero/digital-twin-platform/commit/7cf2ffcac5cc7071f6d8d47690701d151ff866fb))
* **realtime:** hoist Device to top-level type import for lint ([684ccf5](https://github.com/zervero/digital-twin-platform/commit/684ccf53f0bdcf11d9ed0ad83c3e4af8607be85e))
* **smoke:** detect port collisions, bind to own bff, force dev mode ([d441923](https://github.com/zervero/digital-twin-platform/commit/d441923e93ef3377ecbc34972d337e43ec091de1))
* **ui-kit:** make tokens.css resolvable by Vite production build ([000e6f8](https://github.com/zervero/digital-twin-platform/commit/000e6f862fceee1d7d04a05c395b2ed04cb0c3c2))


### Documentation

* **release:** mark v2.0.0 transition for the realtime release ([78429ec](https://github.com/zervero/digital-twin-platform/commit/78429ec228b8862c088e5edab628f276a9da8e6d))
* **release:** mark v3.0.0 transition for the real-auth release ([3c0a53b](https://github.com/zervero/digital-twin-platform/commit/3c0a53bf402a4040b1be29d8995e9cae8edcae70))

## [3.1.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v3.0.0...digital-twin-platform-v3.1.0) (2026-07-07)


### Features

* **bff:** otel sdk lifecycle in bootstrap (V3.1 T2) ([68da4f9](https://github.com/zervero/digital-twin-platform/commit/68da4f9b2d5efed0d379472aac4fb93f5488396f))
* **helm:** umbrella chart with bff + web subcharts (V3.1 T4) ([692cd68](https://github.com/zervero/digital-twin-platform/commit/692cd683d0a144477f2dfc3945622de46300abb7))
* **otel:** new package @dt/otel (V3.1 T1) ([7b97780](https://github.com/zervero/digital-twin-platform/commit/7b9778019d8d6d7de4e6640ba767c055fd0dc4fa))


### Bug Fixes

* **otel:** pin resources to 1.x to match sdk-node internal api ([e26e204](https://github.com/zervero/digital-twin-platform/commit/e26e2045d068fa74b0c66a7c212b95e83279af59))

## [3.0.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v2.3.0...digital-twin-platform-v3.0.0) (2026-07-07)


### ⚠ BREAKING CHANGES

* **release:** AuthStore interface refactored to be headers-based; AuthSession.permissions is now optional; @dt/auth-oidc is the canonical OIDC integration surface.

### Features

* **app-shell:** useOIDCStart composable + LoginButton (V3.0 T6) ([de33fa8](https://github.com/zervero/digital-twin-platform/commit/de33fa894f31a0e03d4a572b299dc526557d5ff6))
* **auth-oidc:** new package @dt/auth-oidc + ALL_PERMISSIONS export ([f98e6d1](https://github.com/zervero/digital-twin-platform/commit/f98e6d1087ef1e1975da3df73679f8d2d2457ee8))
* **bff:** oidc auth store + headers-based AuthStore (V3.0 T3) ([01c5786](https://github.com/zervero/digital-twin-platform/commit/01c5786b9cb0239630b490cb131fe12291db412d))
* **bff:** oidc redirect routes /start + /callback (V3.0 T4) ([db6e863](https://github.com/zervero/digital-twin-platform/commit/db6e863d9b6822ca68cb6c86ed2e74feab6b5034))
* **bff:** permission gates on /devices, /scene, /commands (V3.0 T5) ([75f92b5](https://github.com/zervero/digital-twin-platform/commit/75f92b59513b459aaa6ed0af08ab86dcab17ed96))
* **config:** oidc env vars + OidcConfig on AppEnv (V3.0 T2) ([cd68c8f](https://github.com/zervero/digital-twin-platform/commit/cd68c8fe66f96c79682549c8fc1ed57822d87a69))
* **tools:** dev oidc idp + e2e smoke (V3.0 T7) ([b6a5e4f](https://github.com/zervero/digital-twin-platform/commit/b6a5e4f60be0ce2f96d160ef9b9d2b92122d835f))


### Bug Fixes

* **lint:** clean ci lint blockers from V3.0 work ([af8aafc](https://github.com/zervero/digital-twin-platform/commit/af8aafcb2afc398ccb3286c85a198922628eac6b))


### Documentation

* **release:** mark v3.0.0 transition for the real-auth release ([3c0a53b](https://github.com/zervero/digital-twin-platform/commit/3c0a53bf402a4040b1be29d8995e9cae8edcae70))

## [2.3.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v2.2.0...digital-twin-platform-v2.3.0) (2026-07-06)


### Features

* **bff:** graceful shutdown and /ready endpoint ([b80c250](https://github.com/zervero/digital-twin-platform/commit/b80c2509354bbd69ff887adb2f27dc6dad4fa4e8))
* **bff:** multi-stage Dockerfile with tini + healthcheck ([7e08e38](https://github.com/zervero/digital-twin-platform/commit/7e08e38ec8916fafee81e07500b0b24340fb7055))
* **config:** production env validation and AUTH_PROVIDER ([b4b8906](https://github.com/zervero/digital-twin-platform/commit/b4b8906204d9e79e7de6e61d1adbe26ddefe79b7))
* **deploy:** docker compose for BFF + web (v2.3) ([58ed51b](https://github.com/zervero/digital-twin-platform/commit/58ed51b5703966e36b8f15c0ac8ffeb96e6ab61c))
* **web:** multi-stage Dockerfile with nginx + /api proxy ([3ae9f99](https://github.com/zervero/digital-twin-platform/commit/3ae9f99be5848d811e873ba6eb27446113cf2a13))

## [2.2.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v2.1.0...digital-twin-platform-v2.2.0) (2026-07-06)


### Features

* **app-shell:** bootstrap activates plugins and renders slots ([85ef2ad](https://github.com/zervero/digital-twin-platform/commit/85ef2ada787c88b61d00a5ae3b7796626bf44224))
* **app-shell:** plugin store and panel/menu composables ([0049754](https://github.com/zervero/digital-twin-platform/commit/00497549c0dd5744b09a742ae21047e40c6fea18))
* **plugin-runtime:** manifest validator with permission union check ([ce2af40](https://github.com/zervero/digital-twin-platform/commit/ce2af40f96d4e04f56f046012e94b4fd28f0001a))
* **plugin-runtime:** plugin registry with permission-gated activation ([9144dea](https://github.com/zervero/digital-twin-platform/commit/9144dea9562d4ec618af3dfb003a1e2e861e2d80))
* **samples:** hello plugin + bootstrap integration test ([c0ec10a](https://github.com/zervero/digital-twin-platform/commit/c0ec10ac3deb9fbae23d9b3eed832ba41610babc))

## [2.1.0](https://github.com/zervero/digital-twin-platform/compare/digital-twin-platform-v2.0.0...digital-twin-platform-v2.1.0) (2026-07-06)


### Features

* **api-client:** auth methods (getMe, login, logout) with bearer token ([596f29d](https://github.com/zervero/digital-twin-platform/commit/596f29d0780278964b35d7ba8011222d8bbb7bfd))
* **app-shell:** auth store, useCurrentUser, usePermission composables ([33eb274](https://github.com/zervero/digital-twin-platform/commit/33eb2743aa15a1e26349faf999354d31915d3eac))
* **bff:** mock auth store and /api/auth endpoints ([a397ec3](https://github.com/zervero/digital-twin-platform/commit/a397ec3c32c9106d44d0eb061bfbc1fd28356d17))
* **bff:** requiresPermission middleware with role-based access ([f154daf](https://github.com/zervero/digital-twin-platform/commit/f154daf3a872744e9eb124a1c26e7e448013e924))
* **contracts:** auth and role types for V2.1 ([5913a07](https://github.com/zervero/digital-twin-platform/commit/5913a072511737e7fed08dabe92560fcef80458c))

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
