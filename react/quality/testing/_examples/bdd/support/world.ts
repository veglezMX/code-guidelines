/**
 * Custom World for Cucumber + Playwright
 * 
 * Provides shared context and utilities across all step definitions:
 * - Playwright browser, context, and page instances
 * - Helper methods for screenshots, cleanup
 * - Test data storage
 */

import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';

// ============================================================================
// CUSTOM WORLD INTERFACE
// ============================================================================

export interface ICustomWorld extends World {
  // Playwright instances
  browser: Browser;
  context: BrowserContext;
  page: Page;
  
  // Helper methods
  screenshot(name: string): Promise<void>;
  clearCookies(): Promise<void>;
  setAuthToken(token: string): Promise<void>;
  navigateToPage(pageName: string): Promise<void>;
  
  // Test data storage
  testData: Record<string, any>;
  
  // Performance tracking
  startTime?: number;
  measureTime(label: string): void;
}

// ============================================================================
// CUSTOM WORLD IMPLEMENTATION
// ============================================================================

export class CustomWorld extends World implements ICustomWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  testData: Record<string, any> = {};
  startTime?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Take a screenshot and attach it to the test report
   */
  async screenshot(name: string): Promise<void> {
    const timestamp = Date.now();
    const screenshotPath = `reports/screenshots/${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    
    // Attach to Cucumber report
    this.attach(screenshotPath, 'image/png');
    
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
  }

  /**
   * Clear all cookies in the current context
   */
  async clearCookies(): Promise<void> {
    await this.context.clearCookies();
    console.log('🍪 Cookies cleared');
  }

  /**
   * Set authentication token as a cookie
   */
  async setAuthToken(token: string): Promise<void> {
    await this.context.addCookies([
      {
        name: 'auth_token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
    
    console.log('🔐 Auth token set');
  }

  /**
   * Navigate to a page by name (using predefined routes)
   */
  async navigateToPage(pageName: string): Promise<void> {
    const routes: Record<string, string> = {
      'home': '/',
      'login': '/login',
      'dashboard': '/dashboard',
      'profile': '/profile',
      'settings': '/settings',
      'admin': '/admin',
    };
    
    const route = routes[pageName.toLowerCase()];
    
    if (!route) {
      throw new Error(`Unknown page: ${pageName}`);
    }
    
    await this.page.goto(route);
    await this.page.waitForLoadState('networkidle');
    
    console.log(`🧭 Navigated to: ${pageName} (${route})`);
  }

  /**
   * Start performance measurement
   */
  measureTime(label: string): void {
    if (!this.startTime) {
      this.startTime = Date.now();
      console.log(`⏱️  Started timing: ${label}`);
    } else {
      const elapsed = Date.now() - this.startTime;
      console.log(`⏱️  ${label}: ${elapsed}ms`);
      this.startTime = undefined;
    }
  }
}

// ============================================================================
// SET CUSTOM WORLD AS DEFAULT
// ============================================================================

setWorldConstructor(CustomWorld);

// ============================================================================
// USAGE EXAMPLE IN STEPS
// ============================================================================

/*
import type { ICustomWorld } from '../support/world';

Given('I am on the {string} page', async function (this: ICustomWorld, pageName: string) {
  await this.navigateToPage(pageName);
});

When('I click submit', async function (this: ICustomWorld) {
  await this.page.click('[data-testid="submit-button"]');
});

Then('the page should load', async function (this: ICustomWorld) {
  // Take screenshot for debugging
  await this.screenshot('page-loaded');
  
  // Store data for later steps
  this.testData.userId = await this.page.textContent('[data-user-id]');
});
*/

