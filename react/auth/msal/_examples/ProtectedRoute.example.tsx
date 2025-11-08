/**
 * ProtectedRoute Component Example
 * 
 * Demonstrates route protection with authentication and authorization.
 * Copy this file and customize the TODO sections for your application.
 */

import React from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Navigate, useLocation } from 'react-router-dom';
import { loginRequest } from './msalConfig.example';

/**
 * Loading Spinner Component
 * TODO: Replace with your application's loading component
 */
function LoadingSpinner() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Loading...</div>
    </div>
  );
}

/**
 * Access Denied Component
 * TODO: Customize for your application's design
 */
interface AccessDeniedProps {
  requiredRoles?: string[];
  message?: string;
}

function AccessDenied({ requiredRoles, message }: AccessDeniedProps) {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Access Denied</h2>
      <p>
        {message || 'You don\'t have permission to access this page.'}
      </p>
      {requiredRoles && requiredRoles.length > 0 && (
        <p>
          Required roles: {requiredRoles.join(', ')}
        </p>
      )}
      <a href="/dashboard">Back to Dashboard</a>
    </div>
  );
}

/**
 * Protected Route Component
 * 
 * Features:
 * - Authentication check
 * - Role-based authorization
 * - Loading states
 * - Return URL preservation
 * - Silent SSO attempt
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRoles?: string[];
  requireAllRoles?: boolean;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requireRoles = [],
  requireAllRoles = false,
  fallback,
}: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress, accounts } = useMsal();
  const location = useLocation();
  
  // Show loading while authentication is in progress
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    
    // TODO: Customize login redirect behavior
    instance.loginRedirect({
      ...loginRequest,
      state: { returnTo },
    });
    
    // Show loading while redirecting
    return <LoadingSpinner />;
  }
  
  // Check role-based authorization
  if (requireRoles.length > 0) {
    const account = accounts[0];
    const userRoles = account?.idTokenClaims?.roles || [];
    
    const hasRequiredRole = requireAllRoles
      ? requireRoles.every(role => userRoles.includes(role))
      : requireRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      // TODO: Track unauthorized access attempts
      // analytics.track('auth.access.denied', {
      //   requiredRoles,
      //   userRoles,
      //   path: location.pathname,
      // });
      
      return fallback || <AccessDenied requiredRoles={requireRoles} />;
    }
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
}

/**
 * Advanced: Protected Route with Silent SSO
 * 
 * Attempts silent SSO before redirecting to interactive login.
 * TODO: Use this version for better UX
 */
export function ProtectedRouteWithSSO({
  children,
  requireRoles = [],
  fallback,
}: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress, accounts } = useMsal();
  const location = useLocation();
  const [attemptedSSO, setAttemptedSSO] = React.useState(false);
  
  // Attempt silent SSO
  React.useEffect(() => {
    const attemptSilentLogin = async () => {
      if (!isAuthenticated && !attemptedSSO && inProgress === InteractionStatus.None) {
        setAttemptedSSO(true);
        
        try {
          await instance.ssoSilent({
            scopes: ['openid', 'profile'],
          });
          console.log('[Auth] Silent SSO successful');
        } catch (error) {
          console.log('[Auth] Silent SSO failed, will redirect to login');
          
          // Silent SSO failed, trigger interactive login
          const returnTo = `${location.pathname}${location.search}`;
          instance.loginRedirect({
            ...loginRequest,
            state: { returnTo },
          });
        }
      }
    };
    
    attemptSilentLogin();
  }, [isAuthenticated, attemptedSSO, inProgress, instance, location]);
  
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }
  
  // Check roles
  if (requireRoles.length > 0) {
    const userRoles = accounts[0]?.idTokenClaims?.roles || [];
    const hasRequiredRole = requireRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return fallback || <AccessDenied requiredRoles={requireRoles} />;
    }
  }
  
  return <>{children}</>;
}

/**
 * Advanced: Protected Route with Redirect to Login Page
 * 
 * Redirects to a login page instead of triggering MSAL redirect.
 * TODO: Use this if you have a custom login page
 */
export function ProtectedRouteWithLoginPage({
  children,
  requireRoles = [],
  loginPath = '/login',
}: ProtectedRouteProps & { loginPath?: string }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, accounts } = useMsal();
  const location = useLocation();
  
  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  
  // Check roles
  if (requireRoles && requireRoles.length > 0) {
    const userRoles = accounts[0]?.idTokenClaims?.roles || [];
    const hasRequiredRole = requireRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return <AccessDenied requiredRoles={requireRoles} />;
    }
  }
  
  return <>{children}</>;
}

/**
 * Usage Examples:
 * 
 * // Basic protected route
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * // Protected route with role requirement
 * <Route
 *   path="/admin"
 *   element={
 *     <ProtectedRoute requireRoles={['Admin']}>
 *       <AdminPanel />
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * // Protected route with multiple roles (any)
 * <Route
 *   path="/moderation"
 *   element={
 *     <ProtectedRoute requireRoles={['Admin', 'Moderator']}>
 *       <ModerationPanel />
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * // Protected route with multiple roles (all required)
 * <Route
 *   path="/super-admin"
 *   element={
 *     <ProtectedRoute requireRoles={['Admin', 'SuperUser']} requireAllRoles>
 *       <SuperAdminPanel />
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * // Protected route with custom fallback
 * <Route
 *   path="/premium"
 *   element={
 *     <ProtectedRoute
 *       requireRoles={['Premium']}
 *       fallback={<UpgradeToPremium />}
 *     >
 *       <PremiumFeatures />
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * // With silent SSO
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRouteWithSSO>
 *       <Dashboard />
 *     </ProtectedRouteWithSSO>
 *   }
 * />
 * 
 * // With login page redirect
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRouteWithLoginPage loginPath="/login">
 *       <Dashboard />
 *     </ProtectedRouteWithLoginPage>
 *   }
 * />
 */

/**
 * Helper: Role Guard Component
 * 
 * Use this for protecting specific features within a page.
 * TODO: Use this for fine-grained authorization
 */
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
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * RoleGuard Usage Example:
 * 
 * function Dashboard() {
 *   return (
 *     <div>
 *       <h1>Dashboard</h1>
 *       
 *       <RoleGuard allowedRoles={['Admin']}>
 *         <AdminPanel />
 *       </RoleGuard>
 *       
 *       <RoleGuard 
 *         allowedRoles={['Admin', 'Moderator']}
 *         fallback={<p>You need moderator access to see this</p>}
 *       >
 *         <ModerationTools />
 *       </RoleGuard>
 *     </div>
 *   );
 * }
 */

