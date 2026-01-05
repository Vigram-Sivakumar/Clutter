module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // 🔒 SHARED BOUNDARY: Pure utilities & hooks
    // ✅ CAN import: domain, state
    // ❌ CANNOT import: editor, ui, apps
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@clutter/editor', '@clutter/editor/*'],
            message: '❌ shared cannot import from editor. Keep shared generic.',
          },
          {
            group: ['@clutter/ui', '@clutter/ui/*'],
            message: '❌ shared cannot import from ui. Keep shared generic.',
          },
        ],
      },
    ],
  },
};
