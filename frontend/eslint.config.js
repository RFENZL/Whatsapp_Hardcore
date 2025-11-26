import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        URL: 'readonly',
        WebSocket: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        File: 'readonly',
        Headers: 'readonly',
        Notification: 'readonly',
        crypto: 'readonly',
        BroadcastChannel: 'readonly',
        global: 'readonly',
        module: 'readonly',
        nextTick: 'readonly',
        io: 'readonly',
        socket: 'readonly'
      }
    },
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-prop-types': 'warn',
      'vue/html-indent': ['error', 2],
      'vue/max-attributes-per-line': ['error', {
        singleline: 3,
        multiline: 1
      }],
      'vue/html-self-closing': ['error', {
        html: {
          void: 'always',
          normal: 'never',
          component: 'always'
        }
      }]
    }
  },
  {
    files: ['**/*.spec.js', '**/*.test.js', 'e2e/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      'no-unused-expressions': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**'
    ]
  }
];
