<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { DtButton, DtToolbar } from '@dt/ui-kit';

import LoginButton from './LoginButton.vue';
import { useSceneStore } from '../stores/scene-store.js';

const sceneStore = useSceneStore();
const { snapshot, selectedNodeId } = storeToRefs(sceneStore);

function onReset(): void {
  sceneStore.selectNode(null);
}
</script>

<template>
  <DtToolbar>
    <div class="brand">Digital Twin · V1</div>
    <DtButton variant="ghost" :disabled="selectedNodeId === null" @click="onReset">
      清除选择
    </DtButton>
    <div v-if="snapshot" class="meta">
      <span>{{ snapshot.name }}</span>
      <span class="meta__divider">·</span>
      <span>{{ snapshot.nodes.length }} 节点</span>
    </div>
    <LoginButton />
  </DtToolbar>
</template>

<style scoped>
.brand {
  font-weight: 600;
  color: #c9d1d9;
  letter-spacing: 0.04em;
  font-size: 12px;
}
.meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8b949e;
  font-size: 12px;
}
.meta__divider {
  color: #30363d;
}
</style>
