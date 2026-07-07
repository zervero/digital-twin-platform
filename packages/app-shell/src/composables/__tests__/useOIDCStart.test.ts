/**
 * Tests for useOIDCStart (V3.0 T6).
 *
 * Validates the URL the LoginButton should navigate to for
 * each auth mode. No Vue runtime needed — the composable is
 * pure logic gated by inject(), so we set up an app with the
 * keys + a host component to read the result.
 */

import { createApp, defineComponent, h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import { useOIDCStart, AuthModeKey, BffBaseUrlKey } from '../useOIDCStart.js';

interface Captured {
  loginHref: string;
  authMode: 'mock' | 'oidc';
}

function mountWith(mode: 'mock' | 'oidc', bff: string): Promise<Captured> {
  return new Promise((resolve, reject) => {
    let captured: Captured | null = null;
    const Probe = defineComponent({
      setup() {
        const { loginHref, authMode } = useOIDCStart();
        captured = {
          loginHref: loginHref.value,
          authMode: authMode.value,
        };
        return () => h('div');
      },
    });
    const app = createApp(Probe);
    app.provide(AuthModeKey, mode);
    app.provide(BffBaseUrlKey, bff);
    const host = document.createElement('div');
    document.body.appendChild(host);
    try {
      app.mount(host);
      nextTick().then(() => {
        if (!captured) reject(new Error('composable did not run'));
        else resolve(captured);
      });
    } catch (e) {
      reject(e);
    }
  });
}

describe('useOIDCStart', () => {
  it('points at /api/auth/oidc/start in oidc mode', async () => {
    const res = await mountWith('oidc', 'http://localhost:3001');
    expect(res.loginHref).toBe('http://localhost:3001/api/auth/oidc/start');
    expect(res.authMode).toBe('oidc');
  });

  it('points at /api/auth/login in mock mode', async () => {
    const res = await mountWith('mock', 'http://localhost:3001');
    expect(res.loginHref).toBe('http://localhost:3001/api/auth/login');
    expect(res.authMode).toBe('mock');
  });

  it('strips a trailing slash from the BFF base url', async () => {
    const res = await mountWith('oidc', 'http://localhost:3001/');
    expect(res.loginHref).toBe('http://localhost:3001/api/auth/oidc/start');
  });

  it('falls back to defaults when no provider keys are injected', async () => {
    // No app.provide() calls — verifies the inject() default
    // values keep the composable safe to use without the
    // V3.0 boot wiring (e.g. older AppShell consumers).
    const Probe = defineComponent({
      setup() {
        const { loginHref, authMode } = useOIDCStart();
        return () => h('div', { 'data-login-href': loginHref.value, 'data-auth-mode': authMode.value });
      },
    });
    const app = createApp(Probe);
    const host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);
    await nextTick();
    expect(host.firstElementChild?.getAttribute('data-login-href')).toBe(
      'http://localhost:3001/api/auth/login',
    );
    expect(host.firstElementChild?.getAttribute('data-auth-mode')).toBe('mock');
  });
});
