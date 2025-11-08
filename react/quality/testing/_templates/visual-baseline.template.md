# Visual Baseline Template

Use this checklist when capturing and approving visual baselines.

## Checklist for Capturing Baselines

- [ ] Browser is consistent (use same browser/version)
- [ ] Viewport size is set (e.g., 1280x720)
- [ ] Animations are disabled
- [ ] Dynamic content is masked (timestamps, random data)
- [ ] Fonts are loaded
- [ ] Page is fully loaded (networkidle)
- [ ] Screenshot is taken after stable state

## Playwright Screenshot Template

```ts
import { test, expect } from '@playwright/test';

test('visual regression - [component/page name]', async ({ page }) => {
  // Navigate to page
  await page.goto('/path/to/page');
  
  // Wait for page to stabilize
  await page.waitForLoadState('networkidle');
  
  // Disable animations
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  
  // Mask dynamic content
  await expect(page).toHaveScreenshot('page-name.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="random-content"]'),
    ],
    maxDiffPixels: 100, // Allow up to 100 different pixels
  });
});
```

## Responsive Screenshot Template

```ts
test('visual regression - responsive', async ({ page }) => {
  await page.goto('/path/to/page');
  await page.waitForLoadState('networkidle');
  
  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page).toHaveScreenshot('page-desktop.png');
  
  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('page-tablet.png');
  
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page).toHaveScreenshot('page-mobile.png');
});
```

## Component Screenshot Template

```ts
test('visual regression - component states', async ({ page }) => {
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
  const disabledButton = page.getByRole('button', { name: 'Disabled Button' });
  await expect(disabledButton).toHaveScreenshot('button-disabled.png');
});
```

## Approval Workflow

### 1. Generate Baseline
```bash
# Generate baseline screenshots
pnpm exec playwright test --update-snapshots
```

### 2. Review Changes
```bash
# Run tests to see if there are differences
pnpm exec playwright test

# Open HTML report to review
pnpm exec playwright show-report
```

### 3. Review Diff Images
- Check `*-actual.png` (new screenshot)
- Check `*-diff.png` (differences highlighted)
- Compare with `*-expected.png` (baseline)

### 4. Approve or Reject
```bash
# If changes are intentional, update baselines
pnpm exec playwright test --update-snapshots

# If changes are bugs, fix the code and retest
```

### 5. Commit Baselines
```bash
# Add updated baselines to git
git add tests/**/*-snapshots/
git commit -m "Update visual baselines for [feature name]"
```

## Threshold Configuration

```ts
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,     // Allow up to 100 different pixels
      threshold: 0.2,         // 20% threshold
      animations: 'disabled', // Disable animations
    },
  },
});
```

## Per-Test Threshold

```ts
test('strict visual test', async ({ page }) => {
  await page.goto('/');
  
  await expect(page).toHaveScreenshot('strict.png', {
    maxDiffPixels: 10,  // Very strict
    threshold: 0.1,
  });
});

test('lenient visual test', async ({ page }) => {
  await page.goto('/');
  
  await expect(page).toHaveScreenshot('lenient.png', {
    maxDiffPixels: 500,  // More lenient
    threshold: 0.5,
  });
});
```

## Best Practices

### ✅ Do
- Disable animations
- Use consistent viewport sizes
- Mask dynamic content
- Wait for network idle
- Test critical UI paths only
- Review diffs carefully before approving

### ❌ Don't
- Test every single page
- Include timestamps or random data
- Use pixel-perfect thresholds
- Skip reviewing diffs
- Commit diffs without understanding changes
- Test on unstable UI elements

## Troubleshooting

### Different screenshots in CI
- Use same font rendering
- Disable animations
- Ensure consistent timezone/locale
- Use Docker for consistent environment

### Flaky visual tests
- Increase threshold
- Mask more dynamic content
- Wait longer for stability
- Check for font loading issues

### Large diffs on minor changes
- Review threshold settings
- Check if animations are disabled
- Verify fonts are loaded
- Check for dynamic content

