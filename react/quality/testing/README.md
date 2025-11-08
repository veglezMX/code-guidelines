# Testing Guidelines

**Stack:** React 19, TypeScript 5, Vitest, Cucumber.js, Playwright  

---

## 📚 Documentation Structure

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[TDD Handbook](./01-tdd-handbook.md)** | Red/green/refactor cookbook, test-first workflow | Starting TDD or onboarding new team members |
| **[Testing Pyramid](./02-testing-pyramid.md)** | What lives where: unit, integration, E2E, visual, a11y, perf | Planning test strategy or reviewing test distribution |
| **[Unit Testing](./03-unit-vitest.md)** | Vitest structure, mocking, coverage, anti-patterns | Writing daily unit tests |
| **[Integration Testing](./04-integration-vitest-msw.md)** | MSW handlers, providers, contract testing | Testing component interactions |
| **[BDD Testing](./05-bdd-cucumber-playwright.md)** | Gherkin style, step design, World contract | Writing acceptance tests |
| **[E2E Testing](./06-e2e-playwright.md)** | Smoke flows, selectors, flakiness handling | Critical path testing |
| **[Visual Testing](./07-visual-testing.md)** | Screenshots, baselines, diff thresholds | UI regression prevention |
| **[A11y Testing](./08-a11y-testing.md)** | axe-core integration, keyboard navigation | Accessibility compliance |
| **[Performance Testing](./09-performance-testing.md)** | Lighthouse CI, budgets, trace analysis | Performance regression prevention |
| **[Test Data](./10-test-data-factories.md)** | Faker, factories, deterministic seeds | Test data management |
| **[Mocking Guide](./11-mocking-guide.md)** | vi.mock vs MSW vs Playwright.route decision matrix | Choosing mocking strategy |
| **[Coverage Policy](./12-coverage-policy.md)** | Thresholds, changed-files gates, exclusions | Coverage requirements |
| **[CI Pipeline](./13-ci-pipeline-testing.md)** | Jobs, sharding, artifacts, flaky handling | CI/CD setup |
| **[Governance](./14-governance-checklists.md)** | PR review lists, DoD, ADR links | Code review and standards |
| **[Conventions](./15-conventions-and-naming.md)** | File names, test IDs, Gherkin tags | Naming standards |
| **[Server vs Client](./16-server-vs-client-testing.md)** | React 19 RSC boundaries, assertion strategies | RSC testing guidance |
| **[Troubleshooting](./17-troubleshooting.md)** | Flakes, timeouts, hydration issues | Debugging test failures |

---

## 🎯 Quick Start

**New to our testing stack?** Start here:
1. Read [Why This Stack](#why-this-stack) below
2. Follow [TDD Handbook](./01-tdd-handbook.md) for test-first workflow
3. Review [Testing Pyramid](./02-testing-pyramid.md) for test distribution
4. Check [Conventions](./15-conventions-and-naming.md) for naming standards

**Setting up a new project?** See [CI Pipeline](./13-ci-pipeline-testing.md) for automation setup.

---

## Why This Stack?

### ✅ Advantages
- **Vitest**: Fast unit/integration tests with Vite's speed and TypeScript-first design
- **Cucumber.js**: Business-readable acceptance tests with Gherkin syntax
- **Playwright**: Reliable E2E testing with auto-wait, traces, and cross-browser support
- **MSW**: Network mocking that works across all test layers
- **Type-safe**: Full TypeScript support with minimal configuration
- **Fast feedback**: Parallel execution, smart caching, and incremental testing

### 🔄 vs Other Stacks
| Our Stack | Jest + Cypress | Jest + Selenium |
|-----------|----------------|-----------------|
| Vitest (faster) | Jest (slower) | Jest (slower) |
| Playwright (reliable) | Cypress (limited) | Selenium (flaky) |
| MSW (network mocking) | Manual mocking | Manual mocking |
| Gherkin (BDD) | No BDD | No BDD |
| TypeScript-first | Add-on | Add-on |

---

## Core Principles

### 1. **Test-First Development**
Write tests before implementation:
```
✅ Red → Green → Refactor cycle
✅ One reason to fail per test
✅ Delete code you didn't earn with tests
```

### 2. **Testing Pyramid Distribution**
Allocate test budget by layer:
- **70% Unit tests**: Fast, isolated, comprehensive coverage
- **20% Integration tests**: Component interactions, provider wiring
- **≤10% E2E tests**: Critical user journeys, smoke tests

### 3. **Layer-Specific Mocking Strategy**
- **Unit**: `vi.mock()` for dependencies
- **Integration**: MSW for network calls
- **E2E**: Playwright route interception for external APIs

### 4. **Deterministic Test Data**
Use factories and faker for consistent, isolated test data:
```ts
const user = createUser({ role: 'admin' });
const project = createProject({ owner: user.id });
```

### 5. **Accessibility-First Testing**
Test a11y at every layer:
- **Unit**: `vitest-axe` for component accessibility
- **Integration**: axe-core for page-level checks
- **E2E**: `@axe-core/playwright` for full journey validation

---

## When to Use Each Test Type

### Unit Tests (Vitest)
**Use for:**
- Pure functions and utilities
- Custom hooks with isolated logic
- Component rendering with props
- Business logic and calculations

**Example:**
```ts
describe('useCounter', () => {
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });
});
```

### Integration Tests (Vitest + MSW)
**Use for:**
- Component + provider interactions
- API integration with UI
- State management flows
- Authentication boundaries

**Example:**
```ts
describe('UserProfile', () => {
  it('should display user data from API', async () => {
    server.use(http.get('/api/user', () => 
      HttpResponse.json({ name: 'John Doe' })
    ));
    
    render(<UserProfile />, { wrapper: AppProviders });
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
  });
});
```

### BDD Tests (Cucumber + Playwright)
**Use for:**
- User acceptance criteria
- Business workflow validation
- Cross-feature integration
- Stakeholder communication

**Example:**
```gherkin
Feature: User Authentication
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should be redirected to the dashboard
```

### E2E Tests (Playwright)
**Use for:**
- Critical user journeys
- Smoke tests for deployments
- Cross-browser compatibility
- Performance validation

**Example:**
```ts
test('user can complete checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.goto('/checkout');
  await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
});
```

---

## Getting Help

- **Questions?** Check [Troubleshooting](./17-troubleshooting.md) → Common Issues
- **Contributing?** See [Governance](./14-governance-checklists.md) → Review Checklist
- **Bug in example?** Open an issue in this repo

---

**Next:** [TDD Handbook](./01-tdd-handbook.md) →

