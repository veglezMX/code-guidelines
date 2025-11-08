# Patterns — Zustand

**Goal:** Core store patterns, middleware composition, and type-safe architecture.

---

## Basic Store Pattern

### Simple State

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounter = create<CounterState>()(
  immer((set) => ({
    count: 0,
    increment: () => set((state) => { state.count += 1; }),
    decrement: () => set((state) => { state.count -= 1; }),
    reset: () => set((state) => { state.count = 0; }),
  }))
);
```

**Key points:**
- Use `immer` middleware for all stores
- Mutate the `state` draft directly
- Group related state and actions together

---

## Persistent Store Pattern

```ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Theme = 'light' | 'dark' | 'system';

export interface PreferencesState {
  theme: Theme;
  locale: string;
  hasHydrated: boolean; // hydration guard
  setTheme: (t: Theme) => void;
  setLocale: (l: string) => void;
  markHydrated: () => void;
}

const name = 'preferences:v2'; // bump on breaking changes

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          theme: 'system' as Theme,
          locale: 'en',
          hasHydrated: false,
          setTheme: (t) => set((state) => { state.theme = t; }, false, 'preferences/setTheme'),
          setLocale: (l) => set((state) => { state.locale = l; }, false, 'preferences/setLocale'),
          markHydrated: () => set((state) => { state.hasHydrated = true; }, false, 'preferences/markHydrated'),
        }))
      ),
      {
        name,
        version: 2,
        storage: createJSONStorage(() => localStorage),
        onRehydrateStorage: () => (state) => {
          // runs after hydration
          state?.markHydrated();
        },
        migrate: (persisted, fromVersion) => {
          if (!persisted) return persisted as any;
          if (fromVersion < 2) {
            // example: rename 'language' -> 'locale'
            const { language, ...rest } = persisted as any;
            return { ...rest, locale: language ?? 'en' };
          }
          return persisted as any;
        },
        partialize: (s) => ({ theme: s.theme, locale: s.locale }), // don't persist flags
      }
    ),
    { name: 'preferences' }
  )
);
```

**Key points:**
- **`immer`** enables draft mutation syntax
- **`subscribeWithSelector`** for fine-grained subscriptions
- **`partialize`** keeps persisted payload small
- **`hasHydrated`** prevents UI flicker before persistence loads
- **`version + migrate`** for safe, incremental persistence
- **`devtools`** with action names for debugging

---

## Async Actions Pattern (Client-Side Only)

> **Note:** For server state (API fetching, caching, etc.), use [TanStack Query](../tanstack-query/server-state-guide.md) instead. Zustand is for **client state** only.

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User { 
  id: string; 
  email: string; 
}

interface SessionState {
  user: User | null;
  token: string | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    immer((set) => ({
      user: null,
      token: null,
      setSession: (token, user) => {
        set((state) => {
          state.token = token;
          state.user = user;
        }, false, 'session/setSession');
      },
      clearSession: () => {
        set((state) => {
          state.token = null;
          state.user = null;
        }, false, 'session/clearSession');
      },
    })),
    { name: 'session' }
  )
);
```

**Key points:**
- Store **client state** only (auth tokens, user profile)
- Use `get()` to read current state
- Use `set()` with Immer's draft mutation
- Name actions in devtools (third parameter)
- For API calls, use TanStack Query and update Zustand stores as needed

**Example with TanStack Query integration:**
```ts
// In your component
const { mutate: signIn } = useSignInMutation({
  onSuccess: (data) => {
    // Update Zustand store after successful API call
    useSessionStore.getState().setSession(data.token, data.user);
  }
});
```

---

## Complex Nested State Pattern

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ModalState {
  isOpen: boolean;
  data?: Record<string, any>;
}

type UIState = { 
  modals: Record<string, ModalState>;
  notifications: Array<{ id: string; message: string }>;
};

interface UIActions {
  openModal: (key: string, data?: Record<string, any>) => void;
  closeModal: (key: string) => void;
  addNotification: (message: string) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    immer((set) => ({
      modals: {},
      notifications: [],
      openModal: (key, data) => set((state) => { 
        state.modals[key] = { isOpen: true, data }; 
      }, false, 'ui/openModal'),
      closeModal: (key) => set((state) => { 
        state.modals[key] = { isOpen: false }; 
      }, false, 'ui/closeModal'),
      addNotification: (message) => set((state) => {
        state.notifications.push({ id: crypto.randomUUID(), message });
      }, false, 'ui/addNotification'),
      removeNotification: (id) => set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      }, false, 'ui/removeNotification'),
    })),
    { name: 'ui' }
  )
);
```

**Key points:**
- Immer handles deeply nested mutations safely
- Direct mutation syntax: `state.modals[key] = ...`
- Array methods like `push()` work directly
- For filtering, reassign: `state.notifications = ...`

---

## Middleware Composition Order

**Recommended order:**

```ts
create<State>()(
  devtools(           // outermost: for debugging
    persist(          // persistence layer
      subscribeWithSelector(  // enables selective subscriptions
        immer(        // innermost: enables draft mutations
          (set, get) => ({ /* state */ })
        )
      ),
      { /* persist config */ }
    ),
    { name: 'storeName' }
  )
);
```

**Why this order?**
- `devtools` wraps everything to capture all actions
- `persist` sits before subscriptions to handle rehydration
- `subscribeWithSelector` enables fine-grained subscriptions
- `immer` is innermost to provide draft mutations to your store logic

---

## Vanilla Store Pattern (SSR)

```ts
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';

interface CounterState {
  count: number;
  increment: () => void;
}

export const createCounterStore = (initialCount = 0) =>
  createStore<CounterState>(
    immer((set) => ({
      count: initialCount,
      increment: () => set((state) => { state.count += 1; }),
    }))
  );

// Server-side usage
const store = createCounterStore(10);
store.getState().count; // 10
store.getState().increment();
```

**Key points:**
- Use `createStore` from `zustand/vanilla` for SSR
- Create a new store per request on the server
- Hydrate on the client with initial server state

---

## Type-Safe Store Template

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type StoreWithReset<S> = S & { reset: () => void };

export const createResetableStore = <S extends object>(
  initialState: S,
  name: string
) =>
  create<StoreWithReset<S>>()(
    immer((set) => ({
      ...initialState,
      reset: () => set((state) => {
        Object.assign(state, initialState);
      }, false, `${name}/reset`),
    }))
  );

// Usage
const initial = { count: 0, name: 'Counter' };
export const useCounter = createResetableStore(initial, 'counter');
```

---

**Next:** [Best Practices Guide](./best-practices.md) →
