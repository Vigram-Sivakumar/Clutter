module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // 🔒 DOMAIN BOUNDARY: Pure types & constants only
    // ❌ Cannot import from ANY other package
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@clutter/*'],
            message: '❌ domain cannot import from other packages. It must remain pure (types & constants only).',
          },
        ],
      },
    ],
  },
};

