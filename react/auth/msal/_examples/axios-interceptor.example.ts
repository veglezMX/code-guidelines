/**
 * Axios Interceptor Example
 * 
 * Demonstrates automatic Bearer token injection and 401 handling.
 * Copy this file and customize the TODO sections for your application.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { msalInstance } from './AuthProvider.example';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

/**
 * Create Axios Instance
 * TODO: Configure baseURL and timeout for your API
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token refresh queue
 * Prevents multiple simultaneous token refresh requests
 */
let tokenRefreshPromise: Promise<string> | null = null;

async function getAccessToken(scopes: string[]): Promise<string> {
  // If refresh is already in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  const accounts = msalInstance.getAllAccounts();
  
  if (accounts.length === 0) {
    throw new Error('No active account');
  }
  
  const account = accounts[0];
  
  // Start new token acquisition
  tokenRefreshPromise = (async () => {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account,
      });
      
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Trigger interactive flow
        const response = await msalInstance.acquireTokenPopup({
          scopes,
          account,
        });
        
        return response.accessToken;
      }
      
      throw error;
    } finally {
      // Clear promise after completion
      tokenRefreshPromise = null;
    }
  })();
  
  return tokenRefreshPromise;
}

/**
 * Request Interceptor
 * Adds Bearer token to all requests
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // TODO: Customize scope selection logic
    // Option 1: Use custom header to specify scopes
    const scopes = (config.headers['X-Scopes'] as string[]) || 
                   [import.meta.env.VITE_API_SCOPE || 'api://default/read'];
    
    // Option 2: Map endpoint to scopes
    // const scopes = getScopesForEndpoint(config.url);
    
    try {
      const token = await getAccessToken(scopes);
      
      // Add Bearer token to request
      config.headers.Authorization = `Bearer ${token}`;
      
      // Remove custom header
      delete config.headers['X-Scopes'];
      
      return config;
    } catch (error) {
      console.error('[API] Failed to acquire token:', error);
      
      // TODO: Handle token acquisition failure
      // Option 1: Throw error
      return Promise.reject(error);
      
      // Option 2: Continue without token (for public endpoints)
      // return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles 401 errors and retries with new token
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('[API] 401 error, attempting token refresh...');
      
      const accounts = msalInstance.getAllAccounts();
      
      if (accounts.length === 0) {
        // No account, redirect to login
        console.log('[API] No account found, redirecting to login...');
        msalInstance.loginRedirect();
        return Promise.reject(error);
      }
      
      try {
        // TODO: Get scopes from original request or use default
        const scopes = [import.meta.env.VITE_API_SCOPE || 'api://default/read'];
        
        // Acquire new token
        const token = await getAccessToken(scopes);
        
        // Update token in original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Retry original request
        console.log('[API] Retrying request with new token...');
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        
        // TODO: Handle refresh failure
        // Option 1: Redirect to login
        msalInstance.loginRedirect();
        
        // Option 2: Show error message
        // showErrorMessage('Session expired. Please sign in again.');
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden - insufficient permissions');
      
      // TODO: Track forbidden access
      // analytics.track('api.forbidden', {
      //   url: error.config?.url,
      //   method: error.config?.method,
      // });
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('[API] Network error');
      
      // TODO: Show user-friendly error message
      // showErrorMessage('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

/**
 * Helper: Get scopes for endpoint
 * TODO: Customize this mapping for your API
 */
function getScopesForEndpoint(url?: string): string[] {
  if (!url) {
    return [import.meta.env.VITE_API_SCOPE || 'api://default/read'];
  }
  
  // Map endpoints to scopes
  if (url.includes('/admin/')) {
    return [import.meta.env.VITE_API_SCOPE_ADMIN || 'api://default/admin'];
  }
  
  if (url.match(/\/(POST|PUT|DELETE)/)) {
    return [import.meta.env.VITE_API_SCOPE_WRITE || 'api://default/write'];
  }
  
  return [import.meta.env.VITE_API_SCOPE_READ || 'api://default/read'];
}

/**
 * Usage Examples:
 * 
 * // Simple GET request
 * const response = await apiClient.get('/users');
 * 
 * // POST request
 * const response = await apiClient.post('/users', { name: 'John' });
 * 
 * // Request with specific scopes
 * const response = await apiClient.get('/admin/data', {
 *   headers: {
 *     'X-Scopes': ['api://my-api/admin'],
 *   },
 * });
 * 
 * // Error handling
 * try {
 *   const response = await apiClient.get('/protected');
 * } catch (error) {
 *   if (axios.isAxiosError(error)) {
 *     if (error.response?.status === 401) {
 *       console.log('Unauthorized');
 *     } else if (error.response?.status === 403) {
 *       console.log('Forbidden');
 *     }
 *   }
 * }
 */

/**
 * Advanced: Request with retry logic
 * TODO: Use this for critical requests
 */
export async function apiClientWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 401)
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500 && status !== 401) {
          throw error;
        }
      }
      
      // Retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`[API] Retry attempt ${attempt + 1} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Advanced: Batch requests
 * TODO: Use this for multiple simultaneous requests
 */
export async function apiBatch<T>(
  requests: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(requests.map(req => req()));
}

/**
 * Export for use in other modules
 */
export default apiClient;

