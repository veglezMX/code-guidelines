# Acme DevKit - Technical Specification

**Version:** 1.0  
**Status:** MVP Planning Phase  
**Target Audience:** Software Architects, Senior Engineers  

---

## Executive Summary

Acme DevKit is a monorepo-based internal development framework designed to standardize React 19 + TypeScript development across 5-15 person engineering teams. The framework consolidates existing UI components and design tokens while providing CLI-driven project scaffolding to reduce 40-60% code duplication and accelerate project setup from weeks to <1 day.

**Key Technical Objectives:**
- Consolidate scattered UI components into versioned npm packages (@acme/*)
- Automate design token distribution from Token Studio
- Provide opinionated project generators via CLI
- Standardize configuration (ESLint, TypeScript, Prettier, Vite)
- Reduce maintenance burden through centralized package updates

---

## Current State Assessment

### Pain Points (Measured)
- **Code Duplication:** 40-60% across projects (auth, forms, API clients, UI components)
- **Onboarding Time:** 2-4 weeks for new developers to become productive
- **Setup Time:** Currently unmeasured, estimated 1-2 weeks per new project
- **Tooling Fragmentation:** Each team uses different configs, no standardization

### Existing Assets
- **UI Library:** React component library exists, aligned with Figma design system
- **Design Tokens:** Token Studio in use, manual export process
- **Tech Stack:** React 19, TypeScript (versions/configs vary by project)
- **Team Size:** 5-15 developers, small autonomous teams

### Constraints
- **Resources:** 1 senior software architect, 3-4 months for MVP
- **Budget:** No formal executive sponsorship yet (grassroots initiative)
- **Scope:** Web only (no mobile), React 19 + TypeScript exclusive focus

---

## Architecture Overview

### Monorepo Strategy

**Tool Selection: Nx vs Turborepo**

Decision criteria:
1. **Build Performance:** Local caching, remote caching capabilities
2. **Learning Curve:** Small team (5-15 devs) needs simple mental model
3. **Plugin Ecosystem:** React 19 support, generators quality
4. **Cost:** Turborepo free tier vs Nx Cloud pricing

**Recommended: Turborepo**
- Simpler for small teams (less config overhead)
- Fast incremental builds with turbo cache
- Remote caching available in free tier (Vercel)
- React-first mindset aligns with our stack
- Lower learning curve vs Nx's enterprise-grade complexity

**Alternative: Nx**
- More powerful for future scaling (50+ devs)
- Better generator ecosystem (nx generate)
- Superior task orchestration
- Steeper learning curve, may overwhelm small team

### Package Structure (MVP)

```
acme-devkit/
├── packages/
│   ├── design-tokens/        # @acme/design-tokens
│   ├── ui/                    # @acme/ui
│   ├── config-eslint/         # @acme/config-eslint
│   ├── config-typescript/     # @acme/config-typescript
│   └── config-prettier/       # @acme/config-prettier
├── apps/
│   └── docs/                  # Storybook documentation
├── examples/
│   └── next-starter/          # Example Next.js app
├── tools/
│   └── cli/                   # @acme/cli (create-acme-app)
└── turbo.json                 # Turborepo config
```

**Phase 1 (MVP - Months 1-3):**
- `@acme/design-tokens` - Token Studio → CSS vars + TS types
- `@acme/ui` - Consolidated component library
- `@acme/config-eslint` - Shared ESLint config
- `@acme/config-typescript` - Shared TS config
- `@acme/config-prettier` - Shared Prettier config
- `@acme/cli` - Basic project generator

**Phase 2 (Post-MVP - Month 4+):**
- `@acme/testing` - Jest/RTL setup, custom matchers
- `@acme/api-client` - API client generator with Zod validation
- `@acme/mocks` - MSW handlers + seed data
- `@acme/analytics` - Analytics façade
- `@acme/feature-flags` - Feature flag client SDK

---

## Technical Stack

### Core Technologies

**Runtime:**
- React 19.x (web only, using concurrent features)
- TypeScript 5.x (strict mode enabled)
- Node.js 20.x LTS (development environment)

**Build Tools:**
- Vite 5.x (primary build tool for speed)
- Next.js 15.x (framework for full applications)
- Turborepo (monorepo orchestration)

**Styling:**
- Tailwind CSS 4.x (utility-first, core classes only)
- CSS Variables (from design tokens)
- No CSS-in-JS (performance constraints)

**Testing:**
- Vitest (unit tests, Vite-native)
- React Testing Library (component tests)
- Playwright (E2E, defer to Phase 2)

**Code Quality:**
- ESLint 9.x (flat config)
- Prettier 3.x (opinionated formatting)
- Biome (consider as faster alternative to ESLint+Prettier)

### Design Token Pipeline

**Source → Output Flow:**

```
Token Studio (Figma Plugin)
    ↓ (manual export to JSON)
tokens/source.json
    ↓ (Style Dictionary transformation)
CSS Variables + TypeScript Types
    ↓ (published as npm package)
@acme/design-tokens
    ↓ (consumed by all apps)
Applications
```

**Style Dictionary Config:**
```javascript
// style-dictionary.config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6'
      }]
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'dist/ts/',
      files: [{
        destination: 'tokens.d.ts',
        format: 'typescript/es6-declarations'
      }]
    }
  }
};
```

**Token Categories:**
- Colors (semantic: primary, secondary, error, etc.)
- Typography (font families, sizes, weights, line heights)
- Spacing (4px base grid: 4, 8, 12, 16, 24, 32, 48, 64)
- Shadows (elevation system: 1-5)
- Border radius (none, sm, md, lg, full)
- Breakpoints (sm: 640, md: 768, lg: 1024, xl: 1280, 2xl: 1536)

---

## Component Library Architecture

### @acme/ui Package Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   └── ...
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   ├── useLocalStorage.ts (memory-based, NO browser storage)
│   │   └── ...
│   ├── utils/
│   │   ├── cn.ts (clsx + tailwind-merge)
│   │   └── ...
│   └── index.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Component Design Principles

**1. Composition Over Configuration**
```typescript
// ✅ Good: Composable
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogBody>Content</DialogBody>
  </DialogContent>
</Dialog>

// ❌ Avoid: Prop-heavy monoliths
<Dialog 
  trigger="Open" 
  title="Title" 
  content="Content" 
  onClose={...}
/>
```

**2. Unstyled Primitives + Styled Defaults**
- Base components are headless (behavior only)
- Default styled variants for 80% use cases
- Easy to override with Tailwind classes

**3. Accessibility First**
- ARIA attributes by default
- Keyboard navigation built-in
- Focus management handled
- Screen reader tested

**4. TypeScript Strict Mode**
```typescript
// All components fully typed
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, ...props }, ref) => {
    // Implementation
  }
);
```

### Component Priority (MVP)

**Must Have (Week 3-5):**
- Button, IconButton
- Input, Textarea, Select, Checkbox, Radio
- Card, Modal, Dialog
- Tooltip, Popover
- Alert, Toast (notification system)

**Should Have (Week 6-7):**
- Tabs, Accordion
- Dropdown Menu
- Table (basic)
- Badge, Avatar
- Spinner, Skeleton

**Nice to Have (Phase 2):**
- Data Table (sortable, filterable)
- Date Picker
- Autocomplete
- File Upload
- Stepper

---

## CLI Architecture

### @acme/cli Design

**Command Structure:**
```bash
# Project creation
npx create-acme-app my-app
npx create-acme-app my-app --template next
npx create-acme-app my-app --template vite

# Future: Component generation (Phase 2)
acme generate component Button
acme generate page Dashboard
```

**Implementation:**
```typescript
// tools/cli/src/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import { execa } from 'execa';
import ora from 'ora';

const program = new Command('create-acme-app');

program
  .version('1.0.0')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template to use (next|vite)', 'next')
  .action(async (projectName, options) => {
    // Interactive prompts if no project name
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Project name?',
        initial: 'my-acme-app'
      });
      projectName = response.projectName;
    }
    
    const spinner = ora('Creating project...').start();
    
    // Clone template, install deps, initialize git
    await scaffoldProject(projectName, options.template);
    
    spinner.succeed('Project created successfully!');
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run dev`);
  });

program.parse();
```

**Template Structure:**
```
templates/
├── next/
│   ├── template/           # Copied to user project
│   │   ├── app/
│   │   ├── components/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   └── ...
│   └── template.json       # Metadata
└── vite/
    ├── template/
    └── template.json
```

**Generated Project Dependencies:**
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@acme/ui": "workspace:*",
    "@acme/design-tokens": "workspace:*"
  },
  "devDependencies": {
    "@acme/config-eslint": "workspace:*",
    "@acme/config-typescript": "workspace:*",
    "@acme/config-prettier": "workspace:*",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## CI/CD Pipeline Architecture

### Pipeline Stages

**Per-Package Pipeline (packages/*):**
```yaml
# .github/workflows/package-ci.yml
name: Package CI

on:
  pull_request:
    paths:
      - 'packages/**'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npx turbo run lint --filter='./packages/*'
      
      - name: Type check
        run: npx turbo run type-check --filter='./packages/*'
      
      - name: Test
        run: npx turbo run test --filter='./packages/*'
      
      - name: Build
        run: npx turbo run build --filter='./packages/*'

  publish:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Publish to npm (private registry)
        run: npx changeset publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Versioning Strategy

**Semantic Versioning + Changesets:**

```bash
# Developer workflow
npm run changeset       # Create changeset file
git add .changeset/     # Commit changeset
# Open PR

# On merge to main
# GitHub Action runs:
npx changeset version   # Bump versions
npx changeset publish   # Publish packages
```

**Changeset Example:**
```markdown
---
"@acme/ui": minor
"@acme/design-tokens": patch
---

Add new Tooltip component and update color tokens for better contrast
```

### Environment Strategy

**Development:**
- Local development with hot reload
- Uses `workspace:*` protocol (no publishing)
- Turborepo cache for fast rebuilds

**Staging (Optional for MVP):**
- Preview deployments for docs site
- Dry-run package publishing
- Integration testing

**Production:**
- Published to private npm registry (npm private packages or Verdaccio)
- Semantic versioning enforced
- Changelog auto-generated
- Git tags created

---

## Security & Quality Standards

### Code Quality Gates

**Pre-commit (Husky + lint-staged):**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

**Pre-push:**
- Type checking (tsc --noEmit)
- Unit tests (vitest run)

**PR Checks:**
- All pre-push checks
- Build verification
- No console.logs in production code
- Bundle size analysis (<100KB for @acme/ui)

### Security Practices

**Dependency Management:**
- Renovate for automated dependency updates
- npm audit run weekly
- Snyk/Dependabot for vulnerability scanning

**Package Publishing:**
- 2FA required for npm publish
- Signed commits required
- Protected main branch (require PR approval)

**Secret Management:**
- No secrets in source code
- Environment variables for configs
- .env.example provided for templates

---

## Migration Strategy

### Phase 1: Extract & Consolidate (Weeks 1-7)

**Week 1-2: Foundation**
1. Initialize Turborepo monorepo
2. Set up base package.json, tsconfig.json
3. Configure Turborepo pipeline
4. Set up CI/CD skeleton

**Week 2-3: Design Tokens**
1. Export Token Studio JSON
2. Configure Style Dictionary
3. Generate CSS vars + TS types
4. Publish @acme/design-tokens@1.0.0
5. Document for designers

**Week 3-5: UI Library**
1. Audit existing components (inventory)
2. Extract components to @acme/ui
3. Add Storybook documentation
4. Write unit tests (>80% coverage)
5. Publish @acme/ui@1.0.0

**Week 5-7: Config Packages**
1. Extract ESLint config
2. Extract TypeScript config
3. Extract Prettier config
4. Test in 2-3 existing projects

**Week 7-8: CLI**
1. Build create-acme-app command
2. Create Next.js template
3. Create Vite template
4. Test end-to-end flow

### Phase 2: Internal Pilot (Weeks 9-10)

**Pilot Criteria:**
- 1-2 developers
- New project (not migration)
- Real business requirement
- Measure setup time

**Success Metrics:**
- Project created in <2 hours
- Developer satisfaction: 7+/10
- Zero blocking issues
- At least 5 components from @acme/ui used

### Phase 3: Iterative Rollout (Weeks 11-16)

**Week 11-12:**
- Fix critical feedback from pilot
- Improve documentation
- Record video walkthroughs

**Week 13-14:**
- Offer to 2-3 additional teams
- Gather adoption metrics

**Week 15-16:**
- Business case presentation to CTO
- Secure Phase 2 funding/resources
- Plan expansion (testing utils, API client, etc.)

---

## Performance Budgets

### Package Sizes (Uncompressed)

| Package | Budget | Notes |
|---------|--------|-------|
| @acme/design-tokens | <10 KB | CSS vars + TS types only |
| @acme/ui | <150 KB | All components tree-shakeable |
| @acme/config-* | <5 KB | JSON configs |

### Build Performance

**Target Metrics:**
- Clean build (all packages): <2 minutes
- Incremental build (1 package change): <10 seconds
- CLI project generation: <60 seconds

**Turborepo Caching:**
- Local cache hit: 90%+ after first build
- Remote cache hit: 70%+ in CI

---

## Testing Strategy

### Unit Tests (Vitest + RTL)

**Coverage Requirements:**
- Components: 80%+ coverage
- Utility functions: 90%+ coverage
- Hooks: 85%+ coverage

**Example:**
```typescript
// packages/ui/src/components/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Tests (Defer to Phase 2)

- Playwright for E2E testing
- Test common user flows in example apps
- Visual regression testing (Chromatic/Percy)

---

## Documentation Strategy

### Storybook (Component Docs)

**Structure:**
```
apps/docs/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── theme.ts
├── stories/
│   ├── Introduction.mdx
│   ├── installation.mdx
│   ├── design-tokens.mdx
│   └── components/
│       ├── Button.stories.tsx
│       ├── Input.stories.tsx
│       └── ...
└── package.json
```

**Story Example:**
```typescript
// stories/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@acme/ui';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary'
  }
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true
  }
};
```

### Additional Documentation

**README per Package:**
- Installation instructions
- Basic usage examples
- API reference
- Migration guide (if applicable)

**Root Documentation:**
- Architecture decision records (ADRs)
- Contributing guidelines
- Code of conduct
- Troubleshooting guide

---

## Risk Mitigation

### Technical Risks

**Risk: Nx vs Turborepo Decision Paralysis**
- **Impact:** High - blocks all progress
- **Mitigation:** Set 2-week decision deadline, use decision matrix, accept either is better than neither
- **Contingency:** If blocked, start with Turborepo (simpler), migrate to Nx if needed later

**Risk: Token Studio Workflow Complexity**
- **Impact:** Medium - manual export may have edge cases
- **Mitigation:** Shadow designer for 1-2 sessions, document actual workflow, start with manual exports
- **Contingency:** Build custom Figma plugin if Token Studio insufficient

**Risk: React 19 Breaking Changes**
- **Impact:** Medium - new React version may have bugs/breaking changes
- **Mitigation:** Pin to stable React 19.x version, avoid bleeding-edge features, monitor React changelog
- **Contingency:** Ready to downgrade to React 18 if critical issues

**Risk: Single-Person Bottleneck**
- **Impact:** High - one architect for all framework work
- **Mitigation:** Document extensively, record decisions, timebox features ruthlessly
- **Contingency:** Add engineers after demonstrating value with metrics

**Risk: Over-Engineering**
- **Impact:** High - building unused features wastes time
- **Mitigation:** Strict MVP scope (3-5 packages), measure adoption before expanding
- **Contingency:** Kill features with <20% adoption after 6 months

### Organizational Risks

**Risk: Grassroots Initiative Without Sponsorship**
- **Impact:** Critical - project could be cancelled
- **Mitigation:** Build business case with metrics (40-60% duplication, 2-4 week onboarding), secure CTO buy-in
- **Contingency:** Pivot to smaller scope (just UI library + design tokens)

**Risk: Adoption Resistance**
- **Impact:** High - framework unused means wasted effort
- **Mitigation:** Opt-in initially, pilot with friendly team, gather feedback, iterate
- **Contingency:** Make framework more flexible if too opinionated

---

## Success Metrics & Monitoring

### Leading Indicators (Track Weekly)

- **Developer Engagement:**
  - CLI downloads/executions
  - Package installation counts
  - GitHub stars/watchers

- **Usage Metrics:**
  - Number of projects using framework
  - Component usage (which components most used)
  - Design token adoption

### Lagging Indicators (Track Monthly)

- **Productivity Metrics:**
  - Time-to-deploy (baseline → target)
  - Onboarding time (2-4 weeks → <3 days)
  - Code duplication percentage (40-60% → <30%)

- **Quality Metrics:**
  - Bug count in shared packages
  - Security vulnerabilities
  - Build performance (CI duration)

- **Satisfaction Metrics:**
  - Developer NPS (quarterly survey)
  - Support ticket volume
  - Contribution rate to packages

### Dashboard (Phase 2)

Build internal dashboard showing:
- Real-time adoption metrics
- Package version distribution
- Most used components
- Support request trends

---

## Appendix

### Useful Commands

```bash
# Development
npm install                    # Install all deps
npx turbo run dev             # Start all dev servers
npx turbo run dev --filter=@acme/ui  # Dev single package

# Building
npx turbo run build           # Build all packages
npx turbo run build --force   # Ignore cache

# Testing
npx turbo run test            # Run all tests
npx turbo run test:watch      # Watch mode

# Linting
npx turbo run lint            # Lint all packages
npx turbo run lint:fix        # Auto-fix issues

# Publishing
npm run changeset             # Create changeset
npm run version-packages      # Bump versions
npm run release               # Publish to npm

# CLI
npx create-acme-app my-app    # Generate new project
```

### Technology Alternatives Considered

| Decision | Chosen | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Monorepo tool | Turborepo | Nx | Simpler for small team, lower learning curve |
| Build tool | Vite | Webpack | Faster dev experience, native ESM |
| Test runner | Vitest | Jest | Vite-native, faster, better DX |
| Styling | Tailwind | CSS Modules | Utility-first faster, designer-friendly |
| Linting | ESLint 9 | Biome | Mature ecosystem, but Biome worth watching |
| Package manager | npm | pnpm/yarn | Consistency with existing projects |

### References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [React 19 Documentation](https://react.dev)
- [Style Dictionary](https://amzn.github.io/style-dictionary)
- [Changesets](https://github.com/changesets/changesets)
- [Vitest](https://vitest.dev)
- [Storybook](https://storybook.js.org)

---

**Document Owner:** Senior Software Architect  
**Review Cycle:** Bi-weekly during MVP, monthly after launch  
**Feedback:** [Internal feedback form or Slack channel]