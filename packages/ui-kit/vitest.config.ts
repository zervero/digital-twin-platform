import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    // Element Plus date-picker mount is heavier than bare Dt* smoke tests.
    testTimeout: 20_000,
  },
});
