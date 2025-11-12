# Storybook 10 Upgrade Guide for React 19 Component Libraries

Storybook 10, released in November 2025, introduces **one primary breaking change** (ESM-only architecture) while delivering transformative improvements to component testing, type safety, and developer workflows. For production React 19 component libraries using Vite and Vanilla Extract, this upgrade offers significant performance gains (29% smaller install), next-generation testing capabilities, and enhanced TypeScript support-making the migration effort worthwhile despite requiring Node.js 20.16+ and ESM-compliant configurations.

## The ESM-only transformation and what it means for your workflow

Storybook 10's singular breaking change represents a strategic modernization rather than arbitrary disruption. The complete removal of CommonJS support yields a **29% reduction in install size** on top of Storybook 9's 50% savings, totaling a cumulative 79% reduction from version 8. More importantly, the distribution code is now un-minified, making debugging substantially easier when tracing issues through Storybook's internals.

This architectural shift requires Node.js 20.16+, 22.19+, or 24+-specifically versions supporting `require(esm)` without experimental flags. Your configuration files must be valid ESM modules, meaning `.storybook/main.ts` and all presets need proper ESM syntax with explicit file extensions on relative imports. For local addons, you'll use `import.meta.resolve()` instead of bare path strings.

**Why this matters for component libraries:** Smaller install sizes directly translate to faster CI/CD pipelines, particularly valuable when running multiple test suites or building documentation sites. The un-minified code means when you encounter Storybook-specific bugs (inevitable in complex component libraries), you can actually read the framework code instead of fighting through mangled variable names. The ESM-only approach also future-proofs your setup as the JavaScript ecosystem continues its ESM migration.

## Module automocking: The game-changer for component isolation

The **module automocking system** (`sb.mock`) is arguably Storybook 10's most impactful feature for production component libraries. Built in collaboration with the Vitest team and inspired by Vitest's `vi.mock`, this system finally solves the long-standing challenge of testing components with external dependencies in true isolation.

Previous mocking approaches were builder-specific (Webpack or Vite), required complex package.json configurations with subpath imports, and often failed in production builds. Storybook 10's approach works uniformly across Vite and Webpack, functions in both development and static production builds, and requires just a single line in your preview configuration.

**Three mocking strategies available:**

**Spy-only mode** (recommended default) wraps all module exports in spies while preserving original functionality. This lets you assert that functions were called without replacing their behavior:

```typescript
// .storybook/preview.ts
import { sb } from 'storybook/test';
sb.mock(import('../lib/analytics.ts'), { spy: true });
```

**Full automocking** replaces all exports with empty mock functions, giving you complete control over module behavior for each story. **Custom mock files** in `__mocks__` directories follow Jest/Vitest conventions for complex scenarios requiring hand-crafted implementations.

**Why this transforms component library development:** Consider a data visualization component that fetches real-time metrics. Without mocking, you either skip interaction tests or implement complex test fixtures. With `sb.mock`, you declare the module mock globally in preview.ts, then control its behavior per story using `mocked()` from `@storybook/test`. This enables testing loading states, error boundaries, empty data scenarios, and edge cases that are difficult or impossible to reproduce with real dependencies. Your components become genuinely testable in isolation, and interaction tests can confidently assert on side effects without triggering real API calls or analytics events.

## React 19 compatibility and the current support landscape

Storybook 10 **fully supports React 19** with all major packages updated with proper peer dependencies: `@storybook/react`, `@storybook/react-vite`, `@storybook/react-webpack5`, `@storybook/blocks`, and `@storybook/addon-links`. The Storybook team actively tracks React 19 compatibility via GitHub issue #29805, with their official position being "you should be able to use Storybook with React 19, but if you find any inconsistency or unsupported feature, please let us know."

The integration required internal updates to React's `act` wrapper for component rendering and migration away from react-confetti (replaced with @neoconfetti/react) in the onboarding addon. These changes are transparent to end users-your React 19 components will work without special configuration.

**React-specific advantages in Storybook 10:** The new **CSF Factories** feature (promoted from experimental to preview status) is currently React-exclusive, with Vue, Angular, and Web Components support planned for 10.x releases. React also benefits from the default `react-docgen` parser, which provides up to 50% faster startup times compared to `react-docgen-typescript`.

**Experimental RSC testing** for React Server Components is available through an early access program. Previously, RSCs could only be tested via slow, flaky end-to-end tests. Storybook 10 introduces component-level RSC testing in a "server in browser" approach, enabling fast, controlled testing of server components. This collaboration with React core, Next.js, Testing Library, Vite, and Vitest teams positions Storybook as the future standard for RSC development workflows.

## Vite integration enhancements and zero-config philosophy

The `@storybook/react-vite` framework in Storybook 10 achieves near-zero configuration for most React projects. If your project already uses Vite with Vanilla Extract via `@vanilla-extract/vite-plugin`, **Storybook automatically extends your existing Vite config**-no Storybook-specific configuration needed.

The framework is pre-bundled for faster load times and includes automatic migration from `@storybook/react-webpack5` via the upgrade wizard. Minimum requirements are React ≥16.8, Vite ≥5.0, and Node 20.19+ or 22.12+ (for ESM support).

**Performance improvements quantified:** The ESM-only architecture delivers the 29% install size reduction. Switching from `react-docgen-typescript` to `react-docgen` (now the default) yields up to 50% faster React Storybook startup times. Hot Module Replacement (HMR) with Vite provides near-instant updates. Test builds are 2-4x faster compared to Storybook 7.

**Configuration flexibility:** Storybook gives you more control over Vite plugins in version 10. Dependencies for plugin-react and plugin-vue have moved outside Storybook's direct management, allowing you to configure these exactly as your project requires. Use the `viteFinal` hook in `.storybook/main.ts` to customize Storybook-specific settings while keeping your primary `vite.config.js` clean:

```typescript
async viteFinal(config, { configType }) {
  const { mergeConfig } = await import('vite');
  
  return mergeConfig(config, {
    optimizeDeps: {
      include: ['storybook-dark-mode']
    },
    // Add development-specific or production-specific configs
  });
}
```

**Why this matters:** Large component libraries often have complex build requirements-custom loaders, path aliases, environment-specific optimizations. The enhanced Vite integration lets you maintain a single source of truth in `vite.config.js` while extending it specifically for Storybook when needed. The performance gains are particularly valuable during development: faster startup means quicker feedback cycles, and instant HMR means you spend less time waiting for rebuilds when iterating on component designs.

## Vitest 4 integration and the shift to addon-vitest

Storybook 10 introduces **full support for Vitest 4** and strongly recommends the new **@storybook/addon-vitest** over the traditional test-runner for Vite-based projects. This represents a fundamental architectural shift in how Storybook tests execute.

The **traditional test-runner** requires a running Storybook instance and uses Jest as the runner with Playwright for browser automation. It orchestrates tests by visiting each story URL and executing play functions. While functional, this approach has overhead: you must keep Storybook running, Jest orchestrates browser navigation, and tests are slower due to the indirection.

The **Vitest addon** transforms stories into native Vitest tests at build time using portable stories. Tests run in real browsers via Playwright in browser mode, but without needing a separate Storybook server. It's faster, provides better IDE integration (run/debug tests directly in VSCode or JetBrains IDEs), includes built-in coverage reporting in the testing widget, and offers watch mode with smart re-running of only affected tests.

**Installation is automated:** `npx storybook add @storybook/addon-vitest` handles setup. Requirements are straightforward: Vite-based framework (react-vite, vue3-vite, nextjs-vite, sveltekit) and Vitest ≥3.0.

**Why this upgrade path matters for React 19 libraries:** If you're using `@storybook/react-vite`, you're already on the ideal stack for this transition. The Vitest addon gives you test execution speed comparable to unit tests while maintaining the high-fidelity rendering of real browser tests. The IDE integration means you can run individual story tests directly from your editor without switching context to a terminal or browser. The testing widget in Storybook's sidebar provides visual test management with pass/fail badges, watch mode toggle, and coverage reports-bringing the testing experience into Storybook's UI rather than requiring separate tooling.

## Configuration changes for main.ts and preview.tsx

**Main configuration structure:** Your `.storybook/main.ts` must be valid ESM in Storybook 10. The core structure remains familiar, but with strict ESM requirements:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
  ],
  typescript: {
    reactDocgen: 'react-docgen', // or 'react-docgen-typescript'
  },
};

export default config;
```

The **new tag filtering configuration** lets you set default sidebar behavior. For component libraries with experimental or deprecated components, you can exclude them from the default view:

```typescript
const config: StorybookConfig = {
  tags: {
    experimental: { defaultFilterSelection: 'exclude' },
    deprecated: { defaultFilterSelection: 'exclude' },
  },
};
```

**Preview configuration patterns:** Your `.storybook/preview.tsx` structure is unchanged, but you can leverage new capabilities:

```typescript
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    // Your theme decorator here
  ],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
```

**Addon ecosystem consolidation:** A critical change from Storybook 9 forward is that `@storybook/addon-essentials`, `@storybook/addon-interactions`, `@storybook/addon-links`, and `@storybook/blocks` are now **empty packages**. These have been consolidated into the main `storybook` package. Remove them from your package.json dependencies-they're included by default. You configure them in your addons array, but the actual code ships with core Storybook, reducing duplication and install overhead.

**TypeScript configuration nuances:** The `typescript.reactDocgen` setting controls documentation generation speed versus capability. The default `'react-docgen'` is 50% faster but doesn't support imported types from external packages. Switch to `'react-docgen-typescript'` if your components heavily use imported types, enums, or complex TypeScript features:

```typescript
typescript: {
  reactDocgen: 'react-docgen-typescript',
  reactDocgenTypescriptOptions: {
    compilerOptions: {
      allowSyntheticDefaultImports: false,
      esModuleInterop: false,
    },
    propFilter: (prop) =>
      prop.parent ? !/node_modules\/(?!@mui)/.test(prop.parent.fileName) : true,
  },
}
```

## Vanilla Extract integration and modern theme switching

**Vanilla Extract with Vite (your setup) is zero-configuration.** Since Storybook 10's `@storybook/react-vite` framework automatically extends your project's `vite.config.js`, any Vanilla Extract configuration you have already works in Storybook. If you're using `@vanilla-extract/vite-plugin` in your main Vite config, you're done-Storybook inherits it.

The only caveat is HMR (Hot Module Reloading) can be inconsistent with Vanilla Extract. You may occasionally need hard refreshes to properly reload CSS changes. This is a known limitation of the Vanilla Extract plugin, not specific to Storybook.

**Theme switching has three modern patterns in Storybook 10:**

**Pattern 1: @storybook/addon-themes with data attributes** (recommended for Vanilla Extract):

```typescript
import { withThemeByDataAttribute } from '@storybook/addon-themes';

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};
```

This decorator automatically adds a theme switcher to the toolbar and applies the selected theme as a data attribute on the preview iframe's root element. If your Vanilla Extract themes use `[data-theme="dark"]` selectors, this pattern provides the cleanest integration.

**Pattern 2: CSS class-based themes:**

```typescript
import { withThemeByClassName } from '@storybook/addon-themes';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};
```

**Pattern 3: JSX Provider themes** (for CSS-in-JS like Styled Components or Emotion):

```typescript
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../src/themes';

const preview: Preview = {
  decorators: [
    withThemeFromJSXProvider({
      themes: {
        light: lightTheme,
        dark: darkTheme,
      },
      defaultTheme: 'light',
      Provider: ThemeProvider,
    }),
  ],
};
```

**Why these patterns matter:** Component libraries need consistent theming across all stories without requiring theme props on every story export. The addon-themes decorators provide automatic toolbar integration, persistent theme selection (survives page reloads), and work seamlessly with Storybook's URL parameters for shareable links. For Vanilla Extract specifically, the data-attribute approach aligns perfectly with Vanilla Extract's contract-based theming where you define themes as data attributes in your CSS.

## CSF 3 compatibility and the path to CSF Factories

**CSF 3 stories require zero changes for Storybook 10.** All three Component Story Format versions (CSF 1, 2, and 3) remain fully supported with no deprecation plans. The only breaking change affecting story files is the broader ESM requirement-if your project uses ESM (which it should with Vite), your stories already comply.

**CSF Factories** represent the next evolution, promoted from experimental to preview status in Storybook 10. Currently React-only, this format delivers superior TypeScript ergonomics:

```typescript
// CSF 3 (current, fully supported)
import type { Meta, StoryObj } from '@storybook/react-vite';
import Button from './Button';

const meta = { component: Button } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: 'Button', primary: true }
};

// CSF Factories (new, optional)
import preview from '../.storybook/preview';
import Button from './Button';

const meta = preview.meta({ component: Button });

export const Primary = meta.story({
  args: { label: 'Button', primary: true }
});
```

The benefits are substantial for TypeScript users: **no manual type assignments**, **better autocompletion**, and **reduced boilerplate** (roughly 30% less code). The `preview.meta()` and `meta.story()` factories provide automatic type inference, eliminating the need for `satisfies Meta<typeof Button>` and manual `type Story = StoryObj<typeof meta>` declarations.

**Migration is optional** and automated codemods exist: `npx storybook@latest migrate csf-3-to-csf-factories`. You can migrate incrementally-mixing CSF 3 and CSF Factories across files (but not within the same file). Storybook 11 (Spring 2026) will make CSF Factories the default, but CSF 3 will remain supported.

**Why this matters for React 19 component libraries:** If your team prioritizes type safety and developer experience, CSF Factories reduce friction in story authoring. New team members encounter clearer, more intuitive syntax. IDE autocompletion works better, reducing errors. The reduced boilerplate means stories are more readable, making documentation and testing patterns easier to follow. However, if you have hundreds of existing CSF 3 stories working well, there's no urgency to migrate-CSF 3 isn't going anywhere.

## Testing enhancements: interaction testing, play functions, and lifecycle hooks

**Interaction testing in Storybook 10** receives significant upgrades through the `@storybook/test` package, which consolidates and improves on the previous `@storybook/jest` and `@storybook/testing-library` packages. Built on Vitest's expect and spy APIs, it's smaller, faster, and more feature-complete.

**Enhanced play functions** now support **step grouping** for better test organization:

```typescript
export const LoginFlow: Story = {
  play: async ({ canvas, userEvent, step }) => {
    await step('Enter credentials', async () => {
      await userEvent.type(canvas.getByTestId('email'), 'user@example.com');
      await userEvent.type(canvas.getByTestId('password'), 'password');
    });
    
    await step('Submit form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /submit/i }));
    });
    
    await step('Verify success', async () => {
      await expect(canvas.getByText(/welcome/i)).toBeInTheDocument();
    });
  }
};
```

Steps appear as collapsible sections in the Interactions panel, making complex test flows easier to debug visually.

**Lifecycle hooks** provide setup and teardown at three levels:

```typescript
// Project-level (.storybook/preview.ts)
const preview: Preview = {
  async beforeAll() {
    await initializeGlobalState();
    return () => cleanupGlobalState();
  },
  async beforeEach() {
    MockDate.reset();
  },
};

// Component-level (Button.stories.ts)
const meta = {
  component: Button,
  async beforeEach() {
    MockDate.set('2024-02-14');
    return () => MockDate.reset();
  },
};

// Story-level
export const WithMockedDate: Story = {
  async beforeEach() {
    MockDate.set('2025-01-01');
  },
};
```

**Experimental test syntax** (`.test` method) provides a familiar Jest/Vitest-like API:

```typescript
export const Disabled = meta.story({ args: { disabled: true } });

Disabled.test('should prevent clicks when disabled', async ({ canvas, userEvent, args }) => {
  const button = await canvas.findByRole('button');
  await userEvent.click(button);
  await expect(button).toBeDisabled();
  await expect(args.onClick).not.toHaveBeenCalled();
});
```

Tests can be excluded from the sidebar to reduce clutter, and you can attach multiple tests to a single story without creating separate story exports.

**The testing widget** in Storybook's sidebar provides comprehensive test management: run component tests, interaction tests, accessibility tests, and visual tests from a single interface. Status badges show pass/fail/error states on stories. Watch mode automatically re-runs tests on changes. Coverage reporting shows test coverage directly in Storybook.

**Why these improvements transform component library testing:** Previous Storybook testing felt bolted-on-you'd write play functions, but debugging failures meant console logs and manual clicking. Storybook 10's testing experience rivals dedicated test runners. The step function makes complex interactions debuggable visually. Lifecycle hooks let you set up consistent test state without repetition. The testing widget centralizes test execution, making it natural to run accessibility and visual tests alongside interaction tests. For a production component library, this means higher test coverage with less effort and better debugging when tests fail.

## Performance improvements: quantified gains and architectural benefits

**Install size reduction:** The ESM-only architecture delivers a **29% smaller install** compared to Storybook 9, which already had 50% savings over Storybook 8. Cumulatively, Storybook 10 is **79% smaller** than version 8. For component libraries with multiple contributors, this translates to faster `npm install` times in CI/CD and local development.

**Startup performance:** Switching to the default `react-docgen` parser (from `react-docgen-typescript`) provides **up to 50% faster startup times** for React projects. The tradeoff is that `react-docgen` doesn't support imported types from external packages-but for most component libraries with self-contained prop types, this limitation is acceptable for the speed gain.

**Build performance:** Vite's pre-optimization and lazy compilation provide near-instant HMR updates. Test builds are **2-4x faster** compared to Storybook 7. The un-minified ESM distribution means smaller bundle sizes after tree-shaking.

**Test performance:** The Vitest addon architecture is fundamentally faster than the traditional test-runner. Without the orchestration overhead of maintaining a separate Storybook server and navigating via Playwright, tests execute more efficiently. Parallel execution via native Vitest parallelization and efficient watch mode (only re-running affected tests) further improve developer experience.

**Runtime performance:** Pure ESM modules enable better tree-shaking, eliminating dead code more effectively. Faster module resolution with ESM improves initial load times. The reduced client-side bundle size (from consolidating addon packages into core) means the Storybook UI itself loads faster.

**Why performance matters for component libraries:** Production component libraries often have hundreds of stories. A 50% startup improvement means the difference between a 10-second and 5-second dev server start-multiplied across dozens of daily restarts, this saves significant time. Faster test execution enables broader test coverage without slowing CI/CD. Smaller install sizes reduce network transfer and disk usage, particularly valuable in ephemeral CI environments where every build starts fresh.

## Autodocs evolution: tag-based documentation and best practices

**Autodocs in Storybook 10** uses a tag-based system for flexible documentation generation. Enable autodocs globally by adding `tags: ['autodocs']` to your preview configuration, or selectively per component:

```typescript
// Enable for specific component
const meta = {
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

// Disable for specific story
export const UndocumentedStory: Story = {
  tags: ['!autodocs'],
};
```

**Autodocs automatically generates:**
- Component overview with descriptions from JSDoc comments
- Props table with types, defaults, and descriptions
- Interactive controls for all args
- All story variations with source code
- Table of contents for long documentation pages

**Customizing autodocs templates:**

```typescript
// .storybook/preview.ts
import { Title, Subtitle, Description, Primary, Controls, Stories } from '@storybook/blocks';

const preview: Preview = {
  parameters: {
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
          <Stories />
        </>
      ),
    },
  },
};
```

**Documenting multiple components** (compound components):

```typescript
const meta = {
  component: List,
  subcomponents: { ListItem, ListHeader },
} satisfies Meta<typeof List>;
```

This displays all subcomponent props in separate tabs within the ArgTypes view, essential for component libraries with composite patterns.

**Best practices for component library documentation:**

**Structure documentation hierarchically:** Use an introduction page explaining the library's purpose and installation. Create getting-started guides for CSS loading and theme configuration. Let autodocs handle individual component pages for consistency.

**Write descriptive JSDoc comments:** Autodocs pulls component and prop descriptions from JSDoc. Invest in clear documentation at the source code level-it appears automatically in Storybook:

```typescript
/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  // implementation
};
```

**Create comprehensive story sets:** For each component, include a Default story (minimal props), a Playground story (all props controllable), and state-specific stories (Primary, Secondary, Disabled, Loading). Recipe stories show real-world combinations of multiple components.

**Leverage conditional argTypes** for complex components:

```typescript
argTypes: {
  variant: { control: 'select', options: ['primary', 'secondary', 'tertiary'] },
  icon: { if: { arg: 'variant', neq: 'primary' } }, // Only show icon arg for non-primary variants
}
```

**Why autodocs matters:** Manually maintaining documentation for 100+ components is unsustainable. Autodocs ensures documentation stays synchronized with code. The tag-based system lets you control visibility-hide internal components, exclude experimental stories, or separate development stories from public documentation. For published component libraries, autodocs provides consistent, professional documentation with zero maintenance overhead once configured.

## Migration strategy and recommended upgrade path

**Prerequisites before upgrading:**

1. **Upgrade Node.js** to 20.16+, 22.19+, or 24+ across development machines and CI/CD
2. **Audit community addons** for Storybook 10 compatibility-check GitHub repos for 10.x support
3. **Update TypeScript configuration** to support ESM properly (set `moduleResolution` to `"bundler"`, `"node16"`, or `"nodenext"`)
4. **Test in an isolated branch** using `npx storybook@next upgrade` to preview changes

**Automated upgrade process:**

```bash
npx storybook@latest upgrade
```

This command auto-detects all Storybook projects in your repository (supports monorepos), determines applicable breaking changes, upgrades dependencies to latest versions, and runs automigrations that explain changes with documentation links before making them.

**Post-upgrade verification:**

```bash
npx storybook doctor
```

This health check identifies duplicate dependencies, incompatible addons, mismatched versions, and common configuration issues.

**Manual review areas:**

**Main configuration:** Verify ESM syntax with explicit file extensions on relative imports. Use `import.meta.resolve()` for local addon paths. Check that TypeScript configuration supports the `types` condition.

**Preview configuration:** Ensure ESM syntax. Verify decorator compatibility. If using custom addons, update them to ESM.

**Story files:** No changes required-CSF 3 is fully backward compatible. Optionally migrate to CSF Factories for improved TypeScript experience.

**Recommended phased approach for production libraries:**

**Phase 1 (Week 1-2): Infrastructure preparation**
- Update Node.js versions in CI/CD pipelines and document requirements for contributors
- Audit and resolve addon compatibility issues
- Update TypeScript configuration
- Create isolated upgrade branch

**Phase 2 (Week 2-3): Upgrade execution**
- Run automated upgrade in staging environment
- Execute `storybook doctor` and resolve flagged issues
- Test critical user flows in Storybook
- Verify all addons function correctly

**Phase 3 (Week 3-4): Validation and adoption**
- Test visual regression across all stories
- Update team documentation with new patterns
- Introduce module automocking for components with external dependencies
- Configure tag filtering for better story organization

**Phase 4 (Ongoing): Feature adoption**
- Evaluate CSF Factories for new stories (React only currently)
- Migrate to Vitest addon if using test-runner
- Adopt experimental test syntax for cleaner test organization
- Share feedback with Storybook team for experimental features

**Potential challenges and solutions:**

**Node version constraints:** If unable to upgrade Node immediately, stay on Storybook 9 until infrastructure permits the upgrade. The ESM requirement is non-negotiable.

**Community addon compatibility:** Test with `storybook@next` before upgrading. File GitHub issues for incompatible addons or temporarily remove them. Consider official alternatives where available.

**Custom presets and addons:** Follow the addon migration guide to convert custom code to ESM. Use `import.meta.resolve()` for path resolution. Test thoroughly before production deployment.

**TypeScript configuration issues:** Ensure `tsconfig.json` has `moduleResolution: "bundler"` (or `"node16"`/`"nodenext"`). This enables TypeScript to understand Storybook 10's ESM exports correctly.

## Summary and recommendations

Storybook 10 represents a **strategic modernization** that positions your React 19 component library for the future of JavaScript tooling. The single breaking change (ESM-only) enables substantial architectural improvements while new features address real pain points in component library development.

**Immediate benefits after upgrade:**
- **29% smaller install** speeds up CI/CD and local development
- **Module automocking** enables true component isolation testing
- **Enhanced Vite integration** with zero-config Vanilla Extract support
- **React 19 compatibility** ensuring long-term framework alignment
- **Improved testing workflows** via Vitest addon and enhanced interactions panel

**Long-term strategic advantages:**
- **CSF Factories** (React-exclusive currently) reduce TypeScript boilerplate by 30%
- **Tag filtering** scales to large component libraries with hundreds of stories
- **Future-proof architecture** aligned with ESM-first JavaScript ecosystem
- **Experimental RSC testing** prepares for Next.js App Router patterns

**Recommended for your specific setup:**

Given your React 19 + Vite + Vanilla Extract + TypeScript stack, **you're in the ideal position to upgrade**. Your existing Vanilla Extract configuration will work without changes. The Vite integration improvements and React-specific features (CSF Factories, `react-docgen` performance) provide maximum benefit for your exact stack.

**Upgrade now if:**
- You can upgrade to Node 20.16+ across your infrastructure
- You want module automocking for better component isolation testing
- You prioritize long-term maintainability and ecosystem alignment
- You're experiencing slow test execution with the traditional test-runner

**Consider delaying if:**
- Node.js upgrade is blocked by organizational constraints
- Heavy reliance on community addons that haven't updated to 10.x
- Short-term project with no long-term maintenance plans

The automated upgrade wizard handles most migration tasks, and the strong backward compatibility for CSF 3 stories means your existing story library requires zero changes. For a production React component library, the testing improvements and performance gains make the upgrade worthwhile despite the one-time migration effort.