# Calling APIs — MSAL for React

**Goal:** Inject Bearer tokens into API requests and handle authentication errors properly.

---

## Axios Interceptor Pattern (Recommended)

### Setup Interceptor

```ts
// src/api/axiosInstance.ts
import axios from 'axios';
import { msalInstance } from '../config/msalConfig';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

// Request interceptor: Add Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No active account');
    }
    
    const account = accounts[0];
    
    // Get required scopes from config or use default
    const scopes = config.headers['X-Scopes'] as string[] || 
                   [import.meta.env.VITE_API_SCOPE];
    
    try {
      // Acquire token silently
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account,
      });
      
      // Add Bearer token to request
      config.headers.Authorization = `Bearer ${response.accessToken}`;
      
      // Remove custom header
      delete config.headers['X-Scopes'];
      
      return config;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Trigger interactive flow
        await msalInstance.acquireTokenRedirect({
          scopes,
          account,
        });
      }
      
      throw error;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const accounts = msalInstance.getAllAccounts();
      
      if (accounts.length === 0) {
        // No account, redirect to login
        msalInstance.loginRedirect();
        return Promise.reject(error);
      }
      
      try {
        // Try to acquire new token
        const response = await msalInstance.acquireTokenPopup({
          scopes: [import.meta.env.VITE_API_SCOPE],
          account: accounts[0],
        });
        
        // Update token and retry request
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        msalInstance.loginRedirect();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Usage

```tsx
import { apiClient } from '../api/axiosInstance';

// Simple GET request
const fetchUsers = async () => {
  const response = await apiClient.get('/users');
  return response.data;
};

// POST with data
const createUser = async (userData: User) => {
  const response = await apiClient.post('/users', userData);
  return response.data;
};

// Request with specific scopes
const fetchAdminData = async () => {
  const response = await apiClient.get('/admin/data', {
    headers: {
      'X-Scopes': ['api://my-api/admin'],
    },
  });
  return response.data;
};
```

---

## Fetch Wrapper Alternative

### Create Fetch Wrapper

```ts
// src/api/fetchClient.ts
import { msalInstance } from '../config/msalConfig';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

interface FetchOptions extends RequestInit {
  scopes?: string[];
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { scopes = [import.meta.env.VITE_API_SCOPE], ...fetchOptions } = options;
  
  const accounts = msalInstance.getAllAccounts();
  
  if (accounts.length === 0) {
    throw new Error('No active account');
  }
  
  const account = accounts[0];
  
  try {
    // Acquire token
    const response = await msalInstance.acquireTokenSilent({
      scopes,
      account,
    });
    
    // Add Bearer token to headers
    const headers = new Headers(fetchOptions.headers);
    headers.set('Authorization', `Bearer ${response.accessToken}`);
    
    // Make request
    const apiResponse = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    // Handle 401
    if (apiResponse.status === 401) {
      return handleUnauthorized(url, fetchOptions, scopes, account);
    }
    
    return apiResponse;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Trigger interactive flow
      await msalInstance.acquireTokenRedirect({
        scopes,
        account,
      });
    }
    
    throw error;
  }
}

async function handleUnauthorized(
  url: string,
  options: RequestInit,
  scopes: string[],
  account: any
): Promise<Response> {
  try {
    // Try to get new token
    const response = await msalInstance.acquireTokenPopup({
      scopes,
      account,
    });
    
    // Retry with new token
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${response.accessToken}`);
    
    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    // Refresh failed, redirect to login
    msalInstance.loginRedirect();
    throw error;
  }
}
```

### Usage

```tsx
import { fetchWithAuth } from '../api/fetchClient';

// GET request
const fetchUsers = async () => {
  const response = await fetchWithAuth('/api/users');
  return response.json();
};

// POST request
const createUser = async (userData: User) => {
  const response = await fetchWithAuth('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return response.json();
};

// Request with specific scopes
const fetchAdminData = async () => {
  const response = await fetchWithAuth('/api/admin/data', {
    scopes: ['api://my-api/admin'],
  });
  return response.json();
};
```

---

## Handling 401 Responses

### Differentiate API 401 vs Login Needed

```ts
// Response interceptor with detailed 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      // Check if it's an Azure AD error
      if (wwwAuthenticate && wwwAuthenticate.includes('Bearer')) {
        // Parse error from WWW-Authenticate header
        const errorMatch = wwwAuthenticate.match(/error="([^"]+)"/);
        const errorCode = errorMatch ? errorMatch[1] : null;
        
        if (errorCode === 'invalid_token') {
          // Token expired or invalid, try to refresh
          return handleTokenRefresh(error.config);
        } else if (errorCode === 'insufficient_claims') {
          // Need additional claims
          return handleClaimsChallenge(error.config, wwwAuthenticate);
        }
      }
      
      // Generic 401, redirect to login
      msalInstance.loginRedirect();
    }
    
    return Promise.reject(error);
  }
);
```

---

## Interaction Required Error Handling

### Handle with Backoff Strategy

```ts
// src/api/tokenAcquisition.ts
import { InteractionRequiredAuthError } from '@azure/msal-browser';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

const retryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
};

export async function acquireTokenWithRetry(
  scopes: string[],
  account: any,
  retries = 0
): Promise<string> {
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
    
    // Other errors: retry with exponential backoff
    if (retries < retryConfig.maxRetries) {
      const delay = retryConfig.baseDelay * Math.pow(2, retries);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return acquireTokenWithRetry(scopes, account, retries + 1);
    }
    
    throw error;
  }
}
```

---

## Request Queuing During Token Refresh

### Queue Concurrent Requests

```ts
// src/api/tokenQueue.ts
let tokenRefreshPromise: Promise<string> | null = null;

export async function getAccessToken(scopes: string[]): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  
  if (accounts.length === 0) {
    throw new Error('No active account');
  }
  
  const account = accounts[0];
  
  // If refresh is in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  // Start new refresh
  tokenRefreshPromise = (async () => {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account,
      });
      
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
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
```

### Usage in Interceptor

```ts
apiClient.interceptors.request.use(
  async (config) => {
    const scopes = [import.meta.env.VITE_API_SCOPE];
    
    // Get token (queued if refresh in progress)
    const token = await getAccessToken(scopes);
    
    config.headers.Authorization = `Bearer ${token}`;
    
    return config;
  }
);
```

---

## Retry Strategies

### Circuit Breaker Pattern

```ts
// src/api/circuitBreaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
  
  private reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}

// Usage
const breaker = new CircuitBreaker();

export async function fetchWithCircuitBreaker(url: string) {
  return breaker.execute(() => fetchWithAuth(url));
}
```

---

## React Query Integration

### Setup with Token Injection

```tsx
// src/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from './fetchClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetchWithAuth(url);
        return response.json();
      },
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
```

### Usage in Components

```tsx
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/users'],
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

---

## Best Practices

### ✅ Do

- Use interceptor pattern for centralized token injection
- Try silent token acquisition first
- Queue concurrent requests during token refresh
- Implement retry logic with exponential backoff
- Handle 401 errors appropriately (refresh vs login)
- Use circuit breaker for failing endpoints
- Validate tokens server-side (never trust client)

### ❌ Don't

- Acquire token on every request (use cache)
- Ignore 401 errors
- Retry indefinitely
- Store tokens manually
- Trust client-side token validation
- Make API calls without error handling
- Forget to handle interaction required errors

---

## Complete Example

```ts
// src/api/apiClient.ts
import axios from 'axios';
import { msalInstance } from '../config/msalConfig';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Token refresh queue
let tokenRefreshPromise: Promise<string> | null = null;

async function getAccessToken(scopes: string[]): Promise<string> {
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No active account');
  }
  
  tokenRefreshPromise = (async () => {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await msalInstance.acquireTokenPopup({
          scopes,
          account: accounts[0],
        });
        return response.accessToken;
      }
      throw error;
    } finally {
      tokenRefreshPromise = null;
    }
  })();
  
  return tokenRefreshPromise;
}

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const scopes = config.headers['X-Scopes'] as string[] || 
                   [import.meta.env.VITE_API_SCOPE];
    
    const token = await getAccessToken(scopes);
    config.headers.Authorization = `Bearer ${token}`;
    delete config.headers['X-Scopes'];
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const token = await getAccessToken([import.meta.env.VITE_API_SCOPE]);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        msalInstance.loginRedirect();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

**← Back to:** [Routing & Guards](./04-routing-and-guards.md)  
**Next:** [Roles & Permissions](./06-roles-permissions.md) →

