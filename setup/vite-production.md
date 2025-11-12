# Building a High-Performance React 19 Component Library with Vite and Vanilla Extract

Configuring Vite for building production-grade React component libraries requires understanding the interplay between module formats, tree-shaking mechanics, and CSS bundling strategies. This guide provides the complete technical foundation-not just what to configure, but why each decision matters for your library's bundle size and consumer experience.

## 1. Initial Project Setup & Dependencies

Start by creating your project and installing the essential build toolchain:

```bash
npm create vite@latest my-component-library -- --template react-ts
cd my-component-library
```

### Core Dependencies

Install the complete development dependency stack:

```bash
# Core Vite and React
npm install --save-dev vite @vitejs/plugin-react

# TypeScript and type generation
npm install --save-dev typescript @types/react @types/react-dom vite-plugin-dts

# Vanilla Extract styling
npm install --save-dev @vanilla-extract/css @vanilla-extract/vite-plugin

# CSS injection for libraries
npm install --save-dev vite-plugin-lib-inject-css

# Utility for glob patterns
npm install --save-dev glob

# React as peer dependencies
npm install --save-dev react react-dom
```

### Understanding Each Dependency

**@vitejs/plugin-react** transforms JSX and enables Fast Refresh during development. Critical for React component processing, this plugin uses esbuild for blazingly fast transformations while maintaining compatibility with React 19's latest features including the automatic JSX runtime.

**vite-plugin-dts** generates TypeScript declaration files (.d.ts) automatically during the build process. The plugin can either generate individual declarations for each source file or bundle them into a single file using `rollupTypes: true`, which provides cleaner distribution for consumers. Alternative: use `tsc --emitDeclarationOnly` for more control but requires manual integration.

**@vanilla-extract/vite-plugin** processes `.css.ts` files at build time, extracting type-safe styles into static CSS with zero runtime overhead. Unlike CSS-in-JS libraries that bundle style logic with your JavaScript, Vanilla Extract compiles away completely-styles become hashed class names, CSS gets extracted to separate files, and your JavaScript remains lean.

**vite-plugin-lib-inject-css** automatically injects CSS import statements into component chunks. Without this plugin, your library generates CSS files but doesn't import them, forcing consumers to manually add CSS imports. This plugin reads Vite's metadata about which CSS belongs to which chunk and generates relative import statements at the top of each JavaScript file.

**glob** enables pattern-based file selection for multi-entry builds. Instead of listing every component file individually, you can use patterns like `lib/**/*.{ts,tsx}` to automatically include all components as separate entry points-essential for optimal tree-shaking.

### Peer Dependencies Configuration

Add React as peer dependencies, not regular dependencies. This prevents bundling React into your library, which would create duplicate React instances in consuming applications:

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

The version range allows flexibility-consumers can use React 18 or 19. Your devDependencies should include React for development and testing, while peerDependencies signal what consumers must provide.

## 2. Core vite.config.ts for Library Mode

Vite's library mode fundamentally changes how bundling works compared to application mode. Instead of code-splitting for optimal loading, library mode focuses on creating consumable modules that downstream bundlers can optimize.

### Complete Base Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Don't copy public folder to dist (library doesn't need public assets)
    copyPublicDir: false,
    
    // Enable sourcemaps for debugging in node_modules
    sourcemap: true,
    
    lib: {
      // Entry point - your library's main export file
      entry: resolve(__dirname, 'lib/main.ts'),
      
      // Global variable name (only for UMD/IIFE, not needed for ESM/CJS)
      name: 'MyComponentLibrary',
      
      // Output file naming strategy
      // Can be string or function for complex scenarios
      fileName: (format) => `my-library.${format}.js`,
      
      // Output module formats
      formats: ['es', 'cjs']
    },
    
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
```

### Understanding build.lib Options

**entry**: The single file that exports your public API. Think of this as `index.ts`-the file consumers import from. You can also use an object for multiple entry points:

```typescript
entry: {
  index: resolve(__dirname, 'lib/index.ts'),
  components: resolve(__dirname, 'lib/components/index.ts')
}
```

**name**: Only relevant for UMD/IIFE formats where your library becomes a global variable. For modern ESM-first libraries, this can be omitted. Example: if name is "MyLib" and format is UMD, consumers can access your library via `window.MyLib` in browsers.

**fileName**: Controls output file naming. The format parameter is 'es' for ESM, 'cjs' for CommonJS, 'umd' for UMD, and 'iife' for IIFE. A function gives you complete control:

```typescript
fileName: (format, entryName) => {
  if (format === 'es') return `${entryName}.mjs`
  if (format === 'cjs') return `${entryName}.cjs`
  return `${entryName}.${format}.js`
}
```

**formats**: Critical decision point. The array determines which module systems your library supports:

- **['es']** (ESM only): Modern, maximum tree-shakability, requires Node 12.7+ or modern bundlers. **Recommended** for new libraries.
- **['es', 'cjs']** (Dual ESM/CJS): Broadest compatibility, supports legacy tooling. Use when you need Node 12.6- support or compatibility with older bundlers.
- **['es', 'cjs', 'umd']**: Legacy approach, rarely needed for React libraries today. UMD adds significant bundle size and complexity.

**Why ESM-only is recommended**: ESM's static import syntax enables perfect tree-shaking. Bundlers can statically analyze which exports are used and eliminate unused code. CJS's dynamic `require()` makes this analysis much harder. Every library eventually moves to ESM-only; starting there future-proofs your architecture.

## 3. Handling Peer Dependencies

Externalizing peer dependencies is non-negotiable for libraries. Bundling React into your library creates severe problems: duplicate React instances break hooks, bloat bundle sizes, and cause version conflicts.

### Comprehensive External Configuration

```typescript
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  build: {
    rollupOptions: {
      // Externalize all peer dependencies
      external: [
        // React core - never bundle these
        'react',
        'react-dom',
        'react/jsx-runtime',
        
        // React deep imports (for React 18+)
        /^react\//,
        
        // All peer dependencies automatically
        ...Object.keys(pkg.peerDependencies || {}),
        
        // Node built-ins for SSR compatibility
        /^node:.*/,
      ],
      
      output: {
        // Global variable names for UMD builds
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    }
  }
})
```

### Why External Configuration Matters

**Prevents duplicate code**: Consumers already have React in their node_modules. Bundling React into your library means they download React twice-once in your library, once in their dependencies. With a typical React bundle of 130KB minified, this wastes 130KB.

**Enables tree-shaking**: External modules can be tree-shaken by the consuming application's bundler. When React is external, Webpack/Rollup/Vite in the consumer app can optimize React imports based on what's actually used across the entire application.

**Avoids version conflicts**: Multiple React versions in one application cause bugs. Hooks maintain state based on React instance identity-if two React instances exist, they don't share state and hooks break with "Invalid hook call" errors.

**Reduces library size**: Your library stays lean, typically 10-50KB instead of 150KB+. Smaller packages mean faster npm installs and better DX.

### Regex Patterns for Complex Externalization

Some libraries have deep imports that need externalization. Using regex patterns catches all variations:

```typescript
external: [
  'react',
  /^react\//,  // Matches react/jsx-runtime, react/jsx-dev-runtime, etc.
  /^@emotion\//,  // Matches @emotion/react, @emotion/styled, etc.
  /^lodash\//,  // Matches lodash/fp, lodash/debounce, etc.
]
```

This approach is more maintainable than listing every possible subpath manually.

## 4. Integrating Vanilla Extract

Vanilla Extract provides zero-runtime styling with TypeScript type safety. Unlike CSS-in-JS libraries that include runtime style injection logic, Vanilla Extract compiles completely away at build time-you get static CSS files and hashed class name strings.

### Complete Vanilla Extract Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { libInjectCss } from 'vite-plugin-lib-inject-css'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    
    // Process Vanilla Extract .css.ts files
    vanillaExtractPlugin({
      // Class name generation strategy
      identifiers: 'short'  // Production: short hashes; dev: 'debug' for readable names
    }),
    
    // Inject CSS imports into component chunks
    libInjectCss(),
    
    // Generate TypeScript declarations
    dts({ 
      include: ['lib'],
      exclude: ['**/*.stories.tsx', '**/*.test.tsx']
    })
  ],
  
  build: {
    copyPublicDir: false,
    
    // Enable CSS code splitting for per-component CSS
    cssCodeSplit: true,
    
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es']
    },
    
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime']
    }
  }
})
```

### How Vanilla Extract Processing Works

When you write a `.css.ts` file, Vanilla Extract evaluates it at build time:

```typescript
// Button.css.ts
import { style } from '@vanilla-extract/css'

export const button = style({
  padding: '10px 20px',
  backgroundColor: 'blue',
  ':hover': {
    backgroundColor: 'darkblue'
  }
})
```

**Build-time transformation:**

1. The plugin evaluates `Button.css.ts` in Node.js
2. Extracts style objects and generates CSS
3. Creates hashed class names for scoping
4. Outputs static CSS file: `Button.css.ts.vanilla.css`
5. Replaces your style exports with class name strings

**Output JavaScript:**

```javascript
// Button.js (after build)
import './Button.css.ts.vanilla.css'
export const button = 'Button_button_d6ckgi0'
```

**Output CSS:**

```css
/* Button.css.ts.vanilla.css */
.Button_button_d6ckgi0 {
  padding: 10px 20px;
  background-color: blue;
}
.Button_button_d6ckgi0:hover {
  background-color: darkblue;
}
```

Your component imports just a string-no runtime CSS injection, no JavaScript overhead. The CSS exists as a separate static asset that bundlers can optimize.

### CSS Bundling Strategies

You face a critical architectural choice: per-component CSS files or a single CSS bundle.

**Strategy 1: Per-Component CSS (Recommended)**

With `libInjectCss` and multiple entry points, each component gets its own CSS file automatically imported:

```typescript
// Output structure
dist/
├── components/
│   ├── Button.js          // Imports ../assets/Button.css
│   └── Input.js           // Imports ../assets/Input.css
└── assets/
    ├── Button.css.ts.vanilla.css
    └── Input.css.ts.vanilla.css
```

**Benefits**: Automatic CSS tree-shaking. When a consumer imports only Button, Webpack/Vite only bundles Button.css. Unused components and their CSS are completely eliminated. In real-world scenarios, this reduces CSS bundle sizes by 60-80% when consumers use only a subset of your library.

**Requirements**: Consumers must use bundlers that handle CSS imports (Vite, Webpack 5+, Next.js 13.4+, Remix). For older tooling, they may need configuration.

**Strategy 2: Single CSS Bundle**

Without `libInjectCss`, all CSS merges into one file:

```typescript
// Output structure
dist/
├── main.js
└── style.css
```

Consumers manually import the CSS:

```javascript
import 'my-library/dist/style.css'
import { Button } from 'my-library'
```

**Benefits**: Maximum compatibility-works with any bundler or even no bundler. Simple mental model. No CSS import handling required.

**Drawbacks**: No CSS tree-shaking. All library CSS loads regardless of which components consumers use. For a 50-component library where consumers typically use 5-10 components, this wastes significant bandwidth.

**Recommendation**: Use per-component CSS for modern libraries. Document bundler requirements. Provide single bundle as alternative distribution if needed.

### Configuring sideEffects for CSS

The `sideEffects` field in package.json is critical for tree-shaking with CSS. CSS imports are side effects-they execute code (loading styles) but don't export JavaScript values.

```json
{
  "sideEffects": [
    "**/*.css",
    "**/*.css.ts",
    "**/*.vanilla.css"
  ]
}
```

**Without this**: Webpack and other bundlers may remove CSS imports during tree-shaking, assuming they're unused because no exports are referenced. Your components render unstyled in production builds.

**With this**: Bundlers preserve CSS imports even when no JavaScript values are imported from those files.

**For truly side-effect-free code**: Use `"sideEffects": false` only if your library has zero CSS imports and no module-level code execution. Most component libraries need the array form to preserve CSS.

## 5. Advanced Rollup Output Optimization

This section represents the most impactful configuration for bundle size and tree-shaking effectiveness. The default Vite library build creates a single bundled file-convenient but severely limiting for tree-shaking.

### The Problem with Single Bundle Output

When Vite bundles your entire library into one file:

```javascript
// dist/my-library.js (single bundle)
export { Button } from './components/Button'
export { Input } from './components/Input'
export { Modal } from './components/Modal'
// ... 50 more components all bundled together
```

Consuming applications face a dilemma: import any single export, and bundlers must include the entire file. Even sophisticated tree-shaking cannot eliminate unused components because they're all in one module. The bundler must parse the entire file, analyze its dependency graph, and attempt dead code elimination-which is imperfect with React components due to side effects.

**Real-world impact**: A 75KB library where consumers import one small component still adds 75KB to their bundle. Research shows 60-80% of typical library code goes unused in any given application.

### Understanding preserveModules

The `preserveModules` Rollup option maintains your source file structure in the output:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'lib'
      }
    }
  }
})
```

**Output structure:**

```
dist/
├── components/
│   ├── Button.js
│   ├── Input.js
│   └── Modal.js
├── utils/
│   ├── classNames.js
│   └── merge.js
└── index.js
```

Each source file becomes a separate output file. Consumers' bundlers can now make granular decisions about what to include.

### Why preserveModules Improves Tree-Shaking

**Module-level elimination**: Bundlers can exclude entire files that are never imported. If a consumer never imports Modal, the Modal.js file simply isn't included. With a single bundle, the Modal code is present in the bundle file even if never executed.

**Static analysis precision**: Import statements point to specific files, making dependency graphs explicit and unambiguous. Bundlers can confidently eliminate files with zero incoming edges in the dependency graph.

**Cascading elimination**: When Modal.js is eliminated, all modules that *only* Modal imports also get eliminated. This cascades through the dependency tree, removing transitive dependencies automatically.

**Measured impact**: Case studies show bundle size reductions of 60-80% when consumers import subsets of libraries. A 184KB library (gzipped) reduces to 12KB when only two components are imported, thanks to granular module elimination.

### The Multiple Entry Points Approach (Recommended)

However, there's a better approach than `preserveModules` for libraries: treating each source file as an entry point.

```typescript
import { defineConfig } from 'vite'
import { resolve, extname, relative } from 'path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es']
    },
    
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      
      // Convert all source files to entry points
      input: Object.fromEntries(
        glob.sync('lib/**/*.{ts,tsx}', {
          ignore: [
            'lib/**/*.d.ts',
            'lib/**/*.test.tsx',
            'lib/**/*.stories.tsx'
          ]
        }).map(file => [
          // Entry name: lib/components/Button.tsx -> components/Button
          relative(
            'lib',
            file.slice(0, file.length - extname(file).length)
          ),
          // Absolute path to file
          fileURLToPath(new URL(file, import.meta.url))
        ])
      ),
      
      output: {
        // Don't use preserveModules with multiple entries
        preserveModules: false,
        
        // Clean output paths
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js'
      }
    }
  }
})
```

### Multiple Entries vs preserveModules: Key Differences

**preserveModules** maintains your exact directory structure but has issues:
- Can incorrectly handle CSS and other assets
- May preserve virtual modules created by plugins
- Less control over output structure
- Official Rollup docs recommend against it for libraries

**Multiple entry points**:
- Rollup treats each file as a distinct bundle target
- Better handling of shared dependencies (creates chunks automatically)
- More control over output naming and structure
- Recommended by Rollup maintainers for library builds

### Understanding manualChunks

The `manualChunks` option is frequently misunderstood. It's designed for **application bundling**, not libraries:

```typescript
// ❌ DON'T use in libraries
output: {
  manualChunks: {
    vendor: ['react', 'react-dom']
  }
}
```

**Why not for libraries:**

**Purpose mismatch**: `manualChunks` optimizes chunk loading and caching in deployed applications. Libraries ship to npm, not browsers directly. You want consuming applications to handle chunking based on their specific needs.

**Limits tree-shaking**: Manual chunks still bundle multiple modules together. Consumers cannot tree-shake within a chunk. You've just moved the single-bundle problem from one file to several files.

**Loss of control**: Consumers cannot override your chunking strategy. They're stuck with your decisions even if their usage patterns differ.

**Use case**: `manualChunks` is valuable when building the documentation site or Storybook for your library-those are applications. But the library package itself should avoid it.

### Complete Optimized Configuration

Combining all optimization strategies:

```typescript
import { defineConfig } from 'vite'
import { resolve, extname, relative } from 'path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { libInjectCss } from 'vite-plugin-lib-inject-css'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    libInjectCss(),
    dts({ 
      include: ['lib'],
      rollupTypes: true 
    })
  ],
  
  esbuild: {
    // Preserve identifiers for better tree-shaking analysis
    minifyIdentifiers: false
  },
  
  build: {
    copyPublicDir: false,
    sourcemap: true,
    cssCodeSplit: true,
    
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    
    rollupOptions: {
      // Strict entry signatures prevent unexpected exports
      preserveEntrySignatures: 'strict',
      
      // Externalize peer dependencies
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^react\//
      ],
      
      // All files as entry points for maximum tree-shaking
      input: Object.fromEntries(
        glob.sync('lib/**/*.{ts,tsx}', {
          ignore: [
            'lib/**/*.d.ts',
            'lib/**/*.test.tsx',
            'lib/**/*.stories.tsx'
          ]
        }).map(file => [
          relative('lib', file.slice(0, file.length - extname(file).length)),
          fileURLToPath(new URL(file, import.meta.url))
        ])
      ),
      
      output: {
        // Preserve compatibility with older bundlers
        interop: 'auto',
        
        // Consistent asset naming
        assetFileNames: 'assets/[name][extname]',
        
        // Clean entry file names
        entryFileNames: '[name].js',
        
        // Shared code chunking (automatic)
        chunkFileNames: 'chunks/[name].[hash].js'
      }
    }
  }
})
```

### Performance Trade-offs

**Single bundle approach:**
- ✅ Simple build output (one file)
- ✅ Faster library build time
- ✅ Works with any consumer setup
- ❌ Poor tree-shaking (consumers include everything)
- ❌ Large consumer bundle sizes

**Multiple entry points approach:**
- ✅ Excellent tree-shaking (60-80% reduction in consumer bundles)
- ✅ Consumers only bundle what they import
- ✅ Automatic shared chunk optimization
- ⚠️ More complex build output (many files)
- ⚠️ Slightly slower library build time
- ⚠️ Requires modern consumer bundlers

**The verdict**: For production libraries distributed on npm, the multiple entry points approach is superior. Consumers benefit dramatically from smaller bundle sizes, and modern tooling (Vite, Webpack 5+, Next.js, Remix) all handle this pattern perfectly.

## 6. TypeScript and Declaration File Generation

TypeScript declaration files enable IntelliSense, type checking, and documentation for TypeScript consumers. Even if consumers use JavaScript, declarations enable better IDE support through JSDoc inference.

### Strategy 1: Using vite-plugin-dts (Recommended)

The plugin integrates directly into Vite's build pipeline:

```typescript
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      // Only include library source files
      include: ['lib/**/*.ts', 'lib/**/*.tsx'],
      
      // Exclude test and story files
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.stories.tsx',
        '**/*.spec.ts'
      ],
      
      // Bundle all declarations into single file (optional)
      rollupTypes: true,
      
      // Add types entry to package.json exports
      insertTypesEntry: true,
      
      // Output directory (defaults to Vite's outDir)
      outDir: 'dist',
      
      // TypeScript config file to use
      tsconfigPath: './tsconfig.app.json'
    })
  ]
})
```

**How it works**: The plugin runs `tsc` with `declaration: true` during the Vite build. It can generate individual `.d.ts` files for each source file, or with `rollupTypes: true`, bundle all declarations into a single `index.d.ts` using `@microsoft/api-extractor`.

**Benefits:**
- Seamless Vite integration-runs automatically with `vite build`
- No separate build step needed
- Can bundle types for cleaner distribution
- Automatically handles module resolution

**Drawbacks:**
- Adds build complexity
- Can be slower than raw tsc
- Occasionally has edge cases with complex types
- Another dependency to maintain

### Strategy 2: Using tsc --emitDeclarationOnly

Pure TypeScript compiler approach:

```json
// tsconfig.json
{
  "compilerOptions": {
    // Enable declaration generation
    "declaration": true,
    "declarationMap": true,
    
    // Output directory
    "outDir": "./dist",
    
    // Only emit declarations
    "emitDeclarationOnly": true,
    
    // Module settings
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    
    // React JSX
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    
    // Type checking (strict mode)
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    
    // Source maps for declarations
    "sourceMap": true,
    
    // Other
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["lib/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.stories.tsx"
  ]
}
```

**Build script:**

```json
{
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "build:types": "tsc --project tsconfig.json"
  }
}
```

**Benefits:**
- Official TypeScript compiler-maximum reliability
- Predictable behavior
- Generally faster for declarations
- No plugin dependencies

**Drawbacks:**
- Manual integration required
- Separate build step
- No automatic type bundling (needs api-extractor separately)
- Two tools to configure

### Required tsconfig.json Settings

Key compiler options for library builds:

```json
{
  "compilerOptions": {
    // Modern module resolution that understands package.json exports
    "moduleResolution": "bundler",  // Or "node16", "nodenext"
    
    // ESM output
    "module": "ESNext",
    "target": "ES2020",
    
    // Declaration generation
    "declaration": true,
    "declarationMap": true,  // Enables "go to definition" for consumers
    
    // React 19 automatic JSX transform
    "jsx": "react-jsx",
    
    // Strict type checking for quality
    "strict": true,
    "skipLibCheck": true,
    
    // Library best practices
    "esModuleInterop": true,
    "isolatedModules": true,  // Ensures each file can be transpiled independently
    "forceConsistentCasingInFileNames": true
  }
}
```

**Critical: moduleResolution setting**: Must use `"bundler"`, `"node16"`, or `"nodenext"` to support package.json `exports` field. The legacy `"node"` setting doesn't understand modern export maps and will cause resolution errors.

### Handling Dual Format Exports

When building both ESM and CJS, you can generate separate declaration files for each:

```typescript
// package.json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": {
        "types": "./dist/index.d.mts",  // ESM types
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",  // CJS types
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

**Why separate type files**: While JavaScript code differs slightly between ESM and CJS (import vs require), TypeScript declarations can usually be shared. However, module resolution can differ, so separate `.d.mts` and `.d.cts` files ensure perfect compatibility.

**In practice**: Most libraries use a single `.d.ts` file for both formats unless they have conditional types based on module system.

### Bundling Declaration Files

Large libraries generate hundreds of `.d.ts` files. Bundling them improves consumer experience:

```typescript
dts({
  rollupTypes: true  // Uses @microsoft/api-extractor internally
})
```

**Output**: Single `dist/index.d.ts` with all types.

**Benefits:**
- Faster TypeScript compilation in consuming projects
- Cleaner node_modules
- Single source of truth for types

**Drawbacks:**
- Lose granular type-level tree-shaking
- Slightly harder debugging (all types in one file)
- Build time increases

**Recommendation**: Bundle types for libraries with 50+ components. Keep separate for smaller libraries where granularity helps debugging.

## 7. Configuring package.json for Publishing

The package.json file is your library's contract with consumers. Incorrect configuration causes resolution errors, tree-shaking failures, and version conflicts.

### Complete Modern Configuration

```json
{
  "name": "@yourorg/component-library",
  "version": "1.0.0",
  "type": "module",
  "description": "High-performance React component library with Vanilla Extract styling",
  
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourorg/component-library"
  },
  
  "files": [
    "dist",
    "README.md"
  ],
  
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js",
      "require": "./dist/components/*.cjs"
    },
    "./package.json": "./package.json"
  },
  
  "sideEffects": [
    "**/*.css",
    "**/*.css.ts"
  ],
  
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vanilla-extract/css": "^1.14.0",
    "@vanilla-extract/vite-plugin": "^4.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "glob": "^10.3.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-dts": "^3.7.0",
    "vite-plugin-lib-inject-css": "^2.0.0"
  },
  
  "keywords": [
    "react",
    "components",
    "ui-library",
    "vanilla-extract",
    "typescript"
  ]
}
```

### Understanding Each Field

**type: "module"**: Declares your package as ESM. Node.js interprets `.js` files as ESM instead of CJS. Without this, you must use `.mjs` extensions for ESM files. Modern practice is to use `"type": "module"` and `.cjs` extensions for any CommonJS code.

**files**: Allowlist of files included in npm package. Only `dist` directory ships-source files, tests, config files stay out of the published package. Always explicit-better than .npmignore which uses denylist approach and risks accidentally publishing sensitive files.

**main, module, types**: Legacy fields for backward compatibility:
- `main`: CJS entry point for older Node and bundlers
- `module`: ESM entry point (bundler convention, not Node.js standard)
- `types`: Root TypeScript declarations

These fields work with older tooling that doesn't understand the `exports` field. Modern tooling ignores them when `exports` exists.

**exports**: Modern entry point configuration. Takes precedence over main/module/types. Supports conditional exports based on import conditions:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",      // TypeScript types (always first)
      "import": "./dist/index.js",       // ESM import
      "require": "./dist/index.cjs",     // CJS require
      "default": "./dist/index.js"       // Fallback
    }
  }
}
```

**Condition order matters**: First matching condition wins. Always put `types` first so TypeScript finds declarations. Then `import`/`require` for module format. Finally `default` as fallback.

### Subpath Exports

Enable consumers to import from subpaths for better tree-shaking:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./components/Button": "./dist/components/Button.js",
    "./components/*": "./dist/components/*.js",
    "./utils": "./dist/utils/index.js",
    "./package.json": "./package.json"
  }
}
```

Consumers can then import:

```javascript
import { Button } from '@yourorg/library/components/Button'
import { classNames } from '@yourorg/library/utils'
```

**Benefit**: More explicit imports. Bundlers see exactly which modules are needed, improving tree-shaking even beyond what multiple entry points provide.

**Trade-off**: More verbose imports. Consider exposing both approaches-main entry with re-exports for convenience, subpath exports for maximum optimization.

### The sideEffects Field: Critical for Tree-Shaking

```json
{
  "sideEffects": [
    "**/*.css",
    "**/*.css.ts",
    "**/*.vanilla.css"
  ]
}
```

**What are side effects**: Code that executes when imported beyond just defining exports. Examples: CSS imports, global state initialization, polyfills, module-level DOM manipulation.

**How bundlers use this**:
- `"sideEffects": false` - Safe to remove any module with no used exports
- `"sideEffects": ["*.css"]` - Safe to remove modules except CSS files
- `"sideEffects": true` or omitted - Cannot remove any modules (disables tree-shaking)

**For component libraries**: CSS imports are side effects. Without listing them, bundlers remove unused component CSS, breaking styling. List all CSS file patterns to preserve them while allowing JavaScript tree-shaking.

**Optimal setting for most libraries**:

```json
{
  "sideEffects": [
    "**/*.css",
    "**/*.scss",
    "**/*.less",
    "**/*.css.ts"
  ]
}
```

**Only use `"sideEffects": false`** if your library truly has no side effects-pure utility functions with no styling, no global state, no module initialization code.

### Peer Dependencies Version Ranges

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

**The `||` syntax**: Allows React 18 or React 19. Version ranges balance compatibility and maintenance:

**Too restrictive**: `"react": "^18.2.0"` - Excludes React 18.0 and 18.1 users unnecessarily  
**Too permissive**: `"react": ">=16.8.0"` - You probably haven't tested with React 16, claiming support is risky  
**Just right**: `"react": "^18.0.0 || ^19.0.0"` - Clear about tested versions, includes both major versions you support

### Development vs Peer vs Regular Dependencies

**peerDependencies**: Libraries your code imports but consumers must provide (React, React DOM)

**devDependencies**: Build tools and development packages (Vite, TypeScript, testing tools). Not included in published package.

**dependencies**: Libraries bundled into your library code. Keep this empty for React libraries-externalize everything into peer dependencies instead.

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "react": "^19.0.0",  // For development
    "@types/react": "^18.2.0",
    "vite": "^5.0.0"
  },
  "dependencies": {}  // Empty for component libraries
}
```

## 8. Final Build Scripts

Efficient build scripts streamline development and prevent publishing stale builds.

### Complete npm Scripts Configuration

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:watch": "vite build --watch",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build",
    "type-check": "tsc --noEmit",
    "lint": "eslint lib --ext .ts,.tsx",
    "test": "vitest",
    "preview": "vite preview"
  }
}
```

### Script Explanations

**dev**: Starts Vite development server. Useful for developing with your library locally before publishing. Set up a demo app in your library repo to test components.

**build**: Production build. Runs TypeScript type checking first (fails fast on type errors), then Vite build. Some teams separate type checking into CI for faster local builds.

**build:watch**: Rebuild on file changes. Useful when developing a library and consumer app simultaneously via `npm link`.

**clean**: Removes build artifacts before rebuilding. Prevents stale files from previous builds contaminating distribution. Critical before publishing.

**prepublishOnly**: Lifecycle hook that runs automatically before `npm publish`. Guarantees fresh build and prevents accidentally publishing uncommitted or stale code. The `Only` variant runs only on publish, not on `npm install`.

**type-check**: Runs TypeScript compiler without emitting files-pure type checking. Faster than full build for validation in CI or pre-commit hooks.

### Advanced Build Script Patterns

**Dual format build:**

```json
{
  "scripts": {
    "build:esm": "vite build --config vite.config.esm.ts",
    "build:cjs": "vite build --config vite.config.cjs.ts",
    "build": "npm run clean && npm run build:esm && npm run build:cjs"
  }
}
```

**With type bundling:**

```json
{
  "scripts": {
    "build": "vite build",
    "build:types": "tsc --emitDeclarationOnly",
    "build:bundle-types": "api-extractor run --local",
    "build:full": "npm run build && npm run build:types && npm run build:bundle-types"
  }
}
```

**With bundle analysis:**

```json
{
  "scripts": {
    "build": "vite build",
    "analyze": "vite-bundle-visualizer",
    "build:analyze": "npm run build && npm run analyze"
  }
}
```

### Pre-Publish Checklist Script

Create a comprehensive validation script:

```bash
#!/bin/bash
# scripts/pre-publish.sh

set -e  # Exit on any error

echo "🧹 Cleaning dist directory..."
rm -rf dist

echo "🔍 Type checking..."
tsc --noEmit

echo "🧪 Running tests..."
npm test -- --run

echo "🏗️ Building library..."
npm run build

echo "📦 Validating package..."
npx publint
npx @arethetypeswrong/cli --pack .

echo "✅ Ready to publish!"
```

```json
{
  "scripts": {
    "prepublishOnly": "bash scripts/pre-publish.sh"
  }
}
```

### Local Development Workflow

**Using npm link:**

```bash
# In library directory
npm link

# In consumer app directory
npm link @yourorg/component-library

# Start watch mode
npm run build:watch
```

**Using pnpm workspaces (recommended):**

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

Structure:
```
/
├── packages/
│   └── component-library/  # Your library
└── examples/
    └── demo-app/           # Test consumer app
```

Changes in library automatically reflected in demo-app with instant HMR.

### Testing the Built Package

Before publishing, test the actual built package:

```bash
# Create tarball (what npm publish sends)
npm pack

# Inspect tarball contents
tar -xzf yourorg-component-library-1.0.0.tgz
ls -R package/

# Install in test project
cd ../test-app
npm install ../component-library/yourorg-component-library-1.0.0.tgz
```

This reveals issues like missing files, incorrect exports, or broken imports before you publish to npm.

---

## Putting It All Together: Complete Working Example

Here's the full configuration integrating all concepts:

```typescript
// vite.config.ts - Complete production configuration
import { defineConfig } from 'vite'
import { resolve, extname, relative } from 'path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { libInjectCss } from 'vite-plugin-lib-inject-css'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin({
      identifiers: process.env.NODE_ENV === 'production' ? 'short' : 'debug'
    }),
    libInjectCss(),
    dts({
      include: ['lib'],
      exclude: ['**/*.test.tsx', '**/*.stories.tsx'],
      rollupTypes: true,
      insertTypesEntry: true
    })
  ],
  
  esbuild: {
    minifyIdentifiers: false,  // Better tree-shaking
    minifySyntax: true,
    minifyWhitespace: true
  },
  
  build: {
    copyPublicDir: false,
    sourcemap: true,
    cssCodeSplit: true,
    
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es']
    },
    
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^react\//
      ],
      
      input: Object.fromEntries(
        glob.sync('lib/**/*.{ts,tsx}', {
          ignore: [
            'lib/**/*.d.ts',
            'lib/**/*.test.{ts,tsx}',
            'lib/**/*.stories.{ts,tsx}'
          ]
        }).map(file => [
          relative('lib', file.slice(0, file.length - extname(file).length)),
          fileURLToPath(new URL(file, import.meta.url))
        ])
      ),
      
      output: {
        interop: 'auto',
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js'
      }
    }
  }
})
```

```json
// package.json - Complete configuration
{
  "name": "@yourorg/component-library",
  "version": "1.0.0",
  "type": "module",
  "description": "High-performance React 19 component library with Vanilla Extract styling",
  "author": "Your Name",
  "license": "MIT",
  
  "files": ["dist"],
  
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js"
    },
    "./package.json": "./package.json"
  },
  
  "sideEffects": ["**/*.css", "**/*.css.ts"],
  
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build",
    "type-check": "tsc --noEmit"
  },
  
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vanilla-extract/css": "^1.14.0",
    "@vanilla-extract/vite-plugin": "^4.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "glob": "^10.3.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-dts": "^3.7.0",
    "vite-plugin-lib-inject-css": "^2.0.0"
  },
  
  "keywords": [
    "react",
    "components",
    "ui-library",
    "vanilla-extract",
    "typescript",
    "vite"
  ]
}
```

```json
// tsconfig.json - TypeScript configuration
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    
    "jsx": "react-jsx",
    
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  
  "include": ["lib/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.stories.tsx"
  ]
}
```

This configuration produces the smallest possible production bundles with maximum tree-shakability. Consumers importing a single component will bundle only that component's code and CSS-the gold standard for library performance.

The architecture scales from small utility libraries to comprehensive design systems with hundreds of components. By understanding each configuration layer's purpose and trade-offs, you can adapt these patterns to your specific requirements while maintaining optimal performance.