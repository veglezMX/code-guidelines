# Global State — Zustand Guideline

**Stack:** React 19, TypeScript 5, Zustand (vanilla + react), Immer, Middlewares (persist, devtools, subscribeWithSelector, immer)
**Scope:** Single repo or monorepo (`packages/*`)
**Goal:** Minimal boilerplate, fast renders, safe types, immutable updates, easy persistence & testing

---

## 1) Why Zustand

* **Tiny & fast:** No action/reducer boilerplate; selector-based subscriptions minimize re-renders.
* **Type-first:** Simple, strongly-typed store shapes and actions; great DX with TS.
* **Composable middlewares:** `persist`, `devtools`, `subscribeWithSelector`, `immer` as needed.
* **SSR-friendly:** Create vanilla stores per request; hydrate selectively on the client.
* **Testable:** Headless “vanilla” store works outside React → clean unit tests & fixtures.

---

## 2) Dependencies

```bash
pnpm add zustand immer
```

> **Immer is required** for safe, immutable updates. It prevents mutation bugs and provides excellent ergonomics for nested state updates.

---

## 3) Recommended Folder Layout

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

Monorepo: mirror the same structure per package (`packages/web/src/state/...`). Keep **feature/domain ownership** clear.

---

## 4) Store Pattern (Type-Safe, Minimal Re-renders)

```ts
// src/state/stores/preferences.store.ts
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
        partialize: (s) => ({ theme: s.theme, locale: s.locale }), // don’t persist flags
      }
    ),
    { name: 'preferences' }
  )
);
```

Key points:

* **`immer` middleware** enables direct mutation syntax while maintaining immutability under the hood.
* **`subscribeWithSelector`** enables fine-grained subscriptions and computed watchers.
* **`partialize`** keeps persisted payload small (avoid persisting ephemeral flags).
* **`hasHydrated`** is a client-only flag to avoid UI flicker before persistence loads.
* **`version + migrate`** gives safe, incremental persistence.

---

## 5) Selector Usage (Avoid Wasteful Renders)

```ts
// src/state/selectors/preferences.selectors.ts
import { shallow } from 'zustand/shallow';
import { usePreferencesStore } from '../stores/preferences.store';

export const useTheme = () => usePreferencesStore((s) => s.theme);
export const useLocale = () => usePreferencesStore((s) => s.locale);
export const usePrefs = () =>
  usePreferencesStore((s) => ({ theme: s.theme, locale: s.locale }), shallow);
```

Guidelines:

* Prefer **small selectors** per component; combine with `shallow` if selecting objects.
* Avoid creating new selector functions inline in render loops if they capture changing props—extract to hooks when possible.
* For **derived/computed** values, compute inside the selector (pure, sync) or in a memoized hook that uses primitive slices.

---

## 6) Actions & Async Patterns

```ts
// src/state/stores/session.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User { id: string; email: string; }
interface SessionState {
  user: User | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    immer((set, get) => ({
      user: null,
      token: null,
      signIn: async (email, password) => {
        // call API
        const { token, profile } = await fakeAuth(email, password);
        // use immer for safe updates
        set((state) => {
          state.token = token;
          state.user = profile;
        }, false, 'session/signIn');
      },
      signOut: () => {
        // read current state safely
        if (get().token) {
          set((state) => {
            state.token = null;
            state.user = null;
          }, false, 'session/signOut');
        }
      },
    })),
    { name: 'session' }
  )
);

// example stub
async function fakeAuth(email: string, _pwd: string) {
  return { token: 'tkn', profile: { id: 'u1', email } };
}
```

Rules of thumb:

* Do async work in actions; **read** with `get()` and **write** with `set` using Immer's draft mutation syntax.
* Use **action names** in `devtools`' third parameter for traceable timelines (great for debugging).
* Immer enables safe, readable updates—always wrap your store creator with the `immer` middleware.

---

## 7) Complex Nested State with Immer

```ts
// src/state/stores/ui.store.ts
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

With Immer, you can safely mutate deeply nested structures. The middleware handles immutability automatically.

---

## 8) Persistence Strategy

* **What to persist?** Auth tokens (if allowed), user prefs, last-opened workspace. Avoid caching server data long-term unless you own invalidation.
* **Partial persistence:** Use `partialize` to persist only stable slices.
* **Version & migrate:** Always set a `version`. Add a `migrate` when changing keys/shapes.
* **Storage abstraction:** `createJSONStorage(() => localStorage)` for browsers; for non-DOM contexts (e.g., tests), inject a mock storage.

---

## 9) SSR & Hydration (React 19)

* **Server:** Create **vanilla** stores per request if you need server usage (`import { createStore } from 'zustand/vanilla'`) and pass initial state via HTML payload.
* **Client:** Initialize the React hook store from that state (or hydrate persisted state). Gate UI with a `hasHydrated` flag to avoid flicker or mismatches.
* **No `window` on server:** Keep `persist` inside client-only modules or guard `storage` factory.

---

## 10) Performance Checklist

* Keep stores small and **split by domain** (session, prefs, entities, UI).
* Subscribe to **minimal slices** (`useStore(s => s.part)`); use `shallow` when selecting objects.
* Use Immer middleware for safe, immutable updates—avoid manual spread operations that can be error-prone.
* Avoid storing **non-serializable** objects if you plan to persist/devtool them.
* Don't re-export the entire store object; export **hook selectors** for common reads.

---

## 11) Testing Strategy

* Use **vanilla stores** in unit tests:

```ts
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';

type Counter = { n: number; inc: () => void; reset: () => void };

export const createCounterStore = (initial = 0) =>
  createStore<Counter>(
    immer((set) => ({
      n: initial,
      inc: () => set((state) => { state.n += 1; }),
      reset: () => set((state) => { state.n = 0; }),
    }))
  );

// test
const store = createCounterStore(5);
store.getState().inc();
expect(store.getState().n).toBe(6);
```

* Provide a **reset** helper in each store for deterministic tests:

```ts
const initial = { theme: 'system' as const, locale: 'en', hasHydrated: false };
const useStore = create<State>()(
  immer((set) => ({
    ...initial,
    reset: () => set((state) => {
      state.theme = initial.theme;
      state.locale = initial.locale;
      state.hasHydrated = initial.hasHydrated;
    })
  }))
);
```

---

## 12) Lint & Types (Guardrails)

* Prefer **explicit return types** for actions `(param) => void | Promise<void>`.
* Disallow broad `any` in store types; use discriminated unions for modes.
* Add **ESLint** rules to catch pitfalls (already in your ESLint doc):

  * `@typescript-eslint/consistent-type-definitions: ["warn","type"]`
  * `@typescript-eslint/no-misused-promises`
  * `@typescript-eslint/no-confusing-void-expression`
* Consider `eslint-plugin-boundaries` to prevent cross-domain imports between stores.

---

## 13) Example Consumer Usage (Components)

```tsx
// read tiny slices
const theme = useTheme();
// read + act
const setTheme = usePreferencesStore((s) => s.setTheme);
// combine slices (shallow)
const { locale } = usePrefs();
```

Guideline:

* Export **tiny hooks** (`useTheme`, `useLocale`) for common reads to standardize usage and avoid ad-hoc selectors scattered across the app.

---

## 14) Governance Checklist (what "good" looks like)

* [ ] Stores are **domain-scoped** and small; actions colocated with state.
* [ ] All stores use the **Immer middleware** for safe, immutable updates.
* [ ] Public API = **selector hooks**; components never import the raw store instance.
* [ ] **Persistence** uses `version`, `migrate`, and `partialize`.
* [ ] Hydration guarded with `hasHydrated` where persistence is used.
* [ ] **Devtools** action names set for important transitions.
* [ ] Tests use **vanilla** stores and **reset** helpers.
* [ ] Performance: selectors are minimal; `shallow` used when selecting objects.
* [ ] No server-only code runs in client stores (and vice-versa).
* [ ] Clear docs in `src/state/README.md` on where to add new slices.

---

## 15) Troubleshooting

* **“Hydration mismatch / flicker”:** Ensure `hasHydrated` gates UI pieces that depend on persisted values; avoid reading `localStorage` on the server.
* **“Too many re-renders”:** You’re likely selecting a big object or rebuilding selectors each render. Extract to small selectors and/or add `shallow`.
* **“Persist migration broke users”:** Bump `version`, write a **backward-compatible `migrate`**, and keep a one-liner rollback path.
* **“Devtools shows noisy actions”**: Name significant `set` calls (third arg) and avoid overly granular updates.

---

## 16) Quick Snippets Library

**Create a typed store template**

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type Fn<T = void> = (...args: any[]) => T;

export type StoreTemplate<S> = S & { reset: Fn };
export const createStoreTemplate = <S>(initial: S, name: string) =>
  create<StoreTemplate<S>>()(
    immer((set) => ({
      ...initial,
      reset: () => set((state) => {
        Object.assign(state, initial);
      }, false, `${name}/reset`),
    }))
  );
```

**Subscribe to changes for side-effects (outside React)**

```ts
import { usePreferencesStore } from './preferences.store';
const unsub = usePreferencesStore.subscribe(
  (s) => s.theme,
  (theme) => console.log('theme changed:', theme)
);
// later: unsub()
```

---

## 17) When to Prefer Redux Toolkit Instead

* You need **time-travel debugging** as a core workflow, strict immutability, or enterprise governance around reducers/actions.
* You’ll build **large cross-team state machines** with middleware (thunks, observables), where a conventional action log is a hard requirement.

If not, Zustand keeps you lighter and usually faster to ship.

---

### Final note

This guideline is framework-agnostic and tuned for **React 19 + TS5** only. If you want, I can drop this into a `src/state/README.md` and add a couple of ready-to-use store files (prefs/session/ui) matching your repo layout.
