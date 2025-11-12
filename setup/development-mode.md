# Building Modern React 19 Component Libraries: The Complete Development Guide

Modern component libraries demand more than great components-they require **architectural precision**, developer-friendly tooling, and production-grade infrastructure. This comprehensive guide establishes the complete development workflow for React 19 UI component libraries using Vanilla Extract styling and Vite, with Storybook serving as both development environment and living documentation. Every architectural decision prioritizes **tree-shaking optimization** and minimal bundle sizes for consuming applications.

This guide complements production build processes using Vite with Rollup's preserveModules feature. The architecture detailed here creates libraries that deliver **40-60% smaller bundle sizes** compared to traditional approaches, as demonstrated by production implementations like Koval UI. You'll learn not just the "how" but the "why" behind each decision, from folder structure to CI/CD pipelines, ensuring your component library achieves both developer excellence and optimal performance.

## 1. Optimal project architecture and folder structure

The foundation of a tree-shakable component library begins with intentional folder structure. Modern bundlers perform tree-shaking at the file level, making your architecture the single most important factor in achieving minimal bundle sizes for consumers.

### The critical importance of one-component-per-folder

**Tree-shaking works on file boundaries**. When bundlers analyze your library, they can only eliminate entire files that are unused and have no side effects. A single bundled file containing all components prevents selective imports-consumers importing one button component would receive your entire library. The one-component-per-folder pattern enables granular tree-shaking, allowing bundlers to eliminate unused components at the file level.

The performance impact is substantial. Real-world data from Koval UI library demonstrates that splitting components by module reduced bundle sizes from 184KB to 124KB-a **49% reduction** in total bundle size with identical functionality. For consuming applications, importing a single button might add 10KB instead of 60KB to their bundle.

### Complete folder structure for production libraries

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

### Design tokens as your single source of truth

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

### Building type-safe themes with createThemeContract

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

### Implementing multiple themes that fulfill the contract

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

### Organizing shared utilities and hooks

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

### Complete component folder template

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

### Vite configuration for preserveModules strategy

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

### Package.json configuration for tree-shaking

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

## 2. Defining a clean and powerful public API

Your library's public API represents the contract with consumers. A well-designed API balances **developer convenience** with performance optimization, providing multiple import patterns while maintaining complete tree-shaking compatibility.

### The main entry point strategy

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

### Why named exports win for component libraries

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

### Exporting hooks and utilities for maximum value

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

### Exporting Vanilla Extract theme contracts for extensibility

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

### TypeScript type exports and declaration best practices

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

### Providing multiple entry points for flexibility

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

## 3. Configuring Storybook for premier development and documentation

Storybook 8 transforms component development by serving as **both development environment and living documentation**. For React 19 libraries with Vite and Vanilla Extract, Storybook provides zero-configuration setup while offering extensive customization options.

### Storybook 8 installation and base configuration

Initialize Storybook in your existing Vite project with a single command:

```bash
npx storybook@latest init
```

This detects your Vite + React setup and configures everything automatically. For manual configuration, install the essential packages:

```bash
npm install --save-dev @storybook/react-vite @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y @storybook/test
```

### Complete .storybook/main.ts configuration

```typescript
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': '/src',
        },
      },
    });
  },
  
  staticDirs: ['../public'],
};

export default config;
```

The **reactDocgen configuration** extracts prop documentation from JSDoc comments in your components, enabling automatic documentation generation. The propFilter excludes third-party props from node_modules, keeping documentation focused on your component API.

### Advanced theming with Vanilla Extract in Storybook

Storybook with Vite automatically supports Vanilla Extract when your project uses the vanillaExtractPlugin. The integration happens transparently-Storybook detects your Vite configuration and applies it during story rendering.

Configure theme switching through Storybook's globals system in .storybook/preview.tsx:

```typescript
import type { Preview } from '@storybook/react';
import { lightTheme, darkTheme } from '../src/styles/themes.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },
    actions: {
      argTypesRegex: '^on[A-Z].*',
    },
    layout: 'centered',
  },
  
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? darkTheme : lightTheme;
      
      return (
        <div className={theme} style={{ minHeight: '100vh', padding: '1rem' }}>
          <Story />
        </div>
      );
    },
  ],
  
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'circlehollow', title: 'Light' },
          { value: 'dark', icon: 'circle', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
```

This configuration adds a **theme toggle to Storybook's toolbar**, allowing instant theme switching across all stories. The decorator wraps every story with the selected theme class, demonstrating your components in both themes without duplicating stories. The implementation uses **pure CSS custom properties**, making theme switching instant with zero JavaScript overhead.

### Essential addons that enhance development workflow

Storybook's addon ecosystem provides powerful testing and documentation capabilities. Four addons prove essential for component library development.

**@storybook/addon-interactions** enables interaction testing directly within stories. Write user interaction tests using familiar Testing Library patterns, then debug them visually with Storybook's step-through controls:

```typescript
export const WithInteractionTest: Story = {
  args: {
    label: 'Click Me',
    onClick: fn(),
  },
  play: async ({ args, canvas, step }) => {
    const button = canvas.getByRole('button', { name: /click me/i });
    
    await step('Verify button renders', async () => {
      await expect(button).toBeInTheDocument();
      await expect(button).toBeVisible();
    });
    
    await step('Click the button', async () => {
      await userEvent.click(button);
    });
    
    await step('Verify onClick handler', async () => {
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};
```

The play function runs **after the story renders**, simulating real user interactions. The step API groups related assertions, making test failures easier to debug through Storybook's visual interface.

**@storybook/addon-a11y** provides automatic accessibility auditing powered by axe-core. Every story receives **real-time accessibility feedback**, catching issues like missing ARIA labels, insufficient color contrast, and keyboard navigation problems:

```typescript
parameters: {
  a11y: {
    config: {
      rules: [
        {
          id: 'color-contrast',
          enabled: true,
        },
      ],
    },
    element: '#storybook-root',
    manual: false,
  },
}
```

The addon displays violations directly in Storybook's panel, providing **actionable guidance** for fixes. This proactive approach catches accessibility issues during development rather than in production or user testing.

**@storybook/addon-links** enables navigation between related stories, perfect for demonstrating user flows or component relationships. Link stories together with simple function calls:

```typescript
import { linkTo } from '@storybook/addon-links';

export const Primary: Story = {
  args: {
    onClick: linkTo('Button', 'Secondary'),
  },
};
```

**@storybook/addon-essentials** bundles several utilities including docs, controls, actions, backgrounds, and viewport. The controls addon generates **interactive controls** automatically from component props, while docs creates complete API documentation from TypeScript types and JSDoc comments.

### Writing stories with Component Story Format 3

CSF 3 reduces boilerplate while improving TypeScript integration. Stories become simple object exports with full type safety:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  
  args: {
    onClick: fn(),
  },
  
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
      description: 'Visual variant of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
  
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};
```

The **meta object** contains configuration shared across all stories-component reference, global args, argTypes controls, and parameters. Individual stories extend this configuration by providing story-specific args. TypeScript's `satisfies` operator provides **type checking without type widening**, catching configuration errors while preserving exact types for inference.

### Leveraging JSDoc for automatic documentation

Storybook extracts documentation directly from component TypeScript definitions. Write comprehensive JSDoc comments, and Storybook generates beautiful API documentation automatically:

```typescript
export interface ButtonProps {
  /**
   * Button label text
   * @default "Click me"
   */
  children: React.ReactNode;
  
  /**
   * Is this the principal call to action on the page?
   * Use primary for main actions and secondary for supporting actions.
   */
  variant?: 'primary' | 'secondary' | 'outline';
  
  /**
   * How large should the button be?
   * Sizes affect padding and font size for visual hierarchy.
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Disables the button, preventing user interaction
   * Disabled buttons cannot be clicked and show reduced opacity.
   */
  disabled?: boolean;
  
  /**
   * Optional click handler
   * @param event - React mouse event
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

This documentation appears in **Storybook's Controls panel** and the auto-generated Docs page, providing consumers with complete API reference without maintaining separate documentation. The investment in quality JSDoc comments pays dividends through both IDE tooltips and Storybook documentation.

### Running interaction tests with the test runner

Storybook's test runner executes all play functions as tests, integrating with your CI pipeline:

```bash
npm install --save-dev @storybook/test-runner concurrently http-server wait-on
```

Add test scripts to package.json:

```json
{
  "scripts": {
    "test-storybook": "test-storybook",
    "test-storybook:ci": "concurrently -k -s first -n \"SB,TEST\" \"http-server storybook-static --port 6006 --silent\" \"wait-on tcp:127.0.0.1:6006 && test-storybook --url http://127.0.0.1:6006\""
  }
}
```

The test runner **converts every story with a play function into an executable test**, running them in real browsers via Playwright. This approach validates that components behave correctly in actual browser environments, catching issues that unit tests might miss.

## 4. Enforcing code quality and consistency

Code quality tooling prevents bugs, maintains consistency, and enforces best practices automatically. For React 19 component libraries, modern tooling configurations leverage ESLint 9's flat config, Husky v9 for git hooks, and lint-staged for efficient pre-commit checks.

### ESLint 9 flat config for React 19 and TypeScript

ESLint 9 introduces flat config as the default configuration format, replacing legacy .eslintrc files. Flat config provides **better performance**, explicit imports, and simpler inheritance patterns. The legacy format will be removed in ESLint 10, making migration essential.

```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    
    settings: {
      react: {
        version: 'detect',
      },
      'jsx-a11y': {
        polymorphicPropName: 'as',
        components: {
          Button: 'button',
          Link: 'a',
          Input: 'input',
        },
      },
    },
    
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'storybook-static/**',
    ],
  },
  
  eslintConfigPrettier,
];
```

Flat config uses **explicit imports** rather than string-based package names, making the dependency graph clear and enabling better IDE support. The configuration array composes multiple rule sets, with later entries overriding earlier ones. This composability makes extending and customizing configurations straightforward.

### Essential plugins for React 19 development

**eslint-plugin-react-hooks** enforces React Hooks rules, preventing common mistakes like conditional hooks or missing dependencies. For React 19, these rules remain critical-the compiler may optimize hook calls, but violations still cause bugs:

```javascript
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
}
```

The rules-of-hooks error prevents hooks in conditions or loops, while exhaustive-deps warns about missing effect dependencies. Set exhaustive-deps to 'warn' rather than 'error'-occasionally you genuinely need to omit dependencies, and warnings allow override with eslint-disable comments.

**eslint-plugin-jsx-a11y** catches accessibility issues at development time, preventing WCAG violations before they reach production:

```javascript
settings: {
  'jsx-a11y': {
    polymorphicPropName: 'as',
    components: {
      Button: 'button',
      Link: 'a',
      Input: 'input',
    },
  },
}
```

The components mapping tells the plugin **how to analyze custom components**. Mapping your Button to the button element enables rules like button-has-type and accessible-button-name. This configuration makes accessibility checking accurate for component libraries.

**@typescript-eslint** provides TypeScript-aware linting, catching type-related issues that tsc might miss:

```javascript
languageOptions: {
  parserOptions: {
    project: './tsconfig.json',
  },
},
rules: {
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
  '@typescript-eslint/no-explicit-any': 'warn',
}
```

Type-aware linting requires **project configuration**, enabling rules that understand your TypeScript types. This unlocks powerful checks like no-floating-promises and no-unnecessary-type-assertion.

### Automated quality gates with Husky v9 and lint-staged

Husky v9 simplifies git hook management, ensuring code quality checks run automatically before commits reach your repository:

```bash
# Install dependencies
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky init

# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

Husky v9 uses **simpler initialization** compared to v8-`husky init` replaces the deprecated `husky install`. The init command creates the .husky directory, adds a prepare script to package.json, and creates a pre-commit hook file automatically.

Configure lint-staged to run appropriate checks on staged files:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --max-warnings=0 --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

Lint-staged runs these commands **only on staged files**, making pre-commit checks fast regardless of repository size. The --fix flag automatically corrects ESLint violations when possible, and prettier --write formats code consistently. Setting --max-warnings=0 ensures even warnings block commits, maintaining high code quality.

For advanced use cases, use JavaScript configuration for dynamic commands:

```javascript
// lint-staged.config.js
export default {
  '*.{ts,tsx}': [
    (filenames) => `eslint ${filenames.join(' ')} --fix`,
    (filenames) => `prettier --write ${filenames.join(' ')}`,
    () => 'tsc --noEmit', // Type check entire project
  ],
};
```

The function form enables **context-aware commands**. Running `tsc --noEmit` as a function rather than per-file ensures type checking happens once for the entire project, detecting cross-file type errors that isolated checks would miss.

### Complete package.json scripts for code quality

```json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "typecheck": "tsc --noEmit"
  }
}
```

These scripts provide **consistent quality commands** across local development and CI. The prepare script runs automatically after npm install, ensuring Husky initializes for all contributors. Separating lint:fix and format enables selective execution, while format:check validates formatting without modification.

## 5. Continuous integration with GitLab

GitLab CI/CD automates testing, building, and deployment for component libraries. A well-configured pipeline catches issues early, maintains quality standards, and deploys Storybook documentation automatically.

### Complete .gitlab-ci.yml pipeline structure

```yaml
image: node:20-alpine

stages:
  - install
  - lint
  - test
  - build
  - deploy

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fastest"

default:
  cache: &global_cache
    key:
      files:
        - package-lock.json
      prefix: npm-$CI_COMMIT_REF_SLUG
    fallback_keys:
      - npm-$CI_DEFAULT_BRANCH
      - npm-default
    paths:
      - .npm/
    policy: pull

install-dependencies:
  stage: install
  cache:
    <<: *global_cache
    policy: pull-push
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH
    - if: $CI_COMMIT_TAG

lint:eslint:
  stage: lint
  needs:
    - install-dependencies
  script:
    - npm run lint
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

test:unit:
  stage: test
  needs:
    - install-dependencies
  script:
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

test:storybook:
  stage: test
  needs:
    - install-dependencies
  before_script:
    - npx playwright install --with-deps chromium
  script:
    - npm run build-storybook
    - npx concurrently -k -s first -n "SB,TEST" "npx http-server storybook-static --port 6006 --silent" "npx wait-on tcp:127.0.0.1:6006 && npx test-storybook --url http://127.0.0.1:6006"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

build:library:
  stage: build
  needs:
    - install-dependencies
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG

build:storybook:
  stage: build
  needs:
    - install-dependencies
  script:
    - npm run build-storybook -- --output-dir public
  artifacts:
    paths:
      - public/
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH

pages:
  stage: deploy
  needs:
    - build:storybook
  script:
    - echo "Deploying Storybook to GitLab Pages"
  artifacts:
    paths:
      - public
  environment:
    name: production
    url: $CI_PAGES_URL
  only:
    - main
    - master
```

### Node.js caching strategy for optimal performance

GitLab CI caching requires understanding the **difference between cache and artifacts**. Cache stores dependencies downloaded from the internet (npm packages), while artifacts pass build outputs between pipeline stages.

The optimal strategy caches **the npm cache directory** rather than node_modules. This approach provides 30-50% faster cache restore times because npm's cache contains compressed tarballs instead of thousands of small files. Using package-lock.json as the cache key automatically invalidates the cache when dependencies change, ensuring reproducible builds.

```yaml
cache:
  key:
    files:
      - package-lock.json
    prefix: npm-$CI_COMMIT_REF_SLUG
  fallback_keys:
    - npm-$CI_DEFAULT_BRANCH
    - npm-default
  paths:
    - .npm/
```

The **fallback_keys** provide cache inheritance-feature branches fall back to main branch cache when their specific cache doesn't exist yet. This dramatically improves first-build performance on new branches.

The install-dependencies job uses **pull-push policy** to update the cache, while all other jobs use pull policy for read-only access. This prevents cache thrashing from multiple jobs simultaneously writing the same cache.

### Parallel execution with the needs keyword

The needs keyword enables **parallel job execution**, dramatically reducing pipeline duration. Jobs with identical needs dependencies run simultaneously:

```yaml
lint:eslint:
  needs: [install-dependencies]

lint:prettier:
  needs: [install-dependencies]

test:unit:
  needs: [install-dependencies]

test:storybook:
  needs: [install-dependencies]
```

These four jobs all need only install-dependencies, so they **execute in parallel** rather than sequentially. For a typical component library, this reduces the lint + test stage from 8-10 minutes to 2-3 minutes.

### Running Storybook interaction tests in CI

Storybook's test runner requires **building Storybook**, serving it locally, and then executing tests against the served instance:

```yaml
test:storybook:
  stage: test
  needs:
    - install-dependencies
  before_script:
    - npx playwright install --with-deps chromium
  script:
    - npm run build-storybook
    - npx concurrently -k -s first -n "SB,TEST" "npx http-server storybook-static --port 6006 --silent" "npx wait-on tcp:127.0.0.1:6006 && npx test-storybook --url http://127.0.0.1:6006"
```

The concurrently command **runs two processes simultaneously**: http-server serves the built Storybook, while wait-on waits for the server to become available before running tests. The `-k` flag ensures both processes terminate when tests complete, preventing hanging CI jobs.

### Deploying Storybook to GitLab Pages

GitLab Pages requires specific configuration-the job must be named "pages" or use the `pages: true` keyword, and artifacts must be placed in a directory named "public":

```yaml
build:storybook:
  stage: build
  script:
    - npm run build-storybook -- --output-dir public
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  needs:
    - build:storybook
  script:
    - echo "Deploying Storybook to GitLab Pages"
  artifacts:
    paths:
      - public
  environment:
    name: production
    url: $CI_PAGES_URL
  only:
    - main
```

The **artifacts inheritance** means the pages job receives the public directory from build:storybook automatically. GitLab Pages deploys the public directory contents to `https://username.gitlab.io/project-name/`.

For project pages (not user/group pages), configure Storybook's base path:

```javascript
// .storybook/main.js
viteFinal: async (config) => {
  const basePath = process.env.CI_PAGES_URL 
    ? new URL(process.env.CI_PAGES_URL).pathname 
    : '/';
  
  config.base = basePath;
  return config;
},
```

This ensures **asset paths resolve correctly** when Storybook deploys to a subdirectory rather than the domain root.

### Optimization strategies for faster pipelines

Modern GitLab CI features enable substantial performance improvements. Setting `FF_USE_FASTZIP` and appropriate `ARTIFACT_COMPRESSION_LEVEL` accelerates artifact handling by 20-30%:

```yaml
variables:
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fastest"
```

Using Alpine-based Node images reduces image pull time-node:20-alpine is **60-70% smaller** than node:20. For libraries, Alpine provides all necessary tools while dramatically improving pipeline start time.

Parallel test execution splits large test suites across multiple jobs:

```yaml
test:unit:
  parallel: 4
  script:
    - npm run test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

This scales test execution **linearly with parallelism**-four parallel jobs complete a 4-minute test suite in approximately 1 minute.

### Complete GitLab CI best practices summary

Effective CI pipelines combine **strategic caching, intelligent parallelism, and efficient artifact handling**. Cache the npm directory with lock file-based keys and fallback inheritance. Use the needs keyword to enable parallel execution of independent jobs. Set short expiration times for intermediate artifacts like node_modules (1 hour), and longer times for build outputs (1 week).

The resulting pipeline provides **fast feedback loops** for developers-merge requests receive lint and test results within 3-5 minutes, while production deployments complete including Storybook publication in under 10 minutes. This efficiency encourages frequent commits and rapid iteration while maintaining high quality standards.

---

## Conclusion: Building for the modern component ecosystem

This comprehensive guide establishes production-ready patterns for React 19 component library development, from initial architecture through automated deployment. The architectural decisions-one-component-per-folder structure, Vanilla Extract theming, preserveModules build strategy-work synergistically to achieve **optimal tree-shaking and minimal bundle sizes**.

Storybook 8 transforms development workflow by serving as both development environment and documentation platform, while interaction testing validates component behavior in real browsers. Modern code quality tooling with ESLint 9 flat config, Husky v9, and lint-staged enforces consistency automatically. GitLab CI/CD pipelines with strategic caching and parallelism provide fast feedback loops that support rapid iteration.

The combination of these patterns creates component libraries that excel on **three critical dimensions**: developer experience through excellent tooling and documentation, consumer experience through optimal bundle sizes and flexible APIs, and maintainability through automated testing and quality gates. Real-world implementations demonstrate 40-60% bundle size reductions compared to traditional approaches-improvements that compound across every consuming application.

Building modern component libraries requires attention to architectural details that impact both immediate developer experience and long-term library success. Every decision documented here serves these dual objectives, creating libraries that developers enjoy using and consumers can deploy with confidence in production applications.