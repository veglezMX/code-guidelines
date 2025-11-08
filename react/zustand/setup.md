# Setup — Zustand

**Goal:** Install dependencies, configure project structure, and prepare your workspace for Zustand.

---

## Installation

### Dependencies

```bash
pnpm add zustand immer
```

**Required:**
- `zustand` — State management library
- `immer` — Immutable updates middleware (mandatory in our stack)

**Optional:**
- If using DevTools in development, ensure you have the Redux DevTools browser extension installed

---

## Folder Structure

### Single Repo

```
src/
  state/
    index.ts                 # re-exports of public hooks/selectors for consumers
    stores/
      ui.store.ts            # ephemeral UI state (drawers, modals, toasts)
      session.store.ts       # auth/session (token, profile) + persistence
      preferences.store.ts   # user prefs (theme, language) + persistence + versioned migrations
      entities/
        projects.store.ts    # normalized entities or cache for fetched data
    selectors/
      preferences.selectors.ts
      session.selectors.ts
    utils/
      with-persist.ts        # thin wrapper for persist config defaults
      with-devtools.ts       # thin wrapper to name/store actions in devtools
      ssr.ts                 # helpers to create vanilla stores per-request
```

### Monorepo

Mirror the same structure per package:

```
packages/
  web/
    src/
      state/
        stores/
        selectors/
  admin/
    src/
      state/
        stores/
        selectors/
```

**Principle:** Keep **feature/domain ownership** clear. Avoid sharing stores across packages unless absolutely necessary.

---

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  }
}
```

This ensures proper type inference for Zustand stores.

---

## ESLint Configuration

Add these rules to catch common pitfalls:

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-confusing-void-expression": "error"
  }
}
```

**Optional:** Consider `eslint-plugin-boundaries` to prevent cross-domain imports between stores.

---

## DevTools Setup

### Browser Extension

Install the Redux DevTools extension:
- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Enable in Stores

Use the `devtools` middleware:

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useStore = create<State>()(
  devtools(
    immer((set) => ({
      // state and actions
    })),
    { name: 'MyStore' } // appears in DevTools
  )
);
```

---

## Optional: Create Helper Utilities

### `src/state/utils/with-persist.ts`

Wrapper for consistent persistence config:

```ts
import { persist, createJSONStorage } from 'zustand/middleware';

export const withPersist = <T>(
  name: string,
  version: number,
  partialize?: (state: T) => Partial<T>
) =>
  persist<T>(
    // store creator goes here
    {} as any,
    {
      name,
      version,
      storage: createJSONStorage(() => localStorage),
      partialize,
    }
  );
```

### `src/state/utils/ssr.ts`

Helpers for SSR with vanilla stores:

```ts
import { createStore } from 'zustand/vanilla';

export const createSSRStore = <T>(initializer: () => T) => {
  if (typeof window === 'undefined') {
    // Server: create a new store per request
    return createStore(initializer);
  }
  // Client: use singleton
  return createStore(initializer);
};
```

---

## Verification

Create a test store to verify setup:

```ts
// src/state/stores/counter.store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface CounterState {
  count: number;
  increment: () => void;
}

export const useCounter = create<CounterState>()(
  immer((set) => ({
    count: 0,
    increment: () => set((state) => { state.count += 1; })
  }))
);
```

Use in a component:

```tsx
import { useCounter } from '@/state/stores/counter.store';

export function Counter() {
  const count = useCounter(s => s.count);
  const increment = useCounter(s => s.increment);
  
  return <button onClick={increment}>Count: {count}</button>;
}
```

---

**Next:** [Patterns Guide](./patterns.md) →
