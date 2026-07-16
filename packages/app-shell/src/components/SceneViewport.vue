<script setup lang="ts">
/**
 * SceneViewport -- V4 product redesign.
 *
 * Full-bleed three.js stage with:
 *   - status overlay (loading / error / node count / asset progress) bottom-left
 *   - floating DtToolStrip overlays (top-right options stub,
 *     bottom-center camera actions wired to engine framing helpers)
 *
 * Scheme C: optional `EngineOptionsKey` provides catalog `resolveUrl`.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  createEngine,
  type AssetLoadEvent,
  type DigitalTwinEngine,
} from '@dt/engine-sdk';
import { useI18n } from '@dt/i18n';
import { DtIcon, DtToolStrip } from '@dt/ui-kit';

import { EngineOptionsKey } from '../injection/engine-options.js';
import { useSceneStore } from '../stores/scene-store.js';

const { t } = useI18n();
const sceneStore = useSceneStore();
const engineOptions = inject(EngineOptionsKey, {});
const container = ref<HTMLDivElement | null>(null);
let engine: DigitalTwinEngine | null = null;
let mounted = false;
let unsubAssetLoad: (() => void) | null = null;

const assetProgress = ref<number | null>(null);
const assetFallbackCount = ref(0);
const assetsComplete = ref(true);

const optionItems = computed(() => [
  {
    id: 'layers',
    icon: 'Layers' as const,
    ariaLabel: t('scene.toolbar.layers'),
    disabled: true,
  },
  {
    id: 'settings',
    icon: 'Settings' as const,
    ariaLabel: t('scene.toolbar.settings'),
    disabled: true,
  },
]);

const cameraItems = computed(() => [
  {
    id: 'reset',
    icon: 'RotateCcw' as const,
    ariaLabel: t('scene.toolbar.reset'),
  },
  {
    id: 'fit',
    icon: 'Maximize2' as const,
    ariaLabel: t('scene.toolbar.fit'),
  },
  {
    id: 'focus',
    icon: 'Crosshair' as const,
    ariaLabel: t('scene.toolbar.focus'),
    disabled: sceneStore.selectedNodeId === null,
  },
]);

const showAssetProgress = computed(
  () => assetProgress.value !== null && !assetsComplete.value,
);

function onAssetLoad(ev: AssetLoadEvent): void {
  if (ev.type === 'progress') {
    assetsComplete.value = ev.total === 0 || ev.loaded >= ev.total;
    assetProgress.value = ev.total === 0 ? null : ev.loaded / ev.total;
  } else if (ev.type === 'node-fallback') {
    assetFallbackCount.value += 1;
  } else if (ev.type === 'complete') {
    assetsComplete.value = true;
    assetProgress.value = null;
  }
}

function onCameraSelect(id: string): void {
  if (!engine) return;
  switch (id) {
    case 'reset':
      engine.resetView();
      break;
    case 'fit':
      engine.fitAll();
      break;
    case 'focus': {
      const nodeId = sceneStore.selectedNodeId;
      if (nodeId) engine.focusNode(nodeId);
      break;
    }
  }
}

onMounted(async () => {
  if (!container.value) return;
  engine = createEngine(engineOptions);
  unsubAssetLoad = engine.onAssetLoad(onAssetLoad);
  engine.mount(container.value);
  mounted = true;
  if (sceneStore.snapshot) {
    assetFallbackCount.value = 0;
    assetsComplete.value = false;
    await engine.loadScene(sceneStore.snapshot);
    if (sceneStore.selectedNodeId !== null) {
      engine.selectNode(sceneStore.selectedNodeId);
    }
  }
});

watch(
  () => sceneStore.snapshot,
  async (snapshot) => {
    if (!mounted || !engine) return;
    if (!snapshot) {
      engine.clearScene();
      assetProgress.value = null;
      assetFallbackCount.value = 0;
      assetsComplete.value = true;
      return;
    }
    assetFallbackCount.value = 0;
    assetsComplete.value = false;
    await engine.loadScene(snapshot);
    if (sceneStore.selectedNodeId !== null) {
      engine.selectNode(sceneStore.selectedNodeId);
    }
  },
);

watch(
  () => sceneStore.selectedNodeId,
  (id) => {
    if (!mounted || !engine) return;
    engine.selectNode(id);
  },
);

onBeforeUnmount(() => {
  unsubAssetLoad?.();
  unsubAssetLoad = null;
  engine?.dispose();
  engine = null;
  mounted = false;
});
</script>

<template>
  <div class="scene-viewport">
    <div ref="container" class="scene-viewport__canvas" />

    <div class="scene-viewport__tools scene-viewport__tools--top">
      <DtToolStrip
        :items="optionItems"
        :aria-label="t('scene.toolbar.options')"
      />
    </div>

    <div class="scene-viewport__tools scene-viewport__tools--bottom">
      <DtToolStrip
        :items="cameraItems"
        :aria-label="t('scene.toolbar.camera')"
        @select="onCameraSelect"
      />
    </div>

    <div
      v-if="sceneStore.loading || sceneStore.error || sceneStore.snapshot || showAssetProgress"
      class="scene-viewport__overlay"
      aria-live="polite"
    >
      <template v-if="sceneStore.loading">
        <DtIcon name="Loader" size="sm" />
        <span>{{ t('scene.loading') }}</span>
      </template>
      <template v-else-if="sceneStore.error">
        <DtIcon name="AlertTriangle" size="sm" />
        <span>{{ sceneStore.error }}</span>
      </template>
      <template v-else-if="showAssetProgress">
        <DtIcon name="Loader" size="sm" />
        <span>
          {{
            t('scene.assetsLoading', {
              percent: Math.round((assetProgress ?? 0) * 100),
            })
          }}
        </span>
      </template>
      <template v-else-if="sceneStore.snapshot">
        <DtIcon name="Box" size="sm" />
        <span>
          {{ sceneStore.nodeCount }}
          {{ sceneStore.nodeCount === 1 ? t('scene.node') : t('scene.nodes') }}
        </span>
        <span v-if="assetFallbackCount > 0" class="scene-viewport__fallback">
          · {{ t('scene.assetsFallback', { count: assetFallbackCount }) }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scene-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.scene-viewport__canvas {
  position: absolute;
  inset: 0;
}
.scene-viewport__tools {
  position: absolute;
  z-index: 2;
  pointer-events: auto;
}
.scene-viewport__tools--top {
  top: var(--dt-space-lg);
  right: var(--dt-space-lg);
}
.scene-viewport__tools--bottom {
  left: 50%;
  bottom: var(--dt-space-lg);
  transform: translateX(-50%);
}
.scene-viewport__overlay {
  position: absolute;
  left: var(--dt-space-lg);
  bottom: var(--dt-space-lg);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-sm) var(--dt-space-lg);
  background: var(--dt-bg-overlay);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-pill);
  color: var(--dt-text-secondary);
  font-family: var(--dt-font-ui);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.scene-viewport__fallback {
  color: var(--dt-text-muted, var(--dt-text-secondary));
}
</style>
