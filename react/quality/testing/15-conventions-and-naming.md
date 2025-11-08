# Conventions and Naming — Testing

**Goal:** Consistent naming, file organization, and test identification across all testing layers.

---

## File Naming Conventions

### Test Files

**Unit tests:**
```
✅ component.test.tsx
✅ hook.test.ts
✅ utils.test.ts
✅ store.test.ts
❌ component.spec.tsx (use .test)
❌ Component.test.tsx (kebab-case for files)
```

**Integration tests:**
```
✅ component.integration.test.tsx
✅ feature.integration.test.tsx
❌ component.test.tsx (unclear if unit or integration)
```

**E2E tests:**
```
✅ user-journey.e2e.test.ts
✅ checkout-flow.e2e.test.ts
❌ e2e.test.ts (too generic)
```

### Feature Files (Gherkin)

```
✅ features/authentication/login.feature
✅ features/dashboard/analytics.feature
✅ features/payments/checkout.feature
❌ features/login.feature (use subfolders for organization)
❌ login.feature (missing features/ prefix)
```

### Step Definition Files

```
✅ steps/authentication/login.steps.ts
✅ steps/dashboard/analytics.steps.ts
✅ steps/common/navigation.steps.ts
❌ steps/login.steps.ts (use subfolders matching features)
```

---

## Test ID Strategy

### Component Test IDs

**Use data-testid for stable selectors:**
```tsx
// ✅ Good: Stable, semantic IDs
<button data-testid="submit-button">Submit</button>
<input data-testid="email-input" type="email" />
<div data-testid="error-message">Error occurred</div>

// ❌ Bad: Unstable or non-semantic
<button data-testid="btn-1">Submit</button>
<div data-testid="div">Error occurred</div>
```

**Naming pattern:**
```
✅ {element}-{purpose}
✅ submit-button, email-input, error-message
✅ user-avatar, product-card, navigation-menu
```

### ARIA Labels for Accessibility

**Prefer ARIA attributes over test IDs when possible:**
```tsx
// ✅ Good: Accessible and testable
<button aria-label="Close modal">×</button>
<input aria-label="Search products" />
<nav aria-label="Main navigation">

// ✅ Also good: When ARIA isn't sufficient
<button data-testid="close-modal" aria-label="Close modal">×</button>
```

---

## Gherkin Tag Taxonomy

### Layer Tags
```
@unit          # Unit test scenarios
@integration   # Integration test scenarios  
@e2e           # End-to-end test scenarios
@smoke         # Critical path smoke tests
@regression    # Full regression test suite
```

### Feature Tags
```
@auth          # Authentication related
@payment       # Payment processing
@dashboard     # Dashboard functionality
@admin         # Admin-only features
@mobile        # Mobile-specific behavior
```

### Environment Tags
```
@staging       # Staging environment only
@production    # Production environment
@local         # Local development
```

### Priority Tags
```
@critical      # Must pass for deployment
@high          # High priority scenarios
@medium        # Medium priority scenarios
@low           # Low priority scenarios
```

### Example Feature File:
```gherkin
@e2e @auth @critical
Feature: User Authentication
  Background:
    Given the application is running

  @smoke
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should be redirected to the dashboard

  @regression
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error message
```

---

## Folder Organization

### Unit Tests
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx          # Colocated with component
  hooks/
    useCounter.ts
    useCounter.test.ts        # Colocated with hook
  utils/
    formatDate.ts
    formatDate.test.ts        # Colocated with utility
```

### Integration Tests
```
tests/
  integration/
    components/
      UserProfile.integration.test.tsx
    features/
      authentication.integration.test.tsx
    __mocks__/
      handlers.ts              # MSW handlers
```

### E2E Tests
```
tests/
  e2e/
    features/
      authentication/
        login.feature
        register.feature
    steps/
      authentication/
        login.steps.ts
        register.steps.ts
    support/
      world.ts                 # Custom World
      hooks.ts                 # Before/After hooks
      fixtures/
        users.json             # Test data
```

### BDD Tests (Cucumber)
```
tests/
  bdd/
    features/
      user-management/
        create-user.feature
        update-user.feature
    steps/
      user-management/
        create-user.steps.ts
        update-user.steps.ts
    support/
      world.ts
      hooks.ts
      page-objects/
        UserPage.ts
```

---

## Test Data Naming

### Factory Functions
```ts
// ✅ Good: Clear, descriptive names
const createUser = (overrides = {}) => ({ ...defaultUser, ...overrides });
const createProject = (overrides = {}) => ({ ...defaultProject, ...overrides });
const createApiResponse = (overrides = {}) => ({ ...defaultResponse, ...overrides });

// ❌ Bad: Unclear or generic names
const create = (overrides = {}) => ({ ...default, ...overrides });
const makeUser = (overrides = {}) => ({ ...user, ...overrides });
```

### Test Data Constants
```ts
// ✅ Good: Descriptive constant names
const VALID_USER_CREDENTIALS = { email: 'test@example.com', password: 'password123' };
const INVALID_USER_CREDENTIALS = { email: 'invalid', password: 'wrong' };
const ADMIN_USER = { role: 'admin', permissions: ['read', 'write', 'delete'] };

// ❌ Bad: Generic or unclear names
const USER = { email: 'test@example.com', password: 'password123' };
const DATA = { role: 'admin' };
```

---

## Mock and Stub Naming

### MSW Handlers
```ts
// ✅ Good: Clear handler names
export const authHandlers = [
  http.post('/api/auth/login', loginHandler),
  http.post('/api/auth/logout', logoutHandler),
];

export const userHandlers = [
  http.get('/api/users/:id', getUserHandler),
  http.put('/api/users/:id', updateUserHandler),
];

// ❌ Bad: Generic or unclear names
export const handlers = [
  http.post('/api/auth/login', handler1),
  http.get('/api/users/:id', handler2),
];
```

### Vitest Mocks
```ts
// ✅ Good: Descriptive mock names
const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockApiClient = vi.fn();

// ❌ Bad: Generic mock names
const mock = vi.fn();
const fn = vi.fn();
const mockFn = vi.fn();
```

---

## Step Definition Naming

### Gherkin Steps
```ts
// ✅ Good: Clear, reusable step names
Given('I am logged in as {string}', async (role: string) => {
  // implementation
});

When('I click the {string} button', async (buttonText: string) => {
  // implementation
});

Then('I should see {string} in the {string} section', async (text: string, section: string) => {
  // implementation
});

// ❌ Bad: Too specific or unclear
Given('I am logged in as admin user', async () => {
  // implementation
});

When('I click submit', async () => {
  // implementation
});
```

### Page Object Methods
```ts
// ✅ Good: Action-oriented method names
class LoginPage {
  async enterCredentials(email: string, password: string) { }
  async clickSubmitButton() { }
  async getErrorMessage() { }
  async isLoginFormVisible() { }
}

// ❌ Bad: Unclear or non-action-oriented names
class LoginPage {
  async credentials(email: string, password: string) { }
  async submit() { }
  async error() { }
  async form() { }
}
```

---

## Coverage and Metrics Naming

### Coverage Thresholds
```ts
// ✅ Good: Clear threshold names
const UNIT_COVERAGE_THRESHOLD = 85;
const INTEGRATION_COVERAGE_THRESHOLD = 70;
const E2E_COVERAGE_THRESHOLD = 60;

// ❌ Bad: Generic or unclear names
const THRESHOLD = 85;
const COVERAGE = 70;
const COVERAGE_THRESHOLD = 60;
```

### Test Categories
```ts
// ✅ Good: Clear category names
const CRITICAL_TESTS = ['@critical', '@smoke'];
const REGRESSION_TESTS = ['@regression', '@e2e'];
const INTEGRATION_TESTS = ['@integration', '@api'];

// ❌ Bad: Unclear category names
const TESTS = ['@critical', '@smoke'];
const CATEGORY = ['@regression', '@e2e'];
```

---

## CI/CD Pipeline Naming

### Job Names
```yaml
# ✅ Good: Clear, descriptive job names
test-unit:
test-integration:
test-e2e-smoke:
test-e2e-regression:
test-visual:
test-a11y:
test-performance:

# ❌ Bad: Generic or unclear job names
test:
tests:
test-all:
test-suite:
```

### Artifact Names
```yaml
# ✅ Good: Descriptive artifact names
artifacts:
  test-results-unit:
  test-results-integration:
  test-results-e2e:
  coverage-reports:
  visual-baselines:
  performance-traces:

# ❌ Bad: Generic artifact names
artifacts:
  results:
  reports:
  files:
```

---

## Anti-Patterns to Avoid

### ❌ Inconsistent File Extensions
```
❌ component.spec.tsx (use .test)
❌ component.test.js (use .tsx for TSX files)
❌ feature.feature (use .feature for Gherkin)
```

### ❌ Generic Test IDs
```
❌ data-testid="test"
❌ data-testid="button"
❌ data-testid="div"
```

### ❌ Unclear Step Names
```
❌ Given('I do something', async () => {})
❌ When('I click', async () => {})
❌ Then('I see', async () => {})
```

### ❌ Mixed Naming Conventions
```
❌ Some files use camelCase, others use kebab-case
❌ Some tests use .test, others use .spec
❌ Some features use @tag, others use #tag
```

---

## Best Practices Summary

### ✅ Do
- Use consistent file extensions (`.test.tsx`, `.feature`)
- Create semantic test IDs (`submit-button`, `error-message`)
- Organize by feature/domain in folders
- Use descriptive step definitions
- Name mocks and handlers clearly
- Follow established tag taxonomy

### ❌ Don't
- Mix naming conventions within the same project
- Use generic or unclear names
- Create overly specific step definitions
- Use unstable selectors (CSS classes, positions)
- Mix test types in the same file without clear separation

---

**← Back to:** [Index](./README.md)  
**Next:** [TDD Handbook](./01-tdd-handbook.md) →

