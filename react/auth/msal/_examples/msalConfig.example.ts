/**
 * MSAL Configuration Example
 * 
 * This file demonstrates a complete MSAL configuration for React applications.
 * Copy this file and customize the TODO sections for your application.
 * 
 * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
 */

import { Configuration, LogLevel } from '@azure/msal-browser';

// TODO: Validate required environment variables
const requiredEnvVars = [
  'VITE_MSAL_CLIENT_ID',
  'VITE_MSAL_TENANT_ID',
] as const;

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

/**
 * MSAL Configuration
 * 
 * Security Best Practices:
 * - Use sessionStorage for cache (most secure)
 * - Enable PKCE (automatic in MSAL v2+)
 * - Use HTTPS in production
 * - Never commit production credentials
 */
export const msalConfig: Configuration = {
  auth: {
    // TODO: Set your Azure AD application (client) ID
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID!,
    
    // TODO: Set your Azure AD tenant ID
    // Format: https://login.microsoftonline.com/{tenant-id}
    // For B2C: https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    
    // TODO: Set your redirect URI (must match Azure AD registration exactly)
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin + '/auth/callback',
    
    // TODO: Set post-logout redirect URI
    postLogoutRedirectUri: window.location.origin + '/login',
    
    // Navigate to original request URL after login
    navigateToLoginRequestUrl: true,
    
    // TODO: For B2C, add known authorities
    // knownAuthorities: ['yourtenant.b2clogin.com'],
  },
  
  cache: {
    // TODO: Choose cache location based on security requirements
    // Options: 'sessionStorage' (recommended), 'localStorage', 'memoryStorage'
    // sessionStorage: Cleared on tab close, most secure
    // localStorage: Persists across tabs, enables SSO
    // memoryStorage: No persistence, highest security
    cacheLocation: 'sessionStorage',
    
    // Set to true for IE11/Edge legacy support
    storeAuthStateInCookie: false,
  },
  
  system: {
    loggerOptions: {
      /**
       * Logger callback
       * 
       * TODO: Integrate with your logging service
       * Example: Send to Application Insights, Sentry, etc.
       */
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        // Never log PII (Personally Identifiable Information)
        if (containsPii) {
          return;
        }
        
        switch (level) {
          case LogLevel.Error:
            console.error(`[MSAL] ${message}`);
            // TODO: Send to error tracking service
            break;
          case LogLevel.Warning:
            console.warn(`[MSAL] ${message}`);
            break;
          case LogLevel.Info:
            console.info(`[MSAL] ${message}`);
            break;
          case LogLevel.Verbose:
            console.debug(`[MSAL] ${message}`);
            break;
        }
      },
      
      // TODO: Set appropriate log level per environment
      // Development: LogLevel.Verbose or LogLevel.Info
      // Production: LogLevel.Error or LogLevel.Warning
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      
      // NEVER enable in production (security risk)
      piiLoggingEnabled: false,
    },
    
    // Disable WAM Broker (Windows Account Manager)
    // Set to true if you want to use WAM on Windows
    allowNativeBroker: false,
    
    // TODO: Configure window options for popup flows
    // windowCreationTimeout: 60000,
    // iframeHashTimeout: 6000,
    // loadFrameTimeout: 0,
  },
};

/**
 * API Scopes
 * 
 * TODO: Define scopes for your APIs
 * Format: api://{app-id}/{scope-name}
 * 
 * Best Practice: Use least-privilege principle
 * Request minimal scopes needed for each feature
 */
export const apiScopes = Object.freeze({
  // TODO: Add your API scopes
  read: [import.meta.env.VITE_API_SCOPE_READ || 'api://YOUR-API-APP-ID/read'],
  write: [import.meta.env.VITE_API_SCOPE_WRITE || 'api://YOUR-API-APP-ID/write'],
  admin: [import.meta.env.VITE_API_SCOPE_ADMIN || 'api://YOUR-API-APP-ID/admin'],
  
  // Microsoft Graph scopes (if needed)
  graphUser: ['User.Read'],
  graphMail: ['Mail.Read'],
});

/**
 * Login Request
 * 
 * Default scopes requested during login
 * Keep this minimal - request additional scopes when needed
 */
export const loginRequest = {
  scopes: [
    'openid',    // Required for authentication
    'profile',   // User profile information
    'email',     // Email address
    // TODO: Add any additional scopes needed at login
  ],
  
  // TODO: Uncomment to force account selection
  // prompt: 'select_account',
  
  // TODO: Uncomment to force re-authentication
  // prompt: 'login',
};

/**
 * Silent Request
 * 
 * Used for silent token acquisition
 */
export const silentRequest = {
  scopes: ['openid', 'profile'],
  forceRefresh: false, // Set to true to bypass cache
};

/**
 * Environment-Specific Configuration
 * 
 * TODO: Adjust settings per environment
 */
export const environmentConfig = {
  development: {
    logLevel: LogLevel.Verbose,
    cacheLocation: 'sessionStorage' as const,
  },
  staging: {
    logLevel: LogLevel.Info,
    cacheLocation: 'sessionStorage' as const,
  },
  production: {
    logLevel: LogLevel.Error,
    cacheLocation: 'sessionStorage' as const,
  },
};

/**
 * Protected Resource Map
 * 
 * Maps API endpoints to required scopes
 * Useful for automatic scope selection in interceptors
 */
export const protectedResourceMap = new Map<string, string[]>([
  // TODO: Map your API endpoints to scopes
  ['/api/users', apiScopes.read],
  ['/api/users/*', apiScopes.write],
  ['/api/admin/*', apiScopes.admin],
  
  // Microsoft Graph
  ['https://graph.microsoft.com/v1.0/me', apiScopes.graphUser],
]);

/**
 * Usage Example:
 * 
 * import { msalConfig, loginRequest, apiScopes } from './msalConfig.example';
 * import { PublicClientApplication } from '@azure/msal-browser';
 * 
 * const msalInstance = new PublicClientApplication(msalConfig);
 * await msalInstance.initialize();
 * 
 * // Login
 * await msalInstance.loginRedirect(loginRequest);
 * 
 * // Acquire token
 * const response = await msalInstance.acquireTokenSilent({
 *   scopes: apiScopes.read,
 *   account: accounts[0],
 * });
 */

