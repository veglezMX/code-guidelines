# BDD Testing — Cucumber + Playwright

**Goal:** Gherkin style guide, tag taxonomy, step design patterns, World contract, and CI sharding for acceptance testing.

---

## Setup and Configuration

### Install Dependencies
```bash
pnpm add -D @cucumber/cucumber @playwright/test
```

### Cucumber Configuration
```ts
// cucumber.config.ts
export default {
  require: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  publishQuiet: true,
  dryRun: false,
  failFast: false,
  strict: true,
};
```

### TypeScript Configuration
```json
// tsconfig.cucumber.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "types": ["node", "@cucumber/cucumber", "@playwright/test"]
  },
  "include": ["tests/bdd/**/*"]
}
```

---

## Gherkin Style Guide

### Feature File Structure
```gherkin
@e2e @auth @critical
Feature: User Authentication
  As a user
  I want to securely log in to the application
  So that I can access my personal dashboard

  Background:
    Given the application is running
    And I am not logged in

  @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "user@example.com"
    And I enter password "SecurePass123"
    And I click the "Sign In" button
    Then I should be redirected to the dashboard
    And I should see "Welcome back" message

  @regression
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter email "wrong@example.com"
    And I enter password "wrongpass"
    And I click the "Sign In" button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @regression
  Scenario Outline: Email validation
    Given I am on the login page
    When I enter email "<email>"
    And I move focus away from email field
    Then I should see validation message "<message>"

    Examples:
      | email           | message                    |
      |                 | Email is required          |
      | invalid         | Email must be valid        |
      | user@example    | Email must include domain  |
```

### Writing Good Scenarios

**✅ Good: Declarative, user-focused**
```gherkin
Scenario: User completes purchase
  Given I have items in my cart
  When I proceed to checkout
  And I complete payment
  Then I should see order confirmation
```

**❌ Bad: Imperative, implementation-focused**
```gherkin
Scenario: User completes purchase
  Given I click the cart icon
  And I see 2 items
  When I click "Checkout"
  And I type "4111111111111111" in card field
  And I click "Submit" button
  Then the URL should be "/order-confirmation"
```

---

## Tag Taxonomy

### Layer Tags
```
@e2e           # End-to-end test scenarios
@integration   # Integration test scenarios  
@smoke         # Critical path smoke tests (run on every PR)
@regression    # Full regression suite (run nightly)
```

### Feature Tags
```
@auth          # Authentication/authorization
@payment       # Payment processing
@dashboard     # Dashboard functionality
@admin         # Admin-only features
@mobile        # Mobile-specific scenarios
@desktop       # Desktop-specific scenarios
```

### Priority Tags
```
@critical      # Must pass for deployment (P0)
@high          # High priority scenarios (P1)
@medium        # Medium priority scenarios (P2)
@low           # Low priority scenarios (P3)
```

### Environment Tags
```
@staging       # Staging environment only
@production    # Production safe
@local         # Local development only
```

### State Tags
```
@wip           # Work in progress (skipped in CI)
@flaky         # Known flaky test (quarantined)
@skip          # Temporarily disabled
```

---

## Step Definitions

### Basic Step Patterns
```ts
// tests/bdd/steps/authentication/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { ICustomWorld } from '../support/world';

Given('I am on the login page', async function (this: ICustomWorld) {
  await this.page.goto('/login');
});

When('I enter email {string}', async function (this: ICustomWorld, email: string) {
  await this.page.fill('[data-testid="email-input"]', email);
});

When('I enter password {string}', async function (this: ICustomWorld, password: string) {
  await this.page.fill('[data-testid="password-input"]', password);
});

When('I click the {string} button', async function (this: ICustomWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('I should be redirected to the dashboard', async function (this: ICustomWorld) {
  await expect(this.page).toHaveURL(/.*\/dashboard/);
});

Then('I should see {string} message', async function (this: ICustomWorld, message: string) {
  await expect(this.page.locator('text=' + message)).toBeVisible();
});

Then('I should see an error message {string}', async function (this: ICustomWorld, error: string) {
  await expect(this.page.locator('[data-testid="error-message"]')).toHaveText(error);
});
```

### Reusable Step Patterns
```ts
// tests/bdd/steps/common/navigation.steps.ts
import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/world';

Given('I am on the {string} page', async function (this: ICustomWorld, pageName: string) {
  const routes = {
    'login': '/login',
    'dashboard': '/dashboard',
    'profile': '/profile',
    'settings': '/settings',
  };
  
  const route = routes[pageName.toLowerCase()];
  if (!route) throw new Error(`Unknown page: ${pageName}`);
  
  await this.page.goto(route);
});

When('I navigate to {string}', async function (this: ICustomWorld, url: string) {
  await this.page.goto(url);
});

When('I click {string}', async function (this: ICustomWorld, selector: string) {
  await this.page.click(selector);
});

When('I fill {string} with {string}', async function (this: ICustomWorld, field: string, value: string) {
  await this.page.fill(field, value);
});
```

### Data Table Steps
```ts
// tests/bdd/steps/user/create-user.steps.ts
import { When, Then, DataTable } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/world';

When('I create a user with the following details:', async function (this: ICustomWorld, dataTable: DataTable) {
  const user = dataTable.rowsHash();
  
  await this.page.fill('[data-testid="name-input"]', user['Name']);
  await this.page.fill('[data-testid="email-input"]', user['Email']);
  await this.page.selectOption('[data-testid="role-select"]', user['Role']);
  await this.page.click('[data-testid="submit-button"]');
});

Then('the users table should contain:', async function (this: ICustomWorld, dataTable: DataTable) {
  const expectedUsers = dataTable.hashes();
  
  for (const user of expectedUsers) {
    const row = this.page.locator(`tr:has-text("${user.Email}")`);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(0)).toHaveText(user.Name);
    await expect(row.locator('td').nth(1)).toHaveText(user.Email);
  }
});
```

---

## Custom World Contract

### World Definition
```ts
// tests/bdd/support/world.ts
import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

export interface ICustomWorld extends World {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  
  // Helper methods
  screenshot(name: string): Promise<void>;
  clearCookies(): Promise<void>;
  setAuthToken(token: string): Promise<void>;
  
  // Test data
  testData: Record<string, any>;
}

export class CustomWorld extends World implements ICustomWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  testData: Record<string, any> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  async screenshot(name: string): Promise<void> {
    const screenshotPath = `reports/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.attach(screenshotPath, 'image/png');
  }

  async clearCookies(): Promise<void> {
    await this.context.clearCookies();
  }

  async setAuthToken(token: string): Promise<void> {
    await this.context.addCookies([
      {
        name: 'auth_token',
        value: token,
        domain: 'localhost',
        path: '/',
      },
    ]);
  }
}

setWorldConstructor(CustomWorld);
```

### Hooks
```ts
// tests/bdd/support/hooks.ts
import { Before, After, Status, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { chromium, Browser } from '@playwright/test';
import type { ICustomWorld } from './world';

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
  });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function (this: ICustomWorld) {
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: process.env.VIDEO ? { dir: 'reports/videos' } : undefined,
  });
  
  this.page = await this.context.newPage();
  
  // Enable tracing
  await this.context.tracing.start({ screenshots: true, snapshots: true });
});

After(async function (this: ICustomWorld, { result, pickle }) {
  // Save trace on failure
  if (result?.status === Status.FAILED) {
    const tracePath = `reports/traces/${pickle.name}-${Date.now()}.zip`;
    await this.context.tracing.stop({ path: tracePath });
    this.attach(tracePath, 'application/zip');
    
    // Take screenshot
    await this.screenshot(`failure-${pickle.name}`);
  } else {
    await this.context.tracing.stop();
  }
  
  // Cleanup
  await this.page.close();
  await this.context.close();
});
```

---

## Page Object Pattern

### Page Object Example
```ts
// tests/bdd/support/page-objects/LoginPage.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    submitButton: '[data-testid="submit-button"]',
    errorMessage: '[data-testid="error-message"]',
    forgotPasswordLink: 'a:has-text("Forgot password")',
  };

  // Actions
  async goto() {
    await this.page.goto('/login');
  }

  async enterCredentials(email: string, password: string) {
    await this.page.fill(this.selectors.emailInput, email);
    await this.page.fill(this.selectors.passwordInput, password);
  }

  async clickSubmit() {
    await this.page.click(this.selectors.submitButton);
  }

  async clickForgotPassword() {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  // Assertions
  async expectErrorMessage(message: string) {
    await expect(this.page.locator(this.selectors.errorMessage)).toHaveText(message);
  }

  async expectToBeVisible() {
    await expect(this.page.locator(this.selectors.emailInput)).toBeVisible();
  }
}
```

### Using Page Objects in Steps
```ts
// tests/bdd/steps/authentication/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { LoginPage } from '../support/page-objects/LoginPage';
import type { ICustomWorld } from '../support/world';

Given('I am on the login page', async function (this: ICustomWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  await loginPage.expectToBeVisible();
});

When('I enter credentials {string} and {string}', async function (
  this: ICustomWorld,
  email: string,
  password: string
) {
  const loginPage = new LoginPage(this.page);
  await loginPage.enterCredentials(email, password);
  await loginPage.clickSubmit();
});
```

---

## CI Integration and Sharding

### Running Tests by Tags
```bash
# Run only smoke tests
pnpm cucumber-js --tags "@smoke"

# Run smoke and critical tests
pnpm cucumber-js --tags "@smoke or @critical"

# Run auth tests, exclude flaky
pnpm cucumber-js --tags "@auth and not @flaky"

# Run all except work in progress
pnpm cucumber-js --tags "not @wip"
```

### Parallel Execution
```json
// package.json
{
  "scripts": {
    "test:bdd": "cucumber-js",
    "test:bdd:smoke": "cucumber-js --tags '@smoke'",
    "test:bdd:regression": "cucumber-js --tags '@regression'",
    "test:bdd:parallel": "cucumber-js --parallel 4"
  }
}
```

### CI Configuration
```yaml
# .github/workflows/bdd-tests.yml
name: BDD Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  bdd-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:bdd:smoke
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: bdd-smoke-failures
          path: |
            reports/screenshots/
            reports/traces/
            reports/cucumber-report.html

  bdd-regression:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm cucumber-js --parallel 1 --shard ${{ matrix.shard }}/4
```

---

## Best Practices

### ✅ Write Declarative Scenarios
```gherkin
# ✅ Good: What, not how
When I complete the checkout process
Then I should receive order confirmation

# ❌ Bad: Too much detail
When I click the checkout button
And I fill the address form
And I select shipping method
And I enter credit card
And I click submit
Then the URL should contain "/order-confirmation"
```

### ✅ Keep Steps Reusable
```ts
// ✅ Good: Generic, reusable
When('I click the {string} button', async function (buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

// ❌ Bad: Too specific
When('I click the submit button on the login form', async function () {
  await this.page.click('#login-form button[type="submit"]');
});
```

### ✅ Use Background for Common Setup
```gherkin
Background:
  Given I am logged in as "admin"
  And I am on the users page

Scenario: Create user
  When I click "Add User"
  Then I should see user form
```

---

**← Back to:** [Integration Testing](./04-integration-vitest-msw.md)  
**Next:** [E2E Testing](./06-e2e-playwright.md) →

