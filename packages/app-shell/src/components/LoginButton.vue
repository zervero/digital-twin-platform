<script setup lang="ts">
/**
 * Auth chrome + shared appearance entry + signed-in user hover menu.
 *
 * - Appearance is always available (anonymous or signed-in).
 * - Sign-in opens a DtDialog (mock email form or OIDC redirect CTA).
 * - Signed-in: email chip with hover menu — Ops / Admin (admin only) / Logout.
 *   Mode switching used to live in TopToolbar's center segmented control.
 */
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DtButton, DtDialog, DtIcon, DtTextField } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAuthStore } from '../stores/auth-store.js';
import { useAppearanceStore } from '../stores/appearance-store.js';
import { useLastAdminPath } from '../composables/useLastAdminPath.js';
import { useOIDCStart } from '../composables/useOIDCStart.js';

const { t } = useI18n();

const authStore = useAuthStore();
const appearance = useAppearanceStore();
const { state, error, loading } = storeToRefs(authStore);
const { loginHref, authMode } = useOIDCStart();

const route = useRoute();
const router = useRouter();
const lastAdminPath = useLastAdminPath();

const dialogOpen = ref(false);
const email = ref('');
const menuOpen = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const isAdmin = computed(() => {
  if (state.value.kind !== 'authenticated') return false;
  return state.value.session.user.roles.includes('admin');
});

const mode = computed<'ops' | 'admin'>(() =>
  route.path.startsWith('/admin') ? 'admin' : 'ops',
);

watch(
  () => route.fullPath,
  (path) => {
    lastAdminPath.remember(path);
  },
  { immediate: true },
);

watch(dialogOpen, (open) => {
  if (!open) {
    email.value = '';
    if (error.value) {
      error.value = null;
    }
  }
});

function clearHideTimer(): void {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function openMenu(): void {
  clearHideTimer();
  menuOpen.value = true;
}

function scheduleCloseMenu(): void {
  clearHideTimer();
  hideTimer = setTimeout(() => {
    menuOpen.value = false;
    hideTimer = null;
  }, 120);
}

function goOps(): void {
  menuOpen.value = false;
  void router.push('/ops');
}

function goAdmin(): void {
  menuOpen.value = false;
  void router.push(lastAdminPath.get());
}

async function logout(): Promise<void> {
  menuOpen.value = false;
  await authStore.logout();
}

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

onBeforeUnmount(() => {
  clearHideTimer();
});
</script>

<template>
  <div class="auth-chrome dt-inline-flex dt-items-center dt-gap-sm dt-icon-block">
    <DtButton
      class="dt-inline-flex dt-items-center"
      variant="ghost"
      data-testid="open-appearance"
      :aria-label="t('settings.appearance.title')"
      @click="appearance.openDialog()"
    >
      <DtIcon name="Palette" size="sm" />
      <span class="dt-leading-1 dt-px-sm">{{ t('settings.appearance.menuLabel') }}</span>
    </DtButton>

    <div
      v-if="state.kind === 'authenticated'"
      class="auth-chrome__user-wrap dt-relative"
      data-testid="auth-user-menu"
      @mouseenter="openMenu"
      @mouseleave="scheduleCloseMenu"
    >
      <span
        class="auth-chrome__user dt-inline-flex dt-items-center dt-gap-sm dt-h-control dt-px-md dt-rounded-sm dt-text-xs dt-leading-1 dt-text-secondary dt-truncate dt-pointer"
        data-testid="auth-user"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
      >
        <DtIcon name="UserRound" size="sm" />
        {{ state.session.user.email }}
      </span>

      <div
        v-show="menuOpen"
        class="auth-chrome__menu dt-absolute dt-bg-elevated dt-border dt-rounded-md dt-overflow-hidden"
        role="menu"
        data-testid="auth-user-menu-panel"
        @mouseenter="openMenu"
        @mouseleave="scheduleCloseMenu"
      >
        <button
          type="button"
          role="menuitem"
          class="auth-chrome__menu-item dt-appearance-none dt-flex dt-items-center dt-gap-sm dt-w-full dt-text-left dt-pointer dt-border-0 dt-bg-transparent dt-text-sm dt-text-primary dt-font-inherit"
          :class="{ 'is-active': mode === 'ops' }"
          data-testid="auth-menu-ops"
          @click="goOps"
        >
          <DtIcon name="LayoutDashboard" size="sm" />
          {{ t('shell.mode.ops') }}
        </button>
        <button
          v-if="isAdmin"
          type="button"
          role="menuitem"
          class="auth-chrome__menu-item dt-appearance-none dt-flex dt-items-center dt-gap-sm dt-w-full dt-text-left dt-pointer dt-border-0 dt-bg-transparent dt-text-sm dt-text-primary dt-font-inherit"
          :class="{ 'is-active': mode === 'admin' }"
          data-testid="auth-menu-admin"
          @click="goAdmin"
        >
          <DtIcon name="Settings2" size="sm" />
          {{ t('shell.mode.admin') }}
        </button>
        <button
          type="button"
          role="menuitem"
          class="auth-chrome__menu-item auth-chrome__menu-item--danger dt-appearance-none dt-flex dt-items-center dt-gap-sm dt-w-full dt-text-left dt-pointer dt-border-0 dt-bg-transparent dt-text-sm dt-font-inherit"
          data-testid="auth-logout"
          :disabled="loading"
          @click="logout"
        >
          <DtIcon name="LogOut" size="sm" />
          {{ t('auth.logout') }}
        </button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="auth-chrome__login-trigger dt-appearance-none dt-inline-flex dt-items-center dt-justify-center dt-gap-sm dt-h-control dt-px-lg dt-border dt-rounded-pill dt-bg-surface dt-text-primary dt-text-sm dt-font-medium dt-leading-1 dt-pointer"
      :data-testid="authMode === 'oidc' ? 'login-redirect' : 'login-mock-open'"
      @click="openLogin"
    >
      <DtIcon name="LogIn" size="sm" />
      <span class="dt-leading-1">{{
        authMode === 'oidc' ? t('auth.login') : t('auth.loginDev')
      }}</span>
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
          class="auth-dialog__oidc-link dt-inline-flex dt-items-center dt-justify-center dt-gap-sm dt-w-full dt-px-xl dt-rounded-sm dt-text-inverse dt-text-sm dt-font-medium dt-leading-1"
          data-testid="login-oidc-continue"
        >
          <DtIcon name="LogIn" size="sm" />
          {{ t('auth.continueOidc') }}
        </a>
      </template>

      <form
        v-else
        class="dt-flex dt-flex-col dt-gap-md"
        data-testid="login-mock-form"
        @submit.prevent="submitMockLogin"
      >
        <p class="auth-dialog__lead dt-m-0 dt-text-secondary dt-text-sm dt-leading-normal">
          {{ t('auth.mockHint') }}
        </p>
        <label class="dt-flex dt-flex-col dt-gap-sm">
          <span class="dt-text-xs dt-font-medium dt-text-secondary">{{
            t('auth.emailLabel')
          }}</span>
          <DtTextField
            v-model="email"
            type="email"
            autocomplete="username"
            :placeholder="t('auth.emailPlaceholder')"
            data-testid="login-email"
          >
            <template #prefix>
              <DtIcon name="Mail" size="sm" />
            </template>
          </DtTextField>
        </label>
        <p v-if="error" class="dt-m-0 dt-text-danger dt-text-xs" role="alert">
          {{ error }}
        </p>
        <div class="dt-flex dt-justify-end dt-gap-sm dt-mt-sm">
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
.auth-chrome__user {
  max-width: 180px;
}

.auth-chrome__user:hover,
.auth-chrome__user-wrap:hover .auth-chrome__user {
  color: var(--dt-text-primary);
  background: var(--dt-bg-surface-hover);
}

.auth-chrome__menu {
  top: calc(100% + 2px);
  right: 0;
  z-index: 20;
  min-width: 10rem;
  padding: var(--dt-space-xs);
  box-shadow: var(--dt-shadow-md);
}

.auth-chrome__menu-item {
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-primary);
  transition: background var(--dt-duration-fast) var(--dt-ease-default);
}

.auth-chrome__menu-item:hover:not(:disabled) {
  background: var(--dt-bg-surface-hover);
}

.auth-chrome__menu-item.is-active {
  color: var(--dt-accent-primary);
  background: var(--dt-bg-surface);
}

.auth-chrome__menu-item--danger {
  color: var(--dt-accent-danger);
}

.auth-chrome__menu-item--danger:hover:not(:disabled) {
  background: var(--dt-status-alarm-bg);
}

.auth-chrome__menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-chrome__login-trigger {
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
  margin-bottom: var(--dt-space-lg);
}

.auth-dialog__oidc-link {
  height: 40px;
  background: var(--dt-accent-primary);
  text-decoration: none;
}

.auth-dialog__oidc-link:hover {
  background: var(--dt-accent-primary-hover);
}
</style>
