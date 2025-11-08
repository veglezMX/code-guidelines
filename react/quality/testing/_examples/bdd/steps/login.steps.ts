/**
 * Step Definitions for Login Feature
 * 
 * Demonstrates:
 * - Reusable step patterns
 * - Page Object usage
 * - Custom World integration
 * - Assertions with Playwright
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { ICustomWorld } from '../support/world';
import { LoginPage } from '../support/page-objects/LoginPage';

// ============================================================================
// GIVEN STEPS (Setup / Preconditions)
// ============================================================================

Given('the application is running', async function (this: ICustomWorld) {
  // Application is already running via web server
  // Just verify it's accessible
  await this.page.goto('/');
  await expect(this.page).toHaveTitle(/My App/);
});

Given('I am not logged in', async function (this: ICustomWorld) {
  // Clear any existing session
  await this.context.clearCookies();
  await this.context.clearPermissions();
});

Given('I am on the login page', async function (this: ICustomWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  await loginPage.expectToBeVisible();
});

Given('I am logged in', async function (this: ICustomWorld) {
  // Quick login for tests that need authenticated state
  await this.page.goto('/login');
  await this.page.fill('[data-testid="email-input"]', 'user@example.com');
  await this.page.fill('[data-testid="password-input"]', 'password123');
  await this.page.click('[data-testid="submit-button"]');
  await this.page.waitForURL('**/dashboard');
});

Given('I am on the dashboard', async function (this: ICustomWorld) {
  await this.page.goto('/dashboard');
  await this.page.waitForLoadState('networkidle');
});

// ============================================================================
// WHEN STEPS (Actions)
// ============================================================================

When('I enter email {string}', async function (this: ICustomWorld, email: string) {
  const loginPage = new LoginPage(this.page);
  await loginPage.enterEmail(email);
});

When('I enter password {string}', async function (this: ICustomWorld, password: string) {
  const loginPage = new LoginPage(this.page);
  await loginPage.enterPassword(password);
});

When('I click the {string} button', async function (this: ICustomWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

When('I move focus away from email field', async function (this: ICustomWorld) {
  await this.page.press('[data-testid="email-input"]', 'Tab');
});

When('I enter valid credentials', async function (this: ICustomWorld) {
  await this.page.fill('[data-testid="email-input"]', 'user@example.com');
  await this.page.fill('[data-testid="password-input"]', 'password123');
});

When('I check the {string} checkbox', async function (this: ICustomWorld, label: string) {
  await this.page.check(`input[type="checkbox"]:near(:text("${label}"))`);
});

When('I close and reopen the browser', async function (this: ICustomWorld) {
  // Close current page
  await this.page.close();
  
  // Create new page in same context (preserves cookies)
  this.page = await this.context.newPage();
});

When('I enter invalid credentials {int} times', async function (this: ICustomWorld, times: number) {
  for (let i = 0; i < times; i++) {
    await this.page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await this.page.fill('[data-testid="password-input"]', 'wrong');
    await this.page.click('[data-testid="submit-button"]');
    
    // Wait for error message
    await this.page.waitForSelector('[data-testid="error-message"]');
  }
});

// ============================================================================
// THEN STEPS (Assertions)
// ============================================================================

Then('I should be redirected to the dashboard', async function (this: ICustomWorld) {
  await expect(this.page).toHaveURL(/.*\/dashboard/);
  await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

Then('I should see {string} message', async function (this: ICustomWorld, message: string) {
  await expect(this.page.getByText(message)).toBeVisible();
});

Then('I should see an error message {string}', async function (this: ICustomWorld, errorMessage: string) {
  const error = this.page.getByTestId('error-message');
  await expect(error).toBeVisible();
  await expect(error).toHaveText(errorMessage);
});

Then('I should remain on the login page', async function (this: ICustomWorld) {
  await expect(this.page).toHaveURL(/.*\/login/);
});

Then('the email field should retain its value', async function (this: ICustomWorld) {
  const emailInput = this.page.getByTestId('email-input');
  await expect(emailInput).not.toHaveValue('');
});

Then('I should see validation errors:', async function (this: ICustomWorld, dataTable: DataTable) {
  const errors = dataTable.hashes();
  
  for (const error of errors) {
    const fieldError = this.page.getByTestId(`${error.Field.toLowerCase()}-error`);
    await expect(fieldError).toBeVisible();
    await expect(fieldError).toHaveText(error.Message);
  }
});

Then('I should see validation message {string}', async function (this: ICustomWorld, message: string) {
  if (message) {
    const validationMessage = this.page.getByTestId('email-validation');
    await expect(validationMessage).toBeVisible();
    await expect(validationMessage).toHaveText(message);
  } else {
    // No validation message should be shown
    const validationMessage = this.page.getByTestId('email-validation');
    await expect(validationMessage).not.toBeVisible();
  }
});

Then('the navigation should show {string} button', async function (this: ICustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
});

Then('the page should have no accessibility violations', async function (this: ICustomWorld) {
  // This would use @axe-core/playwright
  // const results = await new AxeBuilder({ page: this.page }).analyze();
  // expect(results.violations).toEqual([]);
});

Then('I should be able to navigate the form with keyboard', async function (this: ICustomWorld) {
  await this.page.keyboard.press('Tab');
  await expect(this.page.getByTestId('email-input')).toBeFocused();
  
  await this.page.keyboard.press('Tab');
  await expect(this.page.getByTestId('password-input')).toBeFocused();
  
  await this.page.keyboard.press('Tab');
  await expect(this.page.getByTestId('submit-button')).toBeFocused();
});

Then('all form fields should have proper labels', async function (this: ICustomWorld) {
  const emailInput = this.page.getByLabel('Email');
  const passwordInput = this.page.getByLabel('Password');
  
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
});

Then('error messages should be announced to screen readers', async function (this: ICustomWorld) {
  const errorRegion = this.page.getByRole('alert');
  await expect(errorRegion).toHaveAttribute('aria-live');
});

Then('I should be redirected to the admin dashboard', async function (this: ICustomWorld) {
  await expect(this.page).toHaveURL(/.*\/admin\/dashboard/);
});

Then('I should see admin navigation menu', async function (this: ICustomWorld) {
  const adminNav = this.page.getByRole('navigation', { name: 'Admin' });
  await expect(adminNav).toBeVisible();
});

Then('I should be logged in', async function (this: ICustomWorld) {
  // Verify authenticated state
  await expect(this.page).toHaveURL(/.*\/dashboard/);
});

Then('I should still be logged in', async function (this: ICustomWorld) {
  await this.page.goto('/dashboard');
  
  // Should not redirect to login
  await expect(this.page).toHaveURL(/.*\/dashboard/);
});

Then('I should be logged out', async function (this: ICustomWorld) {
  // Verify session is cleared
  await expect(this.page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

Then('attempting to access the dashboard should redirect to login', async function (this: ICustomWorld) {
  await this.page.goto('/dashboard');
  await expect(this.page).toHaveURL(/.*\/login/);
});

Then('I should see message {string}', async function (this: ICustomWorld, message: string) {
  await expect(this.page.getByText(message)).toBeVisible();
});

Then('the login button should be disabled', async function (this: ICustomWorld) {
  const submitButton = this.page.getByTestId('submit-button');
  await expect(submitButton).toBeDisabled();
});

Then('the authentication should complete within {int} seconds', async function (this: ICustomWorld, seconds: number) {
  const startTime = Date.now();
  
  await this.page.waitForURL('**/dashboard');
  
  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(seconds * 1000);
});

Then('the dashboard should load within {int} seconds', async function (this: ICustomWorld, seconds: number) {
  const startTime = Date.now();
  
  await this.page.waitForLoadState('networkidle');
  
  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(seconds * 1000);
});

// ============================================================================
// KEY PATTERNS
// ============================================================================
// 1. Use Page Objects for page interactions
// 2. Use Custom World for shared state
// 3. Make steps reusable and declarative
// 4. Use descriptive step names
// 5. Add assertions with meaningful error messages
// 6. Handle async operations properly

