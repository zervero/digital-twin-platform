<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { DtButton } from '@dt/ui-kit';

import { useAuthStore } from '../stores/auth-store.js';
import { useOIDCStart } from '../composables/useOIDCStart.js';

const authStore = useAuthStore();
const { state, error, loading } = storeToRefs(authStore);
const { loginHref, authMode } = useOIDCStart();

const showForm = ref(false);
const email = ref('');

async function submitMockLogin(): Promise<void> {
  try {
    await authStore.login(email.value);
    email.value = '';
    showForm.value = false;
  } catch {
    /* error ref is populated by the store */
  }
}
</script>

<template>
  <div class="login-button">
    <template v-if="state.kind === 'authenticated'">
      <span class="login-button__user">{{ state.session.user.email }}</span>
      <DtButton variant="ghost" :disabled="loading" @click="authStore.logout()">
        退出
      </DtButton>
    </template>
    <template v-else-if="authMode === 'oidc'">
      <DtButton variant="primary" data-testid="login-redirect">
        <a :href="loginHref" class="login-button__link">登录</a>
      </DtButton>
    </template>
    <template v-else>
      <DtButton
        v-if="!showForm"
        variant="primary"
        data-testid="login-mock-open"
        @click="showForm = true"
      >
        登录 (dev)
      </DtButton>
      <form
        v-else
        class="login-button__form"
        @submit.prevent="submitMockLogin"
      >
        <input
          v-model="email"
          type="email"
          required
          placeholder="email"
          class="login-button__input"
        >
        <DtButton type="submit" variant="primary" :disabled="loading" data-testid="login-mock-submit">
          提交
        </DtButton>
        <DtButton type="button" variant="ghost" @click="showForm = false">
          取消
        </DtButton>
      </form>
    </template>
    <span v-if="error" class="login-button__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.login-button {
  display: flex;
  align-items: center;
  gap: 8px;
}
.login-button__user {
  color: #8b949e;
  font-size: 12px;
}
.login-button__link {
  color: inherit;
  text-decoration: none;
}
.login-button__form {
  display: flex;
  gap: 6px;
  align-items: center;
}
.login-button__input {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 8px;
  border-radius: 4px;
  font: inherit;
  font-size: 12px;
}
.login-button__input:focus {
  outline: none;
  border-color: #58a6ff;
}
.login-button__error {
  color: #f85149;
  font-size: 12px;
}
</style>
