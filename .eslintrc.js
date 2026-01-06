module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    node: true,
    es2022: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    '.turbo',
    'coverage',
    '**/*.config.js',
    '**/*.config.ts',
  ],
  // Default rules (can be overridden by package-specific configs)
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: [
        'packages/ui/**/*.{ts,tsx}',
        'packages/editor/**/*.{ts,tsx}',
        'apps/desktop/**/*.{ts,tsx}',
        'apps/web/**/*.{ts,tsx}',
      ],
      env: {
        browser: true,
        es2022: true,
      },
      globals: {
        React: 'readonly',
        NodeJS: 'readonly',
      },
    },
  ],
};
