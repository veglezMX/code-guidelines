# 2. Defining a Clean and Powerful Public API

Your library's public API represents the contract with consumers. A well-designed API balances **developer convenience** with performance optimization, providing multiple import patterns while maintaining complete tree-shaking compatibility.

## The main entry point strategy

The root index.ts file serves as your library's primary interface. For React 19 component libraries, **explicit named exports** provide the optimal balance between usability and tree-shaking.

```typescript
// src/index.ts

// ===== COMPONENTS =====
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Dialog } from './components/Dialog';
export { Input } from './components/Input';

// ===== HOOKS =====
export { useTheme, ThemeProvider } from './hooks/useTheme';
export { useMediaQuery } from './hooks/useMediaQuery';
export { useControllableState } from './hooks/useControllableState';

// ===== UTILITIES =====
export { cn } from './utils/cn';
export { composeRefs } from './utils/composeRefs';

// ===== THEME (Vanilla Extract) =====
export { 
  lightTheme, 
  darkTheme, 
  themeContract, 
  vars 
} from './styles/themes.css';

// ===== TYPES =====
export type { ButtonProps } from './components/Button';
export type { CardProps } from './components/Card';
export type { DialogProps } from './components/Dialog';
export type { InputProps } from './components/Input';
export type { Theme } from './styles/themes.css';
export type { ClassValue } from './utils/cn';
```

This pattern achieves **three critical objectives**: every export is explicitly named for IDE autocomplete, TypeScript can eliminate unused type exports, and the module graph remains analyzable by bundlers. Consumers receive excellent developer experience through autocomplete while bundlers eliminate unused exports efficiently.

## Why named exports win for component libraries

The debate between named and default exports has a clear winner for libraries: **named exports provide superior tree-shaking**. Default exports create module references that bundlers struggle to analyze statically, while named exports enable precise dependency tracking.

Consider the difference in how bundlers analyze these patterns:

```typescript
// Named exports (tree-shakeable)
export const Button = () => { /* ... */ };
export const Dialog = () => { /* ... */ };

// Consumer imports only Button
import { Button } from 'your-library'; // Bundles only Button

// Default export of object (NOT tree-shakeable)
export default {
  Button: () => { /* ... */ },
  Dialog: () => { /* ... */ }
};

// Consumer wants only Button
import library from 'your-library'; // Bundles EVERYTHING
library.Button();
```

Named exports also provide **superior IDE support**-autocomplete suggests available exports, jump-to-definition works correctly, and find-all-references remains accurate. The consistency benefits extend to refactoring: renaming a component propagates correctly across the codebase with named exports, while default exports allow consumers to use arbitrary names.

## Exporting hooks and utilities for maximum value

Component libraries should export hooks and utilities that **enhance the consumption experience**. The test: would consumers write this code themselves if you didn't provide it?

The classnames utility exemplifies this principle perfectly:

```typescript
// Export in src/index.ts
export { cn } from './utils/cn';

// Implementation in utils/cn.ts
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Consumer usage
import { Button, cn } from 'your-library';

function App() {
  return (
    <Button
      className={cn(
        'custom-button',
        isPrimary && 'primary-style',
        isDisabled && 'disabled-style'
      )}
    >
      Click me
    </Button>
  );
}
```

This utility adds **minimal bundle cost** (~200 bytes with clsx), solves a universal need (conditional classnames), and integrates naturally with your components. Export utilities that meet this criteria while avoiding the temptation to include everything your components use internally.

## Exporting Vanilla Extract theme contracts for extensibility

One of Vanilla Extract's most powerful features is **consumer theme extensibility**. By exporting your theme contract and types, you enable consumers to create custom themes that remain compatible with your components.

```typescript
// Exported from src/index.ts
export { themeContract, vars } from './styles/themes.css';
export type { Theme } from './styles/themes.css';

// Consumer creates compatible custom theme
import { createTheme } from '@vanilla-extract/css';
import { themeContract } from 'your-library';

export const brandTheme = createTheme(themeContract, {
  color: {
    primary: '#FF6B35',    // Brand color
    secondary: '#004E89',  // Brand secondary
    background: '#F8F9FA',
    text: {
      normal: '#2C3E50',
      dimmed: '#7F8C8D',
    },
  },
  // ... rest of theme matching contract
});
```

This pattern provides **type-safe theme customization** with zero documentation burden. TypeScript enforces the contract structure, making it impossible for consumers to create incompatible themes. The type safety extends to theme values-consumers receive autocomplete for theme properties and compile-time errors for missing or incorrectly typed values.

## TypeScript type exports and declaration best practices

TypeScript type exports require explicit syntax to enable proper tree-shaking. The `export type` syntax tells bundlers these exports exist only at compile time, preventing them from appearing in runtime bundles.

```typescript
// Explicit type exports
export type { ButtonProps, ButtonVariant } from './components/Button';
export type { Theme, ThemeConfig, ThemeTokens } from './styles/themes.css';

// Type-only utilities consumers might need
export type { VariantProps } from '@vanilla-extract/recipes';
export type { ClassValue } from 'clsx';
```

TypeScript 5.0+ introduces **verbatimModuleSyntax** which enforces explicit type imports and exports. Enable this in your tsconfig.json for maximum clarity:

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Declaration files should mirror your source structure when using preserveModules. This alignment enables **precise type resolution** and excellent IDE performance when consumers import from your library.

## Providing multiple entry points for flexibility

Advanced consumers appreciate **granular entry points** that bypass the main barrel file. The package.json exports field enables this pattern:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/components/Button/index.js",
      "types": "./dist/components/Button/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  }
}
```

This approach provides **maximum flexibility**: beginners import from the main entry point for convenience, while performance-focused teams can import directly from component paths. Next.js 13.5+ even includes automatic optimization that rewrites barrel imports to direct imports, making this pattern increasingly relevant.

---

**Previous:** [Optimal Project Architecture and Folder Structure](./01-project-architecture.md)  
**Next:** [Configuring Storybook for Premier Development and Documentation](./03-storybook-configuration.md)
