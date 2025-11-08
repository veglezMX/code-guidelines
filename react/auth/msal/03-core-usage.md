# Core Usage — MSAL for React

**Goal:** Implement authentication patterns for sign-in, sign-out, and token acquisition.

---

## AuthProvider Pattern

### Single Provider Setup

Create a centralized auth provider to wrap your application:

```tsx
// src/providers/AuthProvider.tsx
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage } from '@azure/msal-browser';
import { msalConfig } from '../config/msalConfig';
import { useEffect } from 'react';

// Create MSAL instance (singleton)
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
await msalInstance.initialize();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthEventHandler />
      {children}
    </MsalProvider>
  );
}

// Event handler component
function AuthEventHandler() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const callbackId = instance.addEventCallback((event: EventMessage) => {
      switch (event.eventType) {
        case EventType.LOGIN_SUCCESS:
          console.log('Login successful', event.payload);
          // TODO: Add telemetry/analytics
          break;
          
        case EventType.LOGIN_FAILURE:
          console.error('Login failed', event.error);
          // TODO: Add error tracking
          break;
          
        case EventType.ACQUIRE_TOKEN_SUCCESS:
          console.log('Token acquired', event.payload);
          break;
          
        case EventType.ACQUIRE_TOKEN_FAILURE:
          console.error('Token acquisition failed', event.error);
          break;
          
        case EventType.LOGOUT_SUCCESS:
          console.log('Logout successful');
          break;
      }
    });
    
    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance]);
  
  return null;
}
```

### Usage in App

```tsx
// src/main.tsx
import { AuthProvider } from './providers/AuthProvider';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

---

## Event Callbacks

### Available Events

```ts
EventType.LOGIN_START           // User initiated login
EventType.LOGIN_SUCCESS         // Login completed successfully
EventType.LOGIN_FAILURE         // Login failed
EventType.LOGOUT_START          // User initiated logout
EventType.LOGOUT_SUCCESS        // Logout completed
EventType.LOGOUT_FAILURE        // Logout failed
EventType.ACQUIRE_TOKEN_START   // Token acquisition started
EventType.ACQUIRE_TOKEN_SUCCESS // Token acquired successfully
EventType.ACQUIRE_TOKEN_FAILURE // Token acquisition failed
EventType.SSO_SILENT_START      // Silent SSO started
EventType.SSO_SILENT_SUCCESS    // Silent SSO succeeded
EventType.SSO_SILENT_FAILURE    // Silent SSO failed
EventType.HANDLE_REDIRECT_START // Redirect handling started
EventType.HANDLE_REDIRECT_END   // Redirect handling completed
```

### Event Payload Structure

```ts
interface EventMessage {
  eventType: EventType;
  interactionType: InteractionType | null;
  payload: any;
  error: Error | null;
  timestamp: number;
}
```

### Telemetry Integration Example

```tsx
function AuthEventHandler() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const callbackId = instance.addEventCallback((event: EventMessage) => {
      // Send to analytics
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        analytics.track('user_login', {
          timestamp: event.timestamp,
          method: event.interactionType,
        });
      }
      
      // Send errors to monitoring
      if (event.error) {
        errorTracking.captureException(event.error, {
          eventType: event.eventType,
          interactionType: event.interactionType,
        });
      }
    });
    
    return () => {
      if (callbackId) instance.removeEventCallback(callbackId);
    };
  }, [instance]);
  
  return null;
}
```

---

## Custom Hooks

### useIsAuthenticated

Built-in hook to check authentication state:

```tsx
import { useIsAuthenticated } from '@azure/msal-react';

function App() {
  const isAuthenticated = useIsAuthenticated();
  
  return isAuthenticated ? <Dashboard /> : <Login />;
}
```

### useAccount

Get the current user account:

```tsx
import { useMsal } from '@azure/msal-react';

function UserProfile() {
  const { accounts } = useMsal();
  const account = accounts[0];
  
  if (!account) {
    return <div>Not signed in</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {account.name}</h1>
      <p>Email: {account.username}</p>
      <p>Tenant: {account.tenantId}</p>
    </div>
  );
}
```

### useAccessToken (Custom Hook)

Create a reusable hook for token acquisition:

```tsx
// src/hooks/useAccessToken.ts
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useCallback } from 'react';

export function useAccessToken(scopes: string[]) {
  const { instance, accounts } = useMsal();
  
  return useCallback(async () => {
    const account = accounts[0];
    
    if (!account) {
      throw new Error('No active account');
    }
    
    try {
      // Try silent acquisition first
      const response = await instance.acquireTokenSilent({
        scopes,
        account,
      });
      
      return response.accessToken;
    } catch (error) {
      // If silent fails, try interactive
      if (error instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({
          scopes,
          account,
        });
        
        return response.accessToken;
      }
      
      throw error;
    }
  }, [instance, accounts, scopes]);
}
```

### Usage Example

```tsx
import { useAccessToken } from '../hooks/useAccessToken';
import { apiScopes } from '../config/msalConfig';

function DataFetcher() {
  const getToken = useAccessToken(apiScopes.read);
  
  const fetchData = async () => {
    try {
      const token = await getToken();
      
      const response = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };
  
  // Use in your component...
}
```

---

## Sign-In Flows

### Redirect vs Popup

| Factor | Redirect | Popup |
|--------|----------|-------|
| **UX** | Full page redirect | Stays on page |
| **State** | Lost (unless saved) | Preserved |
| **Mobile** | ✅ Works everywhere | ❌ Often blocked |
| **Complexity** | Simple | More complex |
| **Default** | ✅ Recommended | Use when needed |

### Redirect Flow (Recommended)

```tsx
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/msalConfig';

function LoginButton() {
  const { instance } = useMsal();
  
  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };
  
  return <button onClick={handleLogin}>Sign In</button>;
}
```

### Popup Flow

```tsx
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/msalConfig';

function LoginButton() {
  const { instance } = useMsal();
  const [error, setError] = useState<string | null>(null);
  
  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error(error);
    }
  };
  
  return (
    <div>
      <button onClick={handleLogin}>Sign In</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Silent SSO

Attempt silent sign-in if user has existing session:

```tsx
import { useMsal } from '@azure/msal-react';
import { useEffect } from 'react';

function App() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const attemptSilentLogin = async () => {
      try {
        await instance.ssoSilent({
          scopes: ['openid', 'profile'],
        });
      } catch (error) {
        // Silent SSO failed, user needs to login interactively
        console.log('Silent SSO not available');
      }
    };
    
    attemptSilentLogin();
  }, [instance]);
  
  return <App />;
}
```

### Custom Login Prompt

```tsx
// Force account selection
instance.loginRedirect({
  ...loginRequest,
  prompt: 'select_account',
});

// Force re-authentication
instance.loginRedirect({
  ...loginRequest,
  prompt: 'login',
});

// Request consent
instance.loginRedirect({
  ...loginRequest,
  prompt: 'consent',
});
```

---

## Sign-Out Flows

### Logout from Single App

```tsx
import { useMsal } from '@azure/msal-react';

function LogoutButton() {
  const { instance } = useMsal();
  
  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: '/login',
    });
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Logout from All Apps (Clear SSO Session)

```tsx
function LogoutButton() {
  const { instance, accounts } = useMsal();
  
  const handleLogout = () => {
    instance.logoutRedirect({
      account: accounts[0],
      postLogoutRedirectUri: '/login',
    });
  };
  
  return <button onClick={handleLogout}>Sign Out Everywhere</button>;
}
```

### Logout Popup

```tsx
function LogoutButton() {
  const { instance } = useMsal();
  
  const handleLogout = async () => {
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: '/login',
      });
    } catch (error) {
      console.error('Logout failed', error);
    }
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Clear Local Cache Only

```tsx
function LogoutButton() {
  const { instance, accounts } = useMsal();
  
  const handleLogout = () => {
    // Clear local cache without calling Azure AD
    const account = accounts[0];
    if (account) {
      instance.logout({
        account,
        onRedirectNavigate: () => false, // Don't navigate
      });
    }
    
    // Manually navigate
    window.location.href = '/login';
  };
  
  return <button onClick={handleLogout}>Sign Out (Local Only)</button>;
}
```

---

## Token Acquisition Patterns

### Pattern 1: Acquire Token for API Call

```tsx
const { instance, accounts } = useMsal();

const callApi = async () => {
  const account = accounts[0];
  
  try {
    const response = await instance.acquireTokenSilent({
      scopes: ['api://my-api/read'],
      account,
    });
    
    // Use token
    fetch('/api/data', {
      headers: { 'Authorization': `Bearer ${response.accessToken}` }
    });
  } catch (error) {
    // Handle error (see Error Handling doc)
  }
};
```

### Pattern 2: Preload Tokens on Login

```tsx
function App() {
  const { instance, accounts } = useMsal();
  
  useEffect(() => {
    const preloadTokens = async () => {
      if (accounts.length === 0) return;
      
      const account = accounts[0];
      
      // Preload tokens for known scopes
      const scopeSets = [
        ['api://my-api/read'],
        ['api://my-api/write'],
      ];
      
      for (const scopes of scopeSets) {
        try {
          await instance.acquireTokenSilent({ scopes, account });
        } catch (error) {
          console.warn('Failed to preload token', scopes);
        }
      }
    };
    
    preloadTokens();
  }, [instance, accounts]);
  
  return <App />;
}
```

### Pattern 3: Token with Claims Challenge

```tsx
// When API returns 401 with claims challenge
const response = await fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  const wwwAuthenticate = response.headers.get('WWW-Authenticate');
  const claims = extractClaims(wwwAuthenticate); // Parse claims
  
  // Acquire new token with claims
  const tokenResponse = await instance.acquireTokenPopup({
    scopes: ['api://my-api/read'],
    account: accounts[0],
    claims,
  });
  
  // Retry with new token
  const retryResponse = await fetch('/api/data', {
    headers: { 'Authorization': `Bearer ${tokenResponse.accessToken}` }
  });
}
```

---

## Complete Authentication Component

```tsx
// src/components/AuthenticationStatus.tsx
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/msalConfig';

export function AuthenticationStatus() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  
  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };
  
  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: '/login',
    });
  };
  
  if (!isAuthenticated) {
    return (
      <div className="auth-status">
        <p>You are not signed in</p>
        <button onClick={handleLogin}>Sign In</button>
      </div>
    );
  }
  
  return (
    <div className="auth-status">
      <div className="user-info">
        <img 
          src={`https://ui-avatars.com/api/?name=${account.name}`} 
          alt={account.name} 
        />
        <div>
          <p className="user-name">{account.name}</p>
          <p className="user-email">{account.username}</p>
        </div>
      </div>
      <button onClick={handleLogout}>Sign Out</button>
    </div>
  );
}
```

---

## Best Practices

### ✅ Do

- Use redirect flow by default (better mobile support)
- Try silent token acquisition first, fallback to interactive
- Preload tokens for known scopes after login
- Handle errors gracefully with user-friendly messages
- Use event callbacks for telemetry and monitoring
- Clear cache on logout
- Validate tokens server-side (never trust client)

### ❌ Don't

- Use popup flow unless necessary (often blocked)
- Acquire tokens on every API call (use cache)
- Store tokens manually (let MSAL handle it)
- Ignore interaction required errors
- Trust client-side authentication state for security
- Mix redirect and popup flows in same app
- Call loginRedirect multiple times simultaneously

---

## Common Patterns

### Loading State During Auth

```tsx
function App() {
  const { inProgress } = useMsal();
  
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  return <MainApp />;
}
```

### Conditional Rendering Based on Auth

```tsx
function Navigation() {
  const isAuthenticated = useIsAuthenticated();
  
  return (
    <nav>
      <Link to="/">Home</Link>
      {isAuthenticated ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Profile</Link>
        </>
      ) : (
        <Link to="/login">Sign In</Link>
      )}
    </nav>
  );
}
```

### Account Switcher (Multi-Account)

```tsx
function AccountSwitcher() {
  const { instance, accounts } = useMsal();
  const [activeAccount, setActiveAccount] = useState(instance.getActiveAccount());
  
  const handleAccountChange = (account: AccountInfo) => {
    instance.setActiveAccount(account);
    setActiveAccount(account);
  };
  
  return (
    <select 
      value={activeAccount?.homeAccountId} 
      onChange={(e) => {
        const account = accounts.find(a => a.homeAccountId === e.target.value);
        if (account) handleAccountChange(account);
      }}
    >
      {accounts.map(account => (
        <option key={account.homeAccountId} value={account.homeAccountId}>
          {account.name} ({account.username})
        </option>
      ))}
    </select>
  );
}
```

---

**← Back to:** [Setup](./02-setup.md)  
**Next:** [Routing & Guards](./04-routing-and-guards.md) →

