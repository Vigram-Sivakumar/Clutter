module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    browser: true,
    es2022: true,
  },
  globals: {
    React: 'readonly',
    NodeJS: 'readonly',
  },
  rules: {
    // 🔒 UI BOUNDARY: Presentational components
    // ✅ CAN import: domain, state, shared
    // ❌ CANNOT import: editor, apps
    //
    // ⚠️ TEMPORARY: Warnings only until Phase 2-4 (Editor Extraction) is complete
    // TODO: Change to 'error' after moving editor components out of UI
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['@clutter/editor', '@clutter/editor/*'],
            message:
              '⚠️ ui should not import from editor. Apps compose editor + ui. (Will be enforced after Phase 2-4)',
          },
        ],
      },
    ],
  },
};
