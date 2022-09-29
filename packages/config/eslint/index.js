// @ts-check

/** @type {import("eslint").Linter.Config} */
const eslintConfig = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:prettier/recommended'],
  plugins: ['@typescript-eslint', 'import', 'unused-imports'],
  rules: {
    'no-unused-vars': ['off'],
    eqeqeq: ['error'],
    '@typescript-eslint/no-unused-vars': ['off'],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-duplicates': 'error',
    'sort-imports': [
      'error',
      {
        // Let eslint-plugin-import handle declaration groups above.
        ignoreDeclarationSort: true,
        // Sort within import statements.
        ignoreMemberSort: false,
      },
    ],
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
}

module.exports = eslintConfig
