<script setup lang="ts">
/**
 * DtIcon - thin wrapper around lucide-vue-next.
 *
 * The wrapper exists so component consumers don't reach into a specific
 * icon library. If ui-kit ever swaps icon systems (e.g. to Heroicons),
 * only this file changes.
 *
 * Props:
 *   - name: lucide icon name (PascalCase, e.g. 'Check', 'LogIn').
 *   - size: 'sm' | 'md' | 'lg' | 'xl' (resolves via --dt-icon-* tokens).
 *   - stroke: stroke-width override (default 2; lucide default).
 *
 * Color follows `currentColor`; style the icon from the parent's color.
 */
import { computed } from 'vue';

import * as Icons from 'lucide-vue-next';
import type { LucideIcon } from 'lucide-vue-next';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    name: keyof typeof Icons;
    size?: Size;
    stroke?: number;
  }>(),
  { size: 'md', stroke: 2 },
);

const sizeMap: Record<Size, string> = {
  sm: 'var(--dt-icon-sm)',
  md: 'var(--dt-icon-md)',
  lg: 'var(--dt-icon-lg)',
  xl: 'var(--dt-icon-xl)',
};

const style = computed(() => ({
  width: sizeMap[props.size],
  height: sizeMap[props.size],
  'stroke-width': String(props.stroke),
}));

// `keyof typeof Icons` resolves to the whole lucide namespace union
// (icons + createLucideIcon + index/icons const), which vue-tsc rejects
// as a `:is` binding. Cast to `LucideIcon` so the runtime lookup keeps
// working while the template sees a real FunctionalComponent.
const resolvedIcon = computed<LucideIcon>(() => Icons[props.name] as LucideIcon);
</script>

<template>
  <component
    :is="resolvedIcon"
    :style="style"
    aria-hidden="true"
    focusable="false"
  />
</template>
