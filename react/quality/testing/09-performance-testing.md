# Performance Testing — Testing

**Goal:** Lighthouse CI configuration, performance budgets, alerts, and trace-to-PR-comment mapping for regression prevention.

---

## Why Performance Testing?

**Performance impacts:**
- User experience and satisfaction
- Conversion rates and revenue
- SEO rankings
- Mobile usability
- Accessibility

**Test performance at:**
- Integration: Component render time
- E2E: Page load metrics
- CI: Lighthouse scores and budgets

---

## Lighthouse CI Setup

### Install Dependencies
```bash
pnpm add -D @lhci/cli
```

### Configuration
```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm serve',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/products',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 75000 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }],
        'resource-summary:font:size': ['warn', { maxNumericValue: 100000 }],
        
        // Performance metrics
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### NPM Scripts
```json
{
  "scripts": {
    "lhci:collect": "lhci collect",
    "lhci:assert": "lhci assert",
    "lhci:upload": "lhci upload",
    "lhci": "pnpm lhci:collect && pnpm lhci:assert && pnpm lhci:upload"
  }
}
```

---

## Performance Budgets

### Budget Configuration
```json
// budget.json
[
  {
    "path": "/*",
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 300
      },
      {
        "resourceType": "stylesheet",
        "budget": 75
      },
      {
        "resourceType": "image",
        "budget": 500
      },
      {
        "resourceType": "font",
        "budget": 100
      },
      {
        "resourceType": "document",
        "budget": 50
      },
      {
        "resourceType": "total",
        "budget": 1000
      }
    ],
    "resourceCounts": [
      {
        "resourceType": "script",
        "budget": 15
      },
      {
        "resourceType": "stylesheet",
        "budget": 5
      },
      {
        "resourceType": "image",
        "budget": 20
      },
      {
        "resourceType": "third-party",
        "budget": 10
      }
    ]
  }
]
```

### Apply Budgets in Lighthouse
```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      settings: {
        budgets: require('./budget.json'),
      },
    },
  },
};
```

---

## CI Integration

### GitHub Actions
```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build app
        run: pnpm build
        env:
          NODE_ENV: production
      
      - name: Run Lighthouse CI
        run: pnpm lhci
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: lighthouse-results
          path: .lighthouseci/
      
      - name: Comment PR
        uses: treosh/lighthouse-ci-action@v9
        if: github.event_name == 'pull_request'
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

## Playwright Performance Testing

### Measure Page Load Time
```ts
import { test, expect } from '@playwright/test';

test('page loads within acceptable time', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  console.log(`Page load time: ${loadTime}ms`);
  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

### Measure Core Web Vitals
```ts
test('Core Web Vitals are acceptable', async ({ page }) => {
  await page.goto('/');
  
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcpValue = 0;
      let clsValue = 0;
      let fidValue = 0;
      
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcpValue = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });
      
      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        fidValue = entries[0].processingStart - entries[0].startTime;
      }).observe({ entryTypes: ['first-input'] });
      
      // Wait for metrics to be collected
      setTimeout(() => {
        resolve({
          lcp: lcpValue,
          cls: clsValue,
          fid: fidValue,
        });
      }, 5000);
    });
  });
  
  console.log('Core Web Vitals:', metrics);
  
  expect(metrics.lcp).toBeLessThan(2500); // 2.5s
  expect(metrics.cls).toBeLessThan(0.1); // 0.1
  expect(metrics.fid).toBeLessThan(100); // 100ms
});
```

### Monitor Resource Sizes
```ts
test('bundle sizes are acceptable', async ({ page }) => {
  const resources: Array<{ url: string; size: number; type: string }> = [];
  
  page.on('response', async (response) => {
    const request = response.request();
    const url = request.url();
    
    try {
      const buffer = await response.body();
      const size = buffer.length;
      const type = response.headers()['content-type'] || '';
      
      resources.push({ url, size, type });
    } catch (e) {
      // Some responses can't be read
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Calculate totals by type
  const scriptSize = resources
    .filter(r => r.type.includes('javascript'))
    .reduce((sum, r) => sum + r.size, 0);
    
  const styleSize = resources
    .filter(r => r.type.includes('css'))
    .reduce((sum, r) => sum + r.size, 0);
    
  const imageSize = resources
    .filter(r => r.type.includes('image'))
    .reduce((sum, r) => sum + r.size, 0);
  
  console.log('Resource sizes:');
  console.log(`  Scripts: ${(scriptSize / 1024).toFixed(2)}KB`);
  console.log(`  Styles: ${(styleSize / 1024).toFixed(2)}KB`);
  console.log(`  Images: ${(imageSize / 1024).toFixed(2)}KB`);
  
  expect(scriptSize).toBeLessThan(300 * 1024); // 300KB
  expect(styleSize).toBeLessThan(75 * 1024); // 75KB
  expect(imageSize).toBeLessThan(500 * 1024); // 500KB
});
```

### Track Performance Over Time
```ts
test('track performance metrics', async ({ page }) => {
  await page.goto('/');
  
  const perfMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      download: navigation.responseEnd - navigation.responseStart,
      domInteractive: navigation.domInteractive,
      domComplete: navigation.domComplete,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    };
  });
  
  console.log('Performance Timing:', perfMetrics);
  
  // Save to file for historical tracking
  const fs = require('fs');
  const data = {
    timestamp: new Date().toISOString(),
    metrics: perfMetrics,
  };
  
  fs.appendFileSync('performance-history.json', JSON.stringify(data) + '\n');
});
```

---

## Component Render Performance

### Measure Component Render Time
```tsx
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

describe('LargeList Performance', () => {
  it('should render 1000 items in acceptable time', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));
    
    const startTime = performance.now();
    
    render(<LargeList items={items} />);
    
    const renderTime = performance.now() - startTime;
    
    console.log(`Render time: ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(100); // 100ms
  });

  it('should re-render efficiently', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));
    
    const { rerender } = render(<LargeList items={items} />);
    
    const updatedItems = items.map(item => ({
      ...item,
      name: `Updated ${item.name}`,
    }));
    
    const startTime = performance.now();
    
    rerender(<LargeList items={updatedItems} />);
    
    const rerenderTime = performance.now() - startTime;
    
    console.log(`Re-render time: ${rerenderTime.toFixed(2)}ms`);
    expect(rerenderTime).toBeLessThan(50); // 50ms
  });
});
```

### Detect Unnecessary Re-Renders
```tsx
import { render } from '@testing-library/react';

describe('Memoization', () => {
  it('should not re-render child when parent updates', () => {
    const renderCount = { child: 0 };
    
    const Child = React.memo(() => {
      renderCount.child++;
      return <div>Child</div>;
    });
    
    const Parent = ({ count }: { count: number }) => (
      <div>
        <div>Count: {count}</div>
        <Child />
      </div>
    );
    
    const { rerender } = render(<Parent count={0} />);
    expect(renderCount.child).toBe(1);
    
    rerender(<Parent count={1} />);
    expect(renderCount.child).toBe(1); // Child should not re-render
  });
});
```

---

## Trace Analysis

### Enable Tracing
```ts
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on',
  },
});
```

### Analyze Trace Files
```bash
# View trace
pnpm exec playwright show-trace trace.zip

# Extract metrics from trace
pnpm exec playwright show-trace trace.zip --report
```

### Automated Trace Analysis
```ts
test('analyze performance from trace', async ({ page }, testInfo) => {
  await page.goto('/');
  
  // Stop tracing and get the trace
  const tracePath = testInfo.outputPath('trace.zip');
  await page.context().tracing.stop({ path: tracePath });
  
  // Could parse trace file here for automated analysis
  console.log(`Trace saved to: ${tracePath}`);
});
```

---

## CI Alerts and PR Comments

### Lighthouse CI PR Comments
```yaml
# .github/workflows/performance.yml
- name: Lighthouse CI Action
  uses: treosh/lighthouse-ci-action@v9
  with:
    uploadArtifacts: true
    temporaryPublicStorage: true
    runs: 3
```

**Generates PR comment:**
```
Performance Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Performance:        93  ⬆️ (+2)
Accessibility:      100
Best Practices:     100
SEO:                100

Core Web Vitals:
  LCP: 1.8s ✅
  CLS: 0.05 ✅
  TBT: 150ms ⚠️

Resource Sizes:
  Scripts: 245KB  ✅ (under 300KB budget)
  Styles:  62KB   ✅ (under 75KB budget)
  Images:  480KB  ⚠️ (approaching 500KB budget)

📊 View full report
```

### Custom Performance Bot
```ts
// scripts/performance-comment.ts
import { readFileSync } from 'fs';
import { Octokit } from '@octokit/rest';

const lhciResults = JSON.parse(readFileSync('.lighthouseci/manifest.json', 'utf-8'));
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const scores = lhciResults[0].summary;
const comment = `
## 📊 Performance Report

| Metric | Score | Status |
|--------|-------|--------|
| Performance | ${scores.performance * 100} | ${scores.performance >= 0.9 ? '✅' : '❌'} |
| Accessibility | ${scores.accessibility * 100} | ${scores.accessibility >= 0.9 ? '✅' : '❌'} |
| Best Practices | ${scores['best-practices'] * 100} | ${scores['best-practices'] >= 0.9 ? '✅' : '❌'} |
| SEO | ${scores.seo * 100} | ${scores.seo >= 0.9 ? '✅' : '❌'} |

[View Full Report](${lhciResults[0].url})
`;

await octokit.issues.createComment({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: context.issue.number,
  body: comment,
});
```

---

## Best Practices

### ✅ Test on Production Builds
```bash
# Always test production builds
pnpm build
pnpm serve
pnpm lhci
```

### ✅ Run Multiple Iterations
```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3, // Average 3 runs
    },
  },
};
```

### ✅ Test Critical Paths
```
✅ Homepage
✅ Product listing
✅ Product detail
✅ Checkout
✅ Dashboard

❌ Every single page
```

### ✅ Monitor Trends
```bash
# Save historical data
echo "$(date),$(cat lighthouse-scores.json)" >> performance-history.csv
```

---

## Anti-Patterns

### ❌ Testing in Development Mode
```bash
# ❌ Bad
pnpm dev &
pnpm lhci

# ✅ Good
pnpm build
pnpm serve &
pnpm lhci
```

### ❌ Ignoring Budget Violations
```
# ❌ Bad: Disable budget checks
skipAudits: ['resource-summary']

# ✅ Good: Fix the violations
```

### ❌ No Performance Baseline
```
# ❌ Bad: No historical tracking
# ✅ Good: Track metrics over time
```

---

**← Back to:** [A11y Testing](./08-a11y-testing.md)  
**Next:** [Test Data Factories](./10-test-data-factories.md) →

