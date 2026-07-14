<script setup lang="ts">
/**
 * SceneViewport -- V4 product redesign.
 *
 * Full-bleed three.js stage with:
 *   - status overlay (loading / error / node count) bottom-left
 *   - floating DtToolStrip overlays (top-right options stub,
 *     bottom-center camera actions wired to engine framing helpers)
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { createEngine, type DigitalTwinEngine } from '@dt/engine-sdk';
import { useI18n } from '@dt/i18n';
import { DtIcon, DtToolStrip } from '@dt/ui-kit';

import { useSceneStore } from '../stores/scene-store.js';

const { t } = useI18n();
const sceneStore = useSceneStore();
const container = ref<HTMLDivElement | null>(null);
let engine: DigitalTwinEngine | null = null;
let mounted = false;

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
  engine = createEngine();
  engine.mount(container.value);
  mounted = true;
  if (sceneStore.snapshot) {
    await engine.loadScene(sceneStore.snapshot);
    if (sceneStore.selectedNodeId !== null) {
      engine.selectNode(sceneStore.selectedNodeId);
    }
  }
});

watch(
  () => sceneStore.snapshot,
  async (snapshot) => {
    if (!mounted || !engine || !snapshot) return;
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
      v-if="sceneStore.loading || sceneStore.error || sceneStore.snapshot"
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
      <template v-else-if="sceneStore.snapshot">
        <DtIcon name="Box" size="sm" />
        <span>{{ sceneStore.nodeCount }} {{ sceneStore.nodeCount === 1 ? t('scene.node') : t('scene.nodes') }}</span>
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
</style>
