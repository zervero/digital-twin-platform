/**
 * Ambient shim for side-effect CSS imports (e.g. AppShell → utilities.css).
 * Apps that extend `tooling/tsconfig/vue.json` get this via `vite/client`;
 * `@dt/app-shell` uses `vue-lib` and needs a local declaration.
 */
declare module '*.css';
