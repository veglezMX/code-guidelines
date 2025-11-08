# Error Handling — MSAL for React

**Goal:** Handle MSAL errors gracefully with appropriate user messages and recovery strategies.

---

## MSAL Error Codes

### Common Error Mapping

| Error Code | Meaning | User Message | Developer Action |
|------------|---------|--------------|------------------|
| `user_cancelled` | User closed popup/cancelled | "Sign-in cancelled" | Allow retry |
| `consent_required` | Additional consent needed | "Additional permissions required" | Trigger consent flow |
| `interaction_required` | User interaction needed | "Please sign in again" | Trigger interactive flow |
| `token_renewal_error` | Token refresh failed | "Session expired, please sign in" | Redirect to login |
| `invalid_grant` | Refresh token expired | "Please sign in again" | Redirect to login |
| `endpoints_resolution_error` | Network/config issue | "Connection error, please try again" | Check network/config |
| `popup_window_error` | Popup blocked | "Please allow popups and try again" | Suggest redirect flow |
| `network_error` | Network failure | "Network error, please check connection" | Retry with backoff |

---

## Error Types

### InteractionRequiredAuthError

**When:** Silent token acquisition fails, user interaction needed

```tsx
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';

async function getToken() {
  const { instance, accounts } = useMsal();
  
  try {
    const response = await instance.acquireTokenSilent({
      scopes: ['api://my-api/read'],
      account: accounts[0],
    });
    
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Trigger interactive flow
      const response = await instance.acquireTokenPopup({
        scopes: ['api://my-api/read'],
        account: accounts[0],
      });
      
      return response.accessToken;
    }
    
    throw error;
  }
}
```

### BrowserAuthError

**When:** Browser-specific issues (popup blocked, storage unavailable)

```tsx
import { BrowserAuthError } from '@azure/msal-browser';

try {
  await instance.loginPopup(loginRequest);
} catch (error) {
  if (error instanceof BrowserAuthError) {
    if (error.errorCode === 'popup_window_error') {
      // Popup blocked
      alert('Please allow popups or use the redirect option');
      
      // Fallback to redirect
      instance.loginRedirect(loginRequest);
    }
  }
}
```

### ClientAuthError

**When:** Client-side configuration or usage errors

```tsx
import { ClientAuthError } from '@azure/msal-browser';

try {
  await instance.acquireTokenSilent({
    scopes: ['api://my-api/read'],
    account: accounts[0],
  });
} catch (error) {
  if (error instanceof ClientAuthError) {
    console.error('Client configuration error:', error.errorCode);
    
    // Log for debugging
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}
```

### ServerError

**When:** Azure AD returns an error

```tsx
import { ServerError } from '@azure/msal-browser';

try {
  await instance.loginRedirect(loginRequest);
} catch (error) {
  if (error instanceof ServerError) {
    console.error('Azure AD error:', error.errorCode);
    
    // Handle specific server errors
    if (error.errorCode === 'invalid_grant') {
      alert('Your session has expired. Please sign in again.');
      instance.loginRedirect(loginRequest);
    }
  }
}
```

---

## Retry Strategies

### Exponential Backoff

```ts
// src/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on user cancellation or interaction required
      if (
        error instanceof InteractionRequiredAuthError ||
        (error as any).errorCode === 'user_cancelled'
      ) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### Usage

```tsx
import { retryWithBackoff } from '../utils/retry';

async function getToken() {
  return retryWithBackoff(async () => {
    const response = await instance.acquireTokenSilent({
      scopes: ['api://my-api/read'],
      account: accounts[0],
    });
    
    return response.accessToken;
  });
}
```

---

## Fallback Flows

### Silent → Popup → Redirect

```tsx
async function acquireTokenWithFallback(scopes: string[]) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  
  try {
    // Try silent first
    const response = await instance.acquireTokenSilent({
      scopes,
      account,
    });
    
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      try {
        // Try popup
        const response = await instance.acquireTokenPopup({
          scopes,
          account,
        });
        
        return response.accessToken;
      } catch (popupError) {
        if ((popupError as any).errorCode === 'popup_window_error') {
          // Fallback to redirect
          await instance.acquireTokenRedirect({
            scopes,
            account,
          });
        }
        
        throw popupError;
      }
    }
    
    throw error;
  }
}
```

---

## User-Facing Messages

### Error Message Component

```tsx
// src/components/ErrorMessage.tsx
import { AuthError } from '@azure/msal-browser';

interface ErrorMessageProps {
  error: Error | AuthError;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const getUserMessage = (error: Error | AuthError) => {
    if ('errorCode' in error) {
      switch (error.errorCode) {
        case 'user_cancelled':
          return 'Sign-in was cancelled. Please try again.';
        case 'consent_required':
          return 'Additional permissions are required to continue.';
        case 'interaction_required':
          return 'Please sign in again to continue.';
        case 'token_renewal_error':
        case 'invalid_grant':
          return 'Your session has expired. Please sign in again.';
        case 'popup_window_error':
          return 'Please allow popups for this site and try again.';
        case 'network_error':
        case 'endpoints_resolution_error':
          return 'Network error. Please check your connection and try again.';
        default:
          return 'An error occurred during authentication. Please try again.';
      }
    }
    
    return 'An unexpected error occurred. Please try again.';
  };
  
  const message = getUserMessage(error);
  
  return (
    <div className="error-message" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry}>Try Again</button>
      )}
      {import.meta.env.DEV && (
        <details>
          <summary>Error Details (Dev Only)</summary>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
```

### Usage

```tsx
function LoginPage() {
  const { instance } = useMsal();
  const [error, setError] = useState<Error | null>(null);
  
  const handleLogin = async () => {
    try {
      setError(null);
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      setError(err as Error);
    }
  };
  
  return (
    <div>
      <button onClick={handleLogin}>Sign In</button>
      {error && (
        <ErrorMessage error={error} onRetry={handleLogin} />
      )}
    </div>
  );
}
```

---

## Telemetry Integration

### Error Tracking

```tsx
// src/utils/errorTracking.ts
import { AuthError } from '@azure/msal-browser';

export function trackAuthError(error: Error | AuthError) {
  // Send to your error tracking service (Sentry, AppInsights, etc.)
  
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };
  
  if ('errorCode' in error) {
    Object.assign(errorData, {
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      subError: error.subError,
      correlationId: (error as any).correlationId,
    });
  }
  
  // Example: Sentry
  // Sentry.captureException(error, { extra: errorData });
  
  // Example: Application Insights
  // appInsights.trackException({ exception: error, properties: errorData });
  
  console.error('Auth error tracked:', errorData);
}
```

### Usage in Event Handler

```tsx
function AuthEventHandler() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const callbackId = instance.addEventCallback((event) => {
      if (event.error) {
        trackAuthError(event.error);
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

## Recovery Patterns

### Pattern 1: Auto-Retry on Network Error

```tsx
async function acquireTokenWithAutoRetry(scopes: string[]) {
  const { instance, accounts } = useMsal();
  
  try {
    return await retryWithBackoff(async () => {
      const response = await instance.acquireTokenSilent({
        scopes,
        account: accounts[0],
      });
      
      return response.accessToken;
    });
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // User interaction needed, don't auto-retry
      const response = await instance.acquireTokenPopup({
        scopes,
        account: accounts[0],
      });
      
      return response.accessToken;
    }
    
    throw error;
  }
}
```

### Pattern 2: Graceful Degradation

```tsx
function ProtectedFeature() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<Error | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  
  const fetchData = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setData(await response.json());
    } catch (err) {
      setError(err as Error);
      
      // Enable fallback mode (cached data, limited features, etc.)
      setFallbackMode(true);
    }
  };
  
  if (fallbackMode) {
    return (
      <div>
        <p>Running in offline mode with limited features</p>
        <CachedDataView />
      </div>
    );
  }
  
  return <DataView data={data} />;
}
```

### Pattern 3: Error Boundary

```tsx
// src/components/AuthErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { AuthError } from '@azure/msal-browser';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error) {
    if ('errorCode' in error) {
      trackAuthError(error as AuthError);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h2>Authentication Error</h2>
          <ErrorMessage 
            error={this.state.error!} 
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Usage

```tsx
function App() {
  return (
    <AuthErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <YourApp />
      </MsalProvider>
    </AuthErrorBoundary>
  );
}
```

---

## Debugging Errors

### Enable Verbose Logging

```ts
// msalConfig.ts
export const msalConfig: Configuration = {
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        console.log(`[MSAL][${LogLevel[level]}] ${message}`);
      },
      logLevel: LogLevel.Verbose, // Enable in development
      piiLoggingEnabled: false,
    },
  },
};
```

### Error Details Component

```tsx
function ErrorDetails({ error }: { error: AuthError }) {
  if (!import.meta.env.DEV) {
    return null;
  }
  
  return (
    <details className="error-details">
      <summary>Error Details (Dev Only)</summary>
      <dl>
        <dt>Error Code:</dt>
        <dd>{error.errorCode}</dd>
        
        <dt>Error Message:</dt>
        <dd>{error.errorMessage}</dd>
        
        <dt>Sub Error:</dt>
        <dd>{error.subError || 'N/A'}</dd>
        
        <dt>Correlation ID:</dt>
        <dd>{(error as any).correlationId || 'N/A'}</dd>
        
        <dt>Stack Trace:</dt>
        <dd><pre>{error.stack}</pre></dd>
      </dl>
    </details>
  );
}
```

---

## Common Issues & Solutions

### Issue: "Popup blocked"

**Solution:**
```tsx
// Fallback to redirect flow
try {
  await instance.loginPopup(loginRequest);
} catch (error) {
  if ((error as any).errorCode === 'popup_window_error') {
    instance.loginRedirect(loginRequest);
  }
}
```

### Issue: "Token renewal error"

**Solution:**
```tsx
// Trigger interactive flow
try {
  await instance.acquireTokenSilent({ scopes, account });
} catch (error) {
  if (error instanceof InteractionRequiredAuthError) {
    await instance.acquireTokenPopup({ scopes, account });
  }
}
```

### Issue: "Network error"

**Solution:**
```tsx
// Retry with exponential backoff
await retryWithBackoff(async () => {
  return await instance.acquireTokenSilent({ scopes, account });
});
```

### Issue: "Invalid grant"

**Solution:**
```tsx
// Refresh token expired, redirect to login
if ((error as any).errorCode === 'invalid_grant') {
  instance.loginRedirect(loginRequest);
}
```

---

## Best Practices

### ✅ Do

- Handle errors at appropriate boundaries (component, API, global)
- Provide user-friendly error messages
- Implement retry logic with backoff
- Track errors for monitoring
- Test error scenarios
- Fallback to redirect if popup fails
- Log errors in development

### ❌ Don't

- Show technical error messages to users
- Retry indefinitely
- Ignore error types
- Forget to handle interaction required
- Expose sensitive error details in production
- Retry on user cancellation

---

**← Back to:** [Session & Storage](./07-session-and-storage.md)  
**Next:** [Testing](./09-testing.md) →

