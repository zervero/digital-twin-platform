<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { getRegisteredDocument } from '../composables/useDocumentRegistry.js';
import DocumentDetailPage from './DocumentDetailPage.vue';
import DocumentListPage from './DocumentListPage.vue';

const route = useRoute();

const typeId = computed(() => String(route.params.typeId ?? ''));
const docId = computed(() => {
  const raw = route.params.docId;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
});
const isDetail = computed(() => route.name === 'document-detail');

const entry = computed(() => getRegisteredDocument(typeId.value));
const basePath = computed(() => `/documents/${typeId.value}`);
</script>

<template>
  <div v-if="!entry" class="dt-document-island dt-doc-missing">
    <p>未知单据类型：{{ typeId }}</p>
  </div>
  <DocumentDetailPage
    v-else-if="isDetail"
    :definition="entry.definition"
    :port="entry.port"
    :base-path="basePath"
    :document-id="docId"
  />
  <DocumentListPage
    v-else
    :definition="entry.definition"
    :port="entry.port"
    :base-path="basePath"
  />
</template>

<style scoped>
.dt-doc-missing {
  padding: 24px;
}
</style>
