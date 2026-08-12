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
  <div class="admin-publish-page dt-flex dt-flex-col dt-gap-lg">
    <header class="dt-flex dt-flex-col dt-gap-xs">
      <h1 class="dt-m-0 dt-text-xl dt-font-semi dt-text-primary">
        {{ t('marketplace.publish.title') }}
      </h1>
      <p class="dt-m-0 dt-text-secondary dt-text-sm">
        {{ t('marketplace.publish.subtitle') }}
      </p>
    </header>

    <p v-if="!canPublish" class="dt-m-0 dt-text-secondary dt-text-sm">
      {{ t('marketplace.installHint', { permission: 'plugin:publish' }) }}
    </p>

    <form
      v-else
      class="dt-flex dt-flex-col dt-gap-md dt-p-lg dt-bg-elevated dt-border-subtle dt-rounded-md"
      @submit.prevent="onSubmit"
    >
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.pluginId') }}</span>
        <input
          v-model="pluginId"
          class="admin-publish-page__field dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          required
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.publish.name') }}</span>
        <input
          v-model="name"
          class="admin-publish-page__field dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          required
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.publish.vendor') }}</span>
        <input
          v-model="vendor"
          class="admin-publish-page__field dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          required
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.version') }}</span>
        <input
          v-model="version"
          class="admin-publish-page__field dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          required
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.publish.description') }}</span>
        <input
          v-model="description"
          class="admin-publish-page__field dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.publish.artifact') }}</span>
        <textarea
          v-model="artifact"
          class="admin-publish-page__field admin-publish-page__textarea dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-mono dt-text-sm"
          rows="4"
          required
        />
      </label>

      <p
        v-if="errorMessage"
        class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-danger dt-text-xs"
        role="alert"
      >
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
      <p
        v-if="successMessage"
        class="admin-publish-page__success dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-xs"
        role="status"
      >
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
  max-width: 560px;
}
.admin-publish-page__field:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
.admin-publish-page__textarea {
  resize: vertical;
}
.admin-publish-page__success {
  color: var(--dt-status-online);
}
</style>
