module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['node_modules', 'dist', '**/__validation__.ts'],
  rules: {
    // 🔒 EDITOR BOUNDARY: Isolated editing engine
    // ❌ CANNOT import: domain, state, shared, ui, apps
    // Editor is intentionally isolated - dependencies injected via EditorProvider
    //
    // ⚠️ TEMPORARY: Warnings only until Phase 2-4 (Editor Extraction) is complete
    // TODO: Change to 'error' after completing editor isolation refactor
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['@clutter/domain', '@clutter/domain/*'],
            message: '⚠️ editor should not import from domain. Use EditorProvider for dependency injection. (Will be enforced after Phase 2-4)',
          },
          {
            group: ['@clutter/state', '@clutter/state/*'],
            message: '⚠️ editor should not import from state. Use EditorProvider for dependency injection. (Will be enforced after Phase 2-4)',
          },
          {
            group: ['@clutter/shared', '@clutter/shared/*'],
            message: '⚠️ editor should not import from shared. Use EditorProvider for dependency injection. (Will be enforced after Phase 2-4)',
          },
          {
            group: ['@clutter/ui', '@clutter/ui/*'],
            message: '⚠️ editor should not import from ui. Editor should be UI-agnostic. (Will be enforced after Phase 2-4)',
          },
        ],
      },
    ],
  },
};
