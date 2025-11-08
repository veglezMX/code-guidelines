# Code Quality:

**Stack:** React 19, TypeScript 5, ESLint (Flat config), Prettier, Husky, lint-staged
**Scope:** Single repo or monorepo (packages/*)
**Goal:** Strict, automated consistency for large teams

## 1) Why this setup

* **Strict Type Safety:** Type-aware ESLint rules catch async and nullability pitfalls early.
* **Team-wide Consistency:** Automated sorting (imports, object keys, JSX props) and unused import cleanup.
* **Fast Feedback Loop:** Pre-commit checks fix most issues automatically; CI enforces the same.
* **Monorepo Ready:** Globs and tsconfig path resolution work across packages.

---

## 2) Dependencies

Install as devDependencies:

```bash
# ESLint + TypeScript + React + a11y + extras
pnpm add -D eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin \
eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
eslint-plugin-perfectionist eslint-plugin-unused-imports \
eslint-config-prettier

# Prettier
pnpm add -D prettier

# Git hooks automation
pnpm add -D husky lint-staged
```

> Use `npm` or `yarn` if preferred. The configs below are package-manager agnostic.

---

## 3) File: `eslint.config.js` (Flat Config, Type-Aware)

```js
// eslint.config.js
import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import perfectionist from "eslint-plugin-perfectionist";
import unused from "eslint-plugin-unused-imports";
// Disable formatting rules that conflict with Prettier:
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * Notes:
 * - Type-aware rules require parserOptions.project. Make sure tsconfig.json includes all source files.
 * - For monorepos, consider an eslint.config.js at root and package-level tsconfigs that extend from root.
 * - This config demonstrates both single-repo and monorepo patterns.
 */
export default [
  js.configs.recommended,
  // --- Shared config for all TypeScript files ---
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      ".next/**",
      ".turbo/**",
      // Monorepo build outputs:
      "packages/**/dist/**",
      "packages/**/build/**",
      "packages/**/.next/**",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Single repo: use ./tsconfig.json
        // Monorepo: use array like ["./tsconfig.json", "./packages/*/tsconfig.json"]
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": a11y,
      perfectionist,
      "unused-imports": unused,
    },
    rules: {
      // --- TypeScript safety ---
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/no-unnecessary-condition": ["warn", { allowConstantLoopConditions: true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/strict-boolean-expressions": ["warn", { 
        allowString: false, 
        allowNumber: false, 
        allowNullableObject: false 
      }],
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": "off", // replaced by unused-imports
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/require-await": "warn",
      // --- React 19 & Hooks ---
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // --- A11y baseline ---
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "warn",
      // --- Hygiene & dead code ---
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // --- Ordering / formatting consistency (let Prettier do code style) ---
      "perfectionist/sort-imports": [
        "warn",
        {
          type: "natural",
          newlinesBetween: "always",
          groups: [
            // tune to your path aliases
            ["builtin", "external"],
            ["internal", "parent", "sibling", "index"],
          ],
        },
      ],
      "perfectionist/sort-objects": ["warn", { type: "asc", ignoreCase: true }],
      "perfectionist/sort-jsx-props": [
        "warn",
        { type: "asc", ignoreCase: true, shorthandFirst: true },
      ],
      // Style-related rules offloaded to Prettier:
      "max-len": "off",
      "arrow-parens": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  // --- Monorepo-specific configs (optional, uncomment and adapt as needed) ---
  // {
  //   files: ["packages/ui/**/*.{ts,tsx}"],
  //   languageOptions: {
  //     parserOptions: {
  //       project: "./packages/ui/tsconfig.json",
  //       tsconfigRootDir: process.cwd(),
  //     },
  //   },
  //   rules: {
  //     // UI-specific overrides
  //   },
  // },
  // {
  //   files: ["packages/api/**/*.ts"],
  //   languageOptions: {
  //     parserOptions: {
  //       project: "./packages/api/tsconfig.json",
  //       tsconfigRootDir: process.cwd(),
  //     },
  //   },
  //   rules: {
  //     "react-hooks/rules-of-hooks": "off", // no React in API layer
  //   },
  // },
  // Keep this as the last entry so it disables conflicting rules globally:
  eslintConfigPrettier,
];
```

### Monorepo note

* If each package has its own `tsconfig.json`, ESLint will pick it up when run from that package's directory.
* If running ESLint from the root, set `parserOptions.project` to an array of paths (e.g., `["./tsconfig.json", "./packages/*/tsconfig.json"]`). In flat config, you can create per-package config blocks with matching `files` globs.
* The example above includes commented-out monorepo configs for UI and API packages. Uncomment and adapt these blocks to match your project structure.
* For monorepos, consider using different rules per package type (e.g., disable React rules in backend packages).

---

## 4) File: `prettier.config.cjs`

```cjs
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  arrowParens: "always",
  endOfLine: "lf",
  proseWrap: "always",
};
```

---

## 5) Ignore Files

**.eslintignore**

```
node_modules
dist
build
coverage
*.min.js
# Monorepo outputs
packages/*/dist
packages/*/build
```

**.prettierignore**

```
node_modules
dist
build
coverage
package-lock.json
pnpm-lock.yaml
yarn.lock
```

---

## 6) TypeScript Baseline (excerpt of `tsconfig.json`)

> Ensure ESLint can “see” all sources you want checked.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": false,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"] // adjust for your aliases or per-package
    }
  },
  "include": ["src", "tests", "types", "scripts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
```

---

## 7) Package Scripts (`package.json`)

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --check",
    "format:write": "prettier . --write",
    "typecheck": "tsc --noEmit",
    "qa": "pnpm run format && pnpm run lint && pnpm run typecheck",
    "qa:fix": "pnpm run format:write && pnpm run lint:fix && pnpm run typecheck"
  },
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix",
      "bash -c 'tsc --noEmit'"
    ],
    "**/*.{md,json,yml,yaml,css,scss,html}": [
      "prettier --write"
    ]
  }
}
```

> We embed **lint-staged** configuration in `package.json` for simplicity. If you prefer a separate file, create `.lintstagedrc.json` with the same content.

---

## 8) Husky Hooks

Initialize Husky and add a pre-commit hook:

```bash
# once per repo
pnpm dlx husky init

# then create the hook
echo "pnpm exec lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

> On commit, **lint-staged** will run **ESLint --fix** for code and **Prettier** for text/config files. Only staged files are processed → fast and focused.

---

## 9) CI Integration

### 9.1 GitHub Actions (`.github/workflows/quality.yml`)

```yaml
name: Quality

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      # Type check first for early failure
      - run: pnpm run typecheck
      # Lint with no auto-fix in CI
      - run: pnpm run lint
      # Enforce formatting (no write)
      - run: pnpm run format
```

### 9.2 GitLab CI (`.gitlab-ci.yml`)

```yaml
stages: [quality]

quality:
  stage: quality
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - corepack enable
    - corepack prepare pnpm@9 --activate
    - pnpm install --frozen-lockfile
  script:
    - pnpm run typecheck
    - pnpm run lint
    - pnpm run format
  only:
    - merge_requests
    - main
```

> In CI we **do not** write fixes; we fail the job if issues exist. Devs run `qa:fix` locally.

---

## 10) VS Code Settings (recommended) — `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.useFlatConfig": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "eslint.codeActionsOnSave.rules": {
    "source.fixAll.eslint": true
  },
  "files.eol": "\n"
}
```

---

## 11) Rules Rationale (Highlights)

* **Type safety**

  * `@typescript-eslint/no-floating-promises`: prevents silently dropped async errors.
  * `@typescript-eslint/no-unnecessary-condition`: flags redundant checks and potential nullish pitfalls.
  * `@typescript-eslint/consistent-type-imports`: stable import style; avoids circular/side-effect surprises.
  * `@typescript-eslint/await-thenable`: ensures you only await promises, not non-promise values.
  * `@typescript-eslint/strict-boolean-expressions`: enforces explicit boolean conversions to prevent truthiness bugs.
  * `@typescript-eslint/require-await`: warns about async functions that don't use await.
  * `@typescript-eslint/no-confusing-void-expression`: prevents confusing void return values in expressions.

* **React 19**

  * No need for `react/react-in-jsx-scope`; modern JSX transform.
  * Hooks rules enforce correctness of `useEffect`, `useMemo`, etc.

* **A11y**

  * Baseline rules (`alt-text`, `anchor-is-valid`) protect users and keep accessibility visible in code review.

* **Hygiene**

  * `unused-imports/*`: automatic dead-code cleanup improves readability and tree-shaking.

* **Consistency/Ordering**

  * `perfectionist/*`: deterministic imports, objects, and JSX prop order → fewer diff conflicts, easier reviews.

* **Prettier**

  * Single source of formatting truth; ESLint focuses on correctness and architecture, not code style.

---

## 12) Running Locally

```bash
pnpm run qa:fix     # fix + format everything
pnpm run lint       # check only
pnpm run format     # check formatting only
```

---

## 13) Monorepo Tips

* **Root-level config:** Keep `eslint.config.js` and `prettier.config.cjs` at the root.
* **Per-package tsconfig:** Each package has its own `tsconfig.json` extending from root. Ensure the ESLint `project` points to the right file(s).
* **Selective linting:** Add per-package scripts (e.g., `pnpm --filter @acme/ui lint`).
* **Performance:** Use ESLint cache (`eslint . --cache`) locally if desired.

---

## 14) Troubleshooting

* **“Parsing error: Cannot read file ‘tsconfig.json’”**
  Ensure the `project` path is correct for where ESLint runs. In monorepos, set per-package `files` blocks with their own `parserOptions.project`.

* **Type check too slow**
  Temporarily swap to a non-type-aware pass for fast edits (`project` removed). Keep type-aware checks in pre-commit/CI.

* **Import order disagreements**
  Adjust `perfectionist/sort-imports` `groups` to match your aliasing (e.g., put `"internal"` before `"external"` if that’s your convention).

* **Prettier vs ESLint conflicts**
  Ensure `eslint-config-prettier` is last in the exported array. Don’t install `eslint-plugin-prettier` (we avoid running Prettier as an ESLint rule).

---

## 15) Governance Checklist (what "good" looks like)

* [ ] `eslint.config.js` present at root; runs type-aware rules.
* [ ] `prettier.config.cjs` present and enforced in CI.
* [ ] `.eslintignore` / `.prettierignore` include build outputs.
* [ ] Husky pre-commit with `lint-staged` configured.
* [ ] `lint-staged` runs Prettier before ESLint, includes TypeScript check.
* [ ] CI job (GH Actions/GitLab) runs `typecheck`, `lint`, and `format` (no auto-write).
* [ ] VS Code workspace settings default to Prettier + ESLint fix on save.
* [ ] Import sorting + unused import cleanup are effective on staged files.
* [ ] Team agrees on `printWidth`, `singleQuote`, ordering groups.
* [ ] Monorepo packages have explicit config blocks if rules differ by package type.

---

## 16) Additional Advanced Rules (Optional)

For teams seeking even stricter quality gates, consider these additional rules:

```js
// Add to the rules section in eslint.config.js
rules: {
  // ... existing rules ...
  
  // Prevent promise misuse
  "@typescript-eslint/promise-function-async": "warn",
  
  // Enforce consistent array type syntax
  "@typescript-eslint/array-type": ["warn", { default: "array-simple" }],
  
  // Prevent unnecessary template literals
  "@typescript-eslint/no-unnecessary-template-expression": "warn",
  
  // Enforce using type parameter constraints
  "@typescript-eslint/no-unnecessary-type-constraint": "error",
  
  // Prevent redundant type assertions
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  
  // Enforce consistent nullish coalescing
  "@typescript-eslint/prefer-nullish-coalescing": "warn",
  
  // Enforce optional chaining over manual null checks
  "@typescript-eslint/prefer-optional-chain": "warn",
  
  // Prevent fallthrough in switch statements
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  
  // React-specific strict rules
  "react/jsx-no-leaked-render": ["warn", { validStrategies: ["ternary"] }],
  "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
  "react/self-closing-comp": "warn",
  
  // A11y enhancements
  "jsx-a11y/aria-props": "error",
  "jsx-a11y/aria-proptypes": "error",
  "jsx-a11y/aria-unsupported-elements": "error",
  "jsx-a11y/role-has-required-aria-props": "error",
  "jsx-a11y/role-supports-aria-props": "error",
}
```

---

## 17) Performance Optimization

For large monorepos or projects with many files:

```bash
# Add to package.json scripts
{
  "scripts": {
    "lint": "eslint . --cache --cache-location ./node_modules/.cache/eslint",
    "lint:fix": "eslint . --fix --cache --cache-location ./node_modules/.cache/eslint"
  }
}
```

The `--cache` flag can reduce lint time by 50-70% on subsequent runs.

---

## 18) Future Extensions

* **Enforce module boundaries:** add `eslint-plugin-boundaries` to stop cross-feature imports.
* **Security surface:** add `eslint-plugin-security` (JS) and dependency scanners in CI.
* **DX commands:** `pnpm dlx sort-package-json` in lint-staged for `package.json` stability.
* **Storybook/Testing hooks:** add file-globs and rules per tooling as you integrate them.
