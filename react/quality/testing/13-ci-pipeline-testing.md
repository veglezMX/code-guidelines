# CI Pipeline Testing — Testing

**Goal:** Jobs, tag filters, parallel shards, artifact retention, and flaky test quarantine procedures for robust CI/CD.

---

## Pipeline Overview

```
PR Opened/Updated
├─ Lint & Type Check (fast feedback)
├─ Unit Tests (parallel)
├─ Integration Tests (parallel)
├─ E2E Smoke Tests (@smoke tag)
└─ Coverage Check (changed files)

Merged to Main
├─ Full Test Suite
├─ E2E Regression (@regression tag)
├─ Visual Regression (Chromatic)
├─ Performance Tests (Lighthouse)
└─ Deploy

Nightly Schedule
├─ Full Regression Suite
├─ Cross-browser Tests
├─ Performance Monitoring
└─ Security Scans
```

---

## GitHub Actions Configuration

### Main Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm tsc --noEmit

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm vitest run --shard=${{ matrix.shard }}/4 --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit-shard-${{ matrix.shard }}

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: integration

  e2e-smoke:
    name: E2E Smoke Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
      
      - name: Build app
        run: pnpm build
      
      - name: Run smoke tests
        run: pnpm exec playwright test --grep "@smoke"
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-smoke-failures
          path: |
            test-results/
            playwright-report/
          retention-days: 7

  coverage-check:
    name: Coverage Check
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Test changed files
        run: pnpm test:changed --coverage
      
      - name: Check threshold
        run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          echo "Coverage: $COVERAGE%"
          
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "❌ Coverage below 85%"
            exit 1
          fi
          
          echo "✅ Coverage meets threshold"
```

---

## Parallel Execution

### Vitest Sharding
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pnpm vitest run --shard=${{ matrix.shard }}/4
```

### Playwright Sharding
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pnpm exec playwright test --shard=${{ matrix.shard }}/4
```

### Cucumber Sharding
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pnpm cucumber-js --parallel=${{ matrix.shard }}
```

---

## Tag-Based Filtering

### BDD/Cucumber Tags
```yaml
# Run only smoke tests
- name: Smoke tests
  run: pnpm cucumber-js --tags "@smoke"

# Run smoke OR critical
- name: Critical path tests
  run: pnpm cucumber-js --tags "@smoke or @critical"

# Run auth tests, exclude flaky
- name: Auth tests
  run: pnpm cucumber-js --tags "@auth and not @flaky"

# Skip work in progress
- name: Stable tests
  run: pnpm cucumber-js --tags "not @wip"
```

### Playwright Test Tags
```yaml
# Run smoke tests
- run: pnpm exec playwright test --grep "@smoke"

# Run all except slow tests
- run: pnpm exec playwright test --grep-invert "@slow"

# Run specific feature
- run: pnpm exec playwright test --grep "@auth"
```

---

## Artifact Retention

### Test Results
```yaml
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: |
      test-results/
      junit.xml
    retention-days: 30
```

### Coverage Reports
```yaml
- name: Upload coverage
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: coverage-reports
    path: coverage/
    retention-days: 30
```

### E2E Artifacts
```yaml
- name: Upload E2E artifacts
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: e2e-failures
    path: |
      test-results/
      playwright-report/
      reports/traces/
      reports/screenshots/
      reports/videos/
    retention-days: 14
```

### Visual Regression Artifacts
```yaml
- name: Upload visual diffs
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: visual-diffs
    path: |
      tests/**/*-diff.png
      tests/**/*-actual.png
    retention-days: 7
```

---

## Flaky Test Handling

### Retry Strategy
```ts
// playwright.config.ts
export default defineConfig({
  // Retry failed tests only in CI
  retries: process.env.CI ? 2 : 0,
  
  // Fail fast to save CI time
  maxFailures: process.env.CI ? 10 : undefined,
});
```

### Quarantine Flaky Tests
```yaml
# .github/workflows/flaky-tests.yml
name: Flaky Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  run-flaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      
      # Run tests tagged as flaky
      - name: Run flaky tests
        run: pnpm exec playwright test --grep "@flaky"
        continue-on-error: true
      
      - name: Report flaky tests
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Flaky test still failing',
              body: 'Flaky tests are still failing. Please investigate.',
              labels: ['flaky-test', 'bug']
            });
```

### Automatic Flaky Detection
```bash
# scripts/detect-flaky.sh
#!/bin/bash

# Run tests multiple times
for i in {1..10}; do
  echo "Run $i/10"
  pnpm test > "run-$i.log" 2>&1 || true
done

# Analyze results
grep -h "FAIL" run-*.log | sort | uniq -c | sort -rn
```

---

## Branch-Specific Workflows

### PR Workflow (Fast Feedback)
```yaml
on:
  pull_request:
    branches: [main]

jobs:
  fast-feedback:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm lint
      - run: pnpm tsc
      - run: pnpm test:unit --changed
      - run: pnpm exec playwright test --grep "@smoke"
```

### Main Branch Workflow (Full Suite)
```yaml
on:
  push:
    branches: [main]

jobs:
  full-suite:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm exec playwright test --grep "@regression"
      - run: pnpm lhci
```

### Nightly Workflow (Comprehensive)
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test
      - run: pnpm exec playwright test  # All tests
      - run: pnpm test:visual
      - run: pnpm test:a11y
      - run: pnpm lhci
```

---

## Performance Optimization

### Cache Dependencies
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: 18
    cache: 'pnpm'

- uses: actions/cache@v3
  with:
    path: |
      ~/.cache/ms-playwright
      node_modules
    key: ${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
```

### Cache Playwright Browsers
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('pnpm-lock.yaml') }}

- name: Install Playwright browsers
  if: steps.cache.outputs.cache-hit != 'true'
  run: pnpm exec playwright install --with-deps
```

### Conditional Job Execution
```yaml
jobs:
  e2e-tests:
    # Only run if source files changed
    if: |
      contains(github.event.head_commit.modified, 'src/') ||
      contains(github.event.head_commit.modified, 'tests/e2e/')
    steps:
      - run: pnpm exec playwright test
```

---

## Notification and Reporting

### Slack Notifications
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Tests failed on ${{ github.ref }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Tests failed*\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### PR Comments
```yaml
- name: Comment PR
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
      
      const comment = `## Test Results\n\n` +
        `✅ Unit Tests: Passed\n` +
        `✅ Integration Tests: Passed\n` +
        `📊 Coverage: ${coverage.total.lines.pct}%\n`;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

---

## Best Practices

### ✅ Fast Feedback Loop
```yaml
# PR: Run fast tests first
1. Lint (< 30s)
2. Type check (< 1min)
3. Unit tests - changed files (< 2min)
4. Smoke tests (< 5min)

# Main: Run full suite
1. All unit tests (< 10min)
2. Integration tests (< 15min)
3. Regression tests (< 30min)
```

### ✅ Parallel Execution
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]  # 4x faster
```

### ✅ Fail Fast
```yaml
jobs:
  test:
    steps:
      - run: pnpm lint || exit 1
      - run: pnpm tsc || exit 1
      - run: pnpm test
```

---

## Anti-Patterns

### ❌ Running All Tests on Every PR
```yaml
# ❌ Bad: Slow feedback
- run: pnpm exec playwright test  # 30+ minutes

# ✅ Good: Fast feedback
- run: pnpm exec playwright test --grep "@smoke"  # 5 minutes
```

### ❌ No Artifact Retention
```yaml
# ❌ Bad: Can't debug failures
- run: pnpm exec playwright test

# ✅ Good: Keep artifacts
- run: pnpm exec playwright test
- uses: actions/upload-artifact@v3
  if: failure()
```

### ❌ No Test Parallelization
```yaml
# ❌ Bad: Sequential (slow)
- run: pnpm test

# ✅ Good: Parallel (fast)
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

---

**← Back to:** [Coverage Policy](./12-coverage-policy.md)  
**Next:** [Governance Checklists](./14-governance-checklists.md) →

