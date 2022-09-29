// @ts-check

const fs = require('fs')
const path = require('path')

const tsConfig = fs.existsSync('tsconfig.json')
  ? path.resolve('tsconfig.json')
  : fs.existsSync('types/tsconfig.json')
  ? path.resolve('types/tsconfig.json')
  : undefined

/** @type {import("eslint").Linter.Config} */
const eslintConfig = {
  extends: ['plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  env: {
    es6: true,
  },
  overrides: [
    {
      files: ['**/*.d.ts', '**/*.ts', '**/*.tsx'],
      excludedFiles: ['**/node_modules/**'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'import', 'unused-imports'],
      parserOptions: {
        project: tsConfig,
      },
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
    },
  ],
}

module.exports = eslintConfig
