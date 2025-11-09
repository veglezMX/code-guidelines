Now I'll create the comprehensive guide tailored for Vite and React 19 with ESLint and TypeScript.

# Content Security Policy Best Practices for Vite + React 19 with TypeScript and ESLint IntegrationBuilding secure React 19 applications with Vite requires a comprehensive approach to Content Security Policy implementation that integrates seamlessly with TypeScript's type safety and ESLint's automated code quality checks. This specialized guide provides production-ready strategies for developers managing external packages while maintaining strict CSP compliance through automated tooling and type-safe configurations.

## Executive OverviewModern React 19 applications built with Vite benefit from fast development cycles and optimized production builds, but these advantages must be balanced with robust security measures. Content Security Policy implementation in this stack requires careful coordination between Vite's build process, React's rendering patterns, TypeScript's type system, and ESLint's static analysis capabilities. By integrating security checks directly into the development workflow, teams can catch CSP violations before they reach production while maintaining the rapid iteration speed that makes Vite attractive.[1][2][3][4]## Vite-Specific CSP Implementation### Understanding Vite's CSP RequirementsVite's architecture presents unique challenges and opportunities for CSP implementation compared to traditional bundlers. During development, Vite serves native ES modules with hot module replacement (HMR), requiring specific CSP directives to allow websocket connections and module loading. In production, Vite generates optimized bundles with code splitting, necessitating policies that accommodate dynamically loaded chunks.[5][6][7][8]

The Vite documentation explicitly addresses CSP requirements, noting that certain directives must be configured based on Vite's internals. When `html.cspNonce` is set in Vite configuration, the build process automatically adds nonce attributes to generated script and style tags. Additionally, Vite injects a meta tag with `property="csp-nonce"` that the runtime uses to apply nonces to dynamically created elements.[6][9]

**Critical Vite CSP Considerations:**

Vite's default behavior of inlining small assets as data URIs requires allowing `data:` for relevant directives like `img-src` and `font-src`, or alternatively disabling this optimization by setting `build.assetsInlineLimit: 0`. The documentation warns against allowing `data:` for `script-src` as it enables arbitrary script injection, defeating CSP's purpose.[6]

### Vite Plugin: vite-plugin-csp-guardThe `vite-plugin-csp-guard` plugin emerged as the leading solution for Vite CSP implementation with version 3.0.0 released in August 2025. This plugin provides first-class support for single-page applications and automates the complex process of generating CSP policies with hash-based or nonce-based directives.[3][4]

**Installation and Basic Configuration:**

```bash
npm install -D vite-plugin-csp-guard
```

**Complete Vite Configuration Example:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import csp from 'vite-plugin-csp-guard';

export default defineConfig({
  plugins: [
    react(),
    csp({
      algorithm: 'sha256', // Hash algorithm for integrity checks
      dev: {
        run: true, // Enable CSP in development mode
        warnOnly: true, // Don't block resources in dev
      },
      policy: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'strict-dynamic'", // Allows dynamically loaded scripts
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'", // Required for development HMR
        ],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': [
          "'self'",
          'ws://localhost:*', // Development websockets
          'wss://localhost:*',
          'https://api.yourdomain.com', // Production API
        ],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
      },
    }),
  ],
  
  // Additional Vite configuration for CSP
  build: {
    assetsInlineLimit: 0, // Disable data URI inlining
    cssCodeSplit: true, // Enable CSS code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  
  // Server configuration for development
  server: {
    host: 'localhost', // Explicit host for CSP consistency
    port: 5173,
    strictPort: true,
    headers: {
      // Development CSP header (report-only)
      'Content-Security-Policy-Report-Only': 
        "default-src 'self'; script-src 'self' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;",
    },
  },
});
```

The plugin automatically calculates Subresource Integrity (SRI) hashes during the build process and injects them into the HTML output. This provides cryptographic verification that assets haven't been tampered with, complementing CSP's restrictions on resource sources.[10][3]

**Development Mode Configuration:**

Running CSP in development prevents shipping code that violates production policies. The `dev.run: true` option enables CSP checking during Vite's development server, while `warnOnly: true` logs violations without blocking resources, maintaining development velocity. This approach catches potential violations early while avoiding the frustration of broken development builds.[4][3]

### Alternative: @coreoz/vite-plugin-content-security-policyFor projects requiring server-side CSP header injection during development, the `@coreoz/vite-plugin-content-security-policy` plugin provides proxy functionality. This plugin adds CSP headers to Vite dev server responses, enabling more realistic testing of production CSP configurations.[1]

```typescript
import { defineConfig } from 'vite';
import { cspProxy } from '@coreoz/vite-plugin-content-security-policy';

export default defineConfig({
  plugins: [
    cspProxy({
      policy: {
        'script-src': ["'self'", "'nonce-{RANDOM}'"],
        'style-src': ["'self'", "'nonce-{RANDOM}'"],
      },
    }),
  ],
});
```

The proxy plugin intercepts responses from the Vite dev server and injects CSP headers, allowing developers to test header-based policies without deploying to a staging environment.[1]



## ESLint Integration for CSP Compliance### Core Security PluginsESLint integration provides automated detection of code patterns that violate CSP principles before they reach production. Three essential plugins form the foundation of CSP-aware linting: `eslint-plugin-no-unsanitized`, `eslint-plugin-security`, and `eslint-plugin-react`.[11][12][13][14][15]

#### eslint-plugin-no-unsanitized

Developed by Mozilla for Firefox's codebase, this plugin specifically targets DOM-based XSS vulnerabilities that CSP aims to prevent. The plugin enforces that any assignment to dangerous properties like `innerHTML`, `outerHTML`, or calls to methods like `insertAdjacentHTML()` must use approved sanitization functions.[14][15]

**Installation:**

```bash
npm install --save-dev eslint-plugin-no-unsanitized
```

**ESLint Configuration (Flat Config):**

```javascript
// eslint.config.js
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'no-unsanitized': nounsanitized,
    },
    rules: {
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
    },
  },
];
```

**Legacy ESLintRC Configuration:**

```json
{
  "extends": ["plugin:no-unsanitized/recommended-legacy"],
  "plugins": ["no-unsanitized"],
  "rules": {
    "no-unsanitized/method": "error",
    "no-unsanitized/property": "error"
  }
}
```

The plugin allows exceptions when dangerous DOM manipulation is wrapped in approved sanitizer functions. By default, it recognizes `Sanitizer.escapeHTML()`, `escapeHTML()`, and the browser's native Sanitizer API with `.setHTML()`. Teams can configure additional sanitizer function names to match their project's conventions.[15][14]

**Custom Sanitizer Configuration:**

```javascript
export default [
  {
    rules: {
      'no-unsanitized/property': [
        'error',
        {
          escape: {
            methods: ['DOMPurify.sanitize', 'customSanitize'],
          },
        },
      ],
    },
  },
];
```

This configuration tells the linter to accept `DOMPurify.sanitize()` and `customSanitize()` as valid sanitization wrappers.[16][14]

#### eslint-plugin-security

This plugin provides broader security coverage, detecting patterns beyond DOM manipulation that pose security risks. While not exclusively focused on CSP, it catches issues like `eval()` usage, which CSP's `'unsafe-eval'` directive addresses.[11]

**Installation:**

```bash
npm install --save-dev eslint-plugin-security
```

**Configuration:**

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  security.configs.recommended,
  {
    // Additional customization
  },
];
```

**Key Rules for CSP Compliance:**

- `detect-eval-with-expression`: Flags `eval()` with variable arguments, requiring `'unsafe-eval'` in CSP[11]
- `detect-non-literal-regexp`: Catches regex injection that could lead to denial of service[11]
- `detect-object-injection`: Identifies potentially dangerous object property access patterns[11]

The plugin generates many false positives requiring human review, but serves as an excellent early warning system for security issues.[11]

#### Custom CSP-Specific ESLint Rules

Beyond pre-built plugins, teams can create custom rules targeting specific CSP patterns in their codebase. The `no-restricted-syntax` rule provides a flexible mechanism for blocking problematic code patterns.[17][12]

**Blocking setAttribute('style'):**

Inline styles via `setAttribute('style', ...)` violate strict CSP policies. A custom rule prevents this pattern:[12][17]

```javascript
// eslint.config.js
export default [
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 
            "CallExpression[callee.property.name='setAttribute']" +
            "[arguments.0.value='style']",
          message: 
            "CSP: Don't use element.setAttribute('style'). " +
            "Use element.style instead.",
        },
      ],
    },
  },
];
```

This configuration uses ESLint's Abstract Syntax Tree (AST) selector syntax to identify and block the problematic pattern. Developers attempting to use `element.setAttribute('style', ...)` receive an immediate error with guidance on the correct approach.[12]

**Enforcing Sanitization Wrappers:**

Projects using `dangerouslySetInnerHTML` in React should enforce sanitization. The `eslint-plugin-jam3` provides a `no-sanitizer-with-danger` rule specifically for this purpose:[16]

```json
{
  "plugins": ["jam3"],
  "rules": {
    "jam3/no-sanitizer-with-danger": [
      "error",
      {
        "wrapperName": ["DOMPurify.sanitize", "sanitizeHtml"]
      }
    ]
  }
}
```

This rule ensures all uses of `dangerouslySetInnerHTML` wrap content in approved sanitizer functions.[16]



### ESLint Plugin Comparison and Selection StrategyDifferent plugins serve complementary roles in a comprehensive security strategy. **eslint-plugin-no-unsanitized** provides the most direct CSP protection by preventing unsafe DOM manipulation. **eslint-plugin-security** offers broader coverage of security antipatterns. **eslint-plugin-react** enforces React-specific best practices that indirectly support CSP compliance.[11][13][18][14][15]

Organizations should implement all three plugins with custom rules addressing project-specific requirements. This layered approach catches violations at multiple levels, from general security issues to React-specific patterns to custom organizational policies.[17][12][13][14][11]

## TypeScript Integration for Type-Safe CSP### Defining CSP Type DefinitionsTypeScript's type system provides compile-time validation of CSP configurations, preventing typos and invalid directive combinations. Well-defined types catch configuration errors during development rather than at runtime when CSP violations occur.[19][20][21]

**Core CSP Type Definitions:**

```typescript
// types/csp.ts

/**
 * CSP directive names as string literal union
 */
export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'media-src'
  | 'object-src'
  | 'frame-src'
  | 'worker-src'
  | 'manifest-src'
  | 'base-uri'
  | 'form-action'
  | 'frame-ancestors'
  | 'upgrade-insecure-requests'
  | 'block-all-mixed-content'
  | 'report-uri'
  | 'report-to';

/**
 * CSP source expressions
 */
export type CSPSource =
  | "'self'"
  | "'none'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | "'unsafe-hashes'"
  | 'data:'
  | 'mediastream:'
  | 'blob:'
  | 'filesystem:'
  | `https://${string}`
  | `http://${string}`
  | `'nonce-${string}'`
  | `'sha256-${string}'`
  | `'sha384-${string}'`
  | `'sha512-${string}'`;

/**
 * Complete CSP policy structure
 */
export type CSPPolicy = Partial<Record<CSPDirective, CSPSource[]>>;

/**
 * CSP hash algorithm options
 */
export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512';

/**
 * Nonce format validation using template literals
 */
export type Nonce = `nonce-${string}`;

/**
 * Configuration for Vite CSP plugin
 */
export interface ViteCSPConfig {
  algorithm: HashAlgorithm;
  policy: CSPPolicy;
  dev?: {
    run?: boolean;
    warnOnly?: boolean;
  };
  sri?: boolean;
}
```

These types provide autocomplete support in IDEs and catch configuration errors immediately. Template literal types like `` `nonce-${string}` `` ensure nonce formats follow the correct pattern.[20][21][19]

**Branded Types for Sanitization:**

TypeScript's branded types enforce that HTML content passes through sanitization functions before dangerous operations:[19]

```typescript
// types/security.ts

/**
 * Branded type representing sanitized HTML content
 */
export type SafeHTML = string & { readonly __brand: 'SafeHTML' };

/**
 * Type-safe sanitizer function signature
 */
export type Sanitizer = (unsafeContent: string) => SafeHTML;

/**
 * Create a sanitizer wrapper with correct typing
 */
export function createSanitizer(
  sanitizeFn: (input: string) => string
): Sanitizer {
  return (unsafeContent: string): SafeHTML => {
    return sanitizeFn(unsafeContent) as SafeHTML;
  };
}

// Example usage with DOMPurify
import DOMPurify from 'dompurify';

export const sanitizeHtml: Sanitizer = createSanitizer(
  (input: string) => DOMPurify.sanitize(input)
);

// This function only accepts SafeHTML
function setInnerHTML(element: HTMLElement, content: SafeHTML): void {
  element.innerHTML = content;
}

// Usage - TypeScript enforces sanitization
const userInput = '<script>alert("xss")</script>';
// setInnerHTML(div, userInput); // ❌ Type error!
setInnerHTML(div, sanitizeHtml(userInput)); // ✅ Correct
```

This pattern makes it impossible to forget sanitization at compile time. The branded type `SafeHTML` can only be created by passing content through approved sanitizer functions.[19]

### TypeScript ESLint ConfigurationThe `@typescript-eslint/eslint-plugin` enables type-aware linting rules that leverage TypeScript's type checker for deeper code analysis. This provides security checks impossible with standard ESLint.[22][21]

**Type-Checked ESLint Configuration:**

```typescript
// eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce type-safe practices
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      
      // Enforce consistent types
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  }
);
```

Type-checked rules analyze the entire project using TypeScript's type information, catching subtle bugs that standard linting misses. The `projectService: true` option tells TypeScript ESLint to use TypeScript's language service for type information.[22]

**CSP Configuration with Type Safety:**

```typescript
// config/csp.config.ts
import type { CSPPolicy, ViteCSPConfig } from '../types/csp';

const developmentCSP: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // Required for HMR
  'style-src': ["'self'", "'unsafe-inline'"], // Required for dev
  'connect-src': ["'self'", 'ws:', 'wss:'],
};

const productionCSP: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.example.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

export const viteCSPConfig: ViteCSPConfig = {
  algorithm: 'sha256',
  policy: process.env.NODE_ENV === 'production' 
    ? productionCSP 
    : developmentCSP,
  dev: {
    run: true,
    warnOnly: process.env.NODE_ENV === 'development',
  },
  sri: true,
};
```

TypeScript ensures all directive names are valid, source expressions follow correct formats, and configuration objects match expected structures. IDEs provide autocomplete for directive names and detect typos immediately.[19][21]



## Managing External Packages with CSP### Package Audit and DocumentationExternal packages require systematic evaluation for CSP compatibility before integration. Each package should undergo a CSP audit documenting its requirements and potential violations.[23][24]

**Package Audit Checklist:**

1. **Identify DOM Manipulation:** Does the package modify `innerHTML`, `outerHTML`, or use `document.write()`?[15]
2. **Check for Dynamic Script Loading:** Does it inject script tags or use `eval()`?[11]
3. **Review Style Injection:** Does it add inline styles via `setAttribute('style')` or create style tags?[25][26]
4. **External Resource Loading:** Does it fetch resources from CDNs or external domains?[27]
5. **CSP Documentation:** Does the package documentation mention CSP requirements?[23]

**Documentation Template:**

```markdown
# Package CSP Requirements: @mui/material

## Version: 5.14.0
## Audit Date: 2025-11-09

### CSP Directives Required:
- `style-src`: Requires nonce support for dynamic styles
- `font-src`: May load icon fonts from data URIs

### Configuration:
```
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const nonce = getNonce(); // From server
const cache = createCache({
  key: 'mui',
  nonce: nonce,
});

function App() {
  return (
    <CacheProvider value={cache}>
      <YourApp />
    </CacheProvider>
  );
}
```

### External Domains: None

### Testing Notes:
- Test all Material-UI components with CSP enabled
- Verify theme customization works with nonce
- Check SSR compatibility

### Alternatives Considered:
- Ant Design: Similar nonce requirements
- Chakra UI: Better default CSP compatibility
```

This structured documentation ensures team members understand CSP implications when evaluating or updating packages.[24][23]

### CSS-in-JS Library ConfigurationCSS-in-JS libraries like styled-components and Emotion require special configuration to work with CSP. Without proper setup, these libraries inject inline styles that CSP blocks.[25][26][28]

**Styled-Components Configuration:**

```typescript
// server.tsx - Server-side rendering
import { ServerStyleSheet } from 'styled-components';
import { renderToString } from 'react-dom/server';

export function render(url: string, nonce: string) {
  const sheet = new ServerStyleSheet();
  
  try {
    const html = renderToString(
      sheet.collectStyles(<App />)
    );
    
    // Styles automatically include nonce
    const styleTags = sheet.getStyleTags();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${styleTags}
        </head>
        <body>
          <div id="root">${html}</div>
        </body>
      </html>
    `;
  } finally {
    sheet.seal();
  }
}
```

For client-side applications, styled-components uses the `__webpack_nonce__` global variable:[29][25]

```typescript
// entry.tsx
declare global {
  interface Window {
    __webpack_nonce__: string;
  }
}

// Set nonce before loading styled-components
const nonce = document.querySelector<HTMLMetaElement>(
  'meta[property="csp-nonce"]'
)?.nonce;

if (nonce) {
  window.__webpack_nonce__ = nonce;
}

// Now import and use styled-components
import styled from 'styled-components';
```

**Emotion Configuration:**

```typescript
// App.tsx
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import type { EmotionCache } from '@emotion/cache';

interface AppProps {
  nonce?: string;
}

function createEmotionCache(nonce?: string): EmotionCache {
  return createCache({
    key: 'css',
    nonce: nonce,
    prepend: true, // Insert styles at beginning of <head>
  });
}

export default function App({ nonce }: AppProps) {
  const cache = createEmotionCache(nonce);
  
  return (
    <CacheProvider value={cache}>
      <YourComponents />
    </CacheProvider>
  );
}
```

For SSR with Emotion:

```typescript
// server.tsx
import createEmotionServer from '@emotion/server/create-instance';
import { renderToString } from 'react-dom/server';

export function render(url: string, nonce: string) {
  const cache = createCache({ key: 'css', nonce });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = 
    createEmotionServer(cache);
  
  const html = renderToString(
    <CacheProvider value={cache}>
      <App />
    </CacheProvider>
  );
  
  const chunks = extractCriticalToChunks(html);
  const styles = constructStyleTagsFromChunks(chunks);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        ${styles}
      </head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `;
}
```

Both libraries require passing nonces through their respective APIs to ensure generated style tags include nonce attributes.[26][28][25]

### Subresource Integrity for External DependenciesProjects loading resources from CDNs should implement Subresource Integrity to verify content hasn't been tampered with. SRI complements CSP by providing cryptographic verification.[30][31][32][33]

**Manual SRI Implementation:**

```html
<script 
  src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"
  integrity="sha384-KyZXEAg3QhqLMpG8r+8fhAXLR..."
  crossorigin="anonymous"
></script>
```

The `crossorigin="anonymous"` attribute is required for SRI to work with cross-origin resources. CDNs must respond with appropriate CORS headers (`Access-Control-Allow-Origin`) for browsers to verify integrity.[33][30]

**Automated SRI with Vite:**

The `vite-plugin-csp-guard` automatically generates SRI hashes during builds:[3][10]

```typescript
// vite.config.ts
import csp from 'vite-plugin-csp-guard';

export default defineConfig({
  plugins: [
    csp({
      algorithm: 'sha384', // SRI hash algorithm
      sri: true, // Enable SRI generation
      policy: { /* ... */ },
    }),
  ],
});
```

The plugin calculates hashes for all JavaScript and CSS assets, adding `integrity` attributes to generated script and link tags. This happens automatically during the build process without manual intervention.[10][3]

## Development Workflow and Testing### Local Development CSP ConfigurationDevelopment environments require more permissive CSP policies than production to support HMR and debugging tools. However, maintaining some CSP enforcement during development catches violations early.[2][5][8][34]

**Vite Development Server CSP:**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy-Report-Only': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'", // HMR requires eval
        "style-src 'self' 'unsafe-inline'", // Hot CSS updates
        "connect-src 'self' ws://localhost:* wss://localhost:*",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
      ].join('; '),
    },
  },
});
```

Report-only mode logs violations without blocking resources, maintaining development velocity while providing visibility into potential production issues.[35][36]

**Browser Console Monitoring:**

CSP violations appear in the browser console with detailed messages:[37][38]

```
[Report Only] Refused to execute inline script because it violates 
the following Content Security Policy directive: "script-src 'self'". 
Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce 
('nonce-...') is required to enable inline execution.
```

Developers should monitor the console during development to identify and fix violations before production deployment.[38][37]

### Automated Testing IntegrationCI/CD pipelines should include CSP validation to catch regressions. Automated tests verify that builds include correct CSP headers and don't introduce violations.[39][40][41]

**GitHub Actions CSP Validation:**

```yaml
# .github/workflows/csp-validation.yml
name: CSP Validation

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  validate-csp:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint security checks
        run: npm run lint
      
      - name: Type check with TypeScript
        run: npm run type-check
      
      - name: Build production bundle
        run: npm run build
        
      - name: Verify CSP meta tags in build
        run: |
          if ! grep -q "Content-Security-Policy" dist/index.html; then
            echo "❌ CSP meta tag missing from build"
            exit 1
          fi
          echo "✅ CSP meta tag found in build"
      
      - name: Check for SRI attributes
        run: |
          if ! grep -q "integrity=" dist/index.html; then
            echo "⚠️ Warning: No SRI attributes found"
          else
            echo "✅ SRI attributes present"
          fi
      
      - name: Start test server
        run: npm run preview &
        
      - name: Wait for server
        run: npx wait-on http://localhost:4173
      
      - name: Run Playwright CSP tests
        run: npm run test:csp
```

**Playwright CSP Tests:**

```typescript
// tests/csp.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CSP Compliance', () => {
  test('should not have CSP violations on home page', async ({ page }) => {
    const violations: string[] = [];
    
    // Capture CSP violations
    page.on('console', (msg) => {
      if (msg.type() === 'error' && 
          msg.text().includes('Content Security Policy')) {
        violations.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:4173');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    expect(violations).toHaveLength(0);
    if (violations.length > 0) {
      console.error('CSP Violations:', violations);
    }
  });
  
  test('should block unauthorized inline script', async ({ page }) => {
    const violations: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && 
          msg.text().includes('Content Security Policy')) {
        violations.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:4173');
    
    // Attempt to inject unauthorized script
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'console.log("unauthorized")';
      document.head.appendChild(script);
    });
    
    // CSP should have blocked the script
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('script-src');
  });
});
```

These automated tests ensure CSP remains effective as the application evolves.[40][39]

## Production Deployment Strategies### Server-Side Rendering CSPSSR applications generate unique nonces per request, providing the strongest CSP implementation. The server creates a fresh nonce for each response and injects it into the HTML and CSP header.[42][43]

**Express Middleware Example:**

```typescript
// server/middleware/csp.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CSPRequest extends Request {
  nonce?: string;
}

export function cspMiddleware(
  req: CSPRequest,
  res: Response,
  next: NextFunction
): void {
  // Generate cryptographically secure nonce
  const nonce = crypto.randomBytes(16).toString('base64');
  req.nonce = nonce;
  
  // Build CSP header
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.example.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspHeader);
  next();
}

// server/index.ts
import express from 'express';
import { cspMiddleware, CSPRequest } from './middleware/csp';
import { renderToString } from 'react-dom/server';

const app = express();
app.use(cspMiddleware);

app.get('*', (req: CSPRequest, res) => {
  const nonce = req.nonce!;
  
  const html = renderToString(<App nonce={nonce} />);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="csp-nonce" nonce="${nonce}" />
      </head>
      <body>
        <div id="root">${html}</div>
        <script nonce="${nonce}" src="/assets/main.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000);
```

The nonce must be unpredictable and change with every request to maintain security. Reusing nonces across requests defeats the security benefit.[6][26]

### Static Build DeploymentStatic sites cannot generate dynamic nonces but can use hash-based CSP or build-time nonce injection.[44][43][45]

**Build-Time Hash Generation:**

```typescript
// scripts/generate-csp-hashes.ts
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

interface HashEntry {
  file: string;
  hash: string;
}

function generateHash(content: string, algorithm: string): string {
  return createHash(algorithm).update(content).digest('base64');
}

async function generateCSPHashes(): Promise<void> {
  const scriptFiles = await glob('dist/**/*.js');
  const styleFiles = await glob('dist/**/*.css');
  
  const scriptHashes: HashEntry[] = scriptFiles.map((file) => {
    const content = readFileSync(file, 'utf-8');
    return {
      file,
      hash: `'sha384-${generateHash(content, 'sha384')}'`,
    };
  });
  
  const styleHashes: HashEntry[] = styleFiles.map((file) => {
    const content = readFileSync(file, 'utf-8');
    return {
      file,
      hash: `'sha384-${generateHash(content, 'sha384')}'`,
    };
  });
  
  // Update index.html with CSP meta tag
  const indexPath = 'dist/index.html';
  let html = readFileSync(indexPath, 'utf-8');
  
  const cspContent = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.map(h => h.hash).join(' ')}`,
    `style-src 'self' ${styleHashes.map(h => h.hash).join(' ')}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "object-src 'none'",
  ].join('; ');
  
  html = html.replace(
    '<head>',
    `<head>\n  <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
  );
  
  writeFileSync(indexPath, html);
  
  console.log('✅ CSP hashes generated and injected');
  console.log(`   Scripts: ${scriptHashes.length} hashes`);
  console.log(`   Styles: ${styleHashes.length} hashes`);
}

generateCSPHashes().catch(console.error);
```

This script runs after the Vite build, calculating hashes for all generated assets and injecting them into the CSP meta tag.[45][46]

**Package.json Scripts:**

```json
{
  "scripts": {
    "build": "vite build && tsx scripts/generate-csp-hashes.ts",
    "preview": "vite preview"
  }
}
```

The build process automatically generates and injects CSP hashes.[45]

## Complete Configuration ExampleHere's a production-ready configuration combining all best practices:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import csp from 'vite-plugin-csp-guard';
import type { CSPPolicy } from './types/csp';

const isDevelopment = process.env.NODE_ENV === 'development';

const developmentPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'ws:', 'wss:'],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
};

const productionPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.production.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

export default defineConfig({
  plugins: [
    react(),
    csp({
      algorithm: 'sha384',
      policy: isDevelopment ? developmentPolicy : productionPolicy,
      dev: {
        run: true,
        warnOnly: isDevelopment,
      },
      sri: true,
    }),
  ],
  
  build: {
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['react-router-dom', 'zustand'],
        },
      },
    },
  },
  
  server: {
    host: 'localhost',
    port: 5173,
    headers: isDevelopment ? {
      'Content-Security-Policy-Report-Only': 
        Object.entries(developmentPolicy)
          .map(([key, values]) => `${key} ${values.join(' ')}`)
          .join('; '),
    } : {},
  },
});
```

```typescript
// eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import security from 'eslint-plugin-security';
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  react.configs.flat.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'no-unsanitized': nounsanitized,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Security rules
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      
      // CSP-specific custom rules
      'no-restricted-syntax': [
        'error',
        {
          selector: 
            "CallExpression[callee.property.name='setAttribute']" +
            "[arguments.0.value='style']",
          message: "Use element.style instead of setAttribute('style')",
        },
      ],
      
      // React security
      'react/no-danger': 'warn',
      'react/jsx-no-target-blank': 'error',
      
      // TypeScript safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
    },
  }
);
```

This configuration provides comprehensive CSP compliance with automated enforcement across the entire development lifecycle.[17][11][3][22]

## ConclusionImplementing Content Security Policy in Vite and React 19 projects requires coordinated configuration across multiple tools and systems. By leveraging Vite plugins for automated hash generation, ESLint plugins for static code analysis, and TypeScript for compile-time validation, teams can build secure applications without sacrificing development velocity.[17][2][3][14]

The key to successful CSP implementation lies in automation and early detection. Vite plugins handle the complex task of generating hashes and nonces, ESLint catches violations during development, and TypeScript prevents configuration errors before runtime. Together, these tools create a robust security foundation that scales with project complexity.[11][19][3][4][14][21][39][17]

Organizations managing their own external packages must establish systematic audit processes, maintain documentation of CSP requirements, and test thoroughly in staging environments. With proper tooling and processes, CSP becomes an enabler of security rather than an obstacle to development.[4][23][24][47]

[1](https://github.com/Coreoz/vite-plugin-content-security-policy)
[2](https://www.stackhawk.com/blog/react-content-security-policy-guide-what-it-is-and-how-to-enable-it/)
[3](https://www.npmjs.com/package/vite-plugin-csp-guard)
[4](https://vite-csp.tsotne.co.uk)
[5](https://stackademic.com/blog/working-with-csp-and-vite)
[6](https://vite.dev/guide/features)
[7](https://vite.dev/guide/build)
[8](https://www.reddit.com/r/reactjs/comments/v2rt5s/vite_and_react_with_csp_requires_stylesrc_unsafe/)
[9](https://vite.dev/config/shared-options)
[10](https://github.com/maccuaa/vite-plugin-csp)
[11](https://www.npmjs.com/package/eslint-plugin-security)
[12](https://advancedfrontends.com/enhancing-csp-with-eslint-preventing-unsafe-setattribute-style-usage/)
[13](https://github.com/jsx-eslint/eslint-plugin-react)
[14](https://blog.mozilla.org/attack-and-defense/2021/11/03/finding-and-fixing-dom-based-xss-with-static-analysis/)
[15](https://github.com/mozilla/eslint-plugin-no-unsanitized)
[16](https://dev.to/jam3/how-to-prevent-xss-attacks-when-using-dangerouslysetinnerhtml-in-react-1464)
[17](https://advancedfrontends.com/preventing-content-security-policy-violations-with-eslint/)
[18](https://blog.logrocket.com/12-essential-eslint-rules-react/)
[19](https://javascript.plainenglish.io/how-to-make-your-react-components-type-safe-with-typescript-63d648d361ef)
[20](https://typescript-eslint.io/rules/consistent-type-definitions/)
[21](https://typescript-eslint.io/rules/)
[22](https://typescript-eslint.io/getting-started/typed-linting/)
[23](https://themeselection.com/third-party-libraries-used-in-react-js/)
[24](https://www.reddit.com/r/developersIndia/comments/1haw85p/best_practices_while_using_external_libraries/)
[25](https://github.com/orgs/styled-components/discussions/3942)
[26](https://mui.com/material-ui/guides/content-security-policy/)
[27](https://meta.discourse.org/t/should-i-load-third-party-libraries-from-vendor-or-cdn/205357)
[28](https://github.com/emotion-js/emotion/issues/403)
[29](https://reesmorris.co.uk/blog/implementing-proper-csp-nextjs-styled-components)
[30](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
[31](https://dev.to/rigalpatel001/securing-javascript-applications-with-subresource-integrity-sri-a-comprehensive-guide-570o)
[32](https://www.npmjs.com/package/webpack-subresource-integrity)
[33](https://blog.lukaszolejnik.com/making-third-party-hosted-scripts-safer-with-subresource-integrity/)
[34](https://www.virtocommerce.org/t/securing-your-e-commerce-site-a-guide-to-csp-security-headers-and-best-practices/768)
[35](https://centralcsp.com/articles/how-to-build-the-best-csp)
[36](https://centralcsp.com/articles/csp-enforce-report-only)
[37](https://www.browserstack.com/guide/react-testing-library-debug-method)
[38](https://stackoverflow.com/questions/44955530/debugging-content-security-policy-violation-in-google-chrome-dev)
[39](https://www.harness.io/blog/integrating-automated-security-testing-ci-cd-pipeline)
[40](https://www.frugaltesting.com/blog/how-to-integrate-automation-testing-into-your-ci-cd-pipeline)
[41](https://dev.to/bankolejohn/setting-up-a-basic-cicd-pipeline-with-automated-build-and-test-stages-10ik)
[42](https://nextjs.org/docs/app/guides/content-security-policy)
[43](https://www.reddit.com/r/nextjs/comments/181wexd/seeking_advice_for_implementing_strict_csp_nonce/)
[44](https://web.dev/articles/strict-csp)
[45](https://www.vector-logic.com/blog/posts/generating-csp-hash-from-browser-console)
[46](https://github.com/ItsIgnacioPortal/CSP-Integrity-Hash-Generator)
[47](https://engineering.monday.com/how-we-mastered-content-security-policy/)
[48](https://stackoverflow.com/questions/30280370/how-does-content-security-policy-csp-work)
[49](https://stackoverflow.com/questions/59633005/how-is-eslint-integrated-into-create-react-app)
[50](https://blog.openreplay.com/security--how-to-deal-with-csp-in-react/)
[51](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy)
[52](https://www.reddit.com/r/Wordpress/comments/127q9ev/writing_solid_content_security_policy_csp_headers/)
[53](https://www.reddit.com/r/reactjs/comments/m5zf09/refusal_to_execute_inline_script_because_it/)
[54](https://eslint.org/docs/latest/use/configure/configuration-files)
[55](https://stackoverflow.com/questions/55160698/how-to-use-react-without-unsafe-inline-javascript-css-code)
[56](https://eslint.org/docs/latest/use/configure/rules)
[57](https://www.npmjs.com/package/vite-plugin-csp/v/1.0.1)
[58](https://stackoverflow.com/questions/79282525/csp-error-with-crxjs-vite-plugin-content-scripts)
[59](https://www.npmjs.com/package/eslint-plugin-xss)
[60](https://www.reddit.com/r/reactjs/comments/1j0zaa5/a_csp_plugin_for_your_vite_apps/)
[61](https://security.snyk.io/vuln/SNYK-JS-ESLINTPLUGINNOUNSANITIZED-173734)
[62](https://typescript-eslint.io/rules/consistent-type-imports/)