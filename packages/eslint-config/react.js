import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import base from './index.js';

/** Config for the React SPA. */
export default [
  ...base,
  reactHooks.configs.flat['recommended-latest'] ?? reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
];
