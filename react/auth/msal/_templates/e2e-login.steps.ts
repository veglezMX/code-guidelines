/**
 * E2E Login Step Definitions Template
 * 
 * Copy this template and customize for your Playwright + Cucumber.js E2E tests.
 * Implements step definitions for authentication scenarios.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Background Steps
 */

Given('the application is in test mode', async function () {
  // Verify test mode is enabled
  expect(process.env.MODE).toBe('test');
  
  // TODO: Add any test mode setup
  // await this.page.evaluate(() => {
  //   sessionStorage.setItem('test-mode', 'true');
  // });
});

Given('I am on the home page', async function () {
  await this.page.goto('/');
  await this.page.waitForLoadState('networkidle');
});

/**
 * Authentication State Steps
 */

Given('I am not authenticated', async function () {
  // Clear any existing auth state
  await this.page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  
  await this.page.goto('/');
});

Given('I am logged in as {string}', async function (role: string) {
  // Navigate to dev login
  await this.page.goto('/dev-login');
  
  // Click the appropriate login button
  await this.page.click(`button:has-text("Login as ${role}")`);
  
  // Wait for redirect to dashboard
  await this.page.waitForURL(/\/dashboard/);
  
  // TODO: Verify authentication state
  // const isAuthenticated = await this.page.evaluate(() => {
  //   return sessionStorage.getItem('msal.dev.token') !== null;
  // });
  // expect(isAuthenticated).toBe(true);
});

/**
 * Navigation Steps
 */

When('I navigate to {string}', async function (path: string) {
  await this.page.goto(path);
  await this.page.waitForLoadState('networkidle');
});

When('I click the {string} button', async function (buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

When('I click {string}', async function (selector: string) {
  await this.page.click(selector);
});

/**
 * Dev Login Steps
 */

When('I select {string} from dev login', async function (option: string) {
  await this.page.click(`button:has-text("${option}")`);
  
  // Wait for login to complete
  await this.page.waitForTimeout(500);
});

/**
 * Assertion Steps
 */

Then('I should be redirected to {string}', async function (path: string) {
  await this.page.waitForURL(new RegExp(path));
  expect(this.page.url()).toContain(path);
});

Then('I should see {string}', async function (text: string) {
  const element = this.page.locator(`text=${text}`);
  await expect(element).toBeVisible();
});

Then('I should not see {string}', async function (text: string) {
  const element = this.page.locator(`text=${text}`);
  await expect(element).not.toBeVisible();
});

Then('I should see the {string}', async function (elementName: string) {
  // TODO: Map element names to selectors
  const selectors: Record<string, string> = {
    'user menu': '[data-testid="user-menu"]',
    'admin panel': '[data-testid="admin-panel"]',
    'moderation panel': '[data-testid="moderation-panel"]',
    'moderation tools': '[data-testid="moderation-tools"]',
    // Add more mappings as needed
  };
  
  const selector = selectors[elementName];
  if (!selector) {
    throw new Error(`Unknown element: ${elementName}`);
  }
  
  const element = this.page.locator(selector);
  await expect(element).toBeVisible();
});

Then('I should not see the {string}', async function (elementName: string) {
  // TODO: Map element names to selectors
  const selectors: Record<string, string> = {
    'admin panel': '[data-testid="admin-panel"]',
    // Add more mappings as needed
  };
  
  const selector = selectors[elementName];
  if (!selector) {
    throw new Error(`Unknown element: ${elementName}`);
  }
  
  const element = this.page.locator(selector);
  await expect(element).not.toBeVisible();
});

/**
 * API Steps
 */

Then('the API should receive a Bearer token', async function () {
  // Intercept API calls and verify Bearer token
  let tokenReceived = false;
  
  await this.page.route('/api/**', (route) => {
    const headers = route.request().headers();
    
    if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
      tokenReceived = true;
    }
    
    route.continue();
  });
  
  // Trigger an API call
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
  
  expect(tokenReceived).toBe(true);
});

Then('the API should return user data', async function () {
  // Wait for API response
  const response = await this.page.waitForResponse(
    (response) => response.url().includes('/api/') && response.status() === 200
  );
  
  expect(response.ok()).toBe(true);
  
  // TODO: Verify response data
  // const data = await response.json();
  // expect(data).toHaveProperty('user');
});

Then('the API should return {int} {string}', async function (statusCode: number, statusText: string) {
  const response = await this.page.waitForResponse(
    (response) => response.url().includes('/api/')
  );
  
  expect(response.status()).toBe(statusCode);
});

/**
 * Action Steps
 */

When('I attempt to create a new item', async function () {
  // TODO: Implement item creation action
  await this.page.click('[data-testid="create-item-button"]');
  await this.page.fill('[data-testid="item-name"]', 'Test Item');
  await this.page.click('[data-testid="submit-button"]');
});

When('I refresh the page', async function () {
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

/**
 * Authentication State Checks
 */

Then('I should not be authenticated', async function () {
  const isAuthenticated = await this.page.evaluate(() => {
    return sessionStorage.getItem('msal.dev.token') !== null;
  });
  
  expect(isAuthenticated).toBe(false);
});

Then('I should still be authenticated', async function () {
  const isAuthenticated = await this.page.evaluate(() => {
    return sessionStorage.getItem('msal.dev.token') !== null;
  });
  
  expect(isAuthenticated).toBe(true);
});

Then('the session should be cleared', async function () {
  const sessionData = await this.page.evaluate(() => {
    return {
      devToken: sessionStorage.getItem('msal.dev.token'),
      devMode: sessionStorage.getItem('msal.dev.mode'),
    };
  });
  
  expect(sessionData.devToken).toBeNull();
  expect(sessionData.devMode).toBeNull();
});

/**
 * Token Steps
 */

Given('my token is about to expire', async function () {
  // TODO: Implement token expiration simulation
  await this.page.evaluate(() => {
    const token = JSON.parse(sessionStorage.getItem('msal.dev.token') || '{}');
    token.expiresOn = new Date(Date.now() + 60000); // Expires in 1 minute
    sessionStorage.setItem('msal.dev.token', JSON.stringify(token));
  });
});

When('I make an API call', async function () {
  // TODO: Trigger an API call
  await this.page.click('[data-testid="fetch-data-button"]');
});

Then('the token should be refreshed automatically', async function () {
  // TODO: Verify token refresh
  // This would typically involve checking network requests or token state
  await this.page.waitForTimeout(1000);
});

Then('the API call should succeed', async function () {
  const response = await this.page.waitForResponse(
    (response) => response.url().includes('/api/')
  );
  
  expect(response.ok()).toBe(true);
});

/**
 * Error Handling Steps
 */

When('the authentication fails', async function () {
  // TODO: Simulate authentication failure
  // This might involve mocking the auth service or manipulating state
});

/**
 * Content Verification Steps
 */

Then('I should see my user data on the dashboard', async function () {
  // TODO: Verify user data is displayed
  await expect(this.page.locator('[data-testid="user-name"]')).toBeVisible();
  await expect(this.page.locator('[data-testid="user-email"]')).toBeVisible();
});

Then('I should see my profile page', async function () {
  await expect(this.page.locator('[data-testid="profile-page"]')).toBeVisible();
});

/**
 * TODO: Add custom step definitions for your application
 * 
 * Examples:
 * - Multi-factor authentication steps
 * - Social login provider steps
 * - Password reset steps
 * - Profile editing steps
 * - Role switching steps
 * - Account linking steps
 */

