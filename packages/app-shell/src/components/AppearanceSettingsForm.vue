<script setup lang="ts">
/**
 * Appearance form body (color mode + accent). Used inside the
 * shared appearance dialog — not a routed page.
 */
import { computed, ref, watch } from 'vue';

import { DtButton, DtSegmentedControl, DtTextField } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { ACCENT_PRESETS } from '../theme/accent-presets.js';
import { applyAccent, isAccentUsable } from '../theme/apply-accent.js';
import type { ColorMode } from '../theme/apply-theme.js';
import { useAppearanceStore } from '../stores/appearance-store.js';

const { t } = useI18n();
const appearance = useAppearanceStore();

const customDraft = ref(appearance.customHex ?? '#1D4ED8');
const contrastError = ref<string | null>(null);

const selectedPresetId = computed(() => appearance.accentId);

const colorModeOptions = computed(() => [
  { value: 'light', label: t('settings.appearance.colorModeLight') },
  { value: 'dark', label: t('settings.appearance.colorModeDark') },
  { value: 'system', label: t('settings.appearance.colorModeSystem') },
]);

function applyCurrentAccent(): void {
  applyAccent(appearance.primary, { hover: appearance.hover });
}

function onColorMode(value: string): void {
  appearance.setColorMode(value as ColorMode);
}

function onSelectPreset(id: string): void {
  contrastError.value = null;
  if (appearance.setPreset(id)) {
    applyCurrentAccent();
  }
}

function onApplyCustom(): void {
  const hex = customDraft.value.trim();
  if (!isAccentUsable(hex)) {
    contrastError.value = t('settings.appearance.contrastReject');
    return;
  }
  contrastError.value = null;
  if (appearance.setCustom(hex)) {
    applyCurrentAccent();
  }
}

watch(
  () => [appearance.primary, appearance.hover] as const,
  () => applyCurrentAccent(),
  { immediate: true },
);
</script>

<template>
  <div class="dt-flex dt-flex-col dt-gap-xl">
    <p class="dt-m-0 dt-text-secondary dt-text-sm">
      {{ t('settings.appearance.subtitle') }}
    </p>

    <section
      class="dt-flex dt-flex-col dt-gap-md"
      :aria-label="t('settings.appearance.colorModeLabel')"
    >
      <h3 class="dt-m-0 dt-text-md dt-font-semi dt-text-primary">
        {{ t('settings.appearance.colorModeLabel') }}
      </h3>
      <p class="dt-m-0 dt-text-xs dt-text-secondary">
        {{ t('settings.appearance.colorModeHint') }}
      </p>
      <DtSegmentedControl
        :model-value="appearance.colorMode"
        :options="colorModeOptions"
        data-testid="appearance-color-mode"
        @update:model-value="onColorMode"
      />
    </section>

    <section
      class="dt-flex dt-flex-col dt-gap-md"
      :aria-label="t('settings.appearance.presetsLabel')"
    >
      <h3 class="dt-m-0 dt-text-md dt-font-semi dt-text-primary">
        {{ t('settings.appearance.presetsLabel') }}
      </h3>
      <div class="appearance-settings__presets dt-gap-md" role="list">
        <button
          v-for="preset in ACCENT_PRESETS"
          :key="preset.id"
          type="button"
          role="listitem"
          class="appearance-settings__swatch dt-appearance-none dt-flex dt-flex-col dt-items-center dt-gap-sm dt-p-md dt-border dt-rounded-md dt-bg-base dt-pointer dt-text-primary dt-font-inherit"
          :class="{ 'appearance-settings__swatch--active': selectedPresetId === preset.id }"
          :aria-pressed="selectedPresetId === preset.id"
          :aria-label="preset.label"
          :style="{ '--swatch-color': preset.primary }"
          @click="onSelectPreset(preset.id)"
        >
          <span class="appearance-settings__swatch-color dt-rounded-pill dt-border-subtle" />
          <span class="dt-text-xs dt-font-medium">{{ preset.label }}</span>
        </button>
      </div>
    </section>

    <section
      class="dt-flex dt-flex-col dt-gap-md"
      :aria-label="t('settings.appearance.customLabel')"
    >
      <h3 class="dt-m-0 dt-text-md dt-font-semi dt-text-primary">
        {{ t('settings.appearance.customLabel') }}
      </h3>
      <p class="dt-m-0 dt-text-xs dt-text-secondary">
        {{ t('settings.appearance.customHint') }}
      </p>
      <div class="dt-flex dt-flex-wrap dt-items-center dt-gap-md">
        <input
          v-model="customDraft"
          class="appearance-settings__color dt-p-0 dt-border dt-rounded-sm dt-bg-transparent dt-pointer"
          type="color"
          :aria-label="t('settings.appearance.colorPicker')"
        />
        <DtTextField
          v-model="customDraft"
          class="appearance-settings__hex"
          :class="{ 'appearance-settings__hex--invalid': Boolean(contrastError) }"
          spellcheck="false"
          :aria-label="t('settings.appearance.hexInput')"
          :aria-invalid="contrastError ? 'true' : 'false'"
        />
        <DtButton variant="primary" @click="onApplyCustom">
          {{ t('settings.appearance.applyCustom') }}
        </DtButton>
      </div>
      <p v-if="contrastError" class="dt-m-0 dt-text-danger dt-text-xs" role="alert">
        {{ contrastError }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.appearance-settings__presets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}
.appearance-settings__swatch:hover {
  border-color: var(--dt-border-strong);
  background: var(--dt-bg-surface);
}
.appearance-settings__swatch--active {
  border-color: var(--dt-accent-primary);
  box-shadow: 0 0 0 1px var(--dt-accent-primary);
}
.appearance-settings__swatch-color {
  width: 36px;
  height: 36px;
  background: var(--swatch-color);
}
.appearance-settings__color {
  width: 44px;
  height: 36px;
}
.appearance-settings__hex {
  flex: 1 1 140px;
  min-width: 140px;
  font-family: var(--dt-font-mono);
}
.appearance-settings__hex--invalid :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--dt-accent-danger) inset;
}
</style>
