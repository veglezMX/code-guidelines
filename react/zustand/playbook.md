# Playbook — Zustand

**Goal:** Copy-paste recipes and real-world examples for common **client state** scenarios.

> **Important:** For server state (API fetching, caching, mutations), use [TanStack Query](../tanstack-query/server-state-guide.md) instead.

---

## Recipe: Counter Store

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

// Usage in component
function Counter() {
  const count = useCounter(s => s.count);
  const increment = useCounter(s => s.increment);
  return <button onClick={increment}>Count: {count}</button>;
}
```

---

## Recipe: Session Store (Client State Only)

> **Note:** For authentication API calls, use [TanStack Query mutations](../tanstack-query/server-state-guide.md). This store only holds the client-side session state.

```ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User {
  id: string;
  email: string;
  name: string;
}

interface SessionState {
  user: User | null;
  token: string | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

export const useSession = create<SessionState>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        token: null,
        setSession: (token, user) => set((s) => {
          s.token = token;
          s.user = user;
        }, false, 'session/setSession'),
        clearSession: () => set((s) => {
          s.user = null;
          s.token = null;
        }, false, 'session/clearSession'),
      })),
      {
        name: 'session:v1',
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({ token: s.token, user: s.user }),
      }
    ),
    { name: 'session' }
  )
);

// Selectors
export const useUser = () => useSession(s => s.user);
export const useIsAuthenticated = () => useSession(s => !!s.token);
```

**Usage with TanStack Query:**
```ts
// In your component
const { mutate: signIn } = useSignInMutation({
  onSuccess: ({ token, user }) => {
    useSession.getState().setSession(token, user);
  }
});

const { mutate: signOut } = useSignOutMutation({
  onSuccess: () => {
    useSession.getState().clearSession();
  }
});
```

---

## Recipe: Theme Preferences Store

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Theme = 'light' | 'dark' | 'system';

interface PreferencesState {
  theme: Theme;
  locale: string;
  hasHydrated: boolean;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: string) => void;
  markHydrated: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    immer((set) => ({
      theme: 'system',
      locale: 'en',
      hasHydrated: false,
      setTheme: (theme) => set((s) => { s.theme = theme; }),
      setLocale: (locale) => set((s) => { s.locale = locale; }),
      markHydrated: () => set((s) => { s.hasHydrated = true; }),
    })),
    {
      name: 'preferences:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    }
  )
);

// Selectors
export const useTheme = () => usePreferences(s => s.theme);
export const useLocale = () => usePreferences(s => s.locale);
export const useHasHydrated = () => usePreferences(s => s.hasHydrated);
```

---

## Recipe: Modal Management Store

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ModalState {
  isOpen: boolean;
  data?: Record<string, any>;
}

interface ModalsState {
  modals: Record<string, ModalState>;
  openModal: (key: string, data?: Record<string, any>) => void;
  closeModal: (key: string) => void;
  isModalOpen: (key: string) => boolean;
}

export const useModals = create<ModalsState>()(
  immer((set, get) => ({
    modals: {},
    openModal: (key, data) => set((s) => {
      s.modals[key] = { isOpen: true, data };
    }),
    closeModal: (key) => set((s) => {
      s.modals[key] = { isOpen: false };
    }),
    isModalOpen: (key) => get().modals[key]?.isOpen ?? false,
  }))
);

// Usage
function MyComponent() {
  const openModal = useModals(s => s.openModal);
  const closeModal = useModals(s => s.closeModal);
  const isOpen = useModals(s => s.isModalOpen('confirm-delete'));
  
  return (
    <>
      <button onClick={() => openModal('confirm-delete', { itemId: 123 })}>
        Delete
      </button>
      {isOpen && (
        <ConfirmDialog onClose={() => closeModal('confirm-delete')} />
      )}
    </>
  );
}
```

---

## Recipe: Notification/Toast Store

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface NotificationsState {
  notifications: Notification[];
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotifications = create<NotificationsState>()(
  immer((set, get) => ({
    notifications: [],
    addNotification: (message, type = 'info') => {
      const id = crypto.randomUUID();
      set((s) => {
        s.notifications.push({ id, message, type });
      });
      // Auto-remove after 5 seconds
      setTimeout(() => {
        get().removeNotification(id);
      }, 5000);
    },
    removeNotification: (id) => set((s) => {
      s.notifications = s.notifications.filter(n => n.id !== id);
    }),
    clearAll: () => set((s) => { s.notifications = []; }),
  }))
);

// Usage
function MyComponent() {
  const addNotification = useNotifications(s => s.addNotification);
  
  const handleSave = async () => {
    try {
      await saveData();
      addNotification('Saved successfully!', 'success');
    } catch (err) {
      addNotification('Failed to save', 'error');
    }
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

---

## Recipe: Form State Store

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormState {
  data: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  isDirty: boolean;
  setField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  setError: <K extends keyof FormData>(field: K, error: string) => void;
  clearError: <K extends keyof FormData>(field: K) => void;
  reset: () => void;
}

const initialData: FormData = {
  email: '',
  password: '',
  rememberMe: false,
};

export const useLoginForm = create<FormState>()(
  immer((set) => ({
    data: initialData,
    errors: {},
    isDirty: false,
    setField: (field, value) => set((s) => {
      s.data[field] = value;
      s.isDirty = true;
      delete s.errors[field]; // clear error on change
    }),
    setError: (field, error) => set((s) => {
      s.errors[field] = error;
    }),
    clearError: (field) => set((s) => {
      delete s.errors[field];
    }),
    reset: () => set((s) => {
      s.data = initialData;
      s.errors = {};
      s.isDirty = false;
    }),
  }))
);
```

**Usage with TanStack Query mutation:**
```ts
function LoginForm() {
  const { data, errors, setField } = useLoginForm();
  const { mutate: signIn, isPending } = useSignInMutation({
    onError: (error) => {
      useLoginForm.getState().setError('email', error.message);
    }
  });

  const handleSubmit = () => {
    signIn(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={data.email}
        onChange={(e) => setField('email', e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}
      <button disabled={isPending}>Sign In</button>
    </form>
  );
}
```

---

## Recipe: Resettable Store Template

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type StoreWithReset<S> = S & { reset: () => void };

export const createResettableStore = <S extends object>(
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
const initialCounter = { count: 0 };
export const useCounter = createResettableStore(initialCounter, 'counter');
```

---

## Recipe: Subscribe to Changes (Outside React)

```ts
import { usePreferencesStore } from './stores/preferences.store';

// Subscribe to specific slice
const unsubscribe = usePreferencesStore.subscribe(
  (state) => state.theme,
  (theme) => {
    console.log('Theme changed to:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
);

// Later: cleanup
unsubscribe();
```

---

## Recipe: SSR with Vanilla Store

```ts
// stores/counter.store.ts
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';

export interface CounterState {
  count: number;
  increment: () => void;
}

export const createCounterStore = (initialCount = 0) =>
  createStore<CounterState>(
    immer((set) => ({
      count: initialCount,
      increment: () => set((s) => { s.count += 1; }),
    }))
  );

// Server-side (Next.js example)
export async function getServerSideProps() {
  const store = createCounterStore(10);
  return {
    props: {
      initialState: store.getState(),
    },
  };
}

// Client-side hydration
import { create } from 'zustand';

export const useCounter = create<CounterState>()(
  immer((set) => ({
    count: 0, // will be replaced by hydration
    increment: () => set((s) => { s.count += 1; }),
  }))
);

// In component
function Counter({ initialState }) {
  useEffect(() => {
    useCounter.setState(initialState);
  }, []);
  
  const count = useCounter(s => s.count);
  return <div>{count}</div>;
}
```

---

**Next:** [Governance Guide](./governance.md) →
