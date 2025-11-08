# Security Checklist — MSAL for React

**Goal:** Ensure authentication implementation follows security best practices.

---

## Pre-Deployment Checklist

Use this checklist before deploying any authentication changes:

- [ ] PKCE enabled (default in MSAL v2+)
- [ ] Least-privilege scopes per feature
- [ ] Tokens validated server-side
- [ ] No production credentials in code
- [ ] Redirect URIs use HTTPS (production)
- [ ] Redirect URIs match exactly in Azure AD
- [ ] Implicit flow disabled
- [ ] `sessionStorage` or `memoryStorage` for cache
- [ ] CORS configured correctly
- [ ] Security headers implemented (CSP, HSTS)
- [ ] Error messages don't expose sensitive data
- [ ] Logout clears cache completely
- [ ] Idle timeout implemented (if required)
- [ ] Dev login disabled in production
- [ ] All tests passing (unit, integration, E2E)

---

## PKCE (Proof Key for Code Exchange)

### Verify PKCE is Enabled

✅ **Enabled by default in MSAL v2+**

```ts
// No configuration needed - PKCE is automatic
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    // PKCE is automatically used
  },
};
```

### What PKCE Prevents

- **Authorization code interception attacks**
- **Code injection attacks**
- **Replay attacks**

### Verify in Network Tab

```
Authorization request includes:
├─ code_challenge
├─ code_challenge_method (S256)
└─ Token request includes:
   └─ code_verifier
```

---

## Scopes: Least-Privilege Principle

### ✅ Good: Minimal Scopes per Feature

```ts
// Request only what's needed
const readScopes = ['api://my-api/read'];
const writeScopes = ['api://my-api/write'];

// Read-only feature
function ViewData() {
  const getToken = useAccessToken(readScopes);
  // ...
}

// Write feature
function EditData() {
  const getToken = useAccessToken(writeScopes);
  // ...
}
```

### ❌ Bad: Requesting All Scopes Upfront

```ts
// ❌ Don't request all scopes at login
const loginRequest = {
  scopes: [
    'api://my-api/read',
    'api://my-api/write',
    'api://my-api/delete',
    'api://my-api/admin',
  ],
};
```

### Scope Audit

```ts
// Audit scopes in your application
const scopeAudit = {
  'api://my-api/read': [
    'ViewData component',
    'Dashboard component',
  ],
  'api://my-api/write': [
    'EditData component',
  ],
  'api://my-api/admin': [
    'AdminPanel component',
  ],
};

// Ensure each scope is justified
```

---

## Token Lifetimes

### Recommended Settings

| Token Type | Recommended Lifetime | Azure AD Default |
|------------|---------------------|------------------|
| **Access Token** | 1 hour | 1 hour |
| **ID Token** | 1 hour | 1 hour |
| **Refresh Token** | 24 hours - 90 days | 90 days |

### Configure in Azure AD

1. Go to **Azure AD** → **App registrations** → Your app
2. Navigate to **Token configuration**
3. Set **Access token lifetime**: 1 hour
4. Set **Refresh token lifetime**: Based on security requirements

### High-Security Applications

```ts
// For sensitive applications:
// - Shorter token lifetimes (15-30 minutes)
// - Shorter refresh token lifetimes (1-7 days)
// - Implement idle timeout
// - Require re-authentication for sensitive actions
```

---

## Disable Implicit Flow

### ✅ Correct: Auth Code Flow with PKCE

```ts
// msalConfig.ts - No implicit flow configuration needed
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    // Auth code flow with PKCE is used by default
  },
};
```

### Verify in Azure AD

1. Go to **Azure AD** → **App registrations** → Your app
2. Navigate to **Authentication**
3. Under **Implicit grant and hybrid flows**:
   - ❌ **Uncheck** "Access tokens"
   - ❌ **Uncheck** "ID tokens"

---

## Redirect URI Hygiene

### ✅ Good: Exact Match, HTTPS

```ts
// Development
redirectUri: 'http://localhost:3000/auth/callback'

// Production
redirectUri: 'https://app.example.com/auth/callback'
```

### ❌ Bad: Wildcards, HTTP in Production

```ts
// ❌ Don't use wildcards
redirectUri: 'https://*.example.com/auth/callback'

// ❌ Don't use HTTP in production
redirectUri: 'http://app.example.com/auth/callback'
```

### Redirect URI Checklist

- [ ] Exact match (including trailing slash)
- [ ] HTTPS in production
- [ ] Registered in Azure AD
- [ ] No wildcards
- [ ] No open redirects
- [ ] Validate `state` parameter

---

## CORS Configuration

### Backend CORS Setup

```ts
// backend/server.ts
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3000',           // Development
  'https://app.example.com',         // Production
  'https://staging.example.com',     // Staging
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
}));
```

### ❌ Don't Use Wildcard CORS

```ts
// ❌ Bad: Allows any origin
app.use(cors({
  origin: '*',
}));
```

---

## Security Headers

### Content Security Policy (CSP)

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://login.microsoftonline.com https://api.example.com;
  img-src 'self' data: https:;
  font-src 'self';
  frame-src 'none';
">
```

### HTTP Strict Transport Security (HSTS)

```ts
// backend/server.ts
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### X-Frame-Options

```ts
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
```

### X-Content-Type-Options

```ts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

---

## Server-Side Token Validation

### ✅ Always Validate Server-Side

```ts
// backend/middleware/auth.ts
import { verify } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.TENANT_ID}/discovery/v2.0/keys`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  verify(token, getKey, {
    audience: process.env.CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
  });
}
```

### Validation Checklist

- [ ] Signature verified
- [ ] Issuer (`iss`) matches expected
- [ ] Audience (`aud`) matches your client ID
- [ ] Expiration (`exp`) is in the future
- [ ] Not before (`nbf`) is in the past
- [ ] Scopes/roles validated for endpoint

---

## Logout Flows

### Complete Logout

```tsx
function LogoutButton() {
  const { instance, accounts } = useMsal();
  
  const handleLogout = () => {
    // Clear MSAL cache
    instance.logoutRedirect({
      account: accounts[0],
      postLogoutRedirectUri: '/login',
    });
    
    // Clear any application-specific storage
    localStorage.clear();
    sessionStorage.clear();
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Logout Checklist

- [ ] MSAL cache cleared
- [ ] Application storage cleared
- [ ] Server session invalidated (if applicable)
- [ ] User redirected to login page
- [ ] SSO session cleared (if desired)

---

## Sensitive Data Handling

### ❌ Don't Expose Sensitive Data

```tsx
// ❌ Bad: Exposing token in console
console.log('Access token:', accessToken);

// ❌ Bad: Sending token in URL
fetch(`/api/data?token=${accessToken}`);

// ❌ Bad: Storing token in localStorage manually
localStorage.setItem('token', accessToken);
```

### ✅ Good: Secure Handling

```tsx
// ✅ Good: Let MSAL handle tokens
const getToken = useAccessToken(scopes);

// ✅ Good: Send token in Authorization header
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${await getToken()}`,
  },
});

// ✅ Good: Log only in development
if (import.meta.env.DEV) {
  console.log('Token acquired');
}
```

---

## Error Message Security

### ❌ Don't Expose Technical Details

```tsx
// ❌ Bad: Exposing error details to user
catch (error) {
  alert(error.message); // May contain sensitive info
}
```

### ✅ Good: Generic User Messages

```tsx
// ✅ Good: Generic message, log details
catch (error) {
  // User-friendly message
  setError('Authentication failed. Please try again.');
  
  // Log details for developers
  console.error('Auth error:', error);
  
  // Send to monitoring (without PII)
  trackError(error);
}
```

---

## App Registration Rotation

### Rotation Schedule

- **Development:** Rotate annually
- **Staging:** Rotate semi-annually
- **Production:** Rotate quarterly

### Rotation Process

1. Create new app registration in Azure AD
2. Update environment variables with new client ID
3. Deploy to staging
4. Test thoroughly
5. Deploy to production
6. Monitor for issues
7. Decommission old app registration after 30 days

---

## Audit Checklist for New Features

Use `_templates/feature-auth-checklist.md` for new features:

### Authentication

- [ ] Protected routes use `ProtectedRoute` wrapper
- [ ] Tokens acquired with minimal scopes
- [ ] Silent acquisition tried before interactive
- [ ] Loading states shown during auth

### Authorization

- [ ] Roles/permissions checked server-side
- [ ] Client-side checks for UX only
- [ ] Fallback UI for unauthorized access
- [ ] Role constants used (no hardcoded strings)

### Security

- [ ] No credentials in code
- [ ] HTTPS in production
- [ ] CORS configured correctly
- [ ] Error messages don't expose sensitive data

### Testing

- [ ] Unit tests for auth logic
- [ ] Integration tests with MSW
- [ ] E2E tests with dev login
- [ ] Tested with different roles

---

## Monitoring & Alerts

### What to Monitor

```ts
// Track authentication events
analytics.track('auth.login.success', { method: 'redirect' });
analytics.track('auth.login.failure', { error: errorCode });
analytics.track('auth.token.acquired', { scopes });
analytics.track('auth.token.failed', { error: errorCode });
analytics.track('auth.logout', { reason });
```

### Alert Thresholds

- **Login failure rate** > 5% → Alert
- **Token acquisition failure** > 2% → Alert
- **401 errors** > 1% → Alert
- **Unusual login locations** → Alert
- **Multiple failed attempts** → Alert

---

## Best Practices Summary

### ✅ Do

- Enable PKCE (automatic in MSAL v2+)
- Use least-privilege scopes
- Validate tokens server-side
- Use HTTPS in production
- Implement security headers
- Clear cache on logout
- Rotate app registrations regularly
- Monitor authentication metrics
- Test security scenarios

### ❌ Don't

- Commit production credentials
- Use implicit flow
- Trust client-side validation
- Expose sensitive data in errors
- Use HTTP in production
- Use wildcard CORS
- Store tokens manually
- Skip server-side validation

---

**← Back to:** [Testing](./09-testing.md)  
**Next:** [Advanced](./11-advanced.md) →

