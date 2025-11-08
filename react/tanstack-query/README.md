# TanStack Query Guidelines

**Stack:** React 19, TypeScript 5, TanStack Query v5  

---

## 📚 Documentation Structure

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[Setup](./setup.md)** | Installation, provider setup, configuration | Starting a new project or onboarding |
| **[API Client](./api-client-guide.md)** | Centralized API client, interceptors, auth | Setting up API layer |
| **[TypeScript Guide](./typescript-guide.md)** | Type-safe APIs, factories, naming conventions | Writing type-safe code |
| **[Patterns](./patterns.md)** | Query & mutation patterns, infinite queries | Building features daily |
| **[Recipes](./recipes.md)** | Common scenarios & real-world examples | Need a quick solution |

---

## 🎯 Quick Start

**New to TanStack Query?** Start here:
1. Read [Why TanStack Query](#why-tanstack-query) below
2. Follow [Setup](./setup.md) to install and configure
3. Read [API Client Guide](./api-client-guide.md) to setup your API layer
4. Learn core [Patterns](./patterns.md) for queries and mutations
5. Review [TypeScript Guide](./typescript-guide.md) for type safety
6. Copy templates from [Recipes](./recipes.md)

---

## What This Guide Covers

This guide focuses on **server state management** using TanStack Query (formerly React Query). Use this for:

- ✅ API data fetching and caching
- ✅ Server mutations (POST, PUT, DELETE)
- ✅ Automatic background refetching
- ✅ Optimistic updates
- ✅ Infinite queries and pagination

For **client state** (UI state, preferences, session), use [Zustand](../zustand/README.md).

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

### TankStack vs Manual Fetching in Zustand
| TanStack Query | Zustand (manual fetch) |
|----------------|------------------------|
| Automatic caching & invalidation | Manual cache management |
| Built-in loading/error states | Manual state tracking |
| Background refetching | Manual refetch logic |
| Request deduplication | No deduplication |
| Optimistic updates built-in | Manual optimistic logic |

**Rule:** Server state → TanStack Query. Client state → Zustand.

---

## Core Principles

### 1. **Type Everything**
Use explicit TypeScript types for all API responses, inputs, and errors:
```ts
interface User {
  id: string;
  email: string;
  name: string;
}

const { data } = useQuery({
  queryKey: ['users', userId],
  queryFn: () => api.get<User>(`/users/${userId}`), // ← typed
});
```

### 2. **Use Query Key Factories**
Create type-safe, hierarchical query keys:
```ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
  },
} as const;
```

### 3. **Invalidate After Mutations**
Always invalidate related queries after mutations:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
}
```

### 4. **Handle Loading & Error States**
Always provide feedback for loading and error states:
```ts
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
```

### 5. **Use Custom Hooks**
Encapsulate queries and mutations in custom hooks:
```ts
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`),
  });
}
```

---

## Quick Examples

### Basic Query
```ts
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{user.name}</div>;
}
```

### Basic Mutation
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateProject() {
  const queryClient = useQueryClient();
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data) => fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <button onClick={() => mutate({ title: 'New Project' })} disabled={isPending}>
      {isPending ? 'Creating...' : 'Create'}
    </button>
  );
}
```

More examples in [Recipes](./recipes.md).

---

## When NOT to Use TanStack Query

**Don't use TanStack Query for:**
- ❌ Client-only state (UI toggles, form inputs) → Use [Zustand](../zustand/README.md)
- ❌ URL state (filters, pagination params) → Use URL search params
- ❌ Form state → Use React Hook Form or Zustand
- ❌ WebSocket/real-time streams → Use custom hooks or libraries like Socket.io

**Use TanStack Query only for:**
- ✅ REST API data fetching
- ✅ Server mutations
- ✅ Cached server data

---

## Best Practices Summary

### ✅ Do's
- Type all API responses explicitly
- Use query key factories
- Create custom hooks for queries/mutations
- Invalidate queries after mutations
- Handle loading and error states
- Use `enabled` for conditional queries
- Implement optimistic updates for UX

### ❌ Don'ts
- Don't use for client-only state
- Don't use string literals for query keys
- Don't ignore TypeScript errors
- Don't mutate without invalidation
- Don't use `any` types
- Don't skip loading states

---

## Getting Help

- **Setup issues?** Check [Setup Guide](./setup.md)
- **Pattern questions?** See [Patterns Guide](./patterns.md)
- **TypeScript errors?** Review [TypeScript Guide](./typescript-guide.md)
- **Need examples?** Browse [Recipes](./recipes.md)

---

**Next:** [Setup Guide](./setup.md) →
