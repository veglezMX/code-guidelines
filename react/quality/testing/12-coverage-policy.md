# Coverage Policy — Testing

**Goal:** Thresholds by folder, changed-files coverage gates, exclusions, and enforcement strategies.

---

## Coverage Targets

### By Layer

| Layer | Lines | Functions | Branches | Statements |
|-------|-------|-----------|----------|------------|
| **Unit** | 85% | 85% | 80% | 85% |
| **Integration** | 70% | 70% | 65% | 70% |
| **E2E** | N/A | N/A | N/A | N/A |

### By Folder

| Folder | Lines | Reason |
|--------|-------|--------|
| `src/utils/` | 95% | Pure functions, easy to test |
| `src/hooks/` | 90% | Business logic, must be tested |
| `src/components/` | 85% | UI components |
| `src/lib/` | 80% | Third-party wrappers |
| `src/config/` | 50% | Configuration files |

---

## Vitest Configuration

### Global Thresholds
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Global thresholds
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      
      // Exclude patterns
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/index.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'tests/**',
        'src/mocks/**',
      ],
    },
  },
});
```

### Per-Folder Thresholds
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 85,
        
        // Higher threshold for utilities
        'src/utils/**': {
          lines: 95,
          functions: 95,
          branches: 90,
        },
        
        // Lower threshold for config
        'src/config/**': {
          lines: 50,
          functions: 50,
        },
      },
    },
  },
});
```

---

## Changed Files Coverage Gate

### Script to Check Changed Files
```bash
#!/bin/bash
# scripts/test-changed.sh

# Get list of changed files
CHANGED_FILES=$(git diff --name-only main...HEAD | grep -E '\.(ts|tsx)$' | grep -v '\.test\.')

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files to test"
  exit 0
fi

# Run tests for changed files
echo "Testing changed files:"
echo "$CHANGED_FILES"

# Run vitest with coverage for changed files
pnpm vitest run --coverage --changed

# Check coverage meets threshold
pnpm vitest run --coverage --changed --coverage.thresholds.lines=85
```

### NPM Script
```json
{
  "scripts": {
    "test:changed": "vitest run --coverage --changed",
    "test:changed:strict": "vitest run --coverage --changed --coverage.thresholds.lines=85"
  }
}
```

### CI Configuration
```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main]

jobs:
  test-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Test changed files
        run: pnpm test:changed:strict
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: changed-files
```

---

## Exclusions

### What to Exclude

**Always exclude:**
- `node_modules/**`
- `dist/**`, `build/**`
- `**/*.d.ts` (type definitions)
- `**/*.config.ts` (config files)
- `**/*.test.ts`, `**/*.test.tsx` (test files)
- `tests/**` (test utilities)

**Consider excluding:**
- `src/mocks/**` (MSW handlers)
- `src/types/**` (type definitions)
- `src/generated/**` (generated code)
- `**/index.ts` (barrel exports)
- `**/*.stories.tsx` (Storybook stories)

### Exclude Specific Lines
```ts
// Use istanbul ignore comments
export function complexFunction() {
  // Regular code is covered
  
  /* istanbul ignore next */
  if (process.env.NODE_ENV === 'development') {
    // This won't count against coverage
    console.log('Debug info');
  }
  
  return true;
}
```

### Exclude Specific Files
```ts
// At top of file
/* istanbul ignore file */

export const developmentOnlyUtils = {
  // Entire file excluded from coverage
};
```

---

## Coverage Reporting

### Generate Reports
```bash
# Generate all report types
pnpm vitest run --coverage

# Generate specific format
pnpm vitest run --coverage --coverage.reporter=html
pnpm vitest run --coverage --coverage.reporter=lcov
pnpm vitest run --coverage --coverage.reporter=json
```

### View HTML Report
```bash
pnpm vitest run --coverage
open coverage/index.html
```

### CI Artifacts
```yaml
# .github/workflows/test.yml
- name: Upload coverage reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: coverage-reports
    path: |
      coverage/
      !coverage/**/*.map
```

---

## Coverage Services Integration

### Codecov
```yaml
# .github/workflows/test.yml
- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: true
```

```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 85%
        threshold: 2%
    patch:
      default:
        target: 85%
        threshold: 5%
```

### Coveralls
```yaml
- name: Upload to Coveralls
  uses: coverallsapp/github-action@master
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    path-to-lcov: ./coverage/lcov.info
```

---

## Enforcement Strategies

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for staged files
pnpm lint-staged

# Check coverage
pnpm vitest run --coverage --changed --reporter=silent

if [ $? -ne 0 ]; then
  echo "❌ Tests failed or coverage below threshold"
  exit 1
fi
```

### PR Status Check
```yaml
# .github/workflows/coverage-check.yml
name: Coverage Check

on:
  pull_request:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test:changed:strict
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
            const lines = coverage.total.lines.pct;
            
            const comment = `## Coverage Report\n\nLines: ${lines}%\n\n${lines >= 85 ? '✅ Meets threshold' : '❌ Below threshold (85%)'}`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Fail Build on Low Coverage
```bash
# Run tests and fail if coverage below threshold
pnpm vitest run --coverage --coverage.thresholds.lines=85

# Exit code 1 if below threshold
```

---

## Coverage Monitoring

### Track Coverage Over Time
```bash
# scripts/track-coverage.sh
#!/bin/bash

# Run coverage
pnpm vitest run --coverage --reporter=json

# Extract coverage percentage
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')

# Append to history
echo "$(date +%Y-%m-%d),$COVERAGE" >> coverage-history.csv

# Commit to tracking branch
git checkout coverage-tracking
git add coverage-history.csv
git commit -m "Update coverage: $COVERAGE%"
git push
```

### Coverage Badge
```markdown
# README.md
![Coverage](https://img.shields.io/codecov/c/github/username/repo)
```

---

## Exception Handling

### Temporary Coverage Decrease
```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: auto
        threshold: 2%  # Allow 2% decrease
```

### File-Specific Exceptions
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        // Lower threshold for specific file
        'src/legacy/**': {
          lines: 50,
        },
      },
    },
  },
});
```

---

## Best Practices

### ✅ Focus on Changed Files
```bash
# Test only what changed
pnpm test:changed
```

### ✅ Set Realistic Thresholds
```
Utils: 95% (pure functions, easy to test)
Hooks: 90% (business logic)
Components: 85% (UI with edge cases)
Config: 50% (mostly static)
```

### ✅ Exclude Generated Code
```ts
exclude: [
  'src/generated/**',
  'src/**/*.d.ts',
  'src/mocks/**',
]
```

### ✅ Review Uncovered Lines
```bash
# Open HTML report to see what's uncovered
open coverage/index.html
```

---

## Anti-Patterns

### ❌ Testing for 100% Coverage
```
# ❌ Bad: Diminishing returns
lines: 100%

# ✅ Good: Realistic target
lines: 85%
```

### ❌ Ignoring Coverage Gaps
```ts
// ❌ Bad: Ignoring entire function
/* istanbul ignore next */
export function importantFunction() {
  // Critical business logic not covered
}

// ✅ Good: Test the important parts
export function importantFunction() {
  // ... tested code ...
  
  /* istanbul ignore next */
  if (process.env.DEBUG) {
    console.log('Debug info');
  }
}
```

### ❌ No Coverage on PRs
```
# ❌ Bad: Only check on main
# ✅ Good: Check on every PR
```

---

## Troubleshooting

### Coverage Report Not Generated
```bash
# Ensure provider is configured
pnpm vitest run --coverage --coverage.provider=v8
```

### Coverage Below Threshold Locally but Passes in CI
```bash
# Use same environment
docker run -it node:18 bash
pnpm install
pnpm test
```

### Coverage Too Low
```bash
# Find uncovered lines
pnpm vitest run --coverage
open coverage/index.html

# Look for red/yellow lines
```

---

**← Back to:** [Test Data Factories](./10-test-data-factories.md)  
**Next:** [CI Pipeline Testing](./13-ci-pipeline-testing.md) →

