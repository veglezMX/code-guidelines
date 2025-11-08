# Security Best Practices

This document outlines security best practices for our web applications, focusing on protecting against common vulnerabilities and ensuring secure code patterns.

---

## 1. Content Security Policy (CSP)

Content Security Policy is a critical defense-in-depth mechanism to prevent Cross-Site Scripting (XSS) attacks. It's an HTTP header sent from the server that tells the browser which sources of content are trusted.

### 1.1. Policy Goal

Implement a strict CSP that:
- Disallows `'unsafe-inline'` and `'unsafe-eval'`
- Limits `script-src`, `style-src`, and `connect-src` to known, trusted domains
- Prevents data exfiltration to unauthorized domains

### 1.2. Implementation Strategy

#### Server-Side Configuration

The `Content-Security-Policy` header **must** be configured and sent by your hosting platform or web server:
- **Vercel**: Configure in `vercel.json` or `next.config.js`
- **Netlify**: Configure in `netlify.toml` or `_headers` file
- **Nginx**: Add to server configuration
- **Express/Node**: Use middleware like `helmet`

**Do not** manage CSP via `<meta>` tags, as they are less effective and cannot use all directives.

#### Nonce-Based or Hash-Based Scripts

To allow application scripts to run while blocking malicious scripts:

1. **Nonce-Based (Recommended for SSR)**:
   - Server generates a unique, random `nonce` for each request
   - Include in CSP header: `script-src 'self' 'nonce-RANDOM_VALUE'`
   - Same `nonce` must be added to all legitimate `<script>` tags
   - Framework/bundler must support this (Next.js 13.4+ has built-in support)

2. **Hash-Based (For Static Sites)**:
   - Build tool generates SHA-256 hashes of script content
   - Include hashes in CSP: `script-src 'self' 'sha256-HASH_VALUE'`
   - Vite and Webpack can be configured to generate these

### 1.3. Example Strict CSP

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{SERVER_GENERATED_NONCE}';
  style-src 'self' 'nonce-{SERVER_GENERATED_NONCE}';
  img-src 'self' data: https://images.cdn.example.com;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests;
```

### 1.4. Codebase Compliance Requirements

To comply with a strict CSP, developers must:

#### ✅ DO:
- Keep all JavaScript in `.js`/`.ts` files
- Use React's event handlers: `onClick={handleClick}`
- Use CSS classes for styling: `className="button-primary"`
- Import styles from `.css` files or use CSS-in-JS with nonce support
- Use the `style` prop only for truly dynamic values (e.g., calculated positions, animation transforms)

#### ❌ DON'T:
- Use inline `<script>` tags with code inside them
- Use inline event handlers: `<div onclick="doSomething()">`
- Use `eval()` or `Function()` constructors
- Use `dangerouslySetInnerHTML` without sanitization
- Add inline styles for static values: `style={{color: 'red'}}`

### 1.5. Testing CSP

Before deploying to production:
1. Test with CSP in `Content-Security-Policy-Report-Only` mode
2. Monitor reports to identify violations
3. Use browser DevTools to see CSP errors
4. Use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to validate your policy

---

## 2. Cross-Site Scripting (XSS) Prevention

XSS is one of the most common web vulnerabilities. Multiple layers of defense are required.

### 2.1. Input Validation

**Server-Side Validation (Required)**:
- Validate all user input on the server, never trust client-side validation alone
- Use allowlists for expected formats (e.g., email regex, phone number formats)
- Reject or sanitize unexpected characters
- Set maximum length limits for all inputs

**Client-Side Validation (UX Enhancement)**:
- Use HTML5 validation attributes: `required`, `pattern`, `maxlength`
- Provide immediate feedback to users
- Use TypeScript types to enforce validation at compile time

### 2.2. Output Encoding

- React automatically escapes values in JSX: `<div>{userInput}</div>` is safe
- **Never** use `dangerouslySetInnerHTML` unless absolutely necessary
- If you must use `dangerouslySetInnerHTML`:
  - Sanitize with a library like [DOMPurify](https://github.com/cure53/DOMPurify)
  - Document why it's necessary
  - Limit scope to the smallest possible component

```typescript
import DOMPurify from 'dompurify';

// Only if absolutely necessary
function SafeHtml({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### 2.3. URL Handling

- Validate all URLs before using them in `href`, `src`, or redirects
- Prevent `javascript:` protocol usage
- Use allowlists for external domains

```typescript
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Usage
{isSafeUrl(userUrl) && <a href={userUrl}>Link</a>}
```

---

## 3. Authentication & Authorization

### 3.1. Authentication Tokens

**Storage**:
- Store JWT tokens in `httpOnly` cookies when possible (prevents XSS access)
- If using localStorage/sessionStorage, be aware of XSS risks
- Never store tokens in regular cookies without `httpOnly` flag

**Cookie Security Flags**:
```http
Set-Cookie: token=VALUE; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

- `HttpOnly`: Prevents JavaScript access
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: Prevents CSRF attacks
- `Path=/`: Limits cookie scope
- `Max-Age`: Sets expiration

### 3.2. Authorization Patterns

**Never Trust Client-Side Checks**:
```typescript
// ❌ BAD: This can be bypassed
function AdminPanel() {
  if (!user.isAdmin) return null; // Client-side only!
  return <SensitiveData />;
}

// ✅ GOOD: Server validates on every request
async function getAdminData() {
  const response = await fetch('/api/admin/data', {
    credentials: 'include' // Sends httpOnly cookies
  });
  
  if (!response.ok) {
    throw new Error('Unauthorized');
  }
  
  return response.json();
}
```

**API Authorization**:
- Validate user permissions on **every** API endpoint
- Use middleware to check authentication before processing requests
- Implement role-based access control (RBAC) or attribute-based access control (ABAC)
- Log authorization failures for security monitoring

---

## 4. Dependency Security

### 4.1. Dependency Scanning

**Regular Audits**:
```bash
# Run regularly in CI/CD
pnpm audit

# Fix vulnerabilities when possible
pnpm audit --fix
```

**Automated Tools**:
- Enable **Dependabot** or **Renovate** for automatic dependency updates
- Use **Snyk** or **Socket** for deep vulnerability scanning
- Configure CI to fail builds with high-severity vulnerabilities

### 4.2. Dependency Hygiene

**Best Practices**:
- Keep dependencies up to date (use automated PRs)
- Minimize dependency count (audit `node_modules` size)
- Prefer well-maintained libraries with active communities
- Review dependency licenses for compliance
- Pin exact versions in production (`lockfile` is critical)

**Lockfile Protection**:
```bash
# In CI/CD, ensure lockfile matches package.json
pnpm install --frozen-lockfile
```

### 4.3. Supply Chain Attacks

- Review dependencies before adding them (check GitHub stars, maintenance, security history)
- Use `npm audit signatures` to verify package authenticity
- Consider using a private registry for critical dependencies
- Enable 2FA for npm/package publishing accounts

---

## 5. API Security

### 5.1. HTTPS Everywhere

- **Never** send sensitive data over HTTP
- Enforce HTTPS redirects on the server
- Use HSTS header to force HTTPS:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 5.2. CORS Configuration

Configure CORS strictly on the API server:

```typescript
// ❌ BAD: Allows any origin
res.setHeader('Access-Control-Allow-Origin', '*');

// ✅ GOOD: Allowlist specific origins
const allowedOrigins = ['https://app.example.com', 'https://www.example.com'];
const origin = req.headers.origin;

if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
```

### 5.3. Rate Limiting

Prevent abuse and DoS attacks:
- Implement rate limiting on authentication endpoints
- Use exponential backoff for failed login attempts
- Consider CAPTCHA after multiple failures
- Rate limit per IP and per user

```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});

app.post('/api/login', loginLimiter, loginHandler);
```

### 5.4. Input Validation & Sanitization

**Validate Everything**:
- Use schema validation libraries (Zod, Yup, Joi)
- Validate request body, query params, and headers
- Reject requests that don't match expected schema

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  age: z.number().int().min(0).max(150).optional()
});

export async function POST(req: Request) {
  const body = await req.json();
  
  // Throws if validation fails
  const validated = userSchema.parse(body);
  
  // Use validated data only
  return createUser(validated);
}
```

---

## 6. Secure Data Handling

### 6.1. Sensitive Data in Frontend

**Minimize Exposure**:
- Never send more data than the UI needs
- Filter sensitive fields on the backend before sending to frontend
- Don't include tokens or secrets in API responses
- Redact PII in logs

**Environment Variables**:
```typescript
// ❌ BAD: Exposes secret to client bundle
const apiKey = process.env.SECRET_API_KEY;

// ✅ GOOD: Only expose public variables (Next.js example)
const publicKey = process.env.NEXT_PUBLIC_API_KEY;

// ✅ BETTER: Keep secrets server-side only
// Access secrets only in API routes or server components
```

### 6.2. Password Handling

**Never Store Plaintext Passwords**:
- Use bcrypt, argon2, or scrypt for hashing
- Use appropriate work factors (bcrypt: 10-12 rounds)
- Add salt (handled automatically by bcrypt)

```typescript
import bcrypt from 'bcrypt';

// Hashing
const hashedPassword = await bcrypt.hash(password, 12);

// Verification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 6.3. Secrets Management

- **Never** commit secrets to version control
- Use environment variables or secret management services (AWS Secrets Manager, Vault)
- Rotate secrets regularly
- Use different secrets per environment (dev, staging, prod)
- Add `.env` to `.gitignore`

---

## 7. Security Headers

Configure these HTTP headers on your server or hosting platform:

```http
# Prevent MIME-sniffing
X-Content-Type-Options: nosniff

# Prevent clickjacking
X-Frame-Options: DENY

# Control referrer information
Referrer-Policy: strict-origin-when-cross-origin

# Feature policy
Permissions-Policy: geolocation=(), microphone=(), camera=()

# XSS protection (legacy, CSP is better)
X-XSS-Protection: 1; mode=block
```

---

## 8. Error Handling & Logging

### 8.1. Error Messages

**Never Expose Internal Details**:
```typescript
// ❌ BAD: Leaks database schema
return res.status(500).json({
  error: "Duplicate key violation on users.email_unique_idx"
});

// ✅ GOOD: Generic message to user
return res.status(400).json({
  error: "This email is already registered"
});

// ✅ GOOD: Log details server-side only
logger.error('Duplicate email signup attempt', {
  email: sanitizedEmail,
  error: err.message
});
```

### 8.2. Logging Security Events

**What to Log**:
- Failed authentication attempts
- Authorization failures
- Suspicious activity patterns
- Changes to sensitive data
- API rate limit violations

**What NOT to Log**:
- Passwords (even hashed in some contexts)
- Credit card numbers
- API keys or tokens
- Full PII without anonymization

---

## 9. Frontend-Specific Security

### 9.1. Third-Party Scripts

**Minimize and Audit**:
- Only include necessary third-party scripts
- Use Subresource Integrity (SRI) for CDN resources:

```html
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-HASH_VALUE"
  crossorigin="anonymous"
></script>
```

- Load third-party scripts async/defer when possible
- Consider self-hosting critical dependencies

### 9.2. iframe Security

**Avoid iframes When Possible**:
- Use `sandbox` attribute to restrict capabilities:

```html
<iframe
  src="https://external.com"
  sandbox="allow-scripts allow-same-origin"
  title="External content"
></iframe>
```

- Never iframe untrusted content
- Use CSP's `frame-ancestors` to prevent your site from being iframed

### 9.3. File Uploads

**Validation**:
- Validate file types on both client and server
- Check file extensions AND MIME types
- Limit file sizes
- Scan for malware if processing user uploads
- Store uploads outside web root
- Serve uploads from a different domain (CDN)

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type) && file.size <= MAX_SIZE;
}
```

---

## 10. Development Workflow

### 10.1. Code Review Checklist

Security items to check in every PR:
- [ ] No secrets or API keys committed
- [ ] User input is validated and sanitized
- [ ] Authentication/authorization is properly enforced
- [ ] No use of `dangerouslySetInnerHTML` without sanitization
- [ ] Dependencies are up to date
- [ ] Error messages don't leak sensitive information

### 10.2. Static Analysis

**Add Security Linting**:
```bash
pnpm add -D eslint-plugin-security
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended']
};
```

### 10.3. Penetration Testing

- Run OWASP ZAP or similar tools against staging
- Perform security audits before major releases
- Consider bug bounty programs for production applications

---

## 11. Compliance & Privacy

### 11.1. Data Protection Regulations

**GDPR/CCPA Considerations**:
- Implement user data export functionality
- Allow users to delete their data
- Obtain consent before collecting personal data
- Document what data is collected and why
- Implement data retention policies

### 11.2. Audit Trail

For compliance-critical applications:
- Log who accessed what data and when
- Make audit logs immutable
- Retain logs per regulatory requirements
- Implement monitoring and alerting for suspicious activity

---

## 12. Checklist: Pre-Deployment Security Audit

Before deploying any application to production:

- [ ] CSP header is configured and tested
- [ ] All security headers are in place
- [ ] HTTPS is enforced (HSTS enabled)
- [ ] Authentication uses secure token storage
- [ ] All API endpoints validate authorization
- [ ] Rate limiting is implemented
- [ ] Dependencies have been scanned for vulnerabilities
- [ ] Secrets are stored securely (not in code)
- [ ] Error messages don't expose sensitive data
- [ ] Input validation is implemented on server and client
- [ ] CORS is configured with specific origins
- [ ] Logging excludes sensitive data
- [ ] File uploads are validated and restricted
- [ ] Third-party scripts are minimized and use SRI

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers Scanner](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
