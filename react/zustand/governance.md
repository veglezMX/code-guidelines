# Governance — Zustand

**Goal:** Team standards, review criteria, and architectural decisions.

---

## Review Checklist

Use this checklist when reviewing PRs that introduce or modify Zustand stores:

### ✅ Store Structure
- [ ] Store is **domain-scoped** (not too broad, not too narrow)
- [ ] Uses the **`immer` middleware** for all state updates
- [ ] State shape is **serializable** (no functions, classes, or DOM nodes in state)
- [ ] Actions are colocated with state in the same store file

### ✅ Type Safety
- [ ] Store has explicit **TypeScript types** for state and actions
- [ ] Action parameters have **explicit types** (no implicit `any`)
- [ ] Return types are explicit: `() => void` or `() => Promise<void>`
- [ ] Uses **discriminated unions** for mode/status fields (not loose strings)

### ✅ Persistence
- [ ] If persisted, uses `version` number
- [ ] If persisted, implements `migrate` function
- [ ] If persisted, uses `partialize` to exclude ephemeral state
- [ ] If persisted, includes `hasHydrated` flag and hydration guard in UI

### ✅ Performance
- [ ] Public API exports **selector hooks**, not raw store
- [ ] Selectors are small and focused
- [ ] Object selections use `shallow` comparator
- [ ] No unnecessary re-renders (verified with React DevTools)

### ✅ DevTools
- [ ] Uses `devtools` middleware with named store
- [ ] Important actions have **named actions** (third parameter in `set`)
- [ ] Action names follow pattern: `domain/actionName` or `domain/actionName:phase`

### ✅ Testing
- [ ] Store exports a factory function or vanilla creator for tests
- [ ] Includes a `reset()` action for deterministic testing
- [ ] Tests use vanilla stores (not React hooks)
- [ ] Tests don't depend on real localStorage

### ✅ SSR (if applicable)
- [ ] No direct `window` or `localStorage` access in store initialization
- [ ] Uses `hasHydrated` flag to prevent UI flicker
- [ ] Vanilla store factory available for server-side usage

### ✅ Documentation
- [ ] Store purpose is clear from filename and types
- [ ] Complex logic has comments
- [ ] Public API is documented in `src/state/README.md` or similar

---

## Standards

### Naming Conventions

**Store files:**
```
✅ preferences.store.ts
✅ session.store.ts
✅ ui.store.ts
❌ PreferencesStore.ts (PascalCase not needed)
❌ prefs.ts (not clear it's a store)
```

**Selector files:**
```
✅ preferences.selectors.ts
✅ session.selectors.ts
❌ usePreferences.ts (not clear it contains multiple selectors)
```

**Hook names:**
```
✅ useTheme
✅ useSetTheme
✅ useIsAuthenticated
❌ getTheme (not a hook)
❌ theme (not descriptive)
```

**Action names (devtools):**
```
✅ 'preferences/setTheme'
✅ 'session/signIn:start'
✅ 'session/signIn:success'
✅ 'ui/openModal'
❌ 'setTheme' (no domain context)
❌ 'SET_THEME' (not necessary to uppercase)
```

### File Organization

```
src/state/
  index.ts              # Public API: re-export selectors
  stores/
    preferences.store.ts
    session.store.ts
    ui.store.ts
    entities/
      projects.store.ts
  selectors/
    preferences.selectors.ts
    session.selectors.ts
  utils/
    with-persist.ts     # Reusable persistence config
    ssr.ts              # SSR helpers
  README.md             # Documentation
```

### Public API Pattern

```ts
// src/state/index.ts
export { useTheme, useLocale, useSetTheme } from './selectors/preferences.selectors';
export { useUser, useIsAuthenticated, useSignIn } from './selectors/session.selectors';
// DO NOT export raw stores
```

**Usage in components:**
```ts
// ✅ Good: Import from public API
import { useTheme, useSetTheme } from '@/state';

// ❌ Bad: Direct store import
import { usePreferencesStore } from '@/state/stores/preferences.store';
```

---

## Architectural Decisions

### When to Create a New Store

**Create a new store when:**
- Different **domain/feature** (preferences vs. session vs. projects)
- Different **lifecycle** (ephemeral UI vs. persisted preferences)
- Different **update frequency** (fast-changing notifications vs. stable config)
- Different **ownership** (team A owns feature X, team B owns feature Y)

**Keep in same store when:**
- Tightly coupled state (modal open state + modal data)
- Actions frequently update multiple fields together
- Small, cohesive domain (theme + locale both are preferences)

### Store Size Guidelines

**Target:** 50-200 lines per store (including actions)

**Too small:** 10 lines → probably over-split  
**Too large:** 500+ lines → likely needs domain split

### When to Use Zustand vs. React Context

| Zustand | React Context |
|---------|---------------|
| Global state (many components) | Scoped state (subtree) |
| Frequent updates | Infrequent updates |
| Needs persistence | Doesn't need persistence |
| Needs DevTools | Doesn't need DevTools |
| Cross-cutting concerns | Component composition |

**Example:**
- ✅ Zustand: Auth session, theme, notifications
- ✅ Context: Form wizard state, modal controller

### When to Use Zustand vs. URL State

| Zustand | URL State |
|---------|-----------|
| User preferences | Page/view selection |
| Ephemeral UI (modals) | Shareable state (filters) |
| Private state | Public/linkable state |

**Example:**
- ✅ Zustand: Sidebar collapsed, theme
- ✅ URL: Search query, page number, sort order

---

## Common Anti-Patterns

### ❌ God Store (Everything in One Store)

```ts
// ❌ Bad: Single store for entire app
interface AppState {
  user: User;
  preferences: Preferences;
  projects: Project[];
  ui: UIState;
  // ... 50 more fields
}
```

**Fix:** Split by domain into multiple stores.

### ❌ Selecting Entire Store

```ts
// ❌ Bad: Re-renders on any change
const state = useStore();
```

**Fix:** Select minimal slices.

### ❌ Creating Selectors Inline

```ts
// ❌ Bad: New function on every render
useStore(s => ({ theme: s.theme, locale: s.locale }))
```

**Fix:** Extract to reusable hook with `shallow`.

### ❌ Mutating Without Immer

```ts
// ❌ Bad: Direct mutation without Immer
create((set) => ({
  count: 0,
  increment: () => set((s) => { s.count++; return s; }) // ← broken
}))
```

**Fix:** Always wrap with `immer` middleware.

### ❌ Persisting Everything

```ts
// ❌ Bad: Persisting loading/error flags
persist(store, { name: 'app' }) // no partialize
```

**Fix:** Use `partialize` to exclude ephemeral state.

### ❌ No Version on Persisted Store

```ts
// ❌ Bad: No version or migrate
persist(store, { name: 'prefs' })
```

**Fix:** Always set `version` and `migrate`.

---

## Migration Path from Redux

If migrating from Redux:

1. **Start small:** Migrate one slice at a time (e.g., UI state first)
2. **Keep Redux for complex flows:** Don't force-migrate state machines
3. **Use similar patterns:** Keep action naming conventions for familiarity
4. **Add DevTools:** Use `devtools` middleware to maintain debugging experience
5. **Document differences:** Add migration guide for team

**Example migration:**

```ts
// Before (Redux Toolkit)
const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: { theme: 'system' },
  reducers: {
    setTheme: (state, action) => { state.theme = action.payload; }
  }
});

// After (Zustand)
const usePreferences = create<PreferencesState>()(
  immer((set) => ({
    theme: 'system',
    setTheme: (theme) => set((s) => { s.theme = theme; }, false, 'preferences/setTheme')
  }))
);
```

---

## Code Review Examples

### ✅ Good PR

```ts
// preferences.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Theme = 'light' | 'dark' | 'system';

interface PreferencesState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    immer((set) => ({
      theme: 'system',
      setTheme: (theme) => set((s) => { s.theme = theme; }),
    })),
    {
      name: 'preferences:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// preferences.selectors.ts
export const useTheme = () => usePreferencesStore(s => s.theme);
export const useSetTheme = () => usePreferencesStore(s => s.setTheme);
```

**Why it's good:**
- ✅ Domain-scoped (preferences)
- ✅ Uses Immer
- ✅ Typed with TypeScript
- ✅ Versioned persistence
- ✅ Exports selectors

### ❌ Bad PR

```ts
// app.store.ts
export const useAppStore = create((set) => ({
  theme: 'light',
  user: null,
  projects: [],
  isLoading: false,
  setTheme: (t) => set({ theme: t }),
  setUser: (u) => set({ user: u }),
  // ... 20 more actions
}));

// Component usage
const app = useAppStore();
```

**Why it's bad:**
- ❌ God store (too broad)
- ❌ No Immer middleware
- ❌ No TypeScript types
- ❌ No persistence version
- ❌ Selects entire store

---

## What "Good" Looks Like

### Summary Checklist

When a store is ready to merge, it should have:

- [x] Domain-scoped and small (50-200 lines)
- [x] All stores use the **Immer middleware**
- [x] Explicit TypeScript types
- [x] Public API via **selector hooks**
- [x] Persistence with `version`, `migrate`, and `partialize`
- [x] Hydration guarded with `hasHydrated`
- [x] DevTools with named actions
- [x] Tests using vanilla stores and reset helpers
- [x] Performance verified (minimal selectors, `shallow` for objects)
- [x] No server-only code in client stores (and vice-versa)
- [x] Clear documentation in `src/state/README.md`

---

## When to Prefer Redux Toolkit

Choose Redux Toolkit if you need:

- **Strict governance:** Mandatory action logs, reducer purity constraints
- **Time-travel debugging:** Full state rewind as a primary workflow
- **Complex middleware:** Redux-saga, redux-observable, custom enhancers
- **Enterprise compliance:** Audit trails, action serialization for logging
- **Large team coordination:** Strict patterns reduce variance

**Otherwise, prefer Zustand** for speed, simplicity, and minimal boilerplate.

---

**← Back to:** [Index](./index.md)
