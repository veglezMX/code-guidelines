/**
 * Dev Login Route Example
 * 
 * ⚠️ CRITICAL: Only enable in test builds, NEVER in production!
 * 
 * This component provides a dev login route for E2E testing without calling live Azure AD.
 * Copy this file and customize the TODO sections for your application.
 */

import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

/**
 * Dev Login Component
 * 
 * Provides buttons to login as different user roles for testing.
 * 
 * Security Notes:
 * - Only available when MODE=test
 * - Sets dev token in sessionStorage
 * - Backend must validate dev tokens only in test mode
 */
export function DevLogin() {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // ⚠️ CRITICAL: Only available in test mode
  if (import.meta.env.MODE !== 'test') {
    console.warn('[DevLogin] Attempted to access dev login in non-test mode');
    return <Navigate to="/" replace />;
  }
  
  /**
   * Handle dev login
   * 
   * TODO: Customize roles and claims for your application
   */
  const handleDevLogin = async (role: string) => {
    setIsLoggingIn(true);
    
    // Create dev token with user claims
    const devToken = {
      accessToken: `dev-token-${role}-${Date.now()}`,
      idToken: {
        name: `Test ${role}`,
        email: `test-${role.toLowerCase()}@example.com`,
        preferred_username: `test-${role.toLowerCase()}@example.com`,
        roles: [role],
        // TODO: Add custom claims for your application
        // department: 'Engineering',
        // permissions: ['read', 'write'],
      },
      account: {
        homeAccountId: `dev-${role}-${Date.now()}`,
        username: `test-${role.toLowerCase()}@example.com`,
        name: `Test ${role}`,
        localAccountId: `dev-local-${role}`,
      },
      expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
    
    // Store dev token in sessionStorage
    sessionStorage.setItem('msal.dev.token', JSON.stringify(devToken));
    sessionStorage.setItem('msal.dev.mode', 'true');
    
    console.log('[DevLogin] Logged in as:', role);
    
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // TODO: Customize redirect path
    navigate('/dashboard');
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Dev Login (Test Only)</h2>
        <p style={styles.warning}>
          ⚠️ This login method is for testing only
        </p>
        
        <div style={styles.buttonGroup}>
          {/* TODO: Add/remove roles based on your application */}
          <button
            onClick={() => handleDevLogin('User')}
            disabled={isLoggingIn}
            style={styles.button}
          >
            Login as User
          </button>
          
          <button
            onClick={() => handleDevLogin('Admin')}
            disabled={isLoggingIn}
            style={styles.button}
          >
            Login as Admin
          </button>
          
          <button
            onClick={() => handleDevLogin('Moderator')}
            disabled={isLoggingIn}
            style={styles.button}
          >
            Login as Moderator
          </button>
          
          <button
            onClick={() => handleDevLogin('Reader')}
            disabled={isLoggingIn}
            style={styles.button}
          >
            Login as Reader
          </button>
        </div>
        
        {isLoggingIn && (
          <p style={styles.loading}>Logging in...</p>
        )}
        
        <details style={styles.details}>
          <summary>How it works</summary>
          <ul style={styles.list}>
            <li>Creates a dev token with specified role</li>
            <li>Stores token in sessionStorage</li>
            <li>Backend validates dev tokens only in test mode</li>
            <li>Never enabled in production builds</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

/**
 * Helper: Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return sessionStorage.getItem('msal.dev.mode') === 'true';
}

/**
 * Helper: Get dev token
 */
export function getDevToken(): any | null {
  const tokenStr = sessionStorage.getItem('msal.dev.token');
  if (!tokenStr) return null;
  
  try {
    return JSON.parse(tokenStr);
  } catch {
    return null;
  }
}

/**
 * Helper: Clear dev token
 */
export function clearDevToken() {
  sessionStorage.removeItem('msal.dev.token');
  sessionStorage.removeItem('msal.dev.mode');
  console.log('[DevLogin] Dev token cleared');
}

/**
 * Hook: useDevAuth
 * 
 * Provides dev authentication state and methods.
 * TODO: Use this in your auth provider for test mode
 */
export function useDevAuth() {
  const [devToken, setDevToken] = React.useState(getDevToken());
  
  React.useEffect(() => {
    const handleStorageChange = () => {
      setDevToken(getDevToken());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  return {
    isDevMode: isDevMode(),
    devToken,
    isAuthenticated: devToken !== null,
    account: devToken?.account || null,
    claims: devToken?.idToken || null,
    logout: clearDevToken,
  };
}

/**
 * Styles
 * TODO: Replace with your application's styling
 */
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  warning: {
    color: '#ff6b6b',
    fontSize: '14px',
    margin: '0 0 20px 0',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#0078d4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  loading: {
    textAlign: 'center' as const,
    marginTop: '20px',
    color: '#666',
  },
  details: {
    marginTop: '20px',
    fontSize: '14px',
  },
  list: {
    marginTop: '10px',
    paddingLeft: '20px',
    color: '#666',
  },
};

/**
 * Usage in Routes:
 * 
 * // src/App.tsx
 * import { DevLogin } from './examples/dev-login/DevLoginRoute.example';
 * 
 * function App() {
 *   return (
 *     <Routes>
 *       {import.meta.env.MODE === 'test' && (
 *         <Route path="/dev-login" element={<DevLogin />} />
 *       )}
 *       
 *       <Route path="/dashboard" element={<Dashboard />} />
 *     </Routes>
 *   );
 * }
 */

/**
 * Usage in Auth Provider:
 * 
 * // src/providers/AuthProvider.tsx
 * import { useDevAuth, isDevMode } from './examples/dev-login/DevLoginRoute.example';
 * 
 * export function AuthProvider({ children }) {
 *   const devAuth = useDevAuth();
 *   
 *   if (isDevMode()) {
 *     // Use dev auth in test mode
 *     return (
 *       <DevAuthContext.Provider value={devAuth}>
 *         {children}
 *       </DevAuthContext.Provider>
 *     );
 *   }
 *   
 *   // Use real MSAL in non-test mode
 *   return (
 *     <MsalProvider instance={msalInstance}>
 *       {children}
 *     </MsalProvider>
 *   );
 * }
 */

