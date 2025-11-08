# TypeScript Guide — TanStack Query

**Goal:** Write fully type-safe queries and mutations with excellent TypeScript inference.

---

## Folder Structure for Types

### Recommended Layout

```
src/
  types/
    api/
      users.types.ts      # User-related API types
      projects.types.ts   # Project-related API types
      common.types.ts     # Shared API types (Pagination, ApiError, etc.)
      index.ts            # Re-export all API types
    models/
      user.model.ts       # Domain models (if different from API)
      project.model.ts    # Domain models
    utils/
      api.types.ts        # Utility types (ApiResponse<T>, etc.)
  lib/
    api/
      client.ts           # API client instance
      users.api.ts        # User API methods
      projects.api.ts     # Project API methods
      index.ts            # Re-export all API methods
  hooks/
    queries/
      use-user.ts
      use-projects.ts
    mutations/
      use-create-project.ts
      use-update-user.ts
```

### Naming Conventions

#### Files
- **API types:** `[resource].types.ts` (e.g., `users.types.ts`, `projects.types.ts`)
- **Domain models:** `[resource].model.ts` (e.g., `user.model.ts`)
- **API methods:** `[resource].api.ts` (e.g., `users.api.ts`)
- **Hooks:** `use-[action]-[resource].ts` (e.g., `use-create-project.ts`)

#### Types
- **Response types (GET):** `User`, `Project`, `UsersListResponse`
- **Request types (POST/PUT/PATCH):** `CreateUserRequest`, `UpdateUserRequest`, `CreateProjectInput`
- **Query params:** `UsersQueryParams`, `ProjectsFilters`
- **Generic wrappers:** `ApiResponse<T>`, `PaginatedResponse<T>`

### Organization Rules

1. **Keep API types close to their domain**  
   Group related types together: `users.types.ts` contains `User`, `CreateUserRequest`, `UpdateUserRequest`, etc.

2. **Use `.types.ts` suffix for type-only files**  
   Makes it clear the file contains only types/interfaces (no runtime code).

3. **Export all types from `types/index.ts`**  
   Simplifies imports: `import { User, Project } from '@/types'`

4. **Separate concerns**  
   - `types/api/` → API contracts (what backend sends/receives)
   - `types/models/` → Domain models (if different from API)
   - `lib/api/` → API client and methods (runtime code)

5. **One resource per file**  
   Don't mix user and project types in the same file.

### Example: Complete Type File

```ts
// types/api/users.types.ts

// Base entity (GET single user)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// List response (GET /users)
export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

// Create request (POST /users)
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user';
}

// Update request (PATCH /users/:id)
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

// Query parameters (GET /users?...)
export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: 'admin' | 'user';
  sortBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}
```

### Example: Index Barrel Export

```ts
// types/api/index.ts
export * from './users.types';
export * from './projects.types';
export * from './common.types';

// types/index.ts
export * from './api';
export * from './models';
export * from './utils';
```

**Benefits:**
- Easy to find types related to a specific resource
- Clear separation of API contracts and domain logic
- Simple imports: `import { User, CreateUserRequest } from '@/types'`
- Scalable as the project grows

---

## Request/Response Naming Patterns

### Standard Naming Conventions

Follow these patterns for consistency across your codebase:

#### Response Types (What You GET)

```ts
// types/api/users.types.ts

// Single resource (GET /users/:id)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Collection response (GET /users)
export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

// Alternative: Use generic wrapper
export type UsersResponse = PaginatedResponse<User>;
```

#### Request Types (What You POST/PUT/PATCH)

```ts
// Create operations (POST /users)
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user';
}

// Update operations (PUT/PATCH /users/:id)
export interface UpdateUserRequest {
  name?: string;        // Optional fields for partial updates
  email?: string;
  avatar?: string;
}

// Delete operations (DELETE /users/:id)
// Usually no body needed, use resource ID only

// Alternative naming: Use "Input" suffix for forms
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}
```

#### Query Parameters

```ts
// Query params (GET /users?page=1&search=john)
export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: 'admin' | 'user';
  sortBy?: 'name' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
}

// Alternative: Use "Filters" suffix
export interface UsersFilters {
  status?: 'active' | 'inactive';
  createdAfter?: string;
  createdBefore?: string;
}
```

### Naming Rules

| Type | Pattern | Example |
|------|---------|---------|
| Single resource | `[Resource]` | `User`, `Project` |
| Collection | `[Resource]ListResponse` or `[Resource]sResponse` | `UsersListResponse`, `ProjectsResponse` |
| Create request | `Create[Resource]Request` or `Create[Resource]Input` | `CreateUserRequest`, `CreateProjectInput` |
| Update request | `Update[Resource]Request` or `Update[Resource]Input` | `UpdateUserRequest`, `UpdateProjectInput` |
| Query params | `[Resource]QueryParams` or `[Resource]Filters` | `UsersQueryParams`, `ProjectsFilters` |
| Paginated | `Paginated[Resource]Response` or use generic | `PaginatedUsersResponse`, `PaginatedResponse<User>` |

### Common Shared Types

```ts
// types/api/common.types.ts

// Generic pagination wrapper
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Generic API error
export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>; // Field-level validation errors
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

// Sort parameters
export interface SortParams {
  sortBy: string;
  order: 'asc' | 'desc';
}

// Date range filter
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}
```

### Don't Repeat Yourself

```ts
// ✅ Good: Reuse types when GET and POST return the same shape
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
}

// The response is just User
const user = await api.post<User>('/users', createUserRequest);

// ❌ Bad: Don't create duplicate types
export interface CreateUserResponse {  // Unnecessary if identical to User
  id: string;
  email: string;
  name: string;
}
```

### Discriminated Unions for Polymorphic Responses

```ts
// When API returns different shapes based on type
export type Notification =
  | {
      type: 'email';
      id: string;
      subject: string;
      body: string;
      recipientEmail: string;
    }
  | {
      type: 'sms';
      id: string;
      message: string;
      phoneNumber: string;
    }
  | {
      type: 'push';
      id: string;
      title: string;
      body: string;
      deviceId: string;
    };

// TypeScript narrows types based on discriminant
function handleNotification(notification: Notification) {
  if (notification.type === 'email') {
    console.log(notification.subject); // ✅ TypeScript knows this exists
  } else if (notification.type === 'sms') {
    console.log(notification.phoneNumber); // ✅ Type-safe
  }
}
```

---

## Type Your API Responses

### Define Response Types

```ts
// types/api/projects.types.ts
export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListResponse {
  projects: Project[];
  total: number;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  status?: 'active' | 'archived';
}
```

**Best practices:**
- Use specific types, not `any` or `unknown`
- Use discriminated unions for status/types
- Include metadata fields (dates, IDs)
- Follow naming conventions from above
- Group related types in the same file

---

## Create Typed API Client

### Basic API Client

```ts
// lib/api-client.ts
import type { ApiError } from '@/types/api';

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

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new APIError(
      response.status,
      error.code,
      error.message,
      error.details
    );
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
      body: JSON.stringify(data),
    }),
  
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchAPI<T>(endpoint, { ...options, method: 'DELETE' }),
};
```

**Usage:**
```ts
const user = await api.get<User>('/users/123'); // user is typed as User
const project = await api.post<Project>('/projects', { title: 'New' }); // typed
```

---

## Query Keys Factory

### Type-Safe Query Keys

```ts
// lib/query-keys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
} as const;
```

**Benefits:**
- Type-safe keys prevent typos
- Hierarchical structure for easy invalidation
- Autocomplete in IDE
- Consistent naming across codebase

**Usage:**
```ts
// Type-safe and autocompleted
queryKey: queryKeys.users.detail(userId)
queryKey: queryKeys.projects.list('status=active')

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate specific user
queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
```

---

## Generic Query Hook Factory

### Type-Safe Query Creator

```ts
// hooks/create-query-hook.ts
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiError } from '@/types/api';

export function createQueryHook<TData, TParams = void>(
  keyFactory: (params: TParams) => readonly unknown[],
  fetcher: (params: TParams) => Promise<TData>
) {
  return (
    params: TParams,
    options?: Omit<
      UseQueryOptions<TData, ApiError>,
      'queryKey' | 'queryFn'
    >
  ) => {
    return useQuery({
      queryKey: keyFactory(params),
      queryFn: () => fetcher(params),
      ...options,
    });
  };
}

// Usage
export const useUser = createQueryHook(
  (userId: string) => queryKeys.users.detail(userId),
  (userId: string) => api.get<User>(`/users/${userId}`)
);

export const useProjects = createQueryHook(
  (params: ProjectsParams) => queryKeys.projects.list(new URLSearchParams(params as any).toString()),
  (params: ProjectsParams) => api.get<ProjectsResponse>(`/projects?${new URLSearchParams(params as any)}`)
);

// Component usage - fully typed!
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useUser(userId); // data is User | undefined
  // ...
}
```

**Benefits:**
- Reduces boilerplate
- Ensures consistent pattern
- Full type inference
- Centralized error handling

---

## Generic Mutation Hook Factory

### Type-Safe Mutation Creator

```ts
// hooks/create-mutation-hook.ts
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import type { ApiError } from '@/types/api';

export function createMutationHook<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  defaultOptions?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>
) {
  return (
    overrideOptions?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>
  ) => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn,
      ...defaultOptions,
      ...overrideOptions,
      // Merge onSuccess handlers
      onSuccess: (data, variables, context) => {
        defaultOptions?.onSuccess?.(data, variables, context);
        overrideOptions?.onSuccess?.(data, variables, context);
      },
    });
  };
}

// Usage
interface CreateProjectInput {
  title: string;
  description: string;
}

export const useCreateProject = createMutationHook(
  (input: CreateProjectInput) => api.post<Project>('/projects', input),
  {
    onSuccess: (project) => {
      // Default: invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  }
);

// Component usage - fully typed!
function CreateProjectForm() {
  const { mutate } = useCreateProject({
    onSuccess: (project) => {
      // Additional success handler, data is typed as Project
      toast.success(`Created ${project.title}`);
    },
  });

  const handleSubmit = (data: CreateProjectInput) => {
    mutate(data); // data is typed as CreateProjectInput
  };
}
```

---

## Strongly-Typed Error Handling

### Type Guards and Utilities

```ts
// utils/query-error.ts
import type { ApiError } from '@/types/api';

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export function getFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (isApiError(error)) {
    return error.details;
  }
  return undefined;
}

export function getErrorCode(error: unknown): string | undefined {
  if (isApiError(error)) {
    return error.code;
  }
  return undefined;
}
```

**Usage in components:**

```tsx
function CreateProjectForm() {
  const { mutate, error } = useCreateProject();

  const fieldErrors = getFieldErrors(error);
  const errorCode = getErrorCode(error);

  return (
    <form>
      <input name="title" />
      {fieldErrors?.title && (
        <span className="error">{fieldErrors.title[0]}</span>
      )}
      
      {error && (
        <Alert variant="error">
          {getErrorMessage(error)}
          {errorCode && <span>Code: {errorCode}</span>}
        </Alert>
      )}
    </form>
  );
}
```

---

## Advanced TypeScript Patterns

### Inferred Return Types

```ts
// hooks/queries/use-user.ts
import { useQuery } from '@tanstack/react-query';

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`),
  });
}

// In component, TypeScript infers the return type
function UserProfile({ userId }: { userId: string }) {
  const query = useUser(userId);
  // query.data is User | undefined
  // query.error is ApiError
  // query.isLoading is boolean
}
```

### Select with Type Transformation

```ts
// Select specific fields with proper typing
function UserEmail({ userId }: { userId: string }) {
  const { data: email } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`),
    select: (user) => user.email, // email is typed as string
  });

  return <div>{email}</div>; // email is string | undefined
}
```

### Typed Pagination

```ts
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function usePaginatedProjects(page: number) {
  return useQuery({
    queryKey: queryKeys.projects.list(`page=${page}`),
    queryFn: () => api.get<PaginatedResponse<Project>>(`/projects?page=${page}`),
  });
}

// Usage
const { data } = usePaginatedProjects(1);
// data.items is Project[]
// data.total is number
```

---

## Type-Safe Optimistic Updates

```ts
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProjectInput) =>
      api.put<Project>(`/projects/${id}`, data),
    
    onMutate: async (variables) => {
      const queryKey = queryKeys.projects.detail(variables.id);
      
      await queryClient.cancelQueries({ queryKey });

      // Snapshot is properly typed
      const previousProject = queryClient.getQueryData<Project>(queryKey);

      // Optimistic update with type safety
      if (previousProject) {
        queryClient.setQueryData<Project>(queryKey, {
          ...previousProject,
          ...variables, // TypeScript ensures this is compatible
        });
      }

      // Context is typed
      return { previousProject };
    },
    
    onError: (err, variables, context) => {
      // context.previousProject is Project | undefined
      if (context?.previousProject) {
        queryClient.setQueryData(
          queryKeys.projects.detail(variables.id),
          context.previousProject
        );
      }
    },
  });
}
```

---

## Best Practices Summary

### ✅ Do's

- **Type all API responses** explicitly with interfaces
- **Use query key factories** for type-safe keys
- **Create typed API client** with error handling
- **Use generic hook factories** for consistency
- **Implement type guards** for error handling
- **Use `select`** for type transformations
- **Leverage TypeScript inference** - don't over-annotate
- **Use discriminated unions** for status/types

### ❌ Don'ts

- **Don't use `any`** for API responses
- **Don't use string literals** for query keys
- **Don't ignore TypeScript errors** - fix them
- **Don't skip error type guards**
- **Don't manually type** what can be inferred
- **Don't use `as` casting** unless necessary

---

## TypeScript Configuration Tips

### Strict Mode (Recommended)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true
  }
}
```

This ensures:
- No implicit `any` types
- Null/undefined checks enforced
- Better error detection

---

**Next:** [Recipes](./recipes.md) →
