import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(globalIgnores(['dist', 'coverage']), tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-cond-assign': 'error',
    'no-constant-condition': 'error',
    'no-debugger': 'error',
    'no-empty': 'error',
  },
});
