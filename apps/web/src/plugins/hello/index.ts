/**
 * Sample "hello" plugin.
 *
 * Contributes a single `ui-panel` whose body says "Hello,
 * {displayName}". Requires `auth:login` in its manifest so the
 * permission gate has something to enforce. The body of the
 * panel can be replaced; the point of this plugin is to prove
 * the extension-point wiring end to end.
 */

import { defineComponent, h } from 'vue';

import type { PluginRegistration } from '@dt/plugin-runtime';

const HelloPanelBody = defineComponent({
  name: 'HelloPanelBody',
  props: {
    displayName: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'hello-panel' }, [
      h('p', { class: 'hello-panel__greeting' }, `Hello, ${props.displayName}!`),
      h('p', { class: 'hello-panel__hint' },
        'This panel is contributed by the `hello` sample plugin.'),
    ]);
  },
});

export const helloPlugin: PluginRegistration = {
  manifest: {
    id: 'hello',
    name: 'Hello Plugin',
    version: '1.0.0',
    vendor: '@dt/samples',
    description: 'Sample plugin that proves the extension-point wiring.',
    permissions: ['auth:login'],
  },
  activate: async (ctx) => {
    // The host is responsible for putting the user's
    // displayName somewhere the panel can read. V2.2 doesn't
    // ship an auth-user context; the panel falls back to
    // "friend" when the activation context says the user is
    // permitted (always true once `auth:login` is granted).
    const displayName = ctx.grantedPermissions.includes('auth:login')
      ? 'friend'
      : 'stranger';
    return [
      {
        kind: 'ui-panel',
        panel: {
          id: 'hello-panel',
          title: 'Hello',
          // The runtime accepts a structural PluginComponent
          // (anything with a render / setup function). A real
          // Vue `defineComponent` is assignable.
          component: defineComponent({
            name: 'HelloPanelHost',
            render: () => h(HelloPanelBody, { displayName }),
          }),
        },
      },
    ];
  },
};
