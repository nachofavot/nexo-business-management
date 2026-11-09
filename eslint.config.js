import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const IGNORED = ['dist', 'coverage', '.claude', '.playwright-mcp', '.superpowers'];

export default defineConfig(globalIgnores(IGNORED), tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-cond-assign': 'error',
    'no-constant-condition': 'error',
    'no-debugger': 'error',
    'no-empty': 'error',
  },
});
