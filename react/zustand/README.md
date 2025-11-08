# Zustand Guidelines

**Stack:** React 19, TypeScript 5, Zustand v4+, Immer  

---

## 📚 Documentation Structure

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[Setup](./setup.md)** | Installation, dependencies, folder structure | Starting a new project or onboarding |
| **[Patterns](./patterns.md)** | Store architecture, middleware, typing | Building features daily |
| **[Best Practices](./best-practices.md)** | Selectors, performance, SSR, testing | Optimizing & reviewing code |
| **[Playbook](./playbook.md)** | Ready-to-use recipes & examples | Need a quick solution |
| **[Governance](./governance.md)** | Team standards, review checklist | PR reviews & architecture decisions |

---

## 🎯 Quick Start

**New to Zustand?** Start here:
1. Read [Why Zustand](#why-zustand) below
2. Follow [Setup](./setup.md) to install dependencies
3. Copy a template from [Playbook](./playbook.md)
4. Review [Best Practices](./best-practices.md) before your first PR

**Migrating from Redux?** See [When NOT to use Zustand](#when-to-prefer-redux) below.

---

## Why Zustand?

### ✅ Advantages
- **Tiny bundle** (~1KB): No action/reducer boilerplate
- **Type-safe**: First-class TypeScript support with minimal ceremony
- **Fast**: Selector-based subscriptions prevent unnecessary re-renders
- **Flexible**: Composable middlewares (persist, devtools, immer)
- **Testable**: Vanilla stores work outside React
- **SSR-friendly**: Create stores per-request, selective hydration

### 🔄 vs Redux Toolkit
| Zustand | Redux Toolkit |
|---------|---------------|
| Minimal boilerplate | More structure/ceremony |
| Learning curve: 1-2 hours | Learning curve: 1-2 days |
| Best for: App state, UI state | Best for: Complex state machines, enterprise governance |
| Devtools: action names | Devtools: full time-travel |

---

## Core Principles

### 1. **Domain-Scoped Stores**
Split by feature domain, not technical layer:
```
✅ session.store.ts, preferences.store.ts, projects.store.ts
❌ api.store.ts, ui.store.ts (too broad)
```

### 2. **Immer is Mandatory**
All stores must use the `immer` middleware for safe, immutable updates:
```ts
import { immer } from 'zustand/middleware/immer';
create<State>()(immer((set) => ({ /* ... */ })))
```

### 3. **Export Selectors, Not Stores**
```ts
// ✅ Good
export const useTheme = () => usePreferencesStore(s => s.theme);

// ❌ Bad
export { usePreferencesStore }; // consumers can select anything
```

### 4. **Persistence with Versioning**
Always use `version` + `migrate` for persisted stores:
```ts
persist(store, {
  version: 2,
  migrate: (state, fromVersion) => { /* handle migration */ }
})
```

### 5. **Test with Vanilla Stores**
Create testable vanilla stores; reset state between tests:
```ts
import { createStore } from 'zustand/vanilla';
const store = createCounterStore();
store.getState().reset(); // in beforeEach
```

---

## When to Prefer Redux Toolkit Instead

Choose Redux if you need:
- **Strict governance**: Mandatory action logs, reducer constraints
- **Time-travel debugging**: Full state rewind as a core workflow
- **Complex middleware**: Observables, sagas, custom enhancers
- **Enterprise compliance**: Audit trails, action serialization

If not, Zustand keeps you lighter and faster.

---

## Quick Examples

### Basic Store
```ts
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

### Persistent Store
```ts
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePreferences = create<PrefsState>()(
  persist(
    immer((set) => ({ 
      theme: 'system', 
      setTheme: (t) => set((s) => { s.theme = t; }) 
    })),
    { name: 'prefs:v1', version: 1, storage: createJSONStorage(() => localStorage) }
  )
);
```

More examples in [Playbook](./playbook.md).

---

## Getting Help

- **Questions?** Check [Best Practices](./best-practices.md) → Troubleshooting
- **Contributing?** See [Governance](./governance.md) → Review Checklist
- **Bug in example?** Open an issue in this repo

---

**Next:** [Setup Guide](./setup.md) →
