# Governance Checklists — Testing

**Goal:** PR review lists by layer, Definition of Done, ADR links, and CODEOWNERS patterns for testing standards enforcement.

---

## PR Review Checklist

### All PRs
- [ ] Tests are included for new features
- [ ] Existing tests still pass
- [ ] Coverage meets threshold (85% for changed files)
- [ ] No skipped or disabled tests without justification
- [ ] Test names clearly describe what they test
- [ ] Tests follow naming conventions
- [ ] No hardcoded values (use factories)
- [ ] Async tests use proper waiting strategies

### Unit Tests Checklist
- [ ] Tests are colocated with source files
- [ ] Each test has one reason to fail
- [ ] Tests use Testing Library queries (getByRole, getByLabel)
- [ ] Mocks are properly typed
- [ ] No testing implementation details
- [ ] Tests are deterministic (no random data)
- [ ] Test setup is isolated (no shared state)

### Integration Tests Checklist
- [ ] MSW handlers are properly configured
- [ ] All providers are included in test wrapper
- [ ] API contracts are validated
- [ ] Loading and error states are tested
- [ ] State is reset between tests
- [ ] No real network calls
- [ ] Realistic test data is used

### E2E Tests Checklist
- [ ] Tests use ARIA/role selectors
- [ ] Tests wait for elements properly (no arbitrary timeouts)
- [ ] Critical paths are covered
- [ ] Tests are tagged appropriately (@smoke, @regression)
- [ ] Screenshots/traces are captured on failure
- [ ] Tests work across browsers
- [ ] External APIs are mocked when appropriate

### BDD/Cucumber Checklist
- [ ] Feature files follow Gherkin best practices
- [ ] Scenarios are declarative (what, not how)
- [ ] Tags are applied correctly
- [ ] Step definitions are reusable
- [ ] World contract is properly used
- [ ] Page objects are utilized
- [ ] Background is used for common setup

---

## Definition of Done

### Feature is Done When:
1. **Code Complete**
   - [ ] Feature implemented per acceptance criteria
   - [ ] Code follows style guide
   - [ ] No linter errors
   - [ ] TypeScript types are correct

2. **Tests Complete**
   - [ ] Unit tests for business logic
   - [ ] Integration tests for component interactions
   - [ ] E2E smoke test for critical path
   - [ ] Visual regression test (if UI change)
   - [ ] A11y test (if UI change)
   - [ ] Coverage meets threshold

3. **Documentation Complete**
   - [ ] README updated (if public API changed)
   - [ ] JSDoc comments for public APIs
   - [ ] ADR created (if architectural decision)
   - [ ] Storybook story (if new component)

4. **Quality Checks Pass**
   - [ ] All tests pass locally
   - [ ] All CI checks pass
   - [ ] No new accessibility violations
   - [ ] Performance budgets met
   - [ ] Code reviewed and approved

5. **Deployment Ready**
   - [ ] Feature flag configured (if applicable)
   - [ ] Database migrations run (if applicable)
   - [ ] Rollback plan documented
   - [ ] Monitoring/alerts configured

---

## Architecture Decision Records (ADRs)

### When to Create an ADR

**Create ADR for:**
- Choosing test framework (Vitest vs Jest)
- Choosing E2E tool (Playwright vs Cypress)
- BDD strategy (Cucumber vs manual Gherkin)
- Mock strategy (MSW vs manual mocks)
- Coverage thresholds and policies
- CI/CD pipeline changes
- Test data management approach

### ADR Template
```markdown
# ADR-001: Choose Playwright for E2E Testing

## Status
Accepted

## Context
We need a reliable E2E testing framework for our React application.
Current pain points with Cypress:
- Flaky tests due to arbitrary waits
- Limited cross-browser support
- Slower execution times

## Decision
We will use Playwright for E2E testing.

## Consequences
**Positive:**
- Auto-waiting reduces flakiness
- Better cross-browser support (Chrome, Firefox, Safari)
- Faster execution with parallel tests
- Better developer experience with trace viewer

**Negative:**
- Team needs to learn new API
- Need to rewrite existing Cypress tests
- Initial setup time

## Implementation
- Install Playwright: `pnpm add -D @playwright/test`
- Configure: `playwright.config.ts`
- Migrate critical paths first
- Training session for team

## References
- [Playwright docs](https://playwright.dev/)
- [Migration guide](./docs/cypress-to-playwright.md)
```

### ADR Index
```markdown
# Testing ADRs

- [ADR-001](./adr-001-playwright.md): Choose Playwright for E2E
- [ADR-002](./adr-002-vitest.md): Choose Vitest over Jest
- [ADR-003](./adr-003-msw.md): Use MSW for network mocking
- [ADR-004](./adr-004-cucumber.md): Adopt Cucumber for BDD
- [ADR-005](./adr-005-coverage.md): Set 85% coverage threshold
```

---

## CODEOWNERS Patterns

### Protect Test Quality
```
# .github/CODEOWNERS

# Test infrastructure requires QA approval
/tests/                    @qa-team
vitest.config.ts          @qa-team @frontend-team
playwright.config.ts      @qa-team @frontend-team
cucumber.config.ts        @qa-team @frontend-team

# BDD features require QA + Product
/tests/bdd/features/      @qa-team @product-team

# Step definitions require QA
/tests/bdd/steps/         @qa-team

# MSW handlers require API team when endpoints change
/src/mocks/handlers.ts    @api-team @frontend-team

# Coverage policy requires QA lead
lighthouserc.js           @qa-lead
codecov.yml               @qa-lead

# CI pipelines require DevOps + QA
/.github/workflows/*test* @devops-team @qa-team
```

---

## Test Review Guidelines

### What to Look For

**✅ Good Test**
```ts
// ✅ Clear name describing behavior
it('should display error when email is invalid', async () => {
  // ✅ Arrange: Clear setup
  const user = userEvent.setup();
  render(<LoginForm />);
  
  // ✅ Act: User-centric interaction
  await user.type(screen.getByLabelText('Email'), 'invalid-email');
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  
  // ✅ Assert: Observable behavior
  expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
});
```

**❌ Bad Test**
```ts
// ❌ Unclear name
it('test email', async () => {
  // ❌ Hardcoded data
  const data = { email: 'test@test.com', password: '123' };
  
  // ❌ Testing implementation
  const component = mount(<LoginForm />);
  component.instance().handleSubmit(data);
  
  // ❌ Testing internal state
  expect(component.state().error).toBe('Invalid email');
});
```

---

## Test Maintenance

### Quarterly Review
- [ ] Review flaky tests and fix or remove
- [ ] Check coverage trends (increasing/decreasing)
- [ ] Update test data factories
- [ ] Review and update ADRs
- [ ] Audit and remove obsolete tests
- [ ] Update documentation
- [ ] Check for test duplication

### When to Delete Tests
- Test for removed feature
- Duplicate coverage
- Testing implementation (not behavior)
- Always skipped/disabled
- Slower than value provided

---

## Standards Enforcement

### Pre-commit Hooks
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
pnpm lint-staged

# Run tests for changed files
pnpm test:changed --run

# Check types
pnpm tsc --noEmit
```

### PR Template
```markdown
## Description
<!-- Describe your changes -->

## Testing Checklist
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if needed)
- [ ] E2E smoke test added/updated (if critical path)
- [ ] Visual regression test added (if UI change)
- [ ] A11y test added (if UI change)
- [ ] All tests pass locally
- [ ] Coverage meets threshold

## Screenshots/Videos
<!-- If UI change, add screenshots/videos -->

## ADR
<!-- Link to ADR if architectural decision -->
```

---

## Quality Metrics

### Track These Metrics
```
Test Coverage:
  Unit: 85%+ ✅
  Integration: 70%+ ✅
  E2E: Critical paths covered ✅

Test Performance:
  Unit: < 10 minutes ✅
  Integration: < 15 minutes ✅
  E2E Smoke: < 5 minutes ✅

Flaky Tests:
  Count: < 5 ⚠️
  Quarantined: 3 🔴

Accessibility:
  Violations: 0 ✅
  Coverage: 100% of UI ✅
```

### Monthly Report Template
```markdown
# Testing Metrics - January 2025

## Coverage
- Unit: 87% (+2%)
- Integration: 72% (+1%)

## Test Performance
- Unit: 8 min (-1 min)
- Integration: 14 min (no change)
- E2E Smoke: 4 min (-30s)

## Flaky Tests
- Total: 3 (-2)
- Fixed this month: 5
- New: 3

## Action Items
- [ ] Fix remaining flaky tests
- [ ] Improve E2E test speed
- [ ] Add integration tests for payments
```

---

## Common Review Comments

### Test Structure
```
"Consider using a factory instead of hardcoded data"
"This test has multiple reasons to fail - split into separate tests"
"Add a test for the error state"
"This test is testing implementation details"
```

### Test Quality
```
"Use getByRole instead of getByTestId"
"Add await for async operations"
"This arbitrary timeout will cause flakiness"
"Mock at the appropriate layer (MSW for network, vi.mock for modules)"
```

### Coverage
```
"Coverage for this file is below 85%"
"Add tests for edge cases (empty array, null, undefined)"
"Missing test for error handling"
```

---

## Escalation Path

### When to Escalate

**To QA Lead:**
- Coverage consistently below threshold
- Flaky tests increasing
- Test suite too slow (>30 min)
- Major test infrastructure change needed

**To Engineering Manager:**
- Team not following testing standards
- Need dedicated time for test improvement
- Testing blocking releases

**To Tech Lead:**
- Architectural decision needed (ADR)
- Framework/tool change required
- Major refactoring of test suite

---

**← Back to:** [CI Pipeline Testing](./13-ci-pipeline-testing.md)  
**Next:** [Conventions and Naming](./15-conventions-and-naming.md) →

