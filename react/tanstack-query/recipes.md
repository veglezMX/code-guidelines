# Recipes — TanStack Query

**Goal:** Copy-paste solutions for common real-world scenarios.

---

## Authentication Flow

### Sign In Mutation

```ts
// hooks/mutations/use-sign-in.ts
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useSession } from '@/stores/session.store';

interface SignInInput {
  email: string;
  password: string;
}

interface SignInResponse {
  token: string;
  user: User;
}

export function useSignIn() {
  return useMutation({
    mutationFn: (credentials: SignInInput) =>
      api.post<SignInResponse>('/auth/signin', credentials),
    
    onSuccess: ({ token, user }) => {
      // Store token in Zustand
      useSession.getState().setToken(token);
      // TanStack Query will automatically fetch user data via useCurrentUser
    },
  });
}

// Usage
function SignInForm() {
  const router = useRouter();
  const { mutate, isPending, error } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success('Signed in!');
          router.push('/dashboard');
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isPending}
      />
      {error && <ErrorMessage error={error} />}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Sign Out Mutation

```ts
// hooks/mutations/use-sign-out.ts
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/signout'),
    
    onSuccess: () => {
      // Clear token from Zustand
      useSession.getState().clearToken();
      
      // Clear all queries
      queryClient.clear();
    },
  });
}

// Usage
function SignOutButton() {
  const router = useRouter();
  const { mutate } = useSignOut();

  const handleSignOut = () => {
    mutate(undefined, {
      onSuccess: () => {
        router.push('/signin');
      },
    });
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Protected Data Query

```ts
// hooks/queries/use-current-user.ts
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/stores/session.store';

export function useCurrentUser() {
  const token = useSession((s) => s.token);

  return useQuery({
    queryKey: ['current-user'],
    queryFn: () =>
      api.get<User>('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token, // only fetch if logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Usage
function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <Skeleton />;
  if (!user) return <SignInButton />;

  return (
    <div>
      <Avatar src={user.avatar} />
      <span>{user.name}</span>
    </div>
  );
}
```

---

## Form Submission

### Create Form with Validation

```ts
// hooks/mutations/use-create-project.ts
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.setQueryData(queryKeys.projects.detail(newProject.id), newProject);
    },
  });
}

// Component with validation
function CreateProjectForm() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateProject();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.title) errors.title = 'Title is required';
    if (formData.title.length < 3) errors.title = 'Title must be at least 3 characters';
    if (!formData.description) errors.description = 'Description is required';
    return errors;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    mutate(formData, {
      onSuccess: (project) => {
        toast.success('Project created!');
        router.push(`/projects/${project.id}`);
      },
      onError: (error) => {
        // Handle server-side validation errors
        const fieldErrors = getFieldErrors(error);
        if (fieldErrors) {
          setValidationErrors({
            title: fieldErrors.title?.[0] ?? '',
            description: fieldErrors.description?.[0] ?? '',
          });
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            setValidationErrors({ ...validationErrors, title: '' });
          }}
          disabled={isPending}
        />
        {validationErrors.title && <span className="error">{validationErrors.title}</span>}
      </div>
      
      <div>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            setValidationErrors({ ...validationErrors, description: '' });
          }}
          disabled={isPending}
        />
        {validationErrors.description && <span className="error">{validationErrors.description}</span>}
      </div>

      {error && !getFieldErrors(error) && <ErrorMessage error={error} />}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}
```

---

## Polling / Auto-Refetch

### Poll for Updates

```ts
// hooks/queries/use-job-status.ts
interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export function useJobStatus(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => api.get<Job>(`/jobs/${jobId}`),
    refetchInterval: (data) => {
      // Stop polling when job is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Poll every 2 seconds while processing
      return 2000;
    },
  });
}

// Usage
function JobProgress({ jobId }: { jobId: string }) {
  const { data: job } = useJobStatus(jobId);

  if (!job) return null;

  return (
    <div>
      <ProgressBar value={job.progress} />
      <span>Status: {job.status}</span>
      {job.status === 'completed' && <SuccessMessage />}
      {job.status === 'failed' && <ErrorMessage />}
    </div>
  );
}
```

---

## File Upload

### Upload with Progress

```ts
// hooks/mutations/use-upload-file.ts
import { useMutation } from '@tanstack/react-query';

interface UploadFileInput {
  file: File;
  onProgress?: (progress: number) => void;
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadFileInput) => {
      const formData = new FormData();
      formData.append('file', file);

      return new Promise<{ url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    },
  });
}

// Usage
function FileUploader() {
  const [progress, setProgress] = useState(0);
  const { mutate, isPending } = useUploadFile();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: (data) => {
          toast.success('File uploaded!');
          console.log('File URL:', data.url);
        },
      }
    );
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isPending} />
      {isPending && <ProgressBar value={progress} />}
    </div>
  );
}
```

---

## Optimistic UI Updates

### Like/Unlike Button

```ts
// hooks/mutations/use-toggle-like.ts
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, liked }: { projectId: string; liked: boolean }) =>
      liked
        ? api.delete(`/projects/${projectId}/like`)
        : api.post(`/projects/${projectId}/like`),
    
    onMutate: async ({ projectId, liked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });

      // Snapshot
      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(projectId)
      );

      // Optimistic update
      if (previousProject) {
        queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), {
          ...previousProject,
          liked: !liked,
          likeCount: liked ? previousProject.likeCount - 1 : previousProject.likeCount + 1,
        });
      }

      return { previousProject };
    },
    
    onError: (err, { projectId }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousProject);
      }
      toast.error('Failed to update like');
    },
  });
}

// Usage
function LikeButton({ project }: { project: Project }) {
  const { mutate } = useToggleLike();

  return (
    <button
      onClick={() => mutate({ projectId: project.id, liked: project.liked })}
      className={project.liked ? 'liked' : ''}
    >
      ❤️ {project.likeCount}
    </button>
  );
}
```

---

## Search with Debounce

```ts
// hooks/queries/use-search-users.ts
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue } from 'react';

export function useSearchUsers(query: string) {
  // Debounce the query
  const deferredQuery = useDeferredValue(query);

  return useQuery({
    queryKey: queryKeys.users.list(`search=${deferredQuery}`),
    queryFn: () => api.get<User[]>(`/users?search=${deferredQuery}`),
    enabled: deferredQuery.length >= 3, // only search with 3+ characters
  });
}

// Usage
function UserSearch() {
  const [query, setQuery] = useState('');
  const { data: users, isLoading } = useSearchUsers(query);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {isLoading && <Spinner />}
      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

---

## Prefetching Data

### Prefetch on Hover

```ts
// hooks/queries/use-project.ts
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: () => api.get<Project>(`/projects/${projectId}`),
      staleTime: 60 * 1000, // 1 minute
    });
  };
}

// Usage
function ProjectLink({ projectId, title }: { projectId: string; title: string }) {
  const prefetchProject = usePrefetchProject();

  return (
    <Link
      href={`/projects/${projectId}`}
      onMouseEnter={() => prefetchProject(projectId)}
    >
      {title}
    </Link>
  );
}
```

### Prefetch on Route Change

```ts
// app/projects/page.tsx
export default function ProjectsPage() {
  const prefetchProject = usePrefetchProject();
  const { data: projects } = useProjects();

  useEffect(() => {
    // Prefetch first 5 projects
    projects?.slice(0, 5).forEach((project) => {
      prefetchProject(project.id);
    });
  }, [projects, prefetchProject]);

  return <ProjectsList projects={projects} />;
}
```

---

## Cursor-Based Pagination

```ts
// hooks/queries/use-infinite-projects.ts
interface ProjectsPage {
  projects: Project[];
  nextCursor: string | null;
}

export function useInfiniteProjects(filters?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.projects.list(filters ?? ''),
    queryFn: ({ pageParam }) =>
      api.get<ProjectsPage>(`/projects?cursor=${pageParam ?? ''}&${filters ?? ''}`),
    
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Usage with Intersection Observer
function InfiniteProjectsList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProjects();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <div ref={loadMoreRef} className="loading-trigger">
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </div>
      )}
    </div>
  );
}
```

---

## Offline Support

### Persist Queries to LocalStorage

```ts
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// In your provider
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
```

---

**← Back to:** [README](./README.md)
