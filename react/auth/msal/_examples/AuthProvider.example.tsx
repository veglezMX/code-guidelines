/**
 * AuthProvider Example
 * 
 * Demonstrates how to set up MSAL Provider with event handling and error boundaries.
 * Copy this file and customize the TODO sections for your application.
 */

import React, { useEffect } from 'react';
import { MsalProvider, useMsal } from '@azure/msal-react';
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
  AuthError,
} from '@azure/msal-browser';
import { msalConfig } from './msalConfig.example';

// Create MSAL instance (singleton)
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL before rendering
await msalInstance.initialize();

/**
 * Auth Event Handler Component
 * 
 * Listens to MSAL events and handles them appropriately.
 * TODO: Integrate with your telemetry/analytics service
 */
function AuthEventHandler() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const callbackId = instance.addEventCallback((event: EventMessage) => {
      const { eventType, payload, error } = event;
      
      switch (eventType) {
        case EventType.LOGIN_START:
          console.log('[Auth] Login started');
          // TODO: Show loading indicator
          break;
          
        case EventType.LOGIN_SUCCESS:
          console.log('[Auth] Login successful', payload);
          // TODO: Track successful login
          // analytics.track('auth.login.success', {
          //   method: event.interactionType,
          //   timestamp: event.timestamp,
          // });
          
          // TODO: Fetch user preferences, initialize app state
          break;
          
        case EventType.LOGIN_FAILURE:
          console.error('[Auth] Login failed', error);
          // TODO: Track login failure
          // analytics.track('auth.login.failure', {
          //   error: error?.errorCode,
          //   message: error?.errorMessage,
          // });
          
          // TODO: Show user-friendly error message
          break;
          
        case EventType.LOGOUT_START:
          console.log('[Auth] Logout started');
          // TODO: Clear application state
          break;
          
        case EventType.LOGOUT_SUCCESS:
          console.log('[Auth] Logout successful');
          // TODO: Track logout
          // analytics.track('auth.logout.success');
          
          // TODO: Clear local storage, reset app state
          break;
          
        case EventType.LOGOUT_FAILURE:
          console.error('[Auth] Logout failed', error);
          // TODO: Track logout failure
          break;
          
        case EventType.ACQUIRE_TOKEN_START:
          console.log('[Auth] Token acquisition started');
          break;
          
        case EventType.ACQUIRE_TOKEN_SUCCESS:
          console.log('[Auth] Token acquired successfully');
          // TODO: Track token acquisition
          // analytics.track('auth.token.acquired', {
          //   scopes: (payload as AuthenticationResult)?.scopes,
          // });
          break;
          
        case EventType.ACQUIRE_TOKEN_FAILURE:
          console.error('[Auth] Token acquisition failed', error);
          // TODO: Track token failure
          // errorTracking.captureException(error, {
          //   context: 'token_acquisition',
          // });
          
          // TODO: Handle specific errors
          if (error?.errorCode === 'interaction_required') {
            // User interaction needed
          }
          break;
          
        case EventType.SSO_SILENT_START:
          console.log('[Auth] Silent SSO started');
          break;
          
        case EventType.SSO_SILENT_SUCCESS:
          console.log('[Auth] Silent SSO successful');
          // TODO: Track silent SSO success
          break;
          
        case EventType.SSO_SILENT_FAILURE:
          console.log('[Auth] Silent SSO failed (expected if no session)');
          break;
          
        case EventType.HANDLE_REDIRECT_START:
          console.log('[Auth] Handling redirect...');
          break;
          
        case EventType.HANDLE_REDIRECT_END:
          console.log('[Auth] Redirect handled');
          break;
      }
      
      // TODO: Send all errors to error tracking service
      if (error) {
        // errorTracking.captureException(error, {
        //   eventType,
        //   interactionType: event.interactionType,
        //   timestamp: event.timestamp,
        // });
      }
    });
    
    // Cleanup: Remove event callback on unmount
    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance]);
  
  return null;
}

/**
 * Auth Error Boundary
 * 
 * Catches authentication errors and provides fallback UI.
 * TODO: Customize error UI for your application
 */
interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Auth] Error boundary caught error:', error, errorInfo);
    
    // TODO: Send to error tracking service
    // errorTracking.captureException(error, {
    //   componentStack: errorInfo.componentStack,
    // });
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/login';
  };
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Authentication Error</h2>
          <p>An error occurred during authentication.</p>
          {import.meta.env.DEV && (
            <details>
              <summary>Error Details (Dev Only)</summary>
              <pre>{this.state.error?.message}</pre>
              <pre>{this.state.error?.stack}</pre>
            </details>
          )}
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

/**
 * Auth Provider Component
 * 
 * Main provider that wraps your application.
 * Includes event handling and error boundary.
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <AuthEventHandler />
        {children}
      </MsalProvider>
    </AuthErrorBoundary>
  );
}

/**
 * Export MSAL instance for use outside React components
 * (e.g., in API interceptors)
 */
export { msalInstance };

/**
 * Usage Example:
 * 
 * // src/main.tsx
 * import { AuthProvider } from './AuthProvider.example';
 * import App from './App';
 * 
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <AuthProvider>
 *       <App />
 *     </AuthProvider>
 *   </React.StrictMode>
 * );
 */

/**
 * Advanced: Custom Event Handler Hook
 * 
 * TODO: Use this hook in components that need to react to auth events
 */
export function useAuthEvents(
  onLoginSuccess?: (result: AuthenticationResult) => void,
  onLoginFailure?: (error: AuthError) => void,
  onLogout?: () => void
) {
  const { instance } = useMsal();
  
  useEffect(() => {
    const callbackId = instance.addEventCallback((event: EventMessage) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && onLoginSuccess) {
        onLoginSuccess(event.payload as AuthenticationResult);
      }
      
      if (event.eventType === EventType.LOGIN_FAILURE && onLoginFailure && event.error) {
        onLoginFailure(event.error as AuthError);
      }
      
      if (event.eventType === EventType.LOGOUT_SUCCESS && onLogout) {
        onLogout();
      }
    });
    
    return () => {
      if (callbackId) instance.removeEventCallback(callbackId);
    };
  }, [instance, onLoginSuccess, onLoginFailure, onLogout]);
}

/**
 * Advanced: Preload Tokens Hook
 * 
 * Preloads tokens for known scopes after login to improve performance.
 * TODO: Add your application's scopes
 */
export function usePreloadTokens() {
  const { instance, accounts } = useMsal();
  
  useEffect(() => {
    const preloadTokens = async () => {
      if (accounts.length === 0) return;
      
      const account = accounts[0];
      
      // TODO: Add your application's scopes
      const scopeSets = [
        ['api://your-api/read'],
        ['api://your-api/write'],
        // Add more scope sets as needed
      ];
      
      for (const scopes of scopeSets) {
        try {
          await instance.acquireTokenSilent({ scopes, account });
          console.log(`[Auth] Preloaded token for scopes: ${scopes.join(', ')}`);
        } catch (error) {
          console.warn(`[Auth] Failed to preload token for scopes: ${scopes.join(', ')}`);
        }
      }
    };
    
    preloadTokens();
  }, [instance, accounts]);
}

