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
};

