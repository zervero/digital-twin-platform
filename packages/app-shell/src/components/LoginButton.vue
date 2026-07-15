<script setup lang="ts">
/**
 * Auth chrome + shared appearance entry.
 *
 * - Appearance is always available (anonymous or signed-in).
 * - Sign-in opens a DtDialog (mock email form or OIDC redirect CTA).
 * - Signed-in: email chip + logout.
 */
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

import { DtButton, DtDialog, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAuthStore } from '../stores/auth-store.js';
import { useAppearanceStore } from '../stores/appearance-store.js';
import { useOIDCStart } from '../composables/useOIDCStart.js';

const { t } = useI18n();

const authStore = useAuthStore();
const appearance = useAppearanceStore();
const { state, error, loading } = storeToRefs(authStore);
const { loginHref, authMode } = useOIDCStart();

const dialogOpen = ref(false);
const email = ref('');

watch(dialogOpen, (open) => {
  if (!open) {
    email.value = '';
    if (error.value) {
      // Clear residual form error without adding a store API.
      error.value = null;
    }
  }
});

function openLogin(): void {
  dialogOpen.value = true;
}

function closeLogin(): void {
  dialogOpen.value = false;
}

async function submitMockLogin(): Promise<void> {
  try {
    await authStore.login(email.value);
    email.value = '';
    dialogOpen.value = false;
  } catch {
    /* error ref is populated by the store */
  }
}
</script>

<template>
  <div class="auth-chrome">
    <DtButton
      variant="ghost"
      data-testid="open-appearance"
      :aria-label="t('settings.appearance.title')"
      @click="appearance.openDialog()"
    >
      <DtIcon name="Palette" size="sm" />
      <span class="auth-chrome__label">{{ t('settings.appearance.menuLabel') }}</span>
    </DtButton>

    <template v-if="state.kind === 'authenticated'">
      <span class="auth-chrome__user" data-testid="auth-user">
        <DtIcon name="UserRound" size="sm" />
        {{ state.session.user.email }}
      </span>
      <DtButton
        variant="ghost"
        data-testid="auth-logout"
        :disabled="loading"
        @click="authStore.logout()"
      >
        <DtIcon name="LogOut" size="sm" />
        <span class="auth-chrome__label">{{ t('auth.logout') }}</span>
      </DtButton>
    </template>

    <button
      v-else
      type="button"
      class="auth-chrome__login-trigger"
      :data-testid="authMode === 'oidc' ? 'login-redirect' : 'login-mock-open'"
      @click="openLogin"
    >
      <DtIcon name="LogIn" size="sm" />
      <span>{{ authMode === 'oidc' ? t('auth.login') : t('auth.loginDev') }}</span>
    </button>

    <DtDialog
      v-model:open="dialogOpen"
      :title="authMode === 'oidc' ? t('auth.login') : t('auth.loginDev')"
      :aria-label="authMode === 'oidc' ? t('auth.login') : t('auth.loginDev')"
      :close-label="t('common.cancel')"
    >
      <template v-if="authMode === 'oidc'">
        <p class="auth-dialog__lead">{{ t('auth.oidcHint') }}</p>
        <a
          :href="loginHref"
          class="auth-dialog__oidc-link"
          data-testid="login-oidc-continue"
        >
          <DtIcon name="LogIn" size="sm" />
          {{ t('auth.continueOidc') }}
        </a>
      </template>

      <form
        v-else
        class="auth-dialog__form"
        data-testid="login-mock-form"
        @submit.prevent="submitMockLogin"
      >
        <p class="auth-dialog__lead">{{ t('auth.mockHint') }}</p>
        <label class="auth-dialog__field">
          <span class="auth-dialog__field-label">{{ t('auth.emailLabel') }}</span>
          <span class="auth-dialog__input-wrap">
            <DtIcon name="Mail" size="sm" />
            <input
              v-model="email"
              type="email"
              required
              autocomplete="username"
              :placeholder="t('auth.emailPlaceholder')"
              class="auth-dialog__input"
              data-testid="login-email"
            />
          </span>
        </label>
        <p v-if="error" class="auth-dialog__error" role="alert">{{ error }}</p>
        <div class="auth-dialog__actions">
          <DtButton variant="ghost" type="button" @click="closeLogin">
            {{ t('common.cancel') }}
          </DtButton>
          <DtButton variant="primary" type="submit" :disabled="loading">
            {{ t('auth.login') }}
          </DtButton>
        </div>
      </form>
    </DtDialog>
  </div>
</template>

<style scoped>
.auth-chrome {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
}
.auth-chrome__label {
  margin-left: var(--dt-space-xs);
}
.auth-chrome__user {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.auth-chrome__login-trigger {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  height: 32px;
  padding: 0 var(--dt-space-lg);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-pill);
  background: var(--dt-bg-surface);
  color: var(--dt-text-primary);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.auth-chrome__login-trigger:hover {
  border-color: var(--dt-accent-primary);
  color: var(--dt-accent-primary);
  background: var(--dt-bg-elevated);
}
.auth-chrome__login-trigger:focus-visible {
  outline: 2px solid var(--dt-accent-primary);
  outline-offset: 2px;
}

.auth-dialog__lead {
  margin: 0 0 var(--dt-space-lg);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  line-height: var(--dt-line-normal);
}
.auth-dialog__form {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
}
.auth-dialog__field {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
}
.auth-dialog__field-label {
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  color: var(--dt-text-secondary);
}
.auth-dialog__input-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-sm) var(--dt-space-md);
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
}
.auth-dialog__input-wrap:focus-within {
  border-color: var(--dt-accent-primary);
}
.auth-dialog__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  color: var(--dt-text-primary);
  font: inherit;
  font-size: var(--dt-text-sm);
  outline: none;
}
.auth-dialog__error {
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.auth-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--dt-space-sm);
  margin-top: var(--dt-space-sm);
}
.auth-dialog__oidc-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-sm);
  width: 100%;
  height: 40px;
  padding: 0 var(--dt-space-xl);
  border-radius: var(--dt-radius-sm);
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  text-decoration: none;
}
.auth-dialog__oidc-link:hover {
  background: var(--dt-accent-primary-hover);
}
</style>
