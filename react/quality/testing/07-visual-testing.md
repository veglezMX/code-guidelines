# Visual Testing — Testing

**Goal:** Playwright screenshots vs Chromatic strategy, baseline storage, diff thresholds, and approval workflows for UI regression prevention.

---

## Why Visual Testing?

**Visual regression** catches UI bugs that functional tests miss:
- Layout shifts
- CSS regression
- Font changes
- Color variations
- Responsive breakpoints
- Browser-specific rendering

---

## Strategy: Playwright Screenshots vs Chromatic

### Decision Matrix

| Factor | Playwright Screenshots | Chromatic |
|--------|----------------------|-----------|
| **Cost** | Free | Paid (free tier available) |
| **Setup** | Minimal | Requires Storybook |
| **Baseline storage** | Git | Cloud |
| **Review UI** | Basic (VS Code) | Advanced (web app) |
| **Component isolation** | No | Yes (Storybook) |
| **CI integration** | Easy | Built-in |
| **Cross-browser** | Built-in | Built-in |
| **Maintenance** | Manual | Automated |

**Recommendation:** 
- **Start with Playwright** for full-page screenshots
- **Add Chromatic** if using Storybook for component library

---

## Approach 1: Playwright Visual Testing

### Setup
```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,          // Allow up to 100 different pixels
      threshold: 0.2,              // 20% threshold
      animations: 'disabled',      // Disable animations
    },
  },
  use: {
    screenshot: 'only-on-failure',
  },
});
```

### Basic Screenshot Test
```ts
import { test, expect } from '@playwright/test';

test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  
  // Wait for content to load
  await page.waitForLoadState('networkidle');
  
  // Take and compare screenshot
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Component Screenshot
```ts
test('button visual states', async ({ page }) => {
  await page.goto('/components/button');
  
  const button = page.getByRole('button', { name: 'Primary Button' });
  
  // Default state
  await expect(button).toHaveScreenshot('button-default.png');
  
  // Hover state
  await button.hover();
  await expect(button).toHaveScreenshot('button-hover.png');
  
  // Focus state
  await button.focus();
  await expect(button).toHaveScreenshot('button-focus.png');
  
  // Disabled state
  await page.getByRole('button', { name: 'Disabled Button' }).screenshot({
    path: 'test-results/button-disabled.png',
  });
});
```

### Responsive Screenshots
```ts
test('responsive layout', async ({ page }) => {
  await page.goto('/');
  
  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page).toHaveScreenshot('homepage-desktop.png');
  
  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('homepage-tablet.png');
  
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page).toHaveScreenshot('homepage-mobile.png');
});
```

### Mask Dynamic Content
```ts
test('mask dynamic elements', async ({ page }) => {
  await page.goto('/dashboard');
  
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.locator('[data-testid="current-time"]'),
      page.locator('[data-testid="live-data"]'),
      page.locator('[data-testid="user-avatar"]'),
    ],
  });
});
```

### Full Page Screenshots
```ts
test('full page screenshot', async ({ page }) => {
  await page.goto('/docs');
  
  await expect(page).toHaveScreenshot('docs-fullpage.png', {
    fullPage: true,
  });
});
```

---

## Baseline Management

### Generate Baselines
```bash
# Generate baseline screenshots
pnpm exec playwright test --update-snapshots

# Generate for specific test
pnpm exec playwright test homepage.spec.ts --update-snapshots

# Generate for specific browser
pnpm exec playwright test --project=chromium --update-snapshots
```

### Store Baselines in Git
```
tests/
  e2e/
    homepage.spec.ts
    homepage.spec.ts-snapshots/
      homepage-chromium-linux.png
      homepage-firefox-linux.png
      homepage-webkit-linux.png
```

### .gitignore Configuration
```
# .gitignore
# Keep baselines, ignore failures and diffs
test-results/
*-actual.png
*-diff.png
```

---

## Approval Workflow

### 1. Run Tests Locally
```bash
pnpm exec playwright test
```

### 2. Review Failures
```bash
# Open HTML report
pnpm exec playwright show-report

# View specific failure
code test-results/homepage-chromium/homepage-diff.png
```

### 3. Approve Changes
```bash
# If changes are intentional, update baselines
pnpm exec playwright test --update-snapshots
```

### 4. Commit Updated Baselines
```bash
git add tests/**/*-snapshots/
git commit -m "Update visual baselines for button redesign"
```

---

## Approach 2: Chromatic with Storybook

### Setup Storybook
```bash
pnpm add -D @storybook/react @storybook/addon-interactions
pnpm add -D chromatic
```

### Story Example
```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    chromatic: { delay: 300 }, // Wait for animations
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};
```

### Chromatic Configuration
```json
// package.json
{
  "scripts": {
    "chromatic": "chromatic --project-token=<your-token>"
  }
}
```

### CI Integration
```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  pull_request:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v3
      
      - run: pnpm install
      
      - name: Publish to Chromatic
        uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: 'build-storybook'
```

---

## Diff Thresholds

### Strict Threshold (Pixel-Perfect)
```ts
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,      // No differences allowed
      threshold: 0,          // 0% threshold
    },
  },
});
```

### Lenient Threshold (Anti-Flaky)
```ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 500,    // Allow up to 500 pixels
      threshold: 0.3,        // 30% threshold
    },
  },
});
```

### Per-Test Threshold
```ts
test('critical component', async ({ page }) => {
  await page.goto('/');
  
  await expect(page).toHaveScreenshot('critical.png', {
    maxDiffPixels: 10,       // Strict for critical UI
    threshold: 0.1,
  });
});

test('less critical', async ({ page }) => {
  await page.goto('/about');
  
  await expect(page).toHaveScreenshot('about.png', {
    maxDiffPixels: 200,      // More lenient
    threshold: 0.5,
  });
});
```

---

## Cross-Browser Visual Testing

### Test All Browsers
```ts
import { test, expect, devices } from '@playwright/test';

const browsers = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
];

browsers.forEach(({ name, device }) => {
  test.describe(name, () => {
    test.use(device);
    
    test('homepage renders consistently', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveScreenshot(`homepage-${name}.png`);
    });
  });
});
```

---

## Best Practices

### ✅ Wait for Stability
```ts
// ✅ Good: Wait for network and animations
await page.goto('/');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Wait for animations

await expect(page).toHaveScreenshot();
```

### ✅ Disable Animations
```ts
// ✅ Good: Disable animations globally
test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
});
```

### ✅ Mask Dynamic Content
```ts
// ✅ Good: Mask timestamps, random data
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="random-quote"]'),
  ],
});
```

### ✅ Use Consistent Viewport
```ts
// ✅ Good: Set consistent viewport
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
});
```

### ✅ Test Critical Paths Only
```ts
// ✅ Good: Test critical UI components
- Homepage
- Login/Signup forms
- Checkout flow
- Dashboard
- Product pages

// ❌ Bad: Test every single page
```

---

## Anti-Patterns

### ❌ Testing on Unstable Elements
```ts
// ❌ Bad: Testing animations
test('animated component', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot(); // Will be flaky
});

// ✅ Good: Disable animations first
test('animated component', async ({ page }) => {
  await page.addStyleTag({ content: '* { animation: none !important; }' });
  await page.goto('/');
  await expect(page).toHaveScreenshot();
});
```

### ❌ Not Masking Dynamic Content
```ts
// ❌ Bad: Including timestamps
await expect(page).toHaveScreenshot(); // Will fail every time

// ✅ Good: Mask dynamic content
await expect(page).toHaveScreenshot({
  mask: [page.locator('[data-testid="timestamp"]')],
});
```

### ❌ Overly Strict Thresholds
```ts
// ❌ Bad: Zero tolerance
maxDiffPixels: 0  // Will be flaky across environments

// ✅ Good: Reasonable threshold
maxDiffPixels: 100  // Allows for minor rendering differences
```

---

## Troubleshooting

### Different Screenshots in CI
**Problem:** Screenshots differ between local and CI  
**Solution:**
```ts
// Use consistent fonts
test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      * {
        font-family: Arial, sans-serif !important;
      }
    `,
  });
});
```

### Flaky Visual Tests
**Problem:** Tests fail intermittently  
**Solution:**
- Increase `maxDiffPixels` threshold
- Disable animations
- Wait for network idle
- Mask dynamic content

### Large Baseline Files
**Problem:** Git repo size growing  
**Solution:**
- Use Git LFS for PNG files
- Test only critical paths
- Use Chromatic for cloud storage

---

**← Back to:** [Mocking Guide](./11-mocking-guide.md)  
**Next:** [A11y Testing](./08-a11y-testing.md) →

