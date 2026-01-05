module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // 🔒 STATE BOUNDARY: Zustand stores
    // ✅ CAN import: domain
    // ❌ CANNOT import: shared, editor, ui, apps
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@clutter/shared', '@clutter/shared/*'],
            message: '❌ state cannot import from shared. State should only depend on domain.',
          },
          {
            group: ['@clutter/editor', '@clutter/editor/*'],
            message: '❌ state cannot import from editor. State should only depend on domain.',
          },
          {
            group: ['@clutter/ui', '@clutter/ui/*'],
            message: '❌ state cannot import from ui. State should only depend on domain.',
          },
        ],
      },
    ],
  },
};

