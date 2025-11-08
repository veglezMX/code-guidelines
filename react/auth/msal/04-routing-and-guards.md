# Routing & Guards — MSAL for React

**Goal:** Protect routes and handle authentication flows in React Router applications.

---

## ProtectedRoute Component

### Basic Implementation

```tsx
// src/components/ProtectedRoute.tsx
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Navigate, useLocation } from 'react-router-dom';
import { loginRequest } from '../config/msalConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, instance } = useMsal();
  const location = useLocation();
  
  // Show loading while authentication is in progress
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    instance.loginRedirect({
      ...loginRequest,
      state: { returnTo: location.pathname },
    });
    
    return <LoadingSpinner />;
  }
  
  // User is authenticated, render children
  return <>{children}</>;
}
```

### Usage with React Router

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Silent First, Interactive Fallback

### The Rule

**Always try silent authentication before interactive:**

1. Check if user is already authenticated (cache)
2. If not, try silent SSO (existing session)
3. If silent fails, trigger interactive login

### Implementation

```tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();
  const [attemptedSilent, setAttemptedSilent] = useState(false);
  
  useEffect(() => {
    const attemptSilentLogin = async () => {
      if (!isAuthenticated && !attemptedSilent && inProgress === InteractionStatus.None) {
        setAttemptedSilent(true);
        
        try {
          // Try silent SSO first
          await instance.ssoSilent({
            scopes: ['openid', 'profile'],
          });
        } catch (error) {
          // Silent failed, trigger interactive
          instance.loginRedirect(loginRequest);
        }
      }
    };
    
    attemptSilentLogin();
  }, [isAuthenticated, attemptedSilent, inProgress, instance]);
  
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

---

## React Router Loaders

### Loader with Authentication Check

```tsx
// src/loaders/dashboardLoader.ts
import { redirect } from 'react-router-dom';
import { msalInstance } from '../config/msalConfig';

export async function dashboardLoader() {
  const accounts = msalInstance.getAllAccounts();
  
  if (accounts.length === 0) {
    // Not authenticated, redirect to login
    return redirect('/login');
  }
  
  // Fetch dashboard data with token
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: ['api://my-api/read'],
      account: accounts[0],
    });
    
    const data = await fetch('/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${response.accessToken}`,
      },
    });
    
    return data.json();
  } catch (error) {
    // Handle error
    throw new Response('Failed to load dashboard', { status: 500 });
  }
}
```

### Usage in Routes

```tsx
import { dashboardLoader } from './loaders/dashboardLoader';

<Route
  path="/dashboard"
  element={<Dashboard />}
  loader={dashboardLoader}
/>
```

---

## UX Patterns

### Pattern 1: Redirect to Login Page

**When to use:** Traditional login flow, separate login page

```tsx
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Redirect to login page, save return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}
```

```tsx
// Login page handles redirect
function LoginPage() {
  const { instance } = useMsal();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  
  const handleLogin = () => {
    instance.loginRedirect({
      ...loginRequest,
      state: { returnTo: from },
    });
  };
  
  return <button onClick={handleLogin}>Sign In</button>;
}
```

### Pattern 2: In-Place Login

**When to use:** Embedded auth, no separate login page

```tsx
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  
  if (!isAuthenticated) {
    return (
      <div className="login-prompt">
        <h2>Authentication Required</h2>
        <p>Please sign in to access this page</p>
        <button onClick={() => instance.loginRedirect(loginRequest)}>
          Sign In
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

### Pattern 3: Modal Login

**When to use:** Preserve context, wizard flows

```tsx
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);
  
  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      setShowLoginModal(false);
    } catch (error) {
      console.error('Login failed', error);
    }
  };
  
  return (
    <>
      {children}
      {showLoginModal && (
        <Modal onClose={() => setShowLoginModal(false)}>
          <h2>Sign In Required</h2>
          <button onClick={handleLogin}>Sign In</button>
        </Modal>
      )}
    </>
  );
}
```

---

## Handling Deep Links

### Save and Restore Return URL

```tsx
// After successful login, redirect to original destination
function AuthCallback() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleRedirect = async () => {
      const response = await instance.handleRedirectPromise();
      
      if (response) {
        // Get return URL from state
        const returnTo = response.state?.returnTo || '/dashboard';
        navigate(returnTo, { replace: true });
      }
    };
    
    handleRedirect();
  }, [instance, navigate]);
  
  return <LoadingSpinner />;
}
```

### Preserve Query Parameters

```tsx
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const { instance } = useMsal();
  
  if (!isAuthenticated) {
    // Save full path including query params
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    
    instance.loginRedirect({
      ...loginRequest,
      state: { returnTo },
    });
    
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

---

## Multi-Step Authentication

### Step 1: Basic Auth

```tsx
function ProtectedRoute({ children, requireMfa = false }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Check if MFA is required and completed
  if (requireMfa) {
    const hasMfa = accounts[0]?.idTokenClaims?.amr?.includes('mfa');
    
    if (!hasMfa) {
      return <Navigate to="/mfa-required" />;
    }
  }
  
  return <>{children}</>;
}
```

### Step 2: Additional Consent

```tsx
function ProtectedRoute({ children, requiredScopes }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [hasConsent, setHasConsent] = useState(false);
  
  useEffect(() => {
    const checkConsent = async () => {
      if (!isAuthenticated) return;
      
      try {
        await instance.acquireTokenSilent({
          scopes: requiredScopes,
          account: accounts[0],
        });
        
        setHasConsent(true);
      } catch (error) {
        // Need to request consent
        if (error instanceof InteractionRequiredAuthError) {
          instance.acquireTokenRedirect({
            scopes: requiredScopes,
            account: accounts[0],
            prompt: 'consent',
          });
        }
      }
    };
    
    checkConsent();
  }, [isAuthenticated, instance, accounts, requiredScopes]);
  
  if (!isAuthenticated || !hasConsent) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

---

## Role-Based Route Guards

### Guard with Role Check

```tsx
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { accounts } = useMsal();
  const userRoles = accounts[0]?.idTokenClaims?.roles || [];
  
  const hasAccess = allowedRoles.some(role => userRoles.includes(role));
  
  if (!hasAccess) {
    return fallback || <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

### Usage

```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <RoleGuard allowedRoles={['Admin']}>
        <AdminPanel />
      </RoleGuard>
    </ProtectedRoute>
  }
/>
```

---

## Anti-Patterns

### ❌ Don't Check Auth in Every Component

```tsx
// ❌ Bad: Checking auth in every component
function UserProfile() {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Component logic...
}

function Settings() {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Component logic...
}
```

```tsx
// ✅ Good: Check once at route level
<Route
  path="/dashboard/*"
  element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  <Route path="profile" element={<UserProfile />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

### ❌ Don't Mix Redirect and Popup

```tsx
// ❌ Bad: Inconsistent auth flows
function ProtectedRoute1() {
  instance.loginRedirect(loginRequest);
}

function ProtectedRoute2() {
  instance.loginPopup(loginRequest);
}
```

```tsx
// ✅ Good: Consistent flow throughout app
// Choose one: redirect OR popup, not both
```

### ❌ Don't Ignore Loading States

```tsx
// ❌ Bad: No loading indicator
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    instance.loginRedirect(loginRequest);
    return null; // Blank screen during redirect
  }
  
  return <>{children}</>;
}
```

```tsx
// ✅ Good: Show loading state
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    instance.loginRedirect(loginRequest);
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

---

## Complete Example

```tsx
// src/components/ProtectedRoute.tsx
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { useLocation } from 'react-router-dom';
import { loginRequest } from '../config/msalConfig';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requireRoles,
  fallback 
}: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress, accounts } = useMsal();
  const location = useLocation();
  
  // Show loading during auth operations
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    
    instance.loginRedirect({
      ...loginRequest,
      state: { returnTo },
    });
    
    return <LoadingSpinner />;
  }
  
  // Check roles if required
  if (requireRoles && requireRoles.length > 0) {
    const userRoles = accounts[0]?.idTokenClaims?.roles || [];
    const hasRequiredRole = requireRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return fallback || (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      );
    }
  }
  
  return <>{children}</>;
}
```

---

## Best Practices

### ✅ Do

- Use `ProtectedRoute` wrapper for all protected routes
- Try silent authentication before interactive
- Show loading states during auth operations
- Save return URL for redirect after login
- Check roles at route level, not in every component
- Use consistent auth flow (redirect OR popup)
- Handle deep links and query parameters

### ❌ Don't

- Check authentication in every component
- Mix redirect and popup flows
- Ignore loading states
- Forget to handle return URLs
- Trust client-side role checks for security
- Block UI without feedback during auth

---

**← Back to:** [Core Usage](./03-core-usage.md)  
**Next:** [Calling APIs](./05-calling-apis.md) →

