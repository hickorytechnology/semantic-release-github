module.exports = {
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
    'class-methods-use-this': 'off',
    'comma-dangle': 'off',
    'function-paren-newline': 'off',
    'implicit-arrow-linebreak': 'off',
    'no-template-curly-in-string': 'off',
    'object-curly-newline': 'off',
    'operator-linebreak': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
