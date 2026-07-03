# 数字孪生平台 / Digital Twin Platform

工业数字孪生平台起步工程。Web + Desktop、Vue 3 + Three.js、BFF 服务，monorepo 结构。

> 其他语言：[English](README.md)

## 版本规划

- **V1** - 可运行的起步工程（当前版本）：monorepo、带 mock 数据的 BFF、Engine SDK、Web 应用、Tauri 桌面骨架、V2/V3 边界占位。
- **V2** - 企业级平台底座：命令总线、实时数据、插件、可观测性、认证。
- **V3** - 工业产品层：AI 智能体、协同、插件市场、多租户、审计。

高层设计见 [docs/architecture/overview.md](docs/architecture/overview.md)，本地开发见 [docs/development/local-dev.md](docs/development/local-dev.md)。

## 环境要求

- **Node.js >= 22.17.1**（Node 20.x 不受支持，详见 [ADR 0004](docs/adr/0004-node-22-pin.md)）
- **pnpm 11.7.0**（克隆后运行一次 `corepack enable` 即可锁版本）

## 技术栈

- pnpm workspace + Turborepo
- TypeScript（strict 模式）
- Vue 3 + Vite + Pinia
- Three.js
- Tauri（桌面端）
- Node.js BFF
- Vitest

## 快速开始

```bash
nvm use            # 读取 .nvmrc，切换到 Node 22.17.1
corepack enable    # 锁住 pnpm 11.7.0
pnpm install
pnpm dev
```

- Web 应用：http://localhost:5173
- BFF 服务：http://localhost:3001

桌面端需要 Rust 工具链（默认 `pnpm dev` 不带它）：

```bash
pnpm --filter @dt/desktop dev
# 或一次性起全部
pnpm dev:all
```

## 常用命令

```bash
pnpm typecheck    # 全工作区严格类型检查
pnpm test         # vitest 单元测试
pnpm lint         # eslint
pnpm build        # 生产构建
pnpm clean        # 清理构建产物和 node_modules
```

按包粒度：

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

## 目录结构

```
apps/
  web/        # 浏览器应用（Vue 3 + Vite）
  desktop/    # Tauri 桌面壳
  bff/        # Node.js BFF 服务
packages/
  contracts/        # 共享 DTO 与事件名
  engine-sdk/       # Three.js 引擎 SDK
  scene-domain/     # 场景业务模型
  device-domain/    # 设备业务模型
  api-client/       # 类型化 BFF 客户端
  ui-kit/           # 展示型 Vue 组件
  app-shell/        # 共享组合层：布局、stores、面板
  realtime/         # V2 边界：流接口
  plugin-runtime/   # V2 边界：插件清单与注册
  ai-agent/         # V3 边界：命令意图类型
  observability/    # V2 边界：日志
  config/           # 共享配置工具
tooling/
  tsconfig/   # 共享 tsconfig 预设
docs/
  architecture/  # 概览、工作区、引擎 SDK
  adr/           # 架构决策记录
  development/   # 本地开发指南
```

包边界与依赖规则见 [docs/architecture/workspace.md](docs/architecture/workspace.md)。

## 环境变量

- Web：`VITE_BFF_URL`，默认 `http://localhost:3001`
- BFF：`PORT`（默认 `3001`）、`LOG_LEVEL`（`debug|info|warn|error`）
- 桌面：标准 Tauri 环境变量，详见 Tauri 文档

## 下一步

- 装 Rust 跑桌面端 → [rustup](https://rustup.rs)
- 接入真实设备数据 → 替换 `apps/bff/src/mock/demo-data.ts`
- V2 实时数据 → 看 `packages/realtime` 的 `RealtimeStream` 接口
- 写 ADR → 在 `docs/adr/` 加文件，参考现有 3 份
