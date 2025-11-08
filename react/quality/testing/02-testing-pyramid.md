# Testing Pyramid — Testing

**Goal:** Budget allocation by layer, acceptance criteria mapping, and when to promote tests between layers.

---

## The Testing Pyramid

```
           /\
          /  \         ≤10% E2E Tests
         /____\        Critical user journeys
        /      \
       /        \      ~20% Integration Tests
      /__________\     Component interactions
     /            \
    /              \   ~70% Unit Tests
   /________________\  Functions, hooks, components

   Fast ←             → Slow
   Cheap ←            → Expensive
   Many ←             → Few
```

---

## Budget Allocation by Layer

### Unit Tests (~70%)
**Coverage target:** 85% of changed files

**What belongs here:**
- Pure functions and utilities
- Custom hooks (isolated)
- Component rendering with props
- Business logic and calculations
- Data transformations
- Validation logic

**Why 70%:**
- Fastest execution (< 1ms per test)
- Easiest to write and maintain
- Pinpoint exact failures
- Run on every save

### Integration Tests (~20%)
**Coverage target:** 70% of changed files

**What belongs here:**
- Component + provider interactions
- API integration with UI
- State management flows
- Authentication boundaries
- Form submission flows
- Router integration

**Why 20%:**
- Test realistic scenarios
- Catch integration bugs
- Validate contracts
- Balance speed vs coverage

### E2E Tests (≤10%)
**Coverage target:** Critical paths only

**What belongs here:**
- Complete user journeys
- Smoke tests for deployments
- Cross-browser compatibility
- Performance validation
- Security-critical flows

**Why ≤10%:**
- Slowest execution (seconds per test)
- Most expensive to maintain
- Hardest to debug
- Run in CI, not locally

---

## Acceptance Criteria → Layer Mapping

### Unit Layer Criteria
```
✅ "formatCurrency should add dollar sign"
✅ "useCounter should increment by 1"
✅ "validateEmail should reject invalid formats"
✅ "calculateTotal should sum prices"
```

**Pattern:** Single function/hook behavior with specific inputs/outputs

### Integration Layer Criteria
```
✅ "User profile should display data from API"
✅ "Login form should authenticate and redirect"
✅ "Shopping cart should update quantity"
✅ "Dashboard should show user's projects"
```

**Pattern:** Component + data flow + UI update

### E2E Layer Criteria
```
✅ "User can complete purchase from search to checkout"
✅ "Admin can create, edit, and delete users"
✅ "Guest can browse, register, and make first purchase"
```

**Pattern:** Complete multi-step user journey across pages

---

## When to Promote Tests Between Layers

### Unit → Integration
**Promote when:**
- Test requires real providers (Router, Query, Auth)
- Need to verify API contracts
- Testing state shared across components
- Component behavior depends on external data

**Example:**
```ts
// Unit: Too much mocking needed
it('should display user', () => {
  vi.mock('react-router', () => ({ useParams: () => ({ id: '1' }) }));
  vi.mock('@/api', () => ({ useUser: () => ({ data: mockUser }) }));
  render(<UserProfile />);
});

// Integration: Real providers, real contracts
it('should display user', async () => {
  server.use(http.get('/api/users/1', () => HttpResponse.json(mockUser)));
  render(<UserProfile />, { wrapper: AppProviders });
  expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
});
```

### Integration → E2E
**Promote when:**
- Test requires full app context
- Need to test navigation between pages
- Validating browser-specific behavior
- Testing external integrations (payment, auth providers)

**Example:**
```ts
// Integration: Single page, mocked navigation
it('should redirect after login', async () => {
  const mockNavigate = vi.fn();
  render(<LoginPage />, { wrapper: AppProviders });
  // submit form...
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
});

// E2E: Real navigation, real pages
test('should redirect after login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password');
  await page.click('[data-testid="submit-button"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### When NOT to Promote
**Keep in lower layer when:**
- Test is fast and reliable at current layer
- Current layer provides adequate confidence
- Upper layer would be significantly slower
- Test focus is narrow and specific

---

## Test Distribution Examples

### Feature: User Authentication

**Unit Tests (70%):**
```
✅ validateEmail() rejects invalid formats
✅ validatePassword() checks length and complexity
✅ hashPassword() produces consistent hashes
✅ useAuthForm() manages form state correctly
```

**Integration Tests (20%):**
```
✅ LoginForm submits credentials to API
✅ API error displays in form
✅ Successful login updates session context
✅ Protected routes redirect unauthenticated users
```

**E2E Tests (10%):**
```
✅ Complete login flow from homepage to dashboard
✅ Session persists across page refreshes
```

### Feature: Shopping Cart

**Unit Tests (70%):**
```
✅ calculateSubtotal() sums item prices
✅ calculateTax() applies correct tax rate
✅ applyDiscount() reduces total by percentage
✅ useCart() manages cart state
```

**Integration Tests (20%):**
```
✅ Adding item updates cart display
✅ Removing item calls API and updates UI
✅ Quantity changes recalculate totals
✅ Cart persists across page navigation
```

**E2E Tests (10%):**
```
✅ Complete checkout flow: add items → cart → checkout → payment → confirmation
```

---

## Layer Decision Matrix

| Scenario | Unit | Integration | E2E | Reason |
|----------|------|-------------|-----|--------|
| Pure function | ✅ | | | No dependencies |
| Custom hook (isolated) | ✅ | | | No external state |
| Component with props only | ✅ | | | No providers needed |
| Component + Context | | ✅ | | Requires provider |
| Component + API | | ✅ | | Requires network |
| Multi-step form | | ✅ | | State flow between steps |
| Page navigation | | | ✅ | Requires router |
| Multi-page journey | | | ✅ | Full user flow |
| Payment integration | | | ✅ | External service |
| Cross-browser behavior | | | ✅ | Browser-specific |

---

## Anti-Patterns

### ❌ Testing Everything at E2E Layer
```
❌ E2E test for email validation
❌ E2E test for button color
❌ E2E test for every error message
```

**Fix:** Push down to unit/integration tests.

### ❌ No Integration Tests (Unit + E2E Only)
```
❌ Unit test with 10 mocks
❌ E2E test that takes 30 seconds
```

**Fix:** Add integration tests for provider interactions.

### ❌ Duplicate Tests Across Layers
```
❌ Unit test for formatCurrency()
❌ Integration test also checks formatCurrency()
❌ E2E test also validates currency format
```

**Fix:** Test each behavior once at the appropriate layer.

### ❌ Testing Implementation Details
```
❌ Unit test checks internal state
❌ Integration test verifies API call count
❌ E2E test inspects DOM structure
```

**Fix:** Test observable behavior, not implementation.

---

## Visual, A11y, and Performance Tests

### Visual Regression Tests
**Layer:** Integration or E2E  
**Coverage:** Critical UI components and pages  
**Frequency:** Changed components + nightly

**What to test:**
- Component visual states
- Responsive layouts
- Theme variations
- Browser rendering differences

### Accessibility Tests
**Layer:** All layers  
**Coverage:** 100% of UI components  
**Gate:** 0 critical violations

**What to test:**
- Unit: Component ARIA attributes
- Integration: Keyboard navigation
- E2E: Screen reader compatibility

### Performance Tests
**Layer:** Integration and E2E  
**Coverage:** Critical paths + changed routes  
**Gate:** Lighthouse budgets

**What to test:**
- Integration: Component render time
- E2E: Page load metrics
- E2E: Interaction responsiveness

---

## Monitoring Test Distribution

### Scripts to Check Balance
```json
{
  "scripts": {
    "test:unit": "vitest run --dir=src",
    "test:integration": "vitest run --dir=tests/integration",
    "test:e2e": "playwright test",
    "test:stats": "vitest run --reporter=json | jq '.testResults | length'"
  }
}
```

### CI Gates
```yaml
# Enforce pyramid distribution
test-distribution:
  runs-on: ubuntu-latest
  steps:
    - name: Count tests
      run: |
        UNIT=$(find src -name "*.test.ts*" | wc -l)
        INTEGRATION=$(find tests/integration -name "*.test.ts*" | wc -l)
        E2E=$(find tests/e2e -name "*.spec.ts" | wc -l)
        
        TOTAL=$((UNIT + INTEGRATION + E2E))
        UNIT_PCT=$((UNIT * 100 / TOTAL))
        
        if [ $UNIT_PCT -lt 60 ]; then
          echo "Unit tests below 60% threshold"
          exit 1
        fi
```

---

## Coverage by Layer

### Unit Coverage Targets
```
✅ Functions: 100%
✅ Hooks: 95%
✅ Components: 85%
✅ Changed files: 85% minimum
```

### Integration Coverage Targets
```
✅ Features: 70%
✅ API contracts: 100%
✅ Critical paths: 100%
✅ Changed files: 70% minimum
```

### E2E Coverage Targets
```
✅ Critical journeys: 100%
✅ Smoke tests: All major features
✅ Regression: Known bugs
```

---

**← Back to:** [TDD Handbook](./01-tdd-handbook.md)  
**Next:** [Unit Testing](./03-unit-vitest.md) →

