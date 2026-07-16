<script setup lang="ts">
/**
 * Admin publish form — builds a PublishPluginRequest for the BFF registry.
 */
import { computed, ref } from 'vue';

import { DtButton, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAdminMarketplace } from '../../composables/useAdminMarketplace.js';

const { t } = useI18n();
const market = useAdminMarketplace();

const pluginId = ref('');
const name = ref('');
const vendor = ref('');
const version = ref('');
const description = ref('');
const artifact = ref('');
const submitting = ref(false);
const successMessage = ref<string | null>(null);

const canPublish = computed(() => market.canPublish.value);
const errorMessage = computed(() => market.error.value);

const canSubmit = computed(
  () =>
    canPublish.value &&
    pluginId.value.trim() &&
    name.value.trim() &&
    vendor.value.trim() &&
    version.value.trim() &&
    artifact.value.trim() &&
    !submitting.value,
);

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  successMessage.value = null;
  market.error.value = null;
  try {
    const id = pluginId.value.trim();
    const ver = version.value.trim();
    await market.api.publish({
      manifest: {
        id,
        name: name.value.trim(),
        vendor: vendor.value.trim(),
        version: ver,
        description: description.value.trim() || undefined,
        permissions: [],
      },
      artifact: artifact.value.trim(),
    });
    successMessage.value = t('marketplace.publish.success', { id, version: ver });
    pluginId.value = '';
    name.value = '';
    vendor.value = '';
    version.value = '';
    description.value = '';
    artifact.value = '';
    await market.refreshAll();
  } catch (err) {
    market.error.value = err instanceof Error ? err.message : String(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="admin-publish-page">
    <header class="admin-publish-page__header">
      <h1 class="admin-publish-page__title">{{ t('marketplace.publish.title') }}</h1>
      <p class="admin-publish-page__subtitle">{{ t('marketplace.publish.subtitle') }}</p>
    </header>

    <p v-if="!canPublish" class="admin-publish-page__hint">
      {{ t('marketplace.installHint', { permission: 'plugin:publish' }) }}
    </p>

    <form
      v-else
      class="admin-publish-page__form"
      @submit.prevent="onSubmit"
    >
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.pluginId') }}</span>
        <input v-model="pluginId" class="admin-publish-page__input" type="text" required />
      </label>
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.publish.name') }}</span>
        <input v-model="name" class="admin-publish-page__input" type="text" required />
      </label>
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.publish.vendor') }}</span>
        <input v-model="vendor" class="admin-publish-page__input" type="text" required />
      </label>
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.version') }}</span>
        <input v-model="version" class="admin-publish-page__input" type="text" required />
      </label>
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.publish.description') }}</span>
        <input v-model="description" class="admin-publish-page__input" type="text" />
      </label>
      <label class="admin-publish-page__label">
        <span>{{ t('marketplace.publish.artifact') }}</span>
        <textarea
          v-model="artifact"
          class="admin-publish-page__textarea"
          rows="4"
          required
        />
      </label>

      <p v-if="errorMessage" class="admin-publish-page__error" role="alert">
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="admin-publish-page__success" role="status">
        <DtIcon name="CheckCircle2" size="sm" />
        {{ successMessage }}
      </p>

      <DtButton type="submit" variant="primary" :disabled="!canSubmit">
        <DtIcon name="Upload" size="sm" />
        {{ t('marketplace.publish.submit') }}
      </DtButton>
    </form>
  </div>
</template>

<style scoped>
.admin-publish-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 560px;
}
.admin-publish-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.admin-publish-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-publish-page__subtitle {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-publish-page__hint {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-publish-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  padding: var(--dt-space-lg);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-md);
}
.admin-publish-page__label {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.admin-publish-page__input,
.admin-publish-page__textarea {
  appearance: none;
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
}
.admin-publish-page__input:focus,
.admin-publish-page__textarea:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
.admin-publish-page__textarea {
  font-family: var(--dt-font-mono);
  resize: vertical;
}
.admin-publish-page__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.admin-publish-page__success {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-status-online);
  font-size: var(--dt-text-xs);
}
</style>
