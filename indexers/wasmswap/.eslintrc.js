// @ts-check

/** @type {import("eslint").Linter.Config} */
const eslintConfig = {
  extends: [require.resolve('config/eslint')],
  ignorePatterns: ['node_modules', 'dist'],
  root: true,
}

module.exports = eslintConfig
