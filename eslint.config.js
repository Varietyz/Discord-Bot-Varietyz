const jsdoc = require('eslint-plugin-jsdoc');
const node = require('eslint-plugin-n');

module.exports = [
  {
    files: ['src/**/*.js'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/logs/**',
      '**/docs/**',
      '**/.vscode/**',
      '**/.eslintrc.js',
      '**/*.code-workspace',
      '**/.inv',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      jsdoc,
      node,
    },
    rules: {
      'node/no-missing-require': ['error', { allowModules: ['@discordjs/rest', 'p-queue'] }],
      'node/no-unpublished-require': 'error',
      'node/no-deprecated-api': 'error',
      'node/callback-return': 'error',
      'node/exports-style': ['error', 'module.exports'],
      'no-process-exit': 'off',
      indent: ['error', 4],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'max-len': ['warn', { code: 250 }],
      'no-console': 'warn',
      'prefer-const': 'warn',
    },
  },
];