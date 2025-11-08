/**
 * useAccessToken Hook Example
 * 
 * Custom hook for acquiring access tokens with automatic fallback handling.
 * Copy this file and customize the TODO sections for your application.
 */

import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

/**
 * Hook for acquiring access tokens
 * 
 * Features:
 * - Silent acquisition first (uses cache/refresh token)
 * - Automatic fallback to interactive flow
 * - Error handling with retry logic
 * - TypeScript support
 * 
 * @param scopes - Array of scopes to request
 * @returns Function that returns access token
 */
export function useAccessToken(scopes: string[]) {
  const { instance, accounts } = useMsal();
  
  return useCallback(async (): Promise<string> => {
    const account = accounts[0];
    
    // Check if user is authenticated
    if (!account) {
      throw new Error('No active account. Please sign in.');
    }
    
    try {
      // Step 1: Try silent token acquisition (uses cache or refresh token)
      const response = await instance.acquireTokenSilent({
        scopes,
        account,
        forceRefresh: false, // TODO: Set to true to bypass cache
      });
      
      console.log('[Token] Acquired silently for scopes:', scopes);
      
      // TODO: Track successful token acquisition
      // analytics.track('token.acquired.silent', { scopes });
      
      return response.accessToken;
    } catch (error) {
      // Step 2: Handle interaction required error
      if (error instanceof InteractionRequiredAuthError) {
        console.log('[Token] Interaction required, triggering popup...');
        
        try {
          // Fallback to interactive flow (popup)
          const response = await instance.acquireTokenPopup({
            scopes,
            account,
          });
          
          console.log('[Token] Acquired via popup for scopes:', scopes);
          
          // TODO: Track interactive token acquisition
          // analytics.track('token.acquired.interactive', { scopes });
          
          return response.accessToken;
        } catch (popupError) {
          console.error('[Token] Popup acquisition failed:', popupError);
          
          // TODO: Check if popup was blocked
          if ((popupError as any).errorCode === 'popup_window_error') {
            console.log('[Token] Popup blocked, falling back to redirect...');
            
            // Last resort: Redirect flow
            await instance.acquireTokenRedirect({
              scopes,
              account,
            });
            
            // This will never return (page redirects)
            throw new Error('Redirecting for authentication...');
          }
          
          throw popupError;
        }
      }
      
      // Other errors (network, configuration, etc.)
      console.error('[Token] Acquisition failed:', error);
      
      // TODO: Track token acquisition failure
      // analytics.track('token.acquisition.failed', {
      //   error: (error as any).errorCode,
      //   scopes,
      // });
      
      throw error;
    }
  }, [instance, accounts, scopes]);
}

/**
 * Advanced: useAccessToken with Retry Logic
 * 
 * TODO: Use this version if you need automatic retries
 */
export function useAccessTokenWithRetry(
  scopes: string[],
  maxRetries = 3,
  retryDelay = 1000
) {
  const { instance, accounts } = useMsal();
  
  return useCallback(async (): Promise<string> => {
    const account = accounts[0];
    
    if (!account) {
      throw new Error('No active account');
    }
    
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await instance.acquireTokenSilent({
          scopes,
          account,
        });
        
        return response.accessToken;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on interaction required or user cancellation
        if (
          error instanceof InteractionRequiredAuthError ||
          (error as any).errorCode === 'user_cancelled'
        ) {
          // Trigger interactive flow
          const response = await instance.acquireTokenPopup({
            scopes,
            account,
          });
          
          return response.accessToken;
        }
        
        // Retry with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`[Token] Retry attempt ${attempt + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }, [instance, accounts, scopes, maxRetries, retryDelay]);
}

/**
 * Advanced: useAccessToken with Caching
 * 
 * TODO: Use this version if you need additional caching layer
 * (MSAL already caches tokens, this is for additional app-level caching)
 */
const tokenCache = new Map<string, { token: string; expiry: number }>();

export function useAccessTokenWithCache(scopes: string[]) {
  const { instance, accounts } = useMsal();
  
  return useCallback(async (): Promise<string> => {
    const cacheKey = scopes.join(',');
    
    // Check app-level cache
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log('[Token] Using app-level cached token');
      return cached.token;
    }
    
    const account = accounts[0];
    if (!account) {
      throw new Error('No active account');
    }
    
    try {
      const response = await instance.acquireTokenSilent({
        scopes,
        account,
      });
      
      // Cache token (expire 5 minutes before actual expiry for safety)
      const expiryTime = response.expiresOn 
        ? response.expiresOn.getTime() - (5 * 60 * 1000)
        : Date.now() + (55 * 60 * 1000);
      
      tokenCache.set(cacheKey, {
        token: response.accessToken,
        expiry: expiryTime,
      });
      
      return response.accessToken;
    } catch (error) {
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

/**
 * Advanced: useAccessToken for Multiple Scopes
 * 
 * TODO: Use this version if you need to acquire tokens for multiple scope sets
 */
export function useMultiScopeTokens(scopeSets: string[][]) {
  const { instance, accounts } = useMsal();
  
  return useCallback(async (): Promise<Map<string, string>> => {
    const account = accounts[0];
    if (!account) {
      throw new Error('No active account');
    }
    
    const tokens = new Map<string, string>();
    
    for (const scopes of scopeSets) {
      try {
        const response = await instance.acquireTokenSilent({
          scopes,
          account,
        });
        
        const key = scopes.join(',');
        tokens.set(key, response.accessToken);
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          const response = await instance.acquireTokenPopup({
            scopes,
            account,
          });
          
          const key = scopes.join(',');
          tokens.set(key, response.accessToken);
        } else {
          console.error(`[Token] Failed to acquire token for scopes: ${scopes.join(', ')}`);
        }
      }
    }
    
    return tokens;
  }, [instance, accounts, scopeSets]);
}

/**
 * Usage Examples:
 * 
 * // Basic usage
 * const getToken = useAccessToken(['api://my-api/read']);
 * const token = await getToken();
 * 
 * // With retry logic
 * const getToken = useAccessTokenWithRetry(['api://my-api/read'], 3, 1000);
 * const token = await getToken();
 * 
 * // With caching
 * const getToken = useAccessTokenWithCache(['api://my-api/read']);
 * const token = await getToken();
 * 
 * // Multiple scopes
 * const getTokens = useMultiScopeTokens([
 *   ['api://my-api/read'],
 *   ['api://my-api/write'],
 * ]);
 * const tokens = await getTokens();
 * const readToken = tokens.get('api://my-api/read');
 */

/**
 * Helper: Clear app-level token cache
 * 
 * TODO: Call this on logout or when needed
 */
export function clearTokenCache() {
  tokenCache.clear();
  console.log('[Token] App-level cache cleared');
}

