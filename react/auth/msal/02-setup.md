# Setup — MSAL for React

**Goal:** Install, configure, and verify MSAL authentication in your React application.

---

## Installation

### Install Dependencies

```bash
# Using pnpm (recommended)
pnpm add @azure/msal-browser @azure/msal-react

# Using npm
npm install @azure/msal-browser @azure/msal-react

# Using yarn
yarn add @azure/msal-browser @azure/msal-react
```

### TypeScript Types

Types are included in the packages. No additional `@types` packages needed.

---

## Azure AD App Registration

### Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name:** Your app name (e.g., "My React App")
   - **Supported account types:** 
     - Single tenant (recommended for internal apps)
     - Multi-tenant (for SaaS apps)
   - **Redirect URI:** 
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:3000/auth/callback` (for development)
5. Click **Register**

### Note Your IDs

After registration, note these values:

```
Application (client) ID: 12345678-1234-1234-1234-123456789012
Directory (tenant) ID:   87654321-4321-4321-4321-210987654321
```

⚠️ **NEVER commit these to version control for production apps**

### Configure Authentication

1. Go to **Authentication** in your app registration
2. Under **Single-page application**, add redirect URIs:
   ```
   http://localhost:3000/auth/callback    (development)
   https://app.example.com/auth/callback  (production)
   ```
3. Under **Logout URL**, add:
   ```
   http://localhost:3000/login            (development)
   https://app.example.com/login          (production)
   ```
4. Under **Implicit grant and hybrid flows**:
   - ❌ **Uncheck** "Access tokens"
   - ❌ **Uncheck** "ID tokens"
   - (PKCE auth code flow is used instead)

### Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. For Microsoft Graph:
   - Select **Microsoft Graph** → **Delegated permissions**
   - Add: `User.Read` (basic profile)
4. For your custom API:
   - Select **My APIs** → Your API
   - Add required scopes (e.g., `read`, `write`)
5. Click **Grant admin consent** (if you have admin rights)

### Expose an API (If Your App Has a Backend)

1. Go to **Expose an API**
2. Click **Add a scope**
3. Set Application ID URI: `api://{client-id}` or custom
4. Add scopes:
   ```
   Scope name: read
   Who can consent: Admins and users
   Display name: Read access
   Description: Allows reading data
   ```
5. Repeat for other scopes (`write`, `delete`, etc.)

---

## Environment Configuration

### Environment Variables

Create environment files for each environment:

```bash
# .env.local (development - not committed)
VITE_MSAL_CLIENT_ID=12345678-1234-1234-1234-123456789012
VITE_MSAL_TENANT_ID=87654321-4321-4321-4321-210987654321
VITE_MSAL_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_API_SCOPE=api://12345678-1234-1234-1234-123456789012/read

# .env.production (production - not committed)
VITE_MSAL_CLIENT_ID=${PROD_CLIENT_ID}  # From CI/CD secrets
VITE_MSAL_TENANT_ID=${PROD_TENANT_ID}  # From CI/CD secrets
VITE_MSAL_REDIRECT_URI=https://app.example.com/auth/callback
VITE_API_SCOPE=api://${PROD_API_ID}/read
```

### .gitignore

```bash
# .gitignore
.env.local
.env.*.local
.env.production
```

### Environment Matrix

| Environment | Client ID | Tenant | Redirect URI | Notes |
|-------------|-----------|--------|--------------|-------|
| **Local** | Dev tenant | Dev | localhost:3000 | Use dev Azure AD tenant |
| **CI/CD** | N/A | N/A | N/A | Use dev login pattern (see Testing) |
| **Staging** | Staging tenant | Staging | staging.app.com | Separate app registration |
| **Production** | Prod tenant | Prod | app.example.com | Separate app registration |

---

## MSAL Configuration

### Basic Configuration

Create `src/config/msalConfig.ts`:

```ts
import { Configuration, LogLevel } from '@azure/msal-browser';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_MSAL_CLIENT_ID',
  'VITE_MSAL_TENANT_ID',
] as const;

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin + '/login',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage', // Recommended for security
    storeAuthStateInCookie: false,   // Set to true for IE11/Edge legacy
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      piiLoggingEnabled: false,
    },
    allowNativeBroker: false, // Disables WAM Broker
  },
};

// API Scopes
export const apiScopes = Object.freeze({
  read: [import.meta.env.VITE_API_SCOPE || 'api://default/read'],
  write: [import.meta.env.VITE_API_SCOPE?.replace('/read', '/write') || 'api://default/write'],
});

// Login Request
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};
```

### Configuration Options Explained

```ts
// auth.clientId
// Your app's unique identifier from Azure AD
// REQUIRED

// auth.authority
// Azure AD endpoint for your tenant
// Format: https://login.microsoftonline.com/{tenant-id}
// For B2C: https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}

// auth.redirectUri
// Where Azure AD sends user after authentication
// Must match exactly what's registered in Azure AD
// Include protocol, domain, port, and path

// auth.postLogoutRedirectUri
// Where to send user after logout
// Typically your login page

// cache.cacheLocation
// Where to store tokens
// Options: 'sessionStorage' (recommended), 'localStorage', 'memoryStorage'

// cache.storeAuthStateInCookie
// Store auth state in cookie for IE11/Edge legacy
// Set to false for modern browsers

// system.loggerOptions.logLevel
// Logging verbosity
// Options: Error, Warning, Info, Verbose
// Use Info in dev, Error in production
```

---

## Application Setup

### Wrap Your App with MsalProvider

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './config/msalConfig';
import App from './App';

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
await msalInstance.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);
```

### Handle Redirect

If using redirect flow, handle the redirect response:

```tsx
// src/main.tsx
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/msalConfig';

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize and handle redirect
await msalInstance.initialize();
await msalInstance.handleRedirectPromise();

// Then render app...
```

---

## Verification

### Test Authentication

Create a simple login component to verify setup:

```tsx
// src/components/LoginButton.tsx
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/msalConfig';

export function LoginButton() {
  const { instance } = useMsal();
  
  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };
  
  return <button onClick={handleLogin}>Sign In</button>;
}
```

```tsx
// src/components/UserInfo.tsx
import { useIsAuthenticated, useMsal } from '@azure/msal-react';

export function UserInfo() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();
  
  if (!isAuthenticated) {
    return <div>Not signed in</div>;
  }
  
  const account = accounts[0];
  
  const handleLogout = () => {
    instance.logoutRedirect();
  };
  
  return (
    <div>
      <p>Welcome, {account.name}</p>
      <p>Email: {account.username}</p>
      <button onClick={handleLogout}>Sign Out</button>
    </div>
  );
}
```

### Verification Checklist

- [ ] App loads without errors
- [ ] Click "Sign In" redirects to Azure AD
- [ ] Can authenticate with test user
- [ ] Redirected back to app after auth
- [ ] User info displays correctly
- [ ] Can sign out successfully
- [ ] Tokens visible in browser storage (sessionStorage)

---

## Troubleshooting Setup

### "AADSTS50011: The reply URL specified in the request does not match"

**Cause:** Redirect URI mismatch

**Fix:**
1. Check redirect URI in code matches Azure AD exactly
2. Include protocol, domain, port, path
3. Check for trailing slashes
4. Verify SPA platform is selected (not Web)

### "AADSTS700016: Application not found"

**Cause:** Invalid client ID or tenant ID

**Fix:**
1. Verify client ID from Azure AD app registration
2. Verify tenant ID (not tenant name)
3. Check environment variables are loaded

### "AADSTS65001: The user or administrator has not consented"

**Cause:** Required permissions not consented

**Fix:**
1. Go to Azure AD → App registrations → API permissions
2. Click "Grant admin consent"
3. Or add `prompt: 'consent'` to login request

### Tokens not persisting

**Cause:** Cache location issue

**Fix:**
1. Verify `cacheLocation: 'sessionStorage'` in config
2. Check browser allows storage
3. Check for browser extensions blocking storage

### Infinite redirect loop

**Cause:** Redirect URI handling issue

**Fix:**
1. Ensure `handleRedirectPromise()` is called before render
2. Check `navigateToLoginRequestUrl` setting
3. Verify redirect URI is registered

---

## CI/CD Secrets

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
env:
  VITE_MSAL_CLIENT_ID: ${{ secrets.MSAL_CLIENT_ID }}
  VITE_MSAL_TENANT_ID: ${{ secrets.MSAL_TENANT_ID }}
```

### Setting Secrets

```bash
# GitHub CLI
gh secret set MSAL_CLIENT_ID --body "your-client-id"
gh secret set MSAL_TENANT_ID --body "your-tenant-id"
```

### Azure DevOps

```yaml
# azure-pipelines.yml
variables:
  - group: msal-secrets  # Variable group with secrets

steps:
  - script: |
      export VITE_MSAL_CLIENT_ID=$(MSAL_CLIENT_ID)
      export VITE_MSAL_TENANT_ID=$(MSAL_TENANT_ID)
      npm run build
```

---

## Security Best Practices

### ✅ Do

- Use separate app registrations for each environment
- Store client IDs in environment variables
- Use `sessionStorage` for cache location
- Enable PKCE (default in MSAL v2+)
- Validate tokens server-side
- Use HTTPS in production
- Rotate app registrations periodically

### ❌ Don't

- Commit client IDs to version control (for production)
- Use production credentials in development
- Store tokens in localStorage (less secure)
- Disable PKCE
- Trust client-side token validation
- Use HTTP in production
- Share app registrations across environments

---

## Next Steps

1. ✅ Setup complete
2. → Read [Core Usage](./03-core-usage.md) for authentication patterns
3. → Copy `_examples/AuthProvider.example.tsx` for advanced setup
4. → Review [Security Checklist](./10-security-checklist.md)

---

**← Back to:** [Concepts](./01-concepts.md)  
**Next:** [Core Usage](./03-core-usage.md) →

