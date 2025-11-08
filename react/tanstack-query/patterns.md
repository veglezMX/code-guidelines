# Patterns — TanStack Query

**Goal:** Learn core query and mutation patterns for fetching and updating server data.

---

## Query Patterns

### Basic Query

```ts
// hooks/queries/use-user.ts
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

**Key points:**
- Use `enabled` to conditionally run queries
- Handle `isLoading`, `error`, and `data` states
- Create custom hooks for reusability

---

### Query with Parameters

```ts
// hooks/queries/use-projects.ts
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

**Key points:**
- Query keys include all parameters for proper caching
- Use `placeholderData` to show previous data while loading
- Filter out `null`/`undefined` params from URL

---

### Dependent Queries

```ts
// hooks/queries/use-project-details.ts
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

**Key points:**
- Use `enabled` to wait for dependent data
- Second query only runs when first completes

---

### Parallel Queries

```ts
// hooks/queries/use-dashboard-data.ts
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

**Key points:**
- Use `useQueries` for multiple parallel requests
- All queries run simultaneously
- Combine results as needed

---

### Infinite Queries (Pagination)

```ts
// hooks/queries/use-infinite-projects.ts
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

**Key points:**
- Use `useInfiniteQuery` for cursor or offset pagination
- `getNextPageParam` determines next cursor
- Access all pages via `data.pages`

---

## Mutation Patterns

### Basic Mutation

```ts
// hooks/mutations/use-create-project.ts
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

**Key points:**
- Invalidate related queries after success
- Use `isPending` for loading state
- Handle success/error per mutation call

---

### Update Mutation

```ts
// hooks/mutations/use-update-project.ts
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
    
    onSuccess: (updatedProject) => {
      // Update cache directly
      queryClient.setQueryData(
        queryKeys.projects.detail(updatedProject.id),
        updatedProject
      );
      
      // Invalidate list to refetch
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.lists() 
      });
    },
  });
}
```

---

### Delete Mutation

```ts
// hooks/mutations/use-delete-project.ts
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

### Optimistic Update

```ts
// hooks/mutations/use-update-project-optimistic.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

**Key points:**
- `onMutate`: Update cache before server responds
- `onError`: Rollback if mutation fails
- `onSettled`: Always refetch to sync with server

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

// hooks/queries/use-current-user.ts (TanStack Query)
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

## Best Practices

### ✅ Do's
- Always invalidate queries after mutations
- Use `enabled` for conditional queries
- Implement optimistic updates for better UX
- Use `placeholderData` for pagination
- Create custom hooks for all queries/mutations
- Handle loading and error states

### ❌ Don'ts
- Don't forget to invalidate after mutations
- Don't use queries for client-only state
- Don't skip `enabled` checks for dependent queries
- Don't ignore loading/error states
- Don't use string literals for query keys

---

**Next:** [TypeScript Guide](./typescript-guide.md) →
