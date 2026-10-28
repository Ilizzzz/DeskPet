import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.vite/**',
      'out/**',
      'dist/**',
      'build/**',
      '.tmp-assets/**',
      '.tmp-preview/**',
      'deskpet-forge-template/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
