<script setup lang="ts">
import { computed } from 'vue';

import { DtIcon } from '@dt/ui-kit';

import ListFilterAbcOpIcon from './ListFilterAbcOpIcon.vue';
import type { ListFilterOp } from '../list-filter-condition.js';
import { listFilterOpIcon } from '../list-filter-op-icon.js';

const props = withDefaults(
  defineProps<{
    op: ListFilterOp;
    size?: 'sm' | 'md';
    stroke?: number;
  }>(),
  { size: 'sm', stroke: 1.75 },
);

const spec = computed(() => listFilterOpIcon(props.op));
</script>

<template>
  <span
    class="dt-list-filter-op-icon"
    :class="[
      `dt-list-filter-op-icon--${size}`,
      spec.kind === 'abc' ? 'dt-list-filter-op-icon--abc' : null,
    ]"
  >
    <ListFilterAbcOpIcon
      v-if="spec.kind === 'abc'"
      :variant="spec.variant"
    />
    <DtIcon
      v-else-if="spec.kind === 'lucide'"
      :name="spec.name"
      :size="size"
      :stroke="stroke"
    />
    <span v-else class="dt-list-filter-op-icon__glyph" aria-hidden="true">{{
      spec.char
    }}</span>
  </span>
</template>
