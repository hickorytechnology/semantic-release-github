module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'airbnb-base', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  rules: {
    'max-len': ['error', {
      code: 140,
      tabWidth: 2,
      ignoreTrailingComments: true,
      ignoreComments: true,
    }],
    'import/prefer-default-export': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'comma-dangle': 'off',
    'function-paren-newline': 'off',
    'implicit-arrow-linebreak': 'off',
    'no-template-curly-in-string': 'off',
    'object-curly-newline': 'off',
    'operator-linebreak': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
