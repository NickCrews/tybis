import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import jseslint from '@eslint/js';
import globals from 'globals';

export default defineConfig(
  jseslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['dist/', 'playground/', 'node_modules/'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
    },
  }
);
