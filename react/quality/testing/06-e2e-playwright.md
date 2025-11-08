# E2E Testing — Playwright

**Goal:** Smoke flows, selectors policy (ARIA/role), flakiness playbook, and trace viewer workflow for critical path testing.

---

## Setup and Configuration

### Install Dependencies
```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

### Playwright Configuration
```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/playwright' }],
    ['json', { outputFile: 'reports/playwright/results.json' }],
    ['junit', { outputFile: 'reports/playwright/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## Selectors Policy

### Prefer ARIA Roles and Labels
```ts
// ✅ Good: Accessible selectors
await page.getByRole('button', { name: 'Sign In' });
await page.getByRole('textbox', { name: 'Email' });
await page.getByRole('link', { name: 'Forgot password?' });
await page.getByLabel('Email');
await page.getByLabel('Password');

// ❌ Bad: Brittle selectors
await page.click('.btn-primary');
await page.fill('#email-input');
await page.click('button:nth-child(2)');
```

### Selector Priority
```ts
// 1. Role-based (best)
page.getByRole('button', { name: 'Submit' })

// 2. Label-based (good for forms)
page.getByLabel('Email address')

// 3. Test ID (when role/label not available)
page.getByTestId('custom-component')

// 4. Text content (for unique text)
page.getByText('Welcome back')

// 5. CSS/XPath (last resort)
page.locator('[data-custom="value"]')
```

---

## Smoke Tests

### Critical User Journeys
```ts
// tests/e2e/smoke/authentication.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Smoke Tests', () => {
  test('user can sign in and access dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify redirect
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify dashboard content
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('user can sign out', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Sign out
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    
    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });
});
```

### Checkout Flow
```ts
// tests/e2e/smoke/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('user can complete purchase', async ({ page }) => {
    // Browse products
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    
    // Add to cart
    await page.getByTestId('product-card').first().click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();
    
    // Go to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible();
    
    // Proceed to checkout
    await page.getByRole('button', { name: 'Checkout' }).click();
    
    // Fill shipping info
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Address').fill('123 Main St');
    await page.getByLabel('City').fill('New York');
    await page.getByLabel('Postal Code').fill('10001');
    
    // Continue to payment
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    
    // Fill payment info
    await page.getByLabel('Card Number').fill('4111111111111111');
    await page.getByLabel('Expiry Date').fill('12/25');
    await page.getByLabel('CVV').fill('123');
    
    // Complete order
    await page.getByRole('button', { name: 'Place Order' }).click();
    
    // Verify confirmation
    await expect(page).toHaveURL(/.*\/order-confirmation/);
    await expect(page.getByText('Order confirmed!')).toBeVisible();
  });
});
```

---

## Flakiness Playbook

### Use Auto-Waiting
```ts
// ✅ Good: Playwright auto-waits
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByText('Success')).toBeVisible();

// ❌ Bad: Manual waits
await page.click('button');
await page.waitForTimeout(1000); // Don't do this
```

### Wait for Network Idle
```ts
// ✅ Good: Wait for network requests
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// ✅ Also good: Wait for specific request
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/user')),
  page.goto('/dashboard'),
]);
```

### Use Expect Polling
```ts
// ✅ Good: Polls until condition is met
await expect(page.getByText('Loading...')).not.toBeVisible();
await expect(page.getByRole('list').locator('li')).toHaveCount(5);

// ❌ Bad: Single assertion
expect(await page.getByRole('list').locator('li').count()).toBe(5);
```

### Handle Race Conditions
```ts
// ✅ Good: Wait for both events
await Promise.all([
  page.waitForURL('/dashboard'),
  page.getByRole('button', { name: 'Submit' }).click(),
]);

// ❌ Bad: Click then wait
await page.click('button');
await page.waitForURL('/dashboard'); // Might miss the navigation
```

### Retry Failed Actions
```ts
// ✅ Good: Built-in retry
await expect(async () => {
  await page.getByRole('button', { name: 'Load More' }).click();
  await expect(page.getByRole('list').locator('li')).toHaveCount(20);
}).toPass({ timeout: 10000 });
```

---

## Fixtures and Test Setup

### Custom Fixtures
```ts
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard');
    
    // Use the authenticated page
    await use(page);
    
    // Cleanup after test
    await page.goto('/logout');
  },
});

export { expect } from '@playwright/test';
```

### Using Custom Fixtures
```ts
// tests/e2e/dashboard.spec.ts
import { test, expect } from './fixtures';

test('authenticated user can view dashboard', async ({ authenticatedPage }) => {
  await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

---

## API Mocking in E2E

### Mock External APIs
```ts
import { test, expect } from '@playwright/test';

test('display data from mocked API', async ({ page }) => {
  // Mock the API response
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]),
    });
  });

  await page.goto('/users');
  
  await expect(page.getByText('John Doe')).toBeVisible();
  await expect(page.getByText('Jane Smith')).toBeVisible();
});
```

### Mock Error Responses
```ts
test('handle API error gracefully', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });

  await page.goto('/users');
  
  await expect(page.getByText('Failed to load users')).toBeVisible();
});
```

---

## Trace Viewer Workflow

### Recording Traces
```ts
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'retain-on-failure', // Only save traces for failed tests
    // or
    trace: 'on', // Always save traces
  },
});
```

### Viewing Traces
```bash
# View trace for failed test
pnpm exec playwright show-trace reports/playwright/traces/test-name-retry1.zip

# View trace in browser
pnpm exec playwright show-report
```

### Trace Contents
- **Screenshots**: Every action taken
- **DOM snapshots**: Before and after each action
- **Network activity**: All requests and responses
- **Console logs**: Browser console output
- **Timeline**: Visual timeline of test execution

---

## Page Object Model

### Page Object Example
```ts
// tests/e2e/pages/LoginPage.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByLabel('Email');
  }

  get passwordInput() {
    return this.page.getByLabel('Password');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Sign In' });
  }

  get errorMessage() {
    return this.page.getByTestId('error-message');
  }

  // Actions
  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // Assertions
  async expectToBeVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toHaveText(message);
  }
}
```

### Using Page Objects
```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Cross-Browser Testing

### Running Tests Across Browsers
```bash
# Run all browsers
pnpm exec playwright test

# Run specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit

# Run mobile browsers
pnpm exec playwright test --project=mobile-chrome
pnpm exec playwright test --project=mobile-safari
```

### Browser-Specific Tests
```ts
test('feature works in chromium', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'This feature is chromium-only');
  
  // Test chromium-specific feature
});
```

---

## Performance Testing in E2E

### Measure Page Load Time
```ts
import { test, expect } from '@playwright/test';

test('page loads within acceptable time', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

### Monitor Web Vitals
```ts
test('Core Web Vitals are acceptable', async ({ page }) => {
  await page.goto('/');
  
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries.map(entry => ({
          name: entry.name,
          value: entry.startTime,
        })));
      }).observe({ entryTypes: ['navigation', 'paint'] });
    });
  });
  
  console.log('Performance metrics:', metrics);
});
```

---

## Best Practices

### ✅ Test Happy Paths in E2E
```ts
// ✅ Good: Critical user journey
test('user completes checkout', async ({ page }) => {
  await page.goto('/products');
  await page.getByTestId('product-card').first().click();
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByRole('link', { name: 'Checkout' }).click();
  // ... complete checkout
});

// ❌ Bad: Edge cases belong in unit/integration tests
test('email validation shows correct error', async ({ page }) => {
  // This should be a unit test
});
```

### ✅ Use Data Attributes for Test IDs
```tsx
// Component
<button data-testid="submit-button">Submit</button>

// Test
await page.getByTestId('submit-button').click();
```

### ✅ Clean Up Test Data
```ts
test.afterEach(async ({ page }) => {
  // Delete test data
  await page.request.delete('/api/test-data');
  
  // Clear cookies
  await page.context().clearCookies();
});
```

---

## Anti-Patterns

### ❌ Using Arbitrary Waits
```ts
// ❌ Bad
await page.click('button');
await page.waitForTimeout(2000);

// ✅ Good
await page.click('button');
await page.waitForResponse(resp => resp.url().includes('/api/data'));
```

### ❌ Testing Implementation Details
```ts
// ❌ Bad: Testing CSS classes
await expect(page.locator('.btn-primary')).toHaveClass('active');

// ✅ Good: Testing user-visible state
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

### ❌ Duplicate Coverage
```ts
// ❌ Bad: E2E test for validation
test('email validation', async ({ page }) => {
  await page.fill('[name="email"]', 'invalid');
  await expect(page.getByText('Invalid email')).toBeVisible();
});

// ✅ Good: This belongs in unit tests
```

---

**← Back to:** [BDD Testing](./05-bdd-cucumber-playwright.md)  
**Next:** [Visual Testing](./07-visual-testing.md) →

