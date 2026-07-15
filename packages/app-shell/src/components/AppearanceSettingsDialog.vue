<script setup lang="ts">
/**
 * Global appearance dialog — opened from admin left nav or user menu.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { DtButton, DtDialog } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAppearanceStore } from '../stores/appearance-store.js';
import AppearanceSettingsForm from './AppearanceSettingsForm.vue';

const { t } = useI18n();
const appearance = useAppearanceStore();
const { dialogOpen } = storeToRefs(appearance);

const open = computed({
  get: () => dialogOpen.value,
  set: (value: boolean) => {
    if (value) appearance.openDialog();
    else appearance.closeDialog();
  },
});
</script>

<template>
  <DtDialog
    v-model:open="open"
    :title="t('settings.appearance.title')"
    :aria-label="t('settings.appearance.title')"
    :close-label="t('common.cancel')"
  >
    <AppearanceSettingsForm />
    <template #footer>
      <DtButton variant="primary" data-testid="appearance-dialog-done" @click="appearance.closeDialog()">
        {{ t('settings.appearance.done') }}
      </DtButton>
    </template>
  </DtDialog>
</template>
