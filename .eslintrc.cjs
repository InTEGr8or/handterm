module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.test.json'],
    ecmaFeatures: {
      jsx: true,
    },
    tsconfigRootDir: __dirname,
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'testing-library',
    'import'
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/internal-regex': '^@/',
  },
  rules: {
    // React Rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-handler-names': 'warn',
    'react/jsx-key': ['error', { checkFragmentShorthand: true }],

    // TypeScript Rules
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      // Only allow underscore prefix for callback parameters and catch clause variables
      argsIgnorePattern: '^_[a-zA-Z][a-zA-Z0-9]*$',
      varsIgnorePattern: null, // Don't allow unused variables with underscore prefix
      caughtErrorsIgnorePattern: '^_error$', // Only allow _error in catch clauses
      destructuredArrayIgnorePattern: '^_', // Allow unused array destructuring with underscore
      ignoreRestSiblings: true, // Ignore rest siblings in object destructuring
    }],
    '@typescript-eslint/naming-convention': [
      'error',
      // Enforce camelCase for variables, properties, and methods
      {
        selector: ['variable', 'parameter', 'property', 'method'],
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'forbid',
      },
      // Allow PascalCase for types, interfaces, and classes
      {
        selector: ['typeLike', 'enumMember'],
        format: ['PascalCase'],
      },
      // Enforce that unused parameters start with underscore
      {
        selector: 'parameter',
        modifiers: ['unused'],
        format: ['camelCase'],
        leadingUnderscore: 'require',
      },
      // Enforce that catch clause parameters are named _error
      {
        selector: 'parameter',
        modifiers: ['unused'],
        filter: {
          regex: '^_error$',
          match: true,
        },
        format: ['camelCase'],
        leadingUnderscore: 'require',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['warn', {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
      disallowTypeAnnotations: true,
    }],
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
        checksConditionals: true,
        checksSpreads: true,
      },
    ],
    '@typescript-eslint/no-floating-promises': ['warn', {
      ignoreVoid: true,
      ignoreIIFE: true,
    }],
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-redundant-type-constituents': 'error',

    // Import Rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type'
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before'
          },
          {
            pattern: '@preact/**',
            group: 'external',
            position: 'after'
          },
          {
            pattern: '@tanstack/**',
            group: 'external',
            position: 'after'
          },
          {
            pattern: '@testing-library/**',
            group: 'external',
            position: 'after'
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['react', '@preact/**'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/no-duplicates': 'error',
    'import/no-named-as-default-member': 'off',
    'import/namespace': 'off',
    'import/export': 'error',
    'import/first': 'error',
    'import/no-cycle': ['warn', {
      maxDepth: 1,
      ignoreExternal: true
    }],
    'import/no-unresolved': 'error',

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility Rules
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
    'jsx-a11y/media-has-caption': 'warn',

    // General Rules
    'consistent-return': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    'public',
    '*.config.js',
    '*.config.ts',
    'vite.config.ts',
    'vitest.config.ts',
  ],
  overrides: [
    // Test Files
    {
      files: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/__tests__/**/*.[jt]s?(x)',
        'e2e/**/*.[jt]s?(x)',
        'tests/**/*.[jt]s?(x)',
        'src/test-utils/**/*',
      ],
      extends: ['plugin:testing-library/react'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        'testing-library/no-unnecessary-act': 'warn',
        'testing-library/prefer-screen-queries': 'error',
        'testing-library/no-wait-for-multiple-assertions': 'warn',
        'testing-library/no-render-in-setup': 'off',
        'testing-library/no-node-access': 'warn',
        'testing-library/render-result-naming-convention': 'warn',
        'testing-library/no-debugging-utils': process.env.CI ? 'error' : 'warn',
        'import/no-duplicates': 'off',
        'import/first': 'error',
        'import/order': 'error',
        'import/export': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', {
          // More lenient unused vars rules for tests
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
        '@typescript-eslint/naming-convention': 'off', // More lenient naming in tests
      },
    },
    // E2E Test Files
    {
      files: ['e2e/**/*.[jt]s?(x)', 'tests/**/*.[jt]s?(x)', 'tests-examples/**/*'],
      rules: {
        'testing-library/prefer-screen-queries': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'testing-library/no-render-in-setup': 'off',
      },
    },
    // TypeScript Declaration Files
    {
      files: ['*.d.ts', 'src/**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-duplicates': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        'import/no-cycle': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/ban-types': 'off',
      },
    },
    // Configuration and Build Files
    {
      files: [
        '*.config.ts',
        '*.config.js',
        'vite.config.ts',
        'vitest.config.ts',
        'scripts/**/*',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-default-export': 'off',
        'no-console': 'off',
      },
    },
    // Mock Files
    {
      files: ['src/__mocks__/**/*', 'src/test-utils/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/unbound-method': 'off',
      },
    },
  ],
};
