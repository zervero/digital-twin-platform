<script setup lang="ts">
/**
 * Compact “abc” motif for text list-filter operators (企联网-style).
 * Uses currentColor so prepend + menu inherit text color.
 */
import type { ListFilterAbcVariant } from '../list-filter-op-icon.js';

defineProps<{
  variant: ListFilterAbcVariant;
}>();
</script>

<template>
  <svg
    class="dt-list-filter-abc-icon"
    :class="`dt-list-filter-abc-icon--${variant}`"
    viewBox="0 0 18 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
  <g v-if="variant === 'contains'">
    <rect
      x="0.75"
      y="0.75"
      width="16.5"
      height="10.5"
      rx="2"
      stroke="currentColor"
      stroke-width="1.1"
    />
    <text
      x="9"
      y="8.2"
      text-anchor="middle"
      font-size="5.5"
      font-weight="600"
      font-family="ui-sans-serif, system-ui, sans-serif"
      fill="currentColor"
    >
      abc
    </text>
  </g>

  <g v-else-if="variant === 'notContains'">
    <rect
      x="0.75"
      y="0.75"
      width="16.5"
      height="10.5"
      rx="2"
      stroke="currentColor"
      stroke-width="1.1"
    />
    <text
      x="9"
      y="8.2"
      text-anchor="middle"
      font-size="5.5"
      font-weight="600"
      font-family="ui-sans-serif, system-ui, sans-serif"
      fill="currentColor"
    >
      abc
    </text>
    <path
      d="M2.2 2.4 15.8 9.6"
      stroke="currentColor"
      stroke-width="1.15"
      stroke-linecap="round"
    />
  </g>

  <g v-else-if="variant === 'startsWith'">
    <rect
      x="0.75"
      y="0.75"
      width="11.5"
      height="10.5"
      rx="2"
      stroke="currentColor"
      stroke-width="1.1"
    />
    <text
      x="6.5"
      y="8.2"
      text-anchor="middle"
      font-size="5.5"
      font-weight="600"
      font-family="ui-sans-serif, system-ui, sans-serif"
      fill="currentColor"
    >
      abc
    </text>
    <circle cx="14" cy="6" r="0.75" fill="currentColor" />
    <circle cx="15.6" cy="6" r="0.75" fill="currentColor" />
    <circle cx="17.2" cy="6" r="0.75" fill="currentColor" />
  </g>

  <g v-else-if="variant === 'endsWith'">
    <circle cx="0.8" cy="6" r="0.75" fill="currentColor" />
    <circle cx="2.4" cy="6" r="0.75" fill="currentColor" />
    <circle cx="4" cy="6" r="0.75" fill="currentColor" />
    <rect
      x="5.75"
      y="0.75"
      width="11.5"
      height="10.5"
      rx="2"
      stroke="currentColor"
      stroke-width="1.1"
    />
    <text
      x="11.5"
      y="8.2"
      text-anchor="middle"
      font-size="5.5"
      font-weight="600"
      font-family="ui-sans-serif, system-ui, sans-serif"
      fill="currentColor"
    >
      abc
    </text>
  </g>
  </svg>
</template>
