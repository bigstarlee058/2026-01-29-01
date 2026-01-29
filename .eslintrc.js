module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true,  // Allows browser globals like window, document, localStorage
    es6: true,      // Allows ES6+ globals like Promise, Set, Map
    node: true      // Allows Node.js globals like console
  },
  rules: {
    'react/prop-types': 'off',
    'react/no-children-prop': 'off',
    'no-constant-condition': 'off',
    'react/no-unknown-property': 'off',
    'react/display-name': 'off',
    'react/jsx-no-undef': 'warn',
    'no-dupe-class-members': 'off',
    'no-unused-vars': 'off',
    'no-console': 'off',
    'no-undef': 'warn',
    'no-case-declarations': 'off',
    'no-empty': 'off',
    'no-fallthrough': 'off'
  },
  overrides: [
    {
      files: ['**/*.spec.js', '**/*.spec.ts'],
      rules: {
        'testing-library/no-node-access': 'off',
        'testing-library/prefer-screen-queries': 'off'
      }
    }
  ]
}; 