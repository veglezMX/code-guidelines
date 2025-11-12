# 1. Optimal Project Architecture and Folder Structure

The foundation of a tree-shakable component library begins with intentional folder structure. Modern bundlers perform tree-shaking at the file level, making your architecture the single most important factor in achieving minimal bundle sizes for consumers.

## The critical importance of one-component-per-folder

**Tree-shaking works on file boundaries**. When bundlers analyze your library, they can only eliminate entire files that are unused and have no side effects. A single bundled file containing all components prevents selective imports-consumers importing one button component would receive your entire library. The one-component-per-folder pattern enables granular tree-shaking, allowing bundlers to eliminate unused components at the file level.

The performance impact is substantial. Real-world data from Koval UI library demonstrates that splitting components by module reduced bundle sizes from 184KB to 124KB-a **49% reduction** in total bundle size with identical functionality. For consuming applications, importing a single button might add 10KB instead of 60KB to their bundle.

## Complete folder structure for production libraries

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.css.ts
│   │   ├── Button.stories.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Card/
│   │   ├── Card.tsx
│   │   ├── Card.css.ts
│   │   ├── Card.stories.tsx
│   │   ├── Card.test.tsx
│   │   └── index.ts
│   └── Dialog/
│       ├── Dialog.tsx
│       ├── Dialog.css.ts
│       ├── Dialog.stories.tsx
│       ├── Dialog.test.tsx
│       └── index.ts
├── styles/
│   ├── tokens.ts
│   ├── contract.css.ts
│   ├── themes.css.ts
│   └── index.ts
├── hooks/
│   ├── useTheme.ts
│   ├── useMediaQuery.ts
│   └── index.ts
├── utils/
│   ├── cn.ts
│   ├── composeRefs.ts
│   └── index.ts
└── index.ts
```

This structure achieves **three critical objectives**: colocation of related files for developer experience, clear separation for tree-shaking, and explicit module boundaries for preserveModules strategy. Each component folder becomes an independent module in your build output, allowing consumers to import only what they need.

## Design tokens as your single source of truth

Design tokens establish consistency across your component library while remaining completely tree-shakable. Vanilla Extract provides **zero-runtime CSS** with full TypeScript integration, making tokens both type-safe and performant.

```typescript
// styles/tokens.ts
export const tokens = {
  colors: {
    brand: {
      primary: '#3355FF',
      secondary: '#004DFF',
      accent: '#00D4FF',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    semantic: {
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
  },
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, sans-serif',
      serif: 'Georgia, Times, serif',
      mono: 'Menlo, Monaco, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  radii: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};
```

These tokens remain pure TypeScript objects, generating no runtime overhead. Vanilla Extract transforms them into CSS custom properties at build time, creating **type-safe design systems** with zero JavaScript cost.

## Building type-safe themes with createThemeContract

Vanilla Extract's theme contract system enables multiple theme implementations while maintaining type safety and **code-split theming**. The contract defines the shape without generating CSS, allowing themes to be loaded on-demand.

```typescript
// styles/contract.css.ts
import { createThemeContract } from '@vanilla-extract/css';

export const themeContract = createThemeContract({
  color: {
    primary: null,
    secondary: null,
    background: null,
    text: {
      normal: null,
      dimmed: null,
    },
  },
  space: {
    small: null,
    medium: null,
    large: null,
  },
  font: {
    body: null,
    heading: null,
  },
  radius: {
    small: null,
    medium: null,
    large: null,
  },
});
```

The contract establishes a **type-safe interface** for all themes. TypeScript enforces that every theme implementation provides all required values, preventing runtime errors from missing theme properties. This becomes crucial when consumers create custom themes compatible with your components.

## Implementing multiple themes that fulfill the contract

```typescript
// styles/themes.css.ts
import { createTheme } from '@vanilla-extract/css';
import { themeContract } from './contract.css';

export const lightTheme = createTheme(themeContract, {
  color: {
    primary: '#3355FF',
    secondary: '#DB2777',
    background: '#FFFFFF',
    text: {
      normal: '#1F2937',
      dimmed: '#6B7280',
    },
  },
  space: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
  font: {
    body: 'system-ui, sans-serif',
    heading: 'Georgia, serif',
  },
  radius: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
});

export const darkTheme = createTheme(themeContract, {
  color: {
    primary: '#60A5FA',
    secondary: '#F472B6',
    background: '#1F2937',
    text: {
      normal: '#F9FAFB',
      dimmed: '#D1D5DB',
    },
  },
  space: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
  font: {
    body: 'system-ui, sans-serif',
    heading: 'Georgia, serif',
  },
  radius: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
});

// Export for component usage
export const vars = themeContract;
```

Each theme implementation generates a **unique CSS class** that sets CSS custom properties. At runtime, switching themes requires only changing a className-no JavaScript re-execution, no prop drilling, no context overhead. This architecture provides **instant theme switching** with zero performance cost.

## Organizing shared utilities and hooks

Utility functions and custom hooks deserve dedicated folders with clear boundaries. The key principle: **utilities should enhance developer experience without compromising tree-shaking**.

```typescript
// utils/cn.ts
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Usage in components
import { cn } from '../../utils/cn';
import * as styles from './Button.css';

export function Button({ variant, className, ...props }) {
  return (
    <button
      className={cn(
        styles.button({ variant }),
        className
      )}
      {...props}
    />
  );
}
```

The classnames utility function exemplifies excellent library utilities: **small bundle impact** (clsx is ~200 bytes), frequently needed by consumers, and completely tree-shakable. Export utilities that consumers will genuinely use when working with your components.

```typescript
// hooks/useTheme.ts
import { createContext, useContext, useState } from 'react';
import { lightTheme, darkTheme } from '../styles/themes.css';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  themeClass: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const themeClass = theme === 'light' ? lightTheme : darkTheme;
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, themeClass, toggleTheme }}>
      <div className={themeClass}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

## Complete component folder template

Every component folder follows an identical pattern, making your library predictable and maintainable. The Button component demonstrates this complete structure:

```typescript
// components/Button/Button.tsx
import * as React from 'react';
import { cn } from '../../utils/cn';
import * as styles from './Button.css';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant style
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'outline';
  
  /**
   * Button size
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Loading state - disables button and shows loading text
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Button content
   */
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      variant = 'primary',
      size = 'md',
      isLoading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          styles.button({ variant, size }),
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```typescript
// components/Button/Button.css.ts
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '../../styles/themes.css';

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.radius.medium,
    fontFamily: vars.font.body,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    
    ':hover': {
      opacity: 0.9,
    },
    
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    
    ':focus-visible': {
      outline: '2px solid',
      outlineColor: vars.color.primary,
      outlineOffset: '2px',
    },
  },
  
  variants: {
    variant: {
      primary: {
        backgroundColor: vars.color.primary,
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: vars.color.secondary,
        color: '#FFFFFF',
      },
      outline: {
        backgroundColor: 'transparent',
        border: `2px solid ${vars.color.primary}`,
        color: vars.color.primary,
      },
    },
    size: {
      sm: {
        padding: `${vars.space.small} ${vars.space.medium}`,
        fontSize: '0.875rem',
      },
      md: {
        padding: `${vars.space.medium} ${vars.space.large}`,
        fontSize: '1rem',
      },
      lg: {
        padding: `${vars.space.large} 1.5rem`,
        fontSize: '1.125rem',
      },
    },
  },
  
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

```typescript
// components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

The barrel file (index.ts) provides **clean import paths** while maintaining tree-shaking compatibility. Each component folder exports only its public API, keeping internal implementation details private.

## Vite configuration for preserveModules strategy

Your build configuration determines whether the architectural decisions above achieve their tree-shaking potential. The preserveModules option is **non-negotiable** for component libraries.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  build: {
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',
      },
    },
  },
});
```

With preserveModules enabled, your build output **mirrors your source structure**. The dist folder contains individual files for each component, allowing bundlers to analyze and eliminate unused code at the component level. Without this setting, Vite produces a single bundle, defeating all tree-shaking efforts.

## Package.json configuration for tree-shaking

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": ["**/*.css.ts", "**/*.css"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./components/*": {
      "import": "./dist/components/*/index.js",
      "require": "./dist/components/*/index.cjs",
      "types": "./dist/components/*/index.d.ts"
    }
  },
  "files": ["dist"]
}
```

The **sideEffects declaration** tells bundlers that CSS files have side effects (they must be included when imported), while JavaScript modules can be safely tree-shaken. The exports field provides **granular entry points**, allowing advanced consumers to import components directly while maintaining a convenient main export.

---

**Next:** [Defining a Clean and Powerful Public API](./02-public-api.md)
