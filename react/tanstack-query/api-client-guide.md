# API Client Management

**Goal:** Centralized, type-safe API client with error handling, authentication, and interceptors.

---

## Why You Need an API Client

### Problems with Direct `fetch` Calls

```tsx
// ❌ Bad: Scattered logic, repeated code
function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const token = localStorage.getItem('token'); // Repeated
      const res = await fetch(`${API_URL}/users/${id}`, { // Repeated
        headers: {
          'Content-Type': 'application/json', // Repeated
          'Authorization': `Bearer ${token}`, // Repeated
        },
      });
      
      if (!res.ok) { // Repeated error handling
        const error = await res.json();
        throw new Error(error.message);
      }
      
      return res.json();
    },
  });
}
```

### Benefits of Centralized API Client

- ✅ **Single source of truth** for base URL, headers, interceptors
- ✅ **Consistent error handling** across all requests
- ✅ **Authentication** handled automatically
- ✅ **Type safety** with TypeScript generics
- ✅ **Interceptors** for logging, retry logic, token refresh
- ✅ **Easy testing** - mock once, test everywhere

---

## Option 1: Axios-Based Client (Recommended)

### Installation

```bash
pnpm add axios
pnpm add -D @types/axios
```

### Basic Setup

```ts
// lib/api/client.ts
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>; // Field-level validation errors
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken(); // From Zustand or localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (normalize errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'Unknown error',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.details,
    };
    
    // Optional: Handle specific status codes globally
    if (apiError.status === 401) {
      // Redirect to login or refresh token
      console.error('Unauthorized - redirecting to login');
    }
    
    return Promise.reject(apiError);
  }
);

// Helper to get auth token (example with Zustand)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Option 1: From Zustand store
  // return useAuthStore.getState().token;
  
  // Option 2: From localStorage
  return localStorage.getItem('auth_token');
}
```

### Typed API Methods (Domain-Based)

```ts
// lib/api/users.api.ts
import { apiClient } from './client';
import type {
  User,
  UsersListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UsersQueryParams,
} from '@/types/api/users.types';

export const usersApi = {
  // GET /users
  getAll: (params?: UsersQueryParams) =>
    apiClient
      .get<UsersListResponse>('/users', { params })
      .then((res) => res.data),

  // GET /users/:id
  getById: (id: string) =>
    apiClient.get<User>(`/users/${id}`).then((res) => res.data),

  // POST /users
  create: (data: CreateUserRequest) =>
    apiClient.post<User>('/users', data).then((res) => res.data),

  // PATCH /users/:id
  update: (id: string, data: UpdateUserRequest) =>
    apiClient.patch<User>(`/users/${id}`, data).then((res) => res.data),

  // DELETE /users/:id
  delete: (id: string) =>
    apiClient.delete<void>(`/users/${id}`).then((res) => res.data),
};
```

```ts
// lib/api/projects.api.ts
import { apiClient } from './client';
import type {
  Project,
  ProjectsListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsQueryParams,
} from '@/types/api/projects.types';

export const projectsApi = {
  getAll: (params?: ProjectsQueryParams) =>
    apiClient
      .get<ProjectsListResponse>('/projects', { params })
      .then((res) => res.data),

  getById: (id: string) =>
    apiClient.get<Project>(`/projects/${id}`).then((res) => res.data),

  create: (data: CreateProjectRequest) =>
    apiClient.post<Project>('/projects', data).then((res) => res.data),

  update: (id: string, data: UpdateProjectRequest) =>
    apiClient.patch<Project>(`/projects/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/projects/${id}`).then((res) => res.data),
};
```

### Barrel Export

```ts
// lib/api/index.ts
export * from './client';
export * from './users.api';
export * from './projects.api';
```

---

## Option 2: Native `fetch` Client

### Basic Setup

```ts
// lib/api/client.ts
export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url = `${baseURL}${endpoint}`;
  
  // Get auth token
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let error: ApiError;
    
    try {
      error = await response.json();
    } catch {
      error = {
        message: response.statusText,
        code: 'UNKNOWN_ERROR',
        status: response.status,
      };
    }
    
    throw new APIError(
      response.status,
      error.code,
      error.message,
      error.details
    );
  }

  // Handle no-content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchAPI<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchAPI<T>(endpoint, { ...options, method: 'DELETE' }),
};

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
```

### Typed API Methods (Same Pattern)

```ts
// lib/api/users.api.ts
import { api } from './client';
import type { User, CreateUserRequest, UsersQueryParams } from '@/types/api/users.types';

export const usersApi = {
  getAll: (params?: UsersQueryParams) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<User[]>(`/users?${query}`);
  },

  getById: (id: string) =>
    api.get<User>(`/users/${id}`),

  create: (data: CreateUserRequest) =>
    api.post<User>('/users', data),

  update: (id: string, data: Partial<CreateUserRequest>) =>
    api.patch<User>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/users/${id}`),
};
```

---

## Integration with TanStack Query

### Custom Hooks Pattern

```ts
// hooks/queries/use-users.ts
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { UsersQueryParams } from '@/types/api/users.types';

export function useUsers(params?: UsersQueryParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.getAll(params),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.getById(userId),
    enabled: !!userId, // Only fetch if userId exists
  });
}
```

```ts
// hooks/mutations/use-create-user.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}
```

### Component Usage

```tsx
// components/UsersList.tsx
import { useUsers } from '@/hooks/queries/use-users';
import { useCreateUser } from '@/hooks/mutations/use-create-user';

export function UsersList() {
  const { data: users, isLoading, error } = useUsers({ page: 1, pageSize: 20 });
  const { mutate: createUser } = useCreateUser();

  const handleCreate = () => {
    createUser(
      { name: 'John Doe', email: 'john@example.com', password: 'secret' },
      {
        onSuccess: (user) => {
          toast.success(`Created user: ${user.name}`);
        },
      }
    );
  };

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
      <button onClick={handleCreate}>Create User</button>
    </div>
  );
}
```

---

## Advanced Patterns

### Token Refresh with Axios

```ts
// lib/api/client.ts
import axios from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        const { data } = await axios.post('/auth/refresh', { refreshToken });
        const newToken = data.token;

        setAuthToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### Request Retry Logic

```ts
// lib/api/client.ts
import axios from 'axios';
import axiosRetry from 'axios-retry';

axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s
  retryCondition: (error) => {
    // Retry on network errors or 5xx
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    );
  },
});
```

### Request Logging (Development Only)

```ts
// lib/api/client.ts
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.status} ${response.config.url}`, response.data);
      return response;
    },
    (error) => {
      console.error(`[API] Error ${error.config?.url}`, error);
      return Promise.reject(error);
    }
  );
}
```

---

## Folder Structure

### Recommended Layout

```
src/
  lib/
    api/
      client.ts           # Axios/fetch instance, interceptors, base config
      users.api.ts        # User API methods
      projects.api.ts     # Project API methods
      auth.api.ts         # Authentication API methods
      index.ts            # Re-export all API methods
  types/
    api/
      users.types.ts      # User request/response types
      projects.types.ts   # Project request/response types
      common.types.ts     # ApiError, Pagination, etc.
      index.ts            # Re-export all types
  hooks/
    queries/
      use-users.ts        # User queries
      use-projects.ts     # Project queries
    mutations/
      use-create-user.ts
      use-update-project.ts
```

### File Naming Rules

| Type | Pattern | Example |
|------|---------|---------|
| API client | `client.ts` | `lib/api/client.ts` |
| API methods | `[resource].api.ts` | `users.api.ts`, `projects.api.ts` |
| Types | `[resource].types.ts` | `users.types.ts` |
| Hooks | `use-[action]-[resource].ts` | `use-create-user.ts` |

---

## Best Practices Summary

### ✅ Do's

- **Centralize API configuration** in `lib/api/client.ts`
- **Group API methods by domain** (`users.api.ts`, `projects.api.ts`)
- **Use TypeScript generics** for all API calls
- **Handle errors in interceptors** (don't repeat in every hook)
- **Export typed API methods**, not the raw client
- **Use environment variables** for API URLs
- **Implement token refresh** for better UX
- **Log requests in development** for debugging

### ❌ Don'ts

- **Don't call `axios` or `fetch` directly** in components or hooks
- **Don't handle auth/errors** in individual API calls
- **Don't use `any`** for API responses
- **Don't skip error handling** in interceptors
- **Don't hardcode API URLs**
- **Don't expose raw client** to components
- **Don't mix API logic** with component logic

---

## Migration from Direct `fetch`

### Before (Direct fetch in hooks)

```ts
// ❌ Bad
function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
}
```

### After (Centralized API client)

```ts
// ✅ Good
// 1. Define API method
// lib/api/users.api.ts
export const usersApi = {
  getById: (id: string) => apiClient.get<User>(`/users/${id}`).then(r => r.data),
};

// 2. Use in hook
// hooks/queries/use-user.ts
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
  });
}
```

---

**Next:** [TypeScript Guide](./typescript-guide.md) →  
**← Back to:** [README](./README.md)
