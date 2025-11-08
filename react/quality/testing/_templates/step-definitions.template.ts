/**
 * Step Definitions Template
 * 
 * Use this template for creating reusable Cucumber step definitions
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { ICustomWorld } from '../support/world';
import { PageObjectName } from '../support/page-objects/PageObjectName';

// ============================================================================
// GIVEN STEPS - Preconditions and Setup
// ============================================================================

Given('I am on the {string} page', async function (this: ICustomWorld, pageName: string) {
  const pageObject = new PageObjectName(this.page);
  await pageObject.goto();
  await pageObject.expectToBeVisible();
});

Given('I am logged in', async function (this: ICustomWorld) {
  // Quick login setup
  await this.setAuthToken('mock-token');
  await this.page.goto('/dashboard');
});

Given('I am logged in as {string}', async function (this: ICustomWorld, role: string) {
  const credentials = {
    user: { email: 'user@example.com', password: 'password123' },
    admin: { email: 'admin@example.com', password: 'admin123' },
  };
  
  const creds = credentials[role];
  await this.page.goto('/login');
  await this.page.fill('[data-testid="email-input"]', creds.email);
  await this.page.fill('[data-testid="password-input"]', creds.password);
  await this.page.click('[data-testid="submit-button"]');
  await this.page.waitForURL('**/dashboard');
});

Given('the following {string} exist:', async function (this: ICustomWorld, resource: string, dataTable: DataTable) {
  const items = dataTable.hashes();
  
  // Store in test data for later use
  this.testData[resource] = items;
  
  // Could also seed database here
  for (const item of items) {
    await this.page.request.post(`/api/${resource}`, {
      data: item,
    });
  }
});

// ============================================================================
// WHEN STEPS - Actions and Interactions
// ============================================================================

When('I click the {string} button', async function (this: ICustomWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

When('I click {string}', async function (this: ICustomWorld, selector: string) {
  await this.page.click(selector);
});

When('I fill {string} with {string}', async function (this: ICustomWorld, field: string, value: string) {
  await this.page.fill(field, value);
});

When('I enter {string} in the {string} field', async function (this: ICustomWorld, value: string, fieldName: string) {
  const field = this.page.getByLabel(fieldName);
  await field.fill(value);
});

When('I select {string} from {string}', async function (this: ICustomWorld, option: string, selectName: string) {
  await this.page.selectOption(`[aria-label="${selectName}"]`, option);
});

When('I check {string}', async function (this: ICustomWorld, checkboxName: string) {
  await this.page.check(`[aria-label="${checkboxName}"]`);
});

When('I navigate to {string}', async function (this: ICustomWorld, url: string) {
  await this.page.goto(url);
});

When('I submit the form', async function (this: ICustomWorld) {
  await this.page.click('[type="submit"]');
});

When('I wait for {int} seconds', async function (this: ICustomWorld, seconds: number) {
  await this.page.waitForTimeout(seconds * 1000);
});

When('I create a {string} with the following details:', async function (this: ICustomWorld, resource: string, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill form with data
  for (const [field, value] of Object.entries(data)) {
    await this.page.fill(`[data-testid="${field.toLowerCase()}-input"]`, value);
  }
  
  await this.page.click('[data-testid="submit-button"]');
});

// ============================================================================
// THEN STEPS - Assertions and Verifications
// ============================================================================

Then('I should see {string}', async function (this: ICustomWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});

Then('I should not see {string}', async function (this: ICustomWorld, text: string) {
  await expect(this.page.getByText(text)).not.toBeVisible();
});

Then('I should be on the {string} page', async function (this: ICustomWorld, pageName: string) {
  const pageRoutes: Record<string, string> = {
    'dashboard': '/dashboard',
    'login': '/login',
    'profile': '/profile',
  };
  
  const expectedRoute = pageRoutes[pageName.toLowerCase()];
  await expect(this.page).toHaveURL(new RegExp(expectedRoute));
});

Then('I should be redirected to {string}', async function (this: ICustomWorld, url: string) {
  await this.page.waitForURL(url);
  await expect(this.page).toHaveURL(url);
});

Then('the {string} field should contain {string}', async function (this: ICustomWorld, fieldName: string, value: string) {
  const field = this.page.getByLabel(fieldName);
  await expect(field).toHaveValue(value);
});

Then('the {string} button should be {string}', async function (this: ICustomWorld, buttonText: string, state: string) {
  const button = this.page.getByRole('button', { name: buttonText });
  
  if (state === 'disabled') {
    await expect(button).toBeDisabled();
  } else if (state === 'enabled') {
    await expect(button).toBeEnabled();
  } else if (state === 'visible') {
    await expect(button).toBeVisible();
  } else if (state === 'hidden') {
    await expect(button).not.toBeVisible();
  }
});

Then('I should see an error message {string}', async function (this: ICustomWorld, errorMessage: string) {
  const error = this.page.getByRole('alert');
  await expect(error).toBeVisible();
  await expect(error).toContainText(errorMessage);
});

Then('I should see a success message', async function (this: ICustomWorld) {
  const success = this.page.getByRole('status');
  await expect(success).toBeVisible();
});

Then('the following {string} should be displayed:', async function (this: ICustomWorld, resource: string, dataTable: DataTable) {
  const expectedItems = dataTable.hashes();
  
  for (const item of expectedItems) {
    const row = this.page.locator(`[data-resource="${resource}"][data-id="${item.id}"]`);
    await expect(row).toBeVisible();
    
    for (const [key, value] of Object.entries(item)) {
      if (key !== 'id') {
        await expect(row.getByText(value)).toBeVisible();
      }
    }
  }
});

Then('the page should have no accessibility violations', async function (this: ICustomWorld) {
  // Would use @axe-core/playwright
  // const results = await new AxeBuilder({ page: this.page }).analyze();
  // expect(results.violations).toEqual([]);
});

Then('I should be able to navigate with keyboard', async function (this: ICustomWorld) {
  // Test keyboard navigation
  await this.page.keyboard.press('Tab');
  const firstFocusable = await this.page.locator(':focus');
  await expect(firstFocusable).toBeVisible();
});

// ============================================================================
// BEST PRACTICES
// ============================================================================
// 1. Make steps reusable and generic
// 2. Use Page Objects for complex interactions
// 3. Store test data in World for reuse across steps
// 4. Use meaningful wait strategies (not arbitrary timeouts)
// 5. Add proper error messages to assertions
// 6. Keep steps declarative (what, not how)
// 7. Use TypeScript for type safety

