import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(globalIgnores(['dist', 'coverage']), tseslint.configs.recommended, {
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
});
