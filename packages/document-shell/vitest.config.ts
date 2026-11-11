import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    // vxe-table install + first grid mount is slow under happy-dom.
    testTimeout: 20_000,
  },
});
