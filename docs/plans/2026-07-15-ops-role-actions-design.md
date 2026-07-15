# Ops Role Actions (viewer vs operator) — Design

> Status: **implemented** on `feat/ui-product-v4` (2026-07-15).  
> Scope: **方案 A + 方案 2** — ops surface only; device actions in the
> detail drawer gated by `command:send`.  
> Extends: `docs/plans/2026-07-14-ui-product-redesign-design.md` §3
> permission matrix (“Device commands / scene write”).  
> Plan: [`2026-07-15-ops-role-actions.md`](./2026-07-15-ops-role-actions.md).

## Context

`Role` is `admin | operator | viewer`. Contract-level permissions differ
— operator and admin have `device:write` and `command:send`; viewer does
not — but the ops chrome was still identical until this design.

Admin vs non-admin is differentiated by **route guard** and by **omitting
the entire top-bar ops/admin mode switch** for non-admins (a lone “操作”
chip is not shown). This design closes the **operator vs viewer** gap on
the ops drawer only.

**Decisions locked in brainstorming:**

| Topic | Choice |
| --- | --- |
| Scope | A — ops drawer/actions only; no top-bar role badge, no admin IA change |
| Differentiation | 2 — dedicated **设备动作** block with actionable buttons for operators |
| Gating | `usePermission('command:send')`, not role-name checks |
| Backend | Extend `DigitalTwinCommand` + BFF echo-accept; no real device state machine |
| Camera tools | Stay available to all roles (local engine; not write-permission UX) |

## §1 — Placement & structure

Device detail drawer (`DeviceDetailDrawer`), Overview tab, **below**
existing KPI + telemetry panels:

```
┌─ CNC-01 · online ─────────────────────┐
│  [Overview] Runtime Alarms …           │
│  KPI cards                             │
│  Telemetry panel                       │
│  ┌─ 设备动作 ─────────────────────────┐ │
│  │  [确认告警] [复位] [请求保养]       │ │  ← operator / admin
│  └────────────────────────────────────┘ │
│  or muted read-only strip               │  ← viewer
└────────────────────────────────────────┘
```

- No new ops columns or top-bar chrome.
- Action block is omitted when no device is selected (empty state unchanged).
- Plugin slots and admin routes are untouched.

## §2 — Permission matrix (ops)

| Capability | anonymous | viewer | operator | admin |
| --- | --- | --- | --- | --- |
| Ops tree / scene / drawer read | — | ✓ | ✓ | ✓ |
| Top-bar ops/admin mode switch | ✗ | ✗ | ✗ | ✓ |
| Viewport camera tools (local) | — | ✓ | ✓ | ✓ |
| **设备动作** buttons | — | ✗ (read-only copy) | ✓ | ✓ |
| 管理 routes | ✗ | ✗ | ✗ | ✓ |

Gate: `usePermission('command:send')`. Viewer sees a single muted line:

> 当前为只读角色，无法执行设备动作

No disabled fake buttons for viewer (avoids “looks clickable” confusion).

## §3 — Actions (v1)

| Id | Label (zh) | Enabled when | Command `type` |
| --- | --- | --- | --- |
| acknowledge | 确认告警 | selected device `status` is `alarm` or `warning` | `acknowledge-alarm` |
| reset | 复位 | device selected | `reset-device` |
| maintenance | 请求保养 | device selected | `request-maintenance` |

Interaction:

1. Click → button(s) enter loading / disable concurrent submits.
2. Success → inline status or toast: 命令已受理 (`accepted` + `commandId`).
3. Failure → inline error + keep buttons usable for retry.
4. **No client-side mutation of device status** in v1 (BFF still echo-accepts).

## §4 — Contract & BFF

Extend `@dt/contracts` `DigitalTwinCommand` with:

```ts
| { id: string; tenantId: string; type: 'acknowledge-alarm'; deviceId: string }
| { id: string; tenantId: string; type: 'reset-device'; deviceId: string }
| { id: string; tenantId: string; type: 'request-maintenance'; deviceId: string }
```

- Existing `select` / `focus` / `reset-view` unchanged.
- `ApiClient.sendCommand` already posts `/api/commands`; no new client method.
- BFF `isDigitalTwinCommand` accepts the three new types; still requires
  `command:send` + matching `tenantId`; response remains
  `{ accepted: true, commandId }`.
- Docs: mention new types in command-related contract comments;
  update `docs/architecture/engine-sdk.md` only if engine surface changes
  (it should **not** for this feature).

## §5 — i18n & a11y

- All user-visible strings via `@dt/i18n` (en + zh-CN), under
  `device.drawer.actions.*`.
- Action region: `aria-label` on the section; buttons expose clear names.
- Loading/disabled state reflected in `disabled` + optional
  `aria-busy` on the active control.

## §6 — Out of scope (this milestone)

- Top-bar role chip / global “只读” banner (mode switch hide for
  non-admins is a separate shell follow-up; see V4 design amendments)
- Showing a **disabled** 管理 segment for non-admins (prefer omit)
- `device:write` as a separate UI gate (bound to `command:send` only)
- Real command bus / telemetry side effects / work-order backend
- Hiding camera tool strips from viewers

## §7 — Acceptance

- [x] viewer + selected device: read-only copy visible; **no** action buttons
- [x] operator + selected device: three buttons; acknowledge disabled unless alarm/warning
- [x] operator click → `POST /api/commands` with new type + `deviceId` + session `tenantId`; UI shows accepted
- [x] viewer cannot trigger send from UI; BFF still rejects if called without permission
- [x] admin on `/ops` matches operator action chrome
- [x] no regression: empty drawer, admin mode gate, camera tools for viewer
- [x] non-admin toolbar: **no** ops/admin segmented control (shell follow-up)

## §8 — Risks

| Risk | Mitigation |
| --- | --- |
| Users expect status to clear after acknowledge | Copy clarifies 已受理; status update deferred |
| Mock login defaults to viewer → “buttons missing” confusion | Dev docs note `roles: ['operator']` for action testing |
| Command union growth | Keep device actions in contracts; validate in one BFF helper |

---

Schematics reviewed in design chat (方案 2). Implementation must not expand
into admin chrome without a new design pass.
