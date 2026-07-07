import tseslint from 'typescript-eslint';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/coverage/**', '**/.turbo/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: { vue: vuePlugin },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    rules: {
      // Apply the underscore-prefix ignore globally so .ts
      // files (where this convention is heavily used for
      // intentionally-unused callback params and the like)
      // behave the same as .vue files.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
);
