<script setup lang="ts">
/**
 * Personal appearance settings — accent presets + custom color.
 * Accessible to all roles at `/settings/appearance`.
 */
import { computed, ref, watch } from 'vue';

import { DtButton } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { ACCENT_PRESETS } from '../../theme/accent-presets.js';
import { applyAccent, isAccentUsable } from '../../theme/apply-accent.js';
import { useAppearanceStore } from '../../stores/appearance-store.js';

const { t } = useI18n();
const appearance = useAppearanceStore();

const customDraft = ref(appearance.customHex ?? '#1D4ED8');
const contrastError = ref<string | null>(null);

const selectedPresetId = computed(() => appearance.accentId);

function applyCurrentAccent(): void {
  applyAccent(appearance.primary, { hover: appearance.hover });
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
  <div class="appearance-settings">
    <header class="appearance-settings__header">
      <h1 class="appearance-settings__title">{{ t('settings.appearance.title') }}</h1>
      <p class="appearance-settings__subtitle">{{ t('settings.appearance.subtitle') }}</p>
    </header>

    <section class="appearance-settings__section" :aria-label="t('settings.appearance.presetsLabel')">
      <h2 class="appearance-settings__section-title">{{ t('settings.appearance.presetsLabel') }}</h2>
      <div class="appearance-settings__presets" role="list">
        <button
          v-for="preset in ACCENT_PRESETS"
          :key="preset.id"
          type="button"
          role="listitem"
          class="appearance-settings__swatch"
          :class="{ 'appearance-settings__swatch--active': selectedPresetId === preset.id }"
          :aria-pressed="selectedPresetId === preset.id"
          :aria-label="preset.label"
          :style="{ '--swatch-color': preset.primary }"
          @click="onSelectPreset(preset.id)"
        >
          <span class="appearance-settings__swatch-color" />
          <span class="appearance-settings__swatch-label">{{ preset.label }}</span>
        </button>
      </div>
    </section>

    <section class="appearance-settings__section" :aria-label="t('settings.appearance.customLabel')">
      <h2 class="appearance-settings__section-title">{{ t('settings.appearance.customLabel') }}</h2>
      <p class="appearance-settings__hint">{{ t('settings.appearance.customHint') }}</p>
      <div class="appearance-settings__custom-row">
        <input
          v-model="customDraft"
          class="appearance-settings__color"
          type="color"
          :aria-label="t('settings.appearance.colorPicker')"
        />
        <input
          v-model="customDraft"
          class="appearance-settings__hex"
          type="text"
          spellcheck="false"
          :aria-label="t('settings.appearance.hexInput')"
          :aria-invalid="contrastError ? 'true' : 'false'"
        />
        <DtButton variant="primary" @click="onApplyCustom">
          {{ t('settings.appearance.applyCustom') }}
        </DtButton>
      </div>
      <p v-if="contrastError" class="appearance-settings__error" role="alert">
        {{ contrastError }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xl);
  max-width: 640px;
  padding: var(--dt-space-lg);
}
.appearance-settings__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.appearance-settings__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.appearance-settings__subtitle {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.appearance-settings__section {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  padding: var(--dt-space-lg);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-md);
}
.appearance-settings__section-title {
  margin: 0;
  font-size: var(--dt-text-md);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.appearance-settings__hint {
  margin: 0;
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.appearance-settings__presets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: var(--dt-space-md);
}
.appearance-settings__swatch {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-md);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  background: var(--dt-bg-base);
  cursor: pointer;
  color: var(--dt-text-primary);
  font: inherit;
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
  border-radius: var(--dt-radius-pill);
  background: var(--swatch-color);
  border: 1px solid var(--dt-border-subtle);
}
.appearance-settings__swatch-label {
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
}
.appearance-settings__custom-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dt-space-md);
}
.appearance-settings__color {
  width: 44px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  background: transparent;
  cursor: pointer;
}
.appearance-settings__hex {
  flex: 1 1 140px;
  min-width: 0;
  appearance: none;
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-sm);
}
.appearance-settings__hex:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
.appearance-settings__hex[aria-invalid='true'] {
  border-color: var(--dt-accent-danger);
}
.appearance-settings__error {
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
</style>
