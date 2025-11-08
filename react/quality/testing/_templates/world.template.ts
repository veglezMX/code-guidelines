/**
 * Custom World Template
 * 
 * Use this template to create a custom World for your Cucumber tests
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
  
  // Custom helpers (add your own)
  // loginAs(role: string): Promise<void>;
  // seedDatabase(data: any): Promise<void>;
  // waitForApiCall(endpoint: string): Promise<void>;
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
      // Add more routes as needed
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
   * Start or stop performance measurement
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

  // ============================================================================
  // ADD YOUR CUSTOM HELPER METHODS HERE
  // ============================================================================

  /**
   * Example: Login as a specific role
   */
  async loginAs(role: string): Promise<void> {
    const credentials: Record<string, { email: string; password: string }> = {
      user: { email: 'user@example.com', password: 'password123' },
      admin: { email: 'admin@example.com', password: 'admin123' },
    };
    
    const creds = credentials[role];
    
    if (!creds) {
      throw new Error(`Unknown role: ${role}`);
    }
    
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', creds.email);
    await this.page.fill('[data-testid="password-input"]', creds.password);
    await this.page.click('[data-testid="submit-button"]');
    await this.page.waitForURL('**/dashboard');
    
    console.log(`👤 Logged in as: ${role}`);
  }

  /**
   * Example: Wait for specific API call
   */
  async waitForApiCall(endpoint: string): Promise<void> {
    await this.page.waitForResponse(resp => resp.url().includes(endpoint));
    console.log(`🌐 API call completed: ${endpoint}`);
  }

  /**
   * Example: Seed database with test data
   */
  async seedDatabase(data: any): Promise<void> {
    await this.page.request.post('/api/test/seed', { data });
    console.log('🌱 Database seeded');
  }
}

// ============================================================================
// SET CUSTOM WORLD AS DEFAULT
// ============================================================================

setWorldConstructor(CustomWorld);

// ============================================================================
// USAGE IN STEP DEFINITIONS
// ============================================================================

/*
import type { ICustomWorld } from '../support/world';

Given('I am on the dashboard', async function (this: ICustomWorld) {
  await this.navigateToPage('dashboard');
});

When('I perform an action', async function (this: ICustomWorld) {
  this.measureTime('action-start');
  await this.page.click('[data-testid="action-button"]');
  this.measureTime('action-complete');
});

Then('I should see results', async function (this: ICustomWorld) {
  await this.screenshot('results-page');
  // assertions...
});
*/

