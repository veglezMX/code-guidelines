# TanStack Query (React Query) — Server State Guide

**Stack:** React 19, TypeScript 5, TanStack Query v5  

---

## 📚 What This Guide Covers

This guide focuses on **server state management** using TanStack Query (formerly React Query). Use this for:

- ✅ API data fetching and caching
- ✅ Server mutations (POST, PUT, DELETE)
- ✅ Automatic background refetching
- ✅ Optimistic updates
- ✅ Infinite queries and pagination

For **client state** (UI state, preferences, session), use [Zustand](../zustand/index.md).

---

## Why TanStack Query?

### ✅ Advantages
- **Automatic caching**: No manual cache management needed
- **Background refetching**: Keeps data fresh automatically
- **Type-safe**: Excellent TypeScript inference
- **Optimistic updates**: Update UI before server responds
- **Devtools**: Built-in debugging and inspection
- **Request deduplication**: Prevents unnecessary API calls
- **Stale-while-revalidate**: Shows cached data while fetching fresh data

### 🔄 vs Manual Fetching in Zustand
| TanStack Query | Zustand (manual fetch) |
|----------------|------------------------|
| Automatic caching & invalidation | Manual cache management |
| Built-in loading/error states | Manual state tracking |
| Background refetching | Manual refetch logic |
| Request deduplication | No deduplication |
| Optimistic updates built-in | Manual optimistic logic |

**Rule:** Server state → TanStack Query. Client state → Zustand.

---

## Installation

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

---

## Setup

### Provider Setup

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Root Layout

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## TypeScript Best Practices

### 1. Type Your API Responses

```ts
// types/api.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}
```

### 2. Create Typed API Client

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

### 3. Create Query Keys Factory

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

**Why?** Type-safe query keys prevent typos and make invalidation easier.

---

## Query Patterns

### Basic Query

```ts
// hooks/use-user.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/types/api';

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`),
    enabled: !!userId, // only run if userId exists
  });
}

// Usage in component
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

### Query with Parameters

```ts
// hooks/use-projects.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Project } from '@/types/api';

interface ProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'archived';
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
}

export function useProjects(params: ProjectsParams = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v != null) as [string, string][]
  );

  return useQuery({
    queryKey: queryKeys.projects.list(searchParams.toString()),
    queryFn: () => api.get<ProjectsResponse>(`/projects?${searchParams}`),
    placeholderData: (previousData) => previousData, // keep previous data while loading
  });
}

// Usage
function ProjectsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const { data, isLoading, isPlaceholderData } = useProjects({ 
    page, 
    search,
    limit: 20 
  });

  return (
    <div>
      {isPlaceholderData && <LoadingOverlay />}
      {data?.projects.map(project => <ProjectCard key={project.id} {...project} />)}
      <Pagination page={page} total={data?.total ?? 0} onChange={setPage} />
    </div>
  );
}
```

### Dependent Queries

```ts
// hooks/use-project-details.ts
import { useQuery } from '@tanstack/react-query';

export function useProjectWithOwner(projectId: string) {
  // First query: get project
  const { data: project } = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
  });

  // Second query: get owner (depends on first query)
  const { data: owner } = useQuery({
    queryKey: queryKeys.users.detail(project?.ownerId ?? ''),
    queryFn: () => api.get<User>(`/users/${project!.ownerId}`),
    enabled: !!project?.ownerId, // only run when project is loaded
  });

  return { project, owner };
}
```

### Parallel Queries

```ts
// hooks/use-dashboard-data.ts
import { useQueries } from '@tanstack/react-query';

export function useDashboardData() {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.users.lists(),
        queryFn: () => api.get<User[]>('/users'),
      },
      {
        queryKey: queryKeys.projects.lists(),
        queryFn: () => api.get<Project[]>('/projects'),
      },
    ],
  });

  return {
    users: results[0].data,
    projects: results[1].data,
    isLoading: results.some(r => r.isLoading),
    error: results.find(r => r.error)?.error,
  };
}
```

---

## Mutation Patterns

### Basic Mutation

```ts
// hooks/use-create-project.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Project } from '@/types/api';

interface CreateProjectInput {
  title: string;
  description: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post<Project>('/projects', input),
    
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.lists() 
      });

      // Optionally: add to cache directly
      queryClient.setQueryData(
        queryKeys.projects.detail(newProject.id),
        newProject
      );
    },
  });
}

// Usage
function CreateProjectForm() {
  const { mutate, isPending, error } = useCreateProject();

  const handleSubmit = (data: CreateProjectInput) => {
    mutate(data, {
      onSuccess: () => {
        toast.success('Project created!');
        router.push('/projects');
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Mutation with Optimistic Update

```ts
// hooks/use-update-project.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateProjectInput {
  id: string;
  title?: string;
  description?: string;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProjectInput) =>
      api.put<Project>(`/projects/${id}`, data),
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.projects.detail(variables.id) 
      });

      // Snapshot previous value
      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(variables.id)
      );

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData<Project>(
          queryKeys.projects.detail(variables.id),
          { ...previousProject, ...variables }
        );
      }

      // Return context with snapshot
      return { previousProject };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(
          queryKeys.projects.detail(variables.id),
          context.previousProject
        );
      }
    },
    
    onSettled: (data, error, variables) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.detail(variables.id) 
      });
    },
  });
}
```

### Delete Mutation

```ts
// hooks/use-delete-project.ts
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete(`/projects/${projectId}`),
    
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.projects.detail(projectId) 
      });
      
      // Invalidate lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.lists() 
      });
    },
  });
}

// Usage
function DeleteProjectButton({ projectId }: { projectId: string }) {
  const { mutate, isPending } = useDeleteProject();

  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      mutate(projectId, {
        onSuccess: () => toast.success('Deleted!'),
      });
    }
  };

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

---

## Infinite Queries (Pagination)

```ts
// hooks/use-infinite-projects.ts
import { useInfiniteQuery } from '@tanstack/react-query';

interface ProjectsPage {
  projects: Project[];
  nextCursor: string | null;
}

export function useInfiniteProjects() {
  return useInfiniteQuery({
    queryKey: queryKeys.projects.lists(),
    queryFn: ({ pageParam }) =>
      api.get<ProjectsPage>(`/projects?cursor=${pageParam ?? ''}`),
    
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => null,
  });
}

// Usage
function InfiniteProjectsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProjects();

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.projects.map(project => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## Advanced TypeScript Patterns

### Generic Query Hook Factory

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
```

### Type-Safe Mutation Hook Factory

```ts
// hooks/create-mutation-hook.ts
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { ApiError } from '@/types/api';

export function createMutationHook<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>
) {
  return (
    overrideOptions?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>
  ) => {
    return useMutation({
      mutationFn,
      ...options,
      ...overrideOptions,
    });
  };
}

// Usage
export const useCreateProject = createMutationHook(
  (input: CreateProjectInput) => api.post<Project>('/projects', input),
  {
    onSuccess: (data, variables, context) => {
      // Default success handler
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  }
);
```

### Strongly-Typed Error Handling

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

// Usage in components
function CreateProjectForm() {
  const { mutate, error } = useCreateProject();

  const fieldErrors = getFieldErrors(error);

  return (
    <div>
      {fieldErrors?.title && <span>{fieldErrors.title[0]}</span>}
      {error && <ErrorAlert message={getErrorMessage(error)} />}
    </div>
  );
}
```

---

## Integration with Zustand

### Store Session Token, Query for User Data

```ts
// stores/session.store.ts (Zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    { name: 'session' }
  )
);

// hooks/use-current-user.ts (TanStack Query)
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/stores/session.store';

export function useCurrentUser() {
  const token = useSession(s => s.token);

  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.get<User>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    enabled: !!token, // only fetch if logged in
  });
}
```

---

## Best Practices Summary

### ✅ Do's

- **Use query key factories** for type-safe, consistent keys
- **Type all API responses** explicitly
- **Create a typed API client** with error handling
- **Use `enabled` option** for conditional queries
- **Implement optimistic updates** for better UX
- **Use `placeholderData`** to show previous data while refetching
- **Invalidate queries** after mutations
- **Create custom hooks** for all queries/mutations
- **Use `useQueries`** for parallel requests
- **Handle errors** with strongly-typed error handlers

### ❌ Don'ts

- **Don't fetch in Zustand** for server data
- **Don't use string literals** for query keys (use factory)
- **Don't ignore TypeScript errors** in query hooks
- **Don't fetch without loading states**
- **Don't mutate without invalidation**
- **Don't use `any`** for API response types
- **Don't skip `enabled` checks** for dependent queries
- **Don't forget DevTools** in development

---

## Folder Structure

```
src/
  hooks/
    queries/
      use-user.ts
      use-projects.ts
      use-dashboard-data.ts
    mutations/
      use-create-project.ts
      use-update-project.ts
      use-delete-project.ts
  lib/
    api-client.ts       # Typed fetch wrapper
    query-keys.ts       # Query key factory
    query-client.ts     # QueryClient config
  types/
    api.ts              # API response types
  utils/
    query-error.ts      # Error handling utilities
```

---

**Related:** [Zustand Guide](../zustand/index.md) for client state management
