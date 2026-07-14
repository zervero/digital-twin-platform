<script setup lang="ts">
export type DtTreeNodeStatus = 'online' | 'warning' | 'alarm' | 'offline';

export type DtTreeNode = {
  id: string;
  label: string;
  status?: DtTreeNodeStatus;
  children?: DtTreeNode[];
};

defineProps<{
  nodes: ReadonlyArray<DtTreeNode>;
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [string];
}>();

function onSelect(id: string) {
  emit('select', id);
}
</script>

<template>
  <ul class="dt-tree" role="tree">
    <li
      v-for="node in nodes"
      :key="node.id"
      class="dt-tree__item"
      role="treeitem"
      :aria-selected="node.id === selectedId ? 'true' : 'false'"
      :aria-expanded="node.children?.length ? 'true' : undefined"
    >
      <button
        type="button"
        class="dt-tree__row"
        :class="{ 'dt-tree__row--selected': node.id === selectedId }"
        :data-node-id="node.id"
        @click="onSelect(node.id)"
      >
        <span
          v-if="node.status"
          class="dt-tree__dot"
          :data-status="node.status"
          aria-hidden="true"
        />
        <span class="dt-tree__label">{{ node.label }}</span>
      </button>
      <DtTree
        v-if="node.children?.length"
        class="dt-tree__children"
        :nodes="node.children"
        :selected-id="selectedId"
        @select="onSelect"
      />
    </li>
  </ul>
</template>

<style scoped>
.dt-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.dt-tree__item {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.dt-tree__row {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--dt-space-md);
  border: none;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-tree__row:hover:not(.dt-tree__row--selected) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-tree__row--selected {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.dt-tree__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--dt-status-offline);
}
.dt-tree__dot[data-status='online'] {
  background: var(--dt-status-online);
}
.dt-tree__dot[data-status='warning'] {
  background: var(--dt-status-warning);
}
.dt-tree__dot[data-status='alarm'] {
  background: var(--dt-status-alarm);
}
.dt-tree__dot[data-status='offline'] {
  background: var(--dt-status-offline);
}
.dt-tree__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dt-tree__children {
  padding-left: var(--dt-space-2xl);
}
</style>
