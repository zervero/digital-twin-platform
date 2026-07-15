# Ops Role Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make viewer vs operator visible on the ops device drawer by adding a **设备动作** block gated on `command:send`, backed by three new echo-accept command types.

**Architecture:** Extend `@dt/contracts` `DigitalTwinCommand` with device-scoped variants; widen BFF `/api/commands` validation; keep `ApiClient.sendCommand` unchanged. In `@dt/app-shell`, gate drawer UI with `usePermission('command:send')` and submit via the injected API client + auth session `tenantId`. No engine or admin chrome changes.

**Tech Stack:** Vue 3 / Pinia, Vitest + `@vue/test-utils`, Hono BFF, `@dt/contracts`, `@dt/i18n`, existing `DtButton` / `DtPanel`.

**Branch:** `feat/ui-product-v4`

**Design spec:** [`docs/plans/2026-07-15-ops-role-actions-design.md`](./2026-07-15-ops-role-actions-design.md)

**Skills while executing:** `@vue-best-practices`, `@vue-testing-best-practices`, `@verification-before-completion`

---

## Task map

| # | Task | Depends on | Acceptance (short) |
| --- | --- | --- | --- |
| T1 | Extend `DigitalTwinCommand` + contract test | — | New types compile; contract test covers them |
| T2 | BFF `isDigitalTwinCommand` accepts device actions | T1 | protected-routes / tenant tests green for new types |
| T3 | i18n strings `device.drawer.actions.*` | — | en + zh-CN keys; composable smoke if needed |
| T4 | Device drawer actions UI + permission gate | T1–T3 | viewer copy / operator buttons / sendCommand wired |
| T5 | Docs note for operator mock login | T4 | contributing or local-dev notes `roles: ['operator']` |
| T6 | Verification gate | T1–T5 | typecheck + targeted package tests |

---

### Task 1: Contract — device action commands

**Files:**
- Modify: `packages/contracts/src/command.ts`
- Modify: `packages/contracts/src/__tests__/contracts.test.ts`

**Step 1: Write the failing test**

Append to `contracts.test.ts`:

```ts
it('narrows device-action DigitalTwinCommand variants', () => {
  const cmd: DigitalTwinCommand = {
    id: 'c-ack',
    tenantId: 'fixture-tenant',
    type: 'acknowledge-alarm',
    deviceId: 'd-1',
  };
  if (cmd.type === 'acknowledge-alarm') {
    expect(cmd.deviceId).toBe('d-1');
  }
  const reset: DigitalTwinCommand = {
    id: 'c-reset',
    tenantId: 'fixture-tenant',
    type: 'reset-device',
    deviceId: 'd-1',
  };
  expect(reset.type).toBe('reset-device');
  const maint: DigitalTwinCommand = {
    id: 'c-maint',
    tenantId: 'fixture-tenant',
    type: 'request-maintenance',
    deviceId: 'd-1',
  };
  expect(maint.type).toBe('request-maintenance');
});
```

**Step 2: Run test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
pnpm --filter @dt/contracts test -- src/__tests__/contracts.test.ts
```

Expected: FAIL (types / expectations not aligned yet).

**Step 3: Minimal implementation**

Update `packages/contracts/src/command.ts`:

```ts
export type DigitalTwinCommand =
  | { id: string; tenantId: string; type: 'select'; nodeId: string }
  | { id: string; tenantId: string; type: 'focus'; nodeId: string }
  | { id: string; tenantId: string; type: 'reset-view' }
  | { id: string; tenantId: string; type: 'acknowledge-alarm'; deviceId: string }
  | { id: string; tenantId: string; type: 'reset-device'; deviceId: string }
  | { id: string; tenantId: string; type: 'request-maintenance'; deviceId: string };
```

Refresh the file header comment to mention device-action variants (V4 ops role actions).

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @dt/contracts test -- src/__tests__/contracts.test.ts
pnpm --filter @dt/contracts typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/command.ts packages/contracts/src/__tests__/contracts.test.ts
git commit -m "$(cat <<'EOF'
feat(contracts): add device-action DigitalTwinCommand variants

Support acknowledge-alarm, reset-device, and request-maintenance for
ops drawer actions gated by command:send.
EOF
)"
```

---

### Task 2: BFF — accept device-action bodies

**Files:**
- Modify: `apps/bff/src/routes/commands.ts` (`isDigitalTwinCommand`)
- Modify: `apps/bff/src/__tests__/protected-routes.test.ts` (add happy-path for a device action as operator)

**Step 1: Write the failing test**

In `protected-routes.test.ts`, inside `POST /api/commands` describe:

```ts
it('accepts acknowledge-alarm for operator', async () => {
  const { app, token } = /* reuse helper that logs in with roles: ['operator'] */;
  const res = await app.request('/api/commands', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'cmd-1',
      tenantId: 'acme-corp',
      type: 'acknowledge-alarm',
      deviceId: 'd-1',
    }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ accepted: true, commandId: 'cmd-1' });
});
```

Use the file's existing login helper style (see current viewer/admin cases). Prefer minting an operator session the same way other tests pass `roles: ['operator']`.

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @dt/bff test -- src/__tests__/protected-routes.test.ts
```

Expected: FAIL with 400 `InvalidCommand`.

**Step 3: Minimal implementation**

In `isDigitalTwinCommand`, extend the switch:

```ts
case 'select':
case 'focus':
  return typeof v.nodeId === 'string';
case 'reset-view':
  return true;
case 'acknowledge-alarm':
case 'reset-device':
case 'request-maintenance':
  return typeof v.deviceId === 'string';
default:
  return false;
```

Update the route file comment that device actions are echo-accepted (no side effects) for V4 ops UX.

**Step 4: Run tests**

```bash
pnpm --filter @dt/bff test -- src/__tests__/protected-routes.test.ts src/__tests__/tenant-isolation.test.ts
pnpm --filter @dt/bff typecheck
```

Expected: PASS (existing tenant isolation still rejects cross-tenant / bad shapes).

**Step 5: Commit**

```bash
git add apps/bff/src/routes/commands.ts apps/bff/src/__tests__/protected-routes.test.ts
git commit -m "$(cat <<'EOF'
feat(bff): accept device-action commands on /api/commands

Echo-accept acknowledge-alarm, reset-device, and request-maintenance
so the ops drawer can exercise command:send.
EOF
)"
```

---

### Task 3: i18n copy for drawer actions

**Files:**
- Modify: `packages/i18n/src/locales/en/device.json`
- Modify: `packages/i18n/src/locales/zh-CN/device.json`
- Optionally extend: `packages/i18n/src/__tests__/composable.test.ts` with one key assertion

**Step 1: Add keys** under `device.drawer`:

English:

```json
"actions": {
  "title": "Device actions",
  "readOnly": "Read-only role — device actions are unavailable",
  "acknowledge": "Acknowledge alarm",
  "reset": "Reset",
  "maintenance": "Request maintenance",
  "accepted": "Command accepted ({id})",
  "failed": "Command failed"
}
```

Chinese:

```json
"actions": {
  "title": "设备动作",
  "readOnly": "当前为只读角色，无法执行设备动作",
  "acknowledge": "确认告警",
  "reset": "复位",
  "maintenance": "请求保养",
  "accepted": "命令已受理（{id}）",
  "failed": "命令发送失败"
}
```

Confirm how `@dt/i18n` interpolates — match existing `{count}` style elsewhere (e.g. `admin.audit.total`). If interpolation uses a different placeholder, mirror that.

**Step 2: Run i18n tests**

```bash
pnpm --filter @dt/i18n test
pnpm --filter @dt/i18n typecheck
```

Expected: PASS.

**Step 3: Commit**

```bash
git add packages/i18n/src/locales/en/device.json packages/i18n/src/locales/zh-CN/device.json packages/i18n/src/__tests__/composable.test.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add device drawer action strings

Copy for viewer read-only hint and operator action buttons.
EOF
)"
```

---

### Task 4: DeviceDetailDrawer — gate + send

**Files:**
- Modify: `packages/app-shell/src/components/DeviceDetailDrawer.vue`
- Modify: `packages/app-shell/src/components/__tests__/DeviceDetailDrawer.test.ts`
- Optional extract (only if the SFC grows unwieldy):  
  `packages/app-shell/src/composables/useDeviceActions.ts`

**Preferred structure (inline in drawer is OK for v1):**

```ts
import { usePermission } from '../composables/usePermission.js';
import { useAuthStore } from '../stores/auth-store.js';
import { ApiClientKey } from '../stores/api-store.js';
import { DtButton, DtPanel /* existing */ } from '@dt/ui-kit';

const canSend = usePermission('command:send');
const auth = useAuthStore();
const api = inject(ApiClientKey)!;

const busyType = ref<string | null>(null);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

const canAcknowledge = computed(() => {
  const s = selectedDevice.value?.status;
  return s === 'alarm' || s === 'warning';
});

async function runAction(
  type: 'acknowledge-alarm' | 'reset-device' | 'request-maintenance',
): Promise<void> {
  const device = selectedDevice.value;
  const tenantId =
    auth.state.kind === 'authenticated' ? auth.state.session.tenantId : null;
  if (!device || !tenantId || !canSend.value) return;
  busyType.value = type;
  actionError.value = null;
  actionMessage.value = null;
  try {
    const res = await api.sendCommand({
      id: crypto.randomUUID(),
      tenantId,
      type,
      deviceId: device.id,
    });
    actionMessage.value = t('device.drawer.actions.accepted', { id: res.commandId });
  } catch (err) {
    actionError.value =
      err instanceof Error ? err.message : t('device.drawer.actions.failed');
  } finally {
    busyType.value = null;
  }
}
```

**Template (Overview tab only, below telemetry):**

```vue
<section
  v-if="selectedDevice"
  class="device-drawer__actions"
  :aria-label="t('device.drawer.actions.title')"
>
  <h3 class="device-drawer__actions-title">{{ t('device.drawer.actions.title') }}</h3>
  <p v-if="!canSend" class="device-drawer__actions-readonly">
    {{ t('device.drawer.actions.readOnly') }}
  </p>
  <div v-else class="device-drawer__actions-row">
    <DtButton
      variant="primary"
      :disabled="!canAcknowledge || busyType !== null"
      :aria-busy="busyType === 'acknowledge-alarm'"
      @click="runAction('acknowledge-alarm')"
    >
      {{ t('device.drawer.actions.acknowledge') }}
    </DtButton>
    <DtButton
      variant="secondary"
      :disabled="busyType !== null"
      @click="runAction('reset-device')"
    >
      {{ t('device.drawer.actions.reset') }}
    </DtButton>
    <DtButton
      variant="secondary"
      :disabled="busyType !== null"
      @click="runAction('request-maintenance')"
    >
      {{ t('device.drawer.actions.maintenance') }}
    </DtButton>
  </div>
  <p v-if="actionMessage" role="status">{{ actionMessage }}</p>
  <p v-if="actionError" role="alert">{{ actionError }}</p>
</section>
```

Style with existing `--dt-*` tokens (spacing, muted text). Do **not** invent new brand hex.

Clear `actionMessage` / `actionError` when `selectedDevice` changes (extend the existing `watch`).

**Step 1: Failing drawer tests**

Update `DeviceDetailDrawer.test.ts` helpers to set auth roles:

```ts
function hydrateAuth(roles: Array<'viewer' | 'operator' | 'admin'>): void {
  const auth = useAuthStore();
  auth.state = {
    kind: 'authenticated',
    session: {
      user: { id: 'u', displayName: 'u', email: 'u@x', roles },
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      tenantId: 'acme-corp',
    },
  };
}
```

Add cases:

1. viewer + selected device → text contains read-only copy; **no** buttons labeled Acknowledge / 确认告警.
2. operator + online device → three buttons; acknowledge disabled.
3. operator + alarm device → acknowledge enabled; click calls `sendCommand` with `type: 'acknowledge-alarm'` and `deviceId`.
4. admin + selected device → buttons present (same as operator).

Spy: pass `sendCommand: vi.fn(async () => ({ accepted: true, commandId: 'cmd-x' }))` via `fakeApiClient`.

**Step 2: Run to fail**

```bash
pnpm --filter @dt/app-shell test -- src/components/__tests__/DeviceDetailDrawer.test.ts
```

**Step 3: Implement drawer UI**

Wire as above. Verify `DtButton` `variant` names against ui-kit exports (`primary` / `secondary` / `ghost`) — match admin pages.

**Step 4: Pass tests + typecheck**

```bash
pnpm --filter @dt/app-shell test -- src/components/__tests__/DeviceDetailDrawer.test.ts
pnpm --filter @dt/app-shell typecheck
```

**Step 5: Commit**

```bash
git add packages/app-shell/src/components/DeviceDetailDrawer.vue \
  packages/app-shell/src/components/__tests__/DeviceDetailDrawer.test.ts
git commit -m "$(cat <<'EOF'
feat(app-shell): gate device actions by command:send in drawer

Viewer sees read-only copy; operator/admin can submit echo-accepted
device commands from the ops detail drawer.
EOF
)"
```

---

### Task 5: Dev docs — how to login as operator

**Files:**
- Modify: `docs/development/contributing.md` **or** `docs/development/local-dev.md`  
  (prefer the file that already documents mock login / `sessionStorage` token; if neither mentions roles, add a short subsection under local-dev Auth)

**Content (keep short):**

```markdown
### Mock login as operator (ops device actions)

Toolbar login defaults to `viewer`. To exercise device actions:

\`\`\`js
const res = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'op@example.com', roles: ['operator'] }),
});
const { session } = await res.json();
sessionStorage.setItem('dt:auth:token', session.token);
location.reload();
\`\`\`
```

**Step 1: Edit + commit**

```bash
git add docs/development/local-dev.md   # or contributing.md
git commit -m "$(cat <<'EOF'
docs: note mock login with operator role for device actions

Toolbar login stays viewer-only; console snippet unlocks ops write UI.
EOF
)"
```

---

### Task 6: Verification gate

**Steps:**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
pnpm --filter @dt/contracts test
pnpm --filter @dt/bff test -- src/__tests__/protected-routes.test.ts
pnpm --filter @dt/i18n test
pnpm --filter @dt/app-shell test -- src/components/__tests__/DeviceDetailDrawer.test.ts
pnpm --filter @dt/contracts typecheck
pnpm --filter @dt/bff typecheck
pnpm --filter @dt/app-shell typecheck
```

Cross-check design acceptance checklist in  
`docs/plans/2026-07-15-ops-role-actions-design.md` §7.

Manual smoke (optional if web+bff running):

1. Login viewer → drawer shows read-only line.
2. Operator login snippet → three buttons; acknowledge disabled when online.
3. Select alarm device (or demo fixture with alarm) → acknowledge works; status message shows accepted.

Mark design §7 boxes done in a follow-up docs commit only if the team wants the checklist mirrored as checked (optional).

---

## Out of scope reminders

- Do not add top-bar role badges.
- Do not change admin nav / marketplace install gates.
- Do not mutate `device.status` client-side after acknowledge.
- Do not hide SceneViewport camera tools from viewers.
- Leave uncommitted auth-session-sync work alone unless the user asks to fold it into this branch (separate concern).

## Execution handoff

Plan saved to `docs/plans/2026-07-15-ops-role-actions.md`.

**Which execution mode?**

1. **Agent executes here** — run T1→T6 in this chat with `executing-plans`
2. **Subagent-driven** — dispatch tasks to subagents with review between tasks
3. **Pause** — you implement from the plan yourself

Reply with `1`, `2`, or `3`.
