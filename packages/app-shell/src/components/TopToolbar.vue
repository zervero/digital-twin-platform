<script setup lang="ts">
/**
 * V4-prep redesign (2026-07-09):
 *   - Brand text dropped "· V1" suffix; version lives in a separate
 *     monospace chip (`VersionChip` style) so the brand stays clean
 *     and the version is greppable. Hardcoded `4.3.0` for now; wire
 *     to a build-time constant (Vite `define` or `import.meta.env`)
 *     in a V3.4.x follow-up if release-please artifacts need to
 *     flow into the UI.
 *   - `LiveStatusDot` reads `useDeviceStream`'s coarse status
 *     (`'connecting' | 'open' | 'closed'`) and renders a teal
 *     pulsing dot + "live" / "connecting" / "offline" label.
 *   - `DtIcon` (lucide) replaces the old unicode `·` divider.
 *   - All hardcoded hex colors replaced with token references.
 *
 * V3.5 (Track K: i18n) — 2026-07-09:
 *   - Locale switcher segmented control added to the toolbar's
 *     right side: `System / EN / 中文`. Binds to `useI18n()`
 *     so the change is reactive across every consumer of `t()`
 *     in the same tick. State persists to `localStorage` via
 *     `useLocaleStore.set`.
 */
import { storeToRefs } from 'pinia';

import { DtButton, DtIcon, DtToolbar } from '@dt/ui-kit';

import LoginButton from './LoginButton.vue';
import { useSceneStore } from '../stores/scene-store.js';
import { useDeviceStream } from '../composables/useDeviceStream.js';
import { useI18n, useLocaleStore } from '@dt/i18n';

const { t, setLocale } = useI18n();
const localeStore = useLocaleStore();

const sceneStore = useSceneStore();
const { snapshot, selectedNodeId } = storeToRefs(sceneStore);

const APP_VERSION = '4.3.0';

const stream = useDeviceStream({
  url: 'ws://localhost:3001/api/stream',
});

function onReset(): void {
  sceneStore.selectNode(null);
}
</script>

<template>
  <DtToolbar>
    <div class="brand">
      <span class="brand__mark">
        <DtIcon name="Boxes" size="lg" />
      </span>
      <span class="brand__name">Digital Twin</span>
      <span class="brand__version">{{ APP_VERSION }}</span>
    </div>

    <span class="divider" aria-hidden="true" />

    <DtButton
      variant="ghost"
      :disabled="selectedNodeId === null"
      @click="onReset"
    >
      <DtIcon name="X" size="sm" />
      {{ t('scene.toolbar.reset') }}
    </DtButton>

    <div v-if="snapshot" class="meta">
      <DtIcon name="Layers" size="sm" />
      <span>{{ snapshot.name }}</span>
      <span class="meta__divider" aria-hidden="true">·</span>
      <span>{{ snapshot.nodes.length }} {{ snapshot.nodes.length === 1 ? t('scene.node') : t('scene.nodes') }}</span>
    </div>

    <div class="live" :data-status="stream.status.value" aria-live="polite">
      <span class="live__dot" aria-hidden="true" />
      <span class="live__label">
        {{ stream.status.value === 'open' ? 'live' :
           stream.status.value === 'connecting' ? 'connecting' : 'offline' }}
      </span>
    </div>

    <div class="locale" role="group" :aria-label="'language'">
      <button
        v-for="opt in [
          { value: 'system', label: 'Auto' },
          { value: 'en',     label: 'EN' },
          { value: 'zh-CN',  label: '中文' },
        ]"
        :key="opt.value"
        type="button"
        :class="['locale__opt', { 'is-active': localeStore.choice === opt.value }]"
        :aria-pressed="localeStore.choice === opt.value"
        @click="setLocale(opt.value as 'system' | 'en' | 'zh-CN')"
      >
        {{ opt.label }}
      </button>
    </div>

    <LoginButton />
  </DtToolbar>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-md);
  font-family: var(--dt-font-ui);
  /* V4-prep redesign: letter-spacing 0 (was 0.04em, an AGENTS.md
   * violation). Weight 600 sits inside the Inter Semi range. */
  letter-spacing: 0;
}
.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    135deg,
    var(--dt-accent-primary),
    var(--dt-accent-secondary)
  );
  color: var(--dt-text-inverse);
}
.brand__name {
  font-size: var(--dt-text-lg);
  font-weight: var(--dt-weight-semi);
  color: var(--dt-text-primary);
}
.brand__version {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  color: var(--dt-text-secondary);
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-subtle);
  padding: 1px 6px;
  border-radius: var(--dt-radius-pill);
}
.divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: var(--dt-border-subtle);
}
.meta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.meta__divider {
  color: var(--dt-border-strong);
}
.live {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: 2px 10px 2px 8px;
  border-radius: var(--dt-radius-pill);
  border: 1px solid var(--dt-border-subtle);
  background: var(--dt-bg-surface);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  color: var(--dt-text-secondary);
  /* V4-prep redesign: live status color follows the secondary
   * accent (teal) when open, secondary text when connecting /
   * offline. Keeps the dot in one place rather than 3 variants. */
}
.live__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dt-text-muted);
  position: relative;
}
.live[data-status='open'] {
  color: var(--dt-accent-secondary);
  border-color: rgba(45, 212, 191, 0.30);
  background: rgba(45, 212, 191, 0.10);
}
.live[data-status='open'] .live__dot {
  background: var(--dt-accent-secondary);
  box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.6);
  /* Subtle pulse so the indicator reads as "live" without being noisy. */
  animation: live-pulse 2s ease-out infinite;
}
.live[data-status='connecting'] {
  color: var(--dt-status-warning);
  border-color: var(--dt-status-warning-border);
  background: var(--dt-status-warning-bg);
}
.live[data-status='connecting'] .live__dot {
  background: var(--dt-status-warning);
}
.live[data-status='closed'] {
  color: var(--dt-text-muted);
}
@keyframes live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.6); }
  70%  { box-shadow: 0 0 0 6px rgba(45, 212, 191, 0); }
  100% { box-shadow: 0 0 0 0 rgba(45, 212, 191, 0); }
}
.locale {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-pill);
}
.locale__opt {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: 2px var(--dt-space-sm);
  border-radius: var(--dt-radius-pill);
  font: inherit;
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.locale__opt:hover:not(.is-active) {
  color: var(--dt-text-primary);
  background: var(--dt-bg-surface-hover);
}
.locale__opt.is-active {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
</style>
