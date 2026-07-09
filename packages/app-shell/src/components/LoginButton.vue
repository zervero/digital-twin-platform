<script setup lang="ts">
/**
 * V4-prep redesign (2026-07-09):
 *   - LogIn / LogOut / Mail icons replace the text-only buttons.
 *   - Mock form: email input now carries a Mail icon as a visual
 *     affordance; the Cancel + Submit pair uses ghost + primary
 *     variant to draw a clear action hierarchy.
 *   - User email displayed with a User icon prefix for symmetry
 *     with the login affordance.
 *
 * V3.5 (Track K: i18n) — 2026-07-09:
 *   - "Sign in" / "Sign in (dev)" / "Logout" and the email
 *     placeholder resolve through `useI18n()`. The Mock / OIDC
 *     branches stay structurally identical.
 */
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { DtButton, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAuthStore } from '../stores/auth-store.js';
import { useOIDCStart } from '../composables/useOIDCStart.js';

const { t } = useI18n();

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
        {{ t('auth.logout') }}
      </DtButton>
    </template>
    <template v-else-if="authMode === 'oidc'">
      <DtButton variant="primary" data-testid="login-redirect">
        <a :href="loginHref" class="login-button__link">
          <DtIcon name="LogIn" size="sm" />
          {{ t('auth.login') }}
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
          {{ t('auth.loginDev') }}
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
            :placeholder="t('auth.emailPlaceholder')"
            class="login-button__input"
          />
        </span>
        <div v-if="error" class="login-button__error">{{ error }}</div>
        <div class="login-button__actions">
          <DtButton variant="ghost" type="button" @click="showForm = false">
            {{ t('common.cancel') }}
          </DtButton>
          <DtButton variant="primary" type="submit" :disabled="loading">
            {{ t('common.confirm') }}
          </DtButton>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.login-button {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
}
.login-button__user {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.login-button__link {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  color: inherit;
  text-decoration: none;
}
.login-button__form {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-md);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
  min-width: 220px;
}
.login-button__input-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  padding: var(--dt-space-xs) var(--dt-space-sm);
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
}
.login-button__input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--dt-text-primary);
  font: inherit;
  font-size: var(--dt-text-sm);
  outline: none;
}
.login-button__error {
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.login-button__actions {
  display: inline-flex;
  justify-content: flex-end;
  gap: var(--dt-space-sm);
}
</style>
