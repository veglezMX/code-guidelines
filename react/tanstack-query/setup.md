# Setup — TanStack Query

**Goal:** Install dependencies, configure the QueryClient provider, and set up your development environment.

---

## Installation

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

**Required:**
- `@tanstack/react-query` — Core library

**Development:**
- `@tanstack/react-query-devtools` — Browser DevTools for debugging

---

## Provider Setup

### React 19 / Next.js App Router

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

### React 18 / Vite / CRA

```tsx
// src/main.tsx or src/index.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## QueryClient Configuration

### Default Options Explained

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (won't refetch)
      staleTime: 60 * 1000, // 1 minute
      
      // How long unused data stays in cache
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      
      // Number of retry attempts on failure
      retry: 1, // only retry once
      
      // Refetch when window regains focus
      refetchOnWindowFocus: false, // disable for better UX
      
      // Refetch on network reconnect
      refetchOnReconnect: true,
      
      // Refetch on component mount
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 0, // don't retry mutations by default
    },
  },
});
```

### Custom Configuration Per Environment

```ts
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: process.env.NODE_ENV === 'development' ? 0 : 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: process.env.NODE_ENV === 'production' ? 2 : 0,
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      },
    },
  });
}
```

---

## DevTools Setup

### Browser Extension (Optional)

Install the TanStack Query DevTools browser extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-query-devtools)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-query-devtools/)

### In-App DevTools

The `<ReactQueryDevtools />` component provides an in-app panel:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools 
  initialIsOpen={false} 
  position="bottom-right" 
/>
```

**Features:**
- View all queries and their state
- Inspect query data
- Trigger refetches manually
- View query invalidation events
- Monitor network requests

---

## Folder Structure

### Recommended Structure

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

### Monorepo Structure

```
packages/
  web/
    src/
      hooks/queries/
      hooks/mutations/
      lib/
  admin/
    src/
      hooks/queries/
      hooks/mutations/
      lib/
  shared/
    src/
      types/api.ts      # Shared types
      lib/api-client.ts # Shared API client
```

---

## Environment Variables

### API Base URL

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```env
# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
```

Usage in API client:

```ts
// lib/api-client.ts
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? '';
```

---

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

This ensures proper type inference for TanStack Query hooks.

---

## ESLint Configuration (Optional)

Add the official ESLint plugin:

```bash
pnpm add -D @tanstack/eslint-plugin-query
```

```json
// .eslintrc.json
{
  "extends": ["plugin:@tanstack/eslint-plugin-query/recommended"]
}
```

**Benefits:**
- Warns about missing `queryKey` dependencies
- Detects potential performance issues
- Enforces best practices

---

## Verification

Create a test query to verify setup:

```tsx
// app/test/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export default function TestPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/users/1');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

Visit `/test` and:
1. Check that data loads
2. Open DevTools (bottom-right button)
3. Verify the query appears in the panel

---

## Next Steps

1. ✅ Setup complete
2. → Learn [Core Patterns](./patterns.md)
3. → Review [TypeScript Guide](./typescript-guide.md)
4. → Browse [Recipes](./recipes.md)

---

**Next:** [Patterns Guide](./patterns.md) →
