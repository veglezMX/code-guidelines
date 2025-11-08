# Session & Storage — MSAL for React

**Goal:** Understand cache locations, persistence, and session management strategies.

---

## Cache Location Options

### Comparison Matrix

| Option | Security | Persistence | SSO | Multi-Tab | Use Case |
|--------|----------|-------------|-----|-----------|----------|
| **sessionStorage** | ✅ High | Tab only | ❌ | ❌ | **Recommended** for most apps |
| **localStorage** | ⚠️ Medium | Browser-wide | ✅ | ✅ | Multi-tab SSO needed |
| **memoryStorage** | ✅ Highest | None | ❌ | ❌ | Maximum security, no persistence |

### sessionStorage (Recommended)

```ts
// msalConfig.ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'sessionStorage', // Recommended
    storeAuthStateInCookie: false,
  },
  // ... other config
};
```

**Pros:**
- ✅ Tokens cleared when tab closes
- ✅ Isolated per tab (more secure)
- ✅ XSS protection (same as localStorage)

**Cons:**
- ❌ No SSO across tabs
- ❌ Lost on tab close
- ❌ Lost on page refresh (in some browsers)

**When to use:** Most applications, especially those handling sensitive data

### localStorage

```ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};
```

**Pros:**
- ✅ Persists across tabs
- ✅ SSO across tabs
- ✅ Survives page refresh

**Cons:**
- ⚠️ Tokens persist after tab close
- ⚠️ Shared across all tabs (less isolated)
- ⚠️ More XSS attack surface

**When to use:** Multi-tab applications, SSO required

### memoryStorage

```ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'memoryStorage',
    storeAuthStateInCookie: false,
  },
};
```

**Pros:**
- ✅ Most secure (no persistence)
- ✅ No XSS risk from storage
- ✅ Tokens never written to disk

**Cons:**
- ❌ Lost on page refresh
- ❌ No SSO
- ❌ Frequent re-authentication needed

**When to use:** Maximum security requirements, kiosks, shared devices

---

## Security Tradeoffs

### XSS Attack Surface

```
sessionStorage / localStorage:
├─ Vulnerable to XSS attacks
├─ Attacker can read tokens via JavaScript
└─ Mitigation: CSP headers, sanitize inputs

memoryStorage:
├─ Not vulnerable to XSS reading from storage
├─ Still vulnerable during token use
└─ Best for high-security scenarios
```

### Decision Tree

```
Do you need SSO across tabs?
├─ Yes → Use localStorage
│   └─ Implement strong CSP headers
│
└─ No → Do you need persistence?
    ├─ Yes → Use sessionStorage (recommended)
    │   └─ Tokens cleared on tab close
    │
    └─ No → Use memoryStorage
        └─ Maximum security, no persistence
```

---

## SSO Behavior

### Single Sign-On Explained

**SSO (Single Sign-On):** Sign in once, access multiple apps without re-authenticating

### SSO with sessionStorage

```tsx
// SSO works within same tab/window
// User signs in to App A → navigates to App B → still signed in

// But: New tab requires new sign-in
```

### SSO with localStorage

```tsx
// SSO works across all tabs
// User signs in to App A in Tab 1
// Opens App B in Tab 2 → automatically signed in
```

### Silent SSO

```tsx
// Attempt SSO without user interaction
import { useMsal } from '@azure/msal-react';

function App() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const attemptSSO = async () => {
      try {
        await instance.ssoSilent({
          scopes: ['openid', 'profile'],
        });
        console.log('SSO successful');
      } catch (error) {
        console.log('SSO not available, user needs to sign in');
      }
    };
    
    attemptSSO();
  }, [instance]);
  
  return <App />;
}
```

---

## Multi-Account UX

### Account Switcher

```tsx
// src/components/AccountSwitcher.tsx
import { useMsal } from '@azure/msal-react';
import { useState, useEffect } from 'react';

export function AccountSwitcher() {
  const { instance, accounts } = useMsal();
  const [activeAccount, setActiveAccount] = useState(instance.getActiveAccount());
  
  const handleSwitch = (accountId: string) => {
    const account = accounts.find(a => a.homeAccountId === accountId);
    
    if (account) {
      instance.setActiveAccount(account);
      setActiveAccount(account);
    }
  };
  
  const handleAddAccount = () => {
    instance.loginPopup({
      scopes: ['openid', 'profile'],
      prompt: 'select_account',
    });
  };
  
  if (accounts.length <= 1) {
    return null; // No need for switcher
  }
  
  return (
    <div className="account-switcher">
      <select
        value={activeAccount?.homeAccountId || ''}
        onChange={(e) => handleSwitch(e.target.value)}
      >
        {accounts.map(account => (
          <option key={account.homeAccountId} value={account.homeAccountId}>
            {account.name} ({account.username})
          </option>
        ))}
      </select>
      <button onClick={handleAddAccount}>Add Account</button>
    </div>
  );
}
```

### Multi-Account Login

```tsx
function LoginButton() {
  const { instance } = useMsal();
  
  const handleLogin = () => {
    instance.loginPopup({
      scopes: ['openid', 'profile'],
      prompt: 'select_account', // Force account selection
    });
  };
  
  return <button onClick={handleLogin}>Add Account</button>;
}
```

---

## Token Persistence Rules

### What MSAL Caches

```
Cache Contents:
├── Access Tokens
│   ├── Keyed by: scope + account + authority
│   ├── Lifetime: 1 hour (typical)
│   └── Automatically refreshed
│
├── ID Tokens
│   ├── Keyed by: account + authority
│   ├── Lifetime: 1 hour (typical)
│   └── Contains user claims
│
├── Refresh Tokens
│   ├── Keyed by: account + authority
│   ├── Lifetime: Days to weeks
│   └── Used for silent renewal
│
└── Account Information
    ├── User profile
    └── Claims from ID token
```

### Cache Expiration

```tsx
// MSAL automatically handles token expiration
// When you request a token:
// 1. Check cache for valid token
// 2. If expired, use refresh token
// 3. If refresh fails, trigger interactive flow

// You don't need to manually check expiration
const { instance, accounts } = useMsal();

const getToken = async () => {
  const response = await instance.acquireTokenSilent({
    scopes: ['api://my-api/read'],
    account: accounts[0],
  });
  
  // Token is always valid (or error is thrown)
  return response.accessToken;
};
```

---

## Logout Flows

### Logout from Single App

```tsx
function LogoutButton() {
  const { instance } = useMsal();
  
  const handleLogout = () => {
    // Clear local cache only
    instance.logoutRedirect({
      postLogoutRedirectUri: '/login',
    });
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Logout from All Apps (Clear SSO)

```tsx
function LogoutButton() {
  const { instance, accounts } = useMsal();
  
  const handleLogout = () => {
    // Clear SSO session at Azure AD
    instance.logoutRedirect({
      account: accounts[0],
      postLogoutRedirectUri: '/login',
    });
  };
  
  return <button onClick={handleLogout}>Sign Out Everywhere</button>;
}
```

### Logout All Accounts

```tsx
function LogoutButton() {
  const { instance, accounts } = useMsal();
  
  const handleLogoutAll = async () => {
    // Logout all accounts
    for (const account of accounts) {
      await instance.logout({
        account,
        onRedirectNavigate: () => false, // Don't navigate yet
      });
    }
    
    // Navigate after all accounts logged out
    window.location.href = '/login';
  };
  
  return <button onClick={handleLogoutAll}>Sign Out All Accounts</button>;
}
```

---

## Cache Cleanup

### Manual Cache Clear

```tsx
// Clear all cached tokens and accounts
function clearCache() {
  const { instance } = useMsal();
  
  // Get all accounts
  const accounts = instance.getAllAccounts();
  
  // Remove each account (clears associated tokens)
  accounts.forEach(account => {
    instance.logout({
      account,
      onRedirectNavigate: () => false,
    });
  });
  
  console.log('Cache cleared');
}
```

### Clear on Logout

```tsx
function LogoutButton() {
  const { instance } = useMsal();
  
  const handleLogout = () => {
    // MSAL automatically clears cache on logout
    instance.logoutRedirect({
      postLogoutRedirectUri: '/login',
    });
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Clear Specific Account

```tsx
function removeAccount(accountId: string) {
  const { instance } = useMsal();
  
  const account = instance.getAccountByHomeId(accountId);
  
  if (account) {
    instance.logout({
      account,
      onRedirectNavigate: () => false,
    });
  }
}
```

---

## Browser Storage Limits

### Storage Quotas

```
sessionStorage / localStorage:
├─ Limit: ~5-10 MB (varies by browser)
├─ Shared across all apps on same domain
└─ Errors thrown when limit exceeded
```

### Handling Storage Errors

```tsx
// Wrap MSAL initialization with error handling
try {
  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
} catch (error) {
  if (error.message.includes('QuotaExceededError')) {
    console.error('Storage quota exceeded');
    
    // Clear old data or prompt user
    if (confirm('Storage full. Clear cache?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }
}
```

### Fallback Strategy

```tsx
// Try localStorage, fallback to sessionStorage
let cacheLocation: 'localStorage' | 'sessionStorage' = 'localStorage';

try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (error) {
  console.warn('localStorage not available, using sessionStorage');
  cacheLocation = 'sessionStorage';
}

export const msalConfig: Configuration = {
  cache: {
    cacheLocation,
    storeAuthStateInCookie: false,
  },
};
```

---

## Session Timeout

### Idle Timeout

```tsx
// src/hooks/useIdleTimeout.ts
import { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';

export function useIdleTimeout(timeoutMs = 30 * 60 * 1000) { // 30 minutes
  const { instance } = useMsal();
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        // Logout on idle
        instance.logoutRedirect({
          postLogoutRedirectUri: '/login?reason=timeout',
        });
      }, timeoutMs);
    };
    
    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout);
    });
    
    resetTimeout(); // Initial timeout
    
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [instance, timeoutMs]);
}
```

### Usage

```tsx
function App() {
  useIdleTimeout(30 * 60 * 1000); // 30 minutes
  
  return <YourApp />;
}
```

---

## Best Practices

### ✅ Do

- Use `sessionStorage` for most applications (recommended)
- Use `localStorage` only if multi-tab SSO is required
- Implement idle timeout for sensitive applications
- Clear cache on logout
- Handle storage quota errors gracefully
- Test with different cache locations
- Provide account switcher for multi-account scenarios

### ❌ Don't

- Use `localStorage` by default (less secure)
- Store tokens manually (let MSAL handle it)
- Forget to clear cache on logout
- Ignore storage quota errors
- Mix cache locations across environments
- Assume SSO works the same across cache locations

---

## Configuration Examples

### High Security (Financial, Healthcare)

```ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'sessionStorage', // or memoryStorage
    storeAuthStateInCookie: false,
  },
};

// + Implement idle timeout
// + Require re-authentication for sensitive actions
// + Use short token lifetimes
```

### Multi-Tab Application

```ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// + Implement CSP headers
// + Monitor for XSS vulnerabilities
// + Provide account switcher
```

### Kiosk / Shared Device

```ts
export const msalConfig: Configuration = {
  cache: {
    cacheLocation: 'memoryStorage',
    storeAuthStateInCookie: false,
  },
};

// + Clear all data on logout
// + Implement aggressive idle timeout
// + Disable "remember me" features
```

---

**← Back to:** [Roles & Permissions](./06-roles-permissions.md)  
**Next:** [Error Handling](./08-error-handling.md) →

