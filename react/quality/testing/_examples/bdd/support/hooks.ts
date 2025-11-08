/**
 * Cucumber Hooks
 * 
 * Setup and teardown for BDD tests:
 * - BeforeAll: Start browser once
 * - Before: Create new context and page per scenario
 * - After: Clean up and capture artifacts on failure
 * - AfterAll: Close browser
 */

import { Before, After, Status, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser } from '@playwright/test';
import type { ICustomWorld } from './world';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

setDefaultTimeout(30000); // 30 seconds default timeout

let browser: Browser;

// Ensure output directories exist
const ensureDirectories = () => {
  const dirs = [
    'reports/screenshots',
    'reports/traces',
    'reports/videos',
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// ============================================================================
// BEFORE ALL SCENARIOS
// ============================================================================

BeforeAll(async function () {
  console.log('🚀 Starting browser...');
  
  ensureDirectories();
  
  // Launch browser
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
    args: [
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
  
  console.log('✅ Browser started');
});

// ============================================================================
// BEFORE EACH SCENARIO
// ============================================================================

Before(async function (this: ICustomWorld, { pickle }) {
  console.log(`\n📝 Scenario: ${pickle.name}`);
  console.log(`📎 Tags: ${pickle.tags.map(t => t.name).join(', ')}`);
  
  // Create new browser context
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: process.env.VIDEO ? {
      dir: 'reports/videos',
      size: { width: 1280, height: 720 },
    } : undefined,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  
  // Create new page
  this.page = await this.context.newPage();
  
  // Enable tracing
  await this.context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  
  // Set up console logging
  this.page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[Browser ${type}]: ${msg.text()}`);
    }
  });
  
  // Set up error logging
  this.page.on('pageerror', error => {
    console.log(`[Browser Error]: ${error.message}`);
  });
  
  // Set up request logging (optional, for debugging)
  if (process.env.DEBUG_NETWORK) {
    this.page.on('request', request => {
      console.log(`→ ${request.method()} ${request.url()}`);
    });
    
    this.page.on('response', response => {
      console.log(`← ${response.status()} ${response.url()}`);
    });
  }
  
  console.log('✅ Context and page created');
});

// ============================================================================
// AFTER EACH SCENARIO
// ============================================================================

After(async function (this: ICustomWorld, { result, pickle }) {
  const scenarioName = pickle.name.replace(/[^a-zA-Z0-9]/g, '-');
  const timestamp = Date.now();
  
  // Save trace on failure
  if (result?.status === Status.FAILED) {
    console.log('❌ Scenario failed, capturing artifacts...');
    
    // Save trace
    const tracePath = `reports/traces/${scenarioName}-${timestamp}.zip`;
    await this.context.tracing.stop({ path: tracePath });
    this.attach(tracePath, 'application/zip');
    console.log(`📦 Trace saved: ${tracePath}`);
    
    // Take screenshot
    const screenshotPath = `reports/screenshots/${scenarioName}-failure-${timestamp}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    this.attach(screenshotPath, 'image/png');
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Capture HTML
    const htmlPath = `reports/screenshots/${scenarioName}-${timestamp}.html`;
    const html = await this.page.content();
    fs.writeFileSync(htmlPath, html);
    this.attach(htmlPath, 'text/html');
    console.log(`📄 HTML saved: ${htmlPath}`);
  } else {
    // Just stop tracing without saving
    await this.context.tracing.stop();
    console.log('✅ Scenario passed');
  }
  
  // Close page and context
  await this.page.close();
  await this.context.close();
  
  console.log('🧹 Cleaned up page and context');
});

// ============================================================================
// AFTER ALL SCENARIOS
// ============================================================================

AfterAll(async function () {
  console.log('\n🏁 Closing browser...');
  
  await browser.close();
  
  console.log('✅ Browser closed');
  console.log('📊 Test run complete');
});

// ============================================================================
// TAGGED HOOKS (conditional execution)
// ============================================================================

// Before hook for scenarios tagged with @slow
Before({ tags: '@slow' }, function () {
  console.log('⏰ This is a slow test, increasing timeout...');
  this.setDefaultTimeout(60000); // 60 seconds
});

// Before hook for scenarios tagged with @performance
Before({ tags: '@performance' }, function (this: ICustomWorld) {
  console.log('📊 Performance test, starting timer...');
  this.startTime = Date.now();
});

// After hook for scenarios tagged with @performance
After({ tags: '@performance' }, function (this: ICustomWorld) {
  if (this.startTime) {
    const elapsed = Date.now() - this.startTime;
    console.log(`⏱️  Total scenario time: ${elapsed}ms`);
  }
});

// Before hook for scenarios tagged with @a11y
Before({ tags: '@a11y' }, async function (this: ICustomWorld) {
  console.log('♿ Accessibility test, injecting axe-core...');
  // Would inject axe-core here for accessibility testing
});

// ============================================================================
// KEY PATTERNS
// ============================================================================
// 1. Use BeforeAll/AfterAll for expensive setup (browser)
// 2. Use Before/After for per-scenario setup (context, page)
// 3. Capture artifacts (traces, screenshots) on failure
// 4. Clean up resources in After hooks
// 5. Use tagged hooks for conditional setup
// 6. Log important events for debugging

