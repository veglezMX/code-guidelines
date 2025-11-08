# Best Practices — Zustand

**Goal:** Optimize performance, ensure type safety, and follow DX best practices.

---

## Selector Usage (Avoid Wasteful Renders)

### Prefer Small Selectors

```ts
// ✅ Good: Small, focused selectors
export const useTheme = () => usePreferencesStore((s) => s.theme);
export const useLocale = () => usePreferencesStore((s) => s.locale);

// ❌ Bad: Selecting entire store
const allPrefs = usePreferencesStore();
```

### Use `shallow` for Objects

```ts
import { shallow } from 'zustand/shallow';

// ✅ Good: Use shallow for object selections
export const usePrefs = () =>
  usePreferencesStore((s) => ({ theme: s.theme, locale: s.locale }), shallow);

// ❌ Bad: Creates new object reference on every render
export const usePrefs = () =>
  usePreferencesStore((s) => ({ theme: s.theme, locale: s.locale }));
```

### Extract Selectors to Hooks

```ts
// src/state/selectors/preferences.selectors.ts
import { shallow } from 'zustand/shallow';
import { usePreferencesStore } from '../stores/preferences.store';

export const useTheme = () => usePreferencesStore((s) => s.theme);
export const useLocale = () => usePreferencesStore((s) => s.locale);
export const usePrefs = () =>
  usePreferencesStore((s) => ({ theme: s.theme, locale: s.locale }), shallow);
```

### Derived/Computed Values

```ts
// ✅ Good: Compute inside selector
export const useIsLightTheme = () => 
  usePreferencesStore((s) => s.theme === 'light');

// ✅ Also good: Memoized hook using primitive slices
export const useFormattedDate = () => {
  const locale = useLocale();
  return useMemo(() => new Intl.DateTimeFormat(locale), [locale]);
};
```

---

## Performance Checklist

### Split Stores by Domain

```
✅ Good:
  - session.store.ts    (auth, user)
  - preferences.store.ts (theme, locale)
  - ui.store.ts         (modals, notifications)
  - projects.store.ts   (project entities)

❌ Bad:
  - app.store.ts        (everything)
  - global.store.ts     (too broad)
```

### Subscribe to Minimal Slices

```ts
// ✅ Good: Only subscribes to `count`
const count = useCounter(s => s.count);

// ❌ Bad: Subscribes to entire store, re-renders on any change
const { count } = useCounter();
```

### Use Immer for Safe Updates

```ts
// ✅ Good: Immer handles immutability
set((state) => { state.count += 1; })

// ❌ Bad: Manual spreading is error-prone
set((state) => ({ ...state, count: state.count + 1 }))
```

### Avoid Non-Serializable Objects

```ts
// ❌ Bad: Functions/classes can't be persisted or debugged
interface BadState {
  handler: () => void;
  instance: MyClass;
}

// ✅ Good: Only serializable data
interface GoodState {
  userId: string;
  config: { timeout: number };
}
```

### Export Hook Selectors, Not Stores

```ts
// ✅ Good: Controlled API
export const useTheme = () => usePreferencesStore(s => s.theme);
export const useSetTheme = () => usePreferencesStore(s => s.setTheme);

// ❌ Bad: Consumers can select anything
export { usePreferencesStore };
```

---

## Persistence Strategy

### What to Persist?

**✅ Persist:**
- User preferences (theme, language)
- Auth tokens (if allowed by security policy)
- Last-opened workspace/view
- Draft content (forms, editors)

**❌ Don't persist:**
- Server data/cache (use proper cache invalidation)
- Ephemeral UI state (loading flags, errors)
- Non-serializable objects (functions, class instances)

### Partial Persistence

```ts
persist(
  store,
  {
    name: 'preferences',
    partialize: (state) => ({ 
      theme: state.theme, 
      locale: state.locale 
      // don't persist hasHydrated, isLoading, etc.
    }),
  }
)
```

### Version & Migrate

```ts
persist(
  store,
  {
    name: 'preferences:v2',
    version: 2,
    migrate: (persisted, fromVersion) => {
      if (!persisted) return persisted as any;
      
      if (fromVersion < 2) {
        // Backward-compatible migration
        const { language, ...rest } = persisted as any;
        return { ...rest, locale: language ?? 'en' };
      }
      
      return persisted as any;
    },
  }
)
```

**Rules:**
- Always set a `version`
- Write backward-compatible `migrate` functions
- Bump version on breaking changes
- Keep rollback path simple

### Storage Abstraction

```ts
import { createJSONStorage } from 'zustand/middleware';

// Browser
storage: createJSONStorage(() => localStorage)

// Tests (mock storage)
storage: createJSONStorage(() => ({
  getItem: (key) => mockStorage[key],
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; },
}))
```

---

## SSR & Hydration (React 19)

### Server: Vanilla Stores

```ts
import { createStore } from 'zustand/vanilla';

export const createPreferencesStore = (initial?: Partial<PreferencesState>) =>
  createStore<PreferencesState>(
    immer((set) => ({
      theme: initial?.theme ?? 'system',
      locale: initial?.locale ?? 'en',
      // actions...
    }))
  );

// Server-side: create per request
const store = createPreferencesStore({ theme: 'dark' });
const serializedState = JSON.stringify(store.getState());
// Pass to HTML payload
```

### Client: Hydration Guard

```ts
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    immer((set) => ({
      theme: 'system',
      locale: 'en',
      hasHydrated: false, // ← hydration flag
      markHydrated: () => set((s) => { s.hasHydrated = true; }),
      // ...
    })),
    {
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

// Component
export function ThemeSwitcher() {
  const hasHydrated = usePreferencesStore(s => s.hasHydrated);
  const theme = usePreferencesStore(s => s.theme);
  
  if (!hasHydrated) return <div>Loading...</div>;
  
  return <div>Theme: {theme}</div>;
}
```

**Key points:**
- Gate UI with `hasHydrated` to prevent flicker
- Avoid reading `localStorage` on the server
- Keep `persist` inside client-only modules

---

## Testing Strategy

### Use Vanilla Stores

```ts
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';

type Counter = { 
  n: number; 
  inc: () => void; 
  reset: () => void; 
};

export const createCounterStore = (initial = 0) =>
  createStore<Counter>(
    immer((set) => ({
      n: initial,
      inc: () => set((state) => { state.n += 1; }),
      reset: () => set((state) => { state.n = 0; }),
    }))
  );

// Test
describe('Counter Store', () => {
  it('should increment', () => {
    const store = createCounterStore(5);
    store.getState().inc();
    expect(store.getState().n).toBe(6);
  });
});
```

### Provide Reset Helpers

```ts
const initial = { theme: 'system' as const, locale: 'en', hasHydrated: false };

const useStore = create<State>()(
  immer((set) => ({
    ...initial,
    reset: () => set((state) => {
      Object.assign(state, initial);
    })
  }))
);

// Test
beforeEach(() => {
  useStore.getState().reset();
});
```

### Mock Persistence in Tests

```ts
const mockStorage = new Map<string, string>();

const storage = createJSONStorage(() => ({
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, value) => mockStorage.set(key, value),
  removeItem: (key) => mockStorage.delete(key),
}));

const useStore = create(
  persist(immer(store), { name: 'test', storage })
);
```

---

## Type Safety & Linting

### Explicit Return Types for Actions

```ts
// ✅ Good
setTheme: (t: Theme) => void
signIn: (email: string, pwd: string) => Promise<void>

// ❌ Bad (implicit any)
setTheme: (t) => { }
```

### Use Type Unions for Modes

```ts
// ✅ Good: Discriminated union
type Theme = 'light' | 'dark' | 'system';

// ❌ Bad: Loose string
theme: string;
```

### ESLint Rules

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-confusing-void-expression": "error"
  }
}
```

---

## Troubleshooting

### "Hydration mismatch / flicker"
**Problem:** UI shows wrong value briefly before persistence loads.  
**Solution:** Gate UI with `hasHydrated` flag; avoid reading `localStorage` on server.

```ts
if (!hasHydrated) return <Skeleton />;
```

### "Too many re-renders"
**Problem:** Component re-renders on unrelated state changes.  
**Solution:** Use small selectors; add `shallow` for object selections.

```ts
// ✅ Good
const theme = useStore(s => s.theme);

// ❌ Bad
const { theme } = useStore();
```

### "Persist migration broke users"
**Problem:** Users' persisted state is incompatible after update.  
**Solution:** Bump `version`, write backward-compatible `migrate`.

```ts
migrate: (state, fromVersion) => {
  if (fromVersion < 2) {
    return { ...state, newField: 'default' };
  }
  return state;
}
```

### "Devtools shows noisy actions"
**Problem:** Too many unnamed actions cluttering timeline.  
**Solution:** Name significant actions; batch related updates.

```ts
set((state) => { /* mutations */ }, false, 'module/actionName')
```

---

**Next:** [Playbook](./playbook.md) →
