# 4. Enforcing Code Quality and Consistency

Code quality tooling prevents bugs, maintains consistency, and enforces best practices automatically. For React 19 component libraries, modern tooling configurations leverage ESLint 9's flat config, Husky v9 for git hooks, and lint-staged for efficient pre-commit checks.

## ESLint 9 flat config for React 19 and TypeScript

ESLint 9 introduces flat config as the default configuration format, replacing legacy .eslintrc files. Flat config provides **better performance**, explicit imports, and simpler inheritance patterns. The legacy format will be removed in ESLint 10, making migration essential.

```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    
    settings: {
      react: {
        version: 'detect',
      },
      'jsx-a11y': {
        polymorphicPropName: 'as',
        components: {
          Button: 'button',
          Link: 'a',
          Input: 'input',
        },
      },
    },
    
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'storybook-static/**',
    ],
  },
  
  eslintConfigPrettier,
];
```

Flat config uses **explicit imports** rather than string-based package names, making the dependency graph clear and enabling better IDE support. The configuration array composes multiple rule sets, with later entries overriding earlier ones. This composability makes extending and customizing configurations straightforward.

## Essential plugins for React 19 development

### eslint-plugin-react-hooks

**eslint-plugin-react-hooks** enforces React Hooks rules, preventing common mistakes like conditional hooks or missing dependencies. For React 19, these rules remain critical-the compiler may optimize hook calls, but violations still cause bugs:

```javascript
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
}
```

The rules-of-hooks error prevents hooks in conditions or loops, while exhaustive-deps warns about missing effect dependencies. Set exhaustive-deps to 'warn' rather than 'error'-occasionally you genuinely need to omit dependencies, and warnings allow override with eslint-disable comments.

### eslint-plugin-jsx-a11y

**eslint-plugin-jsx-a11y** catches accessibility issues at development time, preventing WCAG violations before they reach production:

```javascript
settings: {
  'jsx-a11y': {
    polymorphicPropName: 'as',
    components: {
      Button: 'button',
      Link: 'a',
      Input: 'input',
    },
  },
}
```

The components mapping tells the plugin **how to analyze custom components**. Mapping your Button to the button element enables rules like button-has-type and accessible-button-name. This configuration makes accessibility checking accurate for component libraries.

### @typescript-eslint

**@typescript-eslint** provides TypeScript-aware linting, catching type-related issues that tsc might miss:

```javascript
languageOptions: {
  parserOptions: {
    project: './tsconfig.json',
  },
},
rules: {
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
  '@typescript-eslint/no-explicit-any': 'warn',
}
```

Type-aware linting requires **project configuration**, enabling rules that understand your TypeScript types. This unlocks powerful checks like no-floating-promises and no-unnecessary-type-assertion.

## Automated quality gates with Husky v9 and lint-staged

Husky v9 simplifies git hook management, ensuring code quality checks run automatically before commits reach your repository:

```bash
# Install dependencies
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky init

# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

Husky v9 uses **simpler initialization** compared to v8-`husky init` replaces the deprecated `husky install`. The init command creates the .husky directory, adds a prepare script to package.json, and creates a pre-commit hook file automatically.

Configure lint-staged to run appropriate checks on staged files:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --max-warnings=0 --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

Lint-staged runs these commands **only on staged files**, making pre-commit checks fast regardless of repository size. The --fix flag automatically corrects ESLint violations when possible, and prettier --write formats code consistently. Setting --max-warnings=0 ensures even warnings block commits, maintaining high code quality.

For advanced use cases, use JavaScript configuration for dynamic commands:

```javascript
// lint-staged.config.js
export default {
  '*.{ts,tsx}': [
    (filenames) => `eslint ${filenames.join(' ')} --fix`,
    (filenames) => `prettier --write ${filenames.join(' ')}`,
    () => 'tsc --noEmit', // Type check entire project
  ],
};
```

The function form enables **context-aware commands**. Running `tsc --noEmit` as a function rather than per-file ensures type checking happens once for the entire project, detecting cross-file type errors that isolated checks would miss.

## Complete package.json scripts for code quality

```json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "typecheck": "tsc --noEmit"
  }
}
```

These scripts provide **consistent quality commands** across local development and CI. The prepare script runs automatically after npm install, ensuring Husky initializes for all contributors. Separating lint:fix and format enables selective execution, while format:check validates formatting without modification.

---

**Previous:** [Configuring Storybook for Premier Development and Documentation](./03-storybook-configuration.md)  
**Next:** [Continuous Integration with GitLab](./05-ci-cd.md)
