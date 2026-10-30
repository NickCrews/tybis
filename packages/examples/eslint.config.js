import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import jseslint from '@eslint/js';
import globals from 'globals';

export default defineConfig(
  jseslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['node_modules/'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'eslint.config.js',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
    },
  }
);
