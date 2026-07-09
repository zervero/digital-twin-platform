<script setup lang="ts">
/**
 * V4-prep redesign (2026-07-09):
 *   - LogIn / LogOut / Mail icons replace the text-only buttons.
 *   - Mock form: email input now carries a Mail icon as a visual
 *     affordance; the Cancel + Submit pair uses ghost + primary
 *     variant to draw a clear action hierarchy.
 *   - User email displayed with a User icon prefix for symmetry
 *     with the login affordance.
 */
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { DtButton, DtIcon } from '@dt/ui-kit';

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
      <span class="login-button__user">
        <DtIcon name="UserRound" size="sm" />
        {{ state.session.user.email }}
      </span>
      <DtButton variant="ghost" :disabled="loading" @click="authStore.logout()">
        <DtIcon name="LogOut" size="sm" />
        退出
      </DtButton>
    </template>
    <template v-else-if="authMode === 'oidc'">
      <DtButton variant="primary" data-testid="login-redirect">
        <a :href="loginHref" class="login-button__link">
          <DtIcon name="LogIn" size="sm" />
          登录
        </a>
      </DtButton>
    </template>
    <template v-else>
      <template v-if="!showForm">
        <DtButton
          variant="primary"
          data-testid="login-mock-open"
          @click="showForm = true"
        >
          <DtIcon name="LogIn" size="sm" />
          登录 (dev)
        </DtButton>
      </template>
      <form
        v-else
        class="login-button__form"
        @submit.prevent="submitMockLogin"
      >
        <span class="login-button__input-wrap">
          <DtIcon name="Mail" size="sm" />
          <input
            v-model="email"
            type="email"
            required
            placeholder="email"
            class="login-button__input"
            data-testid="login-mock-email"
          >
        </span>
        <DtButton
          type="submit"
          variant="primary"
          :disabled="loading"
          data-testid="login-mock-submit"
        >
          提交
        </DtButton>
        <DtButton
          type="button"
          variant="ghost"
          @click="showForm = false"
        >
          取消
        </DtButton>
      </form>
    </template>
    <span v-if="error" class="login-button__error">
      <DtIcon name="AlertTriangle" size="sm" />
      {{ error }}
    </span>
  </div>
</template>

<style scoped>
.login-button {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-md);
}
.login-button__user {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.login-button__link {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: inherit;
  text-decoration: none;
}
.login-button__form {
  display: inline-flex;
  gap: var(--dt-space-sm);
  align-items: center;
}
.login-button__input-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: 0 var(--dt-space-md);
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
  transition: border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.login-button__input-wrap:focus-within {
  border-color: var(--dt-accent-primary);
  color: var(--dt-text-primary);
}
.login-button__input {
  appearance: none;
  background: transparent;
  border: 0;
  color: inherit;
  padding: var(--dt-space-sm) 0;
  font: inherit;
  font-size: var(--dt-text-sm);
  width: 180px;
}
.login-button__input:focus {
  outline: none;
}
.login-button__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
</style>
