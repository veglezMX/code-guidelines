# Troubleshooting — Testing

**Goal:** Common issues, flakes, timeouts, hydration mismatches, race conditions, and MSW gotchas with solutions.

---

## Flaky Tests

### Symptom: Test Passes Sometimes, Fails Other Times

**Common Causes:**

#### 1. Arbitrary Timeouts
```ts
// ❌ Bad: Arbitrary wait
await page.waitForTimeout(1000);
expect(page.locator('.result')).toBeVisible();

// ✅ Good: Wait for specific condition
await expect(page.locator('.result')).toBeVisible();
```

#### 2. Race Conditions
```ts
// ❌ Bad: Not waiting for async operation
render(<AsyncComponent />);
expect(screen.getByText('Data')).toBeInTheDocument(); // Fails

// ✅ Good: Wait for async data
render(<AsyncComponent />);
expect(await screen.findByText('Data')).toBeInTheDocument();
```

#### 3. Shared State Between Tests
```ts
// ❌ Bad: Shared state
let sharedUser;

it('test 1', () => {
  sharedUser = createUser();
  // ...
});

it('test 2', () => {
  // Uses sharedUser from test 1 - flaky!
});

// ✅ Good: Isolated state
beforeEach(() => {
  const user = createUser();
  // Use within test only
});
```

#### 4. Non-Deterministic Data
```ts
// ❌ Bad: Random data
const user = {
  id: Math.random().toString(),
  createdAt: Date.now(),
};

// ✅ Good: Deterministic data
faker.seed(123);
const user = {
  id: faker.string.uuid(),
  createdAt: faker.date.past(),
};
```

---

## Timeout Errors

### Symptom: "Timeout Exceeded" or "Test Timeout of 5000ms Exceeded"

**Solutions:**

#### 1. Increase Timeout for Slow Operations
```ts
// Vitest
it('slow operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 seconds

// Playwright
test('slow page load', async ({ page }) => {
  await page.goto('/', { timeout: 30000 });
});
```

#### 2. Wait for Network Idle
```ts
// ❌ Bad: Not waiting
await page.goto('/');
expect(page.locator('.data')).toBeVisible(); // Fails

// ✅ Good: Wait for network
await page.goto('/', { waitUntil: 'networkidle' });
expect(page.locator('.data')).toBeVisible();
```

#### 3. Use Proper Async Utilities
```ts
// ❌ Bad: Not using async query
render(<AsyncComponent />);
expect(screen.getByText('Data')).toBeInTheDocument();

// ✅ Good: Use findBy (async)
render(<AsyncComponent />);
expect(await screen.findByText('Data')).toBeInTheDocument();
```

---

## Hydration Mismatches

### Symptom: "Hydration failed" or "Text content does not match"

**Common Causes:**

#### 1. Client-Only Code in Server Component
```tsx
// ❌ Bad: Using window in server component
export default function ServerComponent() {
  const width = window.innerWidth; // Error!
  return <div>{width}</div>;
}

// ✅ Good: Use client component
'use client';
export function ClientComponent() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
  
  return <div>{width}</div>;
}
```

#### 2. Date/Time Rendering
```tsx
// ❌ Bad: Different on server and client
<div>{new Date().toLocaleString()}</div>

// ✅ Good: Suppress hydration warning or use client component
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>

// Or
'use client';
export function TimeDisplay() {
  const [time, setTime] = useState('');
  
  useEffect(() => {
    setTime(new Date().toLocaleString());
  }, []);
  
  return <div>{time}</div>;
}
```

#### 3. Random IDs
```tsx
// ❌ Bad: Random ID on server and client differ
const id = Math.random().toString();

// ✅ Good: Use useId or deterministic ID
import { useId } from 'react';

function Component() {
  const id = useId();
  return <div id={id}>Content</div>;
}
```

---

## MSW Issues

### Symptom: "Network request not intercepted" or "Handler not found"

**Solutions:**

#### 1. Handler Not Matching
```ts
// ❌ Bad: Handler doesn't match request
server.use(
  http.get('/api/user', () => { /* ... */ })
);

// Request goes to: http://localhost:3000/api/users (plural)
// Fix: Update handler
server.use(
  http.get('/api/users', () => { /* ... */ })
);
```

#### 2. MSW Not Started
```ts
// ❌ Bad: Forgot to start server
import { server } from './mocks/server';

it('test', () => {
  // MSW not running!
});

// ✅ Good: Start in setup
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### 3. Handler Order Matters
```ts
// ❌ Bad: Specific handler after generic
server.use(
  http.get('/api/*', () => HttpResponse.json({ generic: true })),
  http.get('/api/users', () => HttpResponse.json({ specific: true })),
);
// Generic handler matches first!

// ✅ Good: Specific before generic
server.use(
  http.get('/api/users', () => HttpResponse.json({ specific: true })),
  http.get('/api/*', () => HttpResponse.json({ generic: true })),
);
```

#### 4. CORS Issues
```ts
// ✅ Good: Add CORS headers
http.get('/api/data', () => {
  return HttpResponse.json({ data: 'value' }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
});
```

---

## React Testing Library Issues

### Symptom: "Unable to find element" or "Element not found"

**Solutions:**

#### 1. Element Not Yet Rendered
```ts
// ❌ Bad: Synchronous query for async element
render(<AsyncComponent />);
expect(screen.getByText('Data')).toBeInTheDocument();

// ✅ Good: Async query
render(<AsyncComponent />);
expect(await screen.findByText('Data')).toBeInTheDocument();
```

#### 2. Wrong Query Type
```ts
// ❌ Bad: Wrong query for hidden element
const modal = screen.getByRole('dialog'); // Fails if hidden

// ✅ Good: Query for all
const modal = screen.queryByRole('dialog'); // Returns null if not found
expect(modal).not.toBeInTheDocument();
```

#### 3. Inaccessible Element
```ts
// ❌ Bad: Element not accessible
<div onClick={handleClick}>Submit</div>

// Test fails: screen.getByRole('button') not found

// ✅ Good: Use proper semantic element
<button onClick={handleClick}>Submit</button>

// Now works: screen.getByRole('button', { name: 'Submit' })
```

---

## Playwright Issues

### Symptom: "Element not clickable" or "Element is outside viewport"

**Solutions:**

#### 1. Element Not Visible
```ts
// ❌ Bad: Clicking before visible
await page.click('button');

// ✅ Good: Wait for visibility
await page.waitForSelector('button', { state: 'visible' });
await page.click('button');

// Or use expect (auto-waits)
await expect(page.locator('button')).toBeVisible();
await page.click('button');
```

#### 2. Element Covered by Another Element
```ts
// ❌ Bad: Element covered by modal/overlay
await page.click('.button-under-modal');

// ✅ Good: Close modal first
await page.click('[data-testid="close-modal"]');
await page.click('.button');
```

#### 3. Element Outside Viewport
```ts
// ❌ Bad: Element not scrolled into view
await page.click('.footer-button');

// ✅ Good: Scroll into view
await page.locator('.footer-button').scrollIntoViewIfNeeded();
await page.click('.footer-button');
```

---

## Coverage Issues

### Symptom: "Coverage threshold not met"

**Solutions:**

#### 1. Uncovered Branches
```ts
// File has uncovered branches

// ✅ Solution: Add tests for all branches
it('handles success', () => {
  // Test success branch
});

it('handles error', () => {
  // Test error branch
});

it('handles edge case', () => {
  // Test edge case branch
});
```

#### 2. Generated Code Counted
```ts
// ❌ Bad: Including generated code in coverage
// vitest.config.ts
coverage: {
  exclude: ['node_modules/**'],
}

// ✅ Good: Exclude generated code
coverage: {
  exclude: [
    'node_modules/**',
    'src/generated/**',
    '**/*.d.ts',
  ],
}
```

---

## CI-Specific Issues

### Symptom: "Tests pass locally but fail in CI"

**Solutions:**

#### 1. Different Node Versions
```yaml
# ✅ Solution: Pin Node version
- uses: actions/setup-node@v3
  with:
    node-version: 18  # Same as local
```

#### 2. Missing Environment Variables
```yaml
# ✅ Solution: Set env vars
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}
```

#### 3. Timezone Differences
```ts
// ❌ Bad: Dependent on local timezone
expect(formatDate(date)).toBe('1/1/2025');

// ✅ Good: Use UTC or mock
faker.seed(123);
const date = new Date('2025-01-01T00:00:00Z');
```

#### 4. Race Conditions in Parallel Tests
```yaml
# ✅ Solution: Reduce parallelism
strategy:
  matrix:
    shard: [1, 2]  # Instead of [1, 2, 3, 4]
```

---

## Common Error Messages

### "act() warning"
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution:**
```ts
// ✅ Wrap state updates in act()
import { act } from '@testing-library/react';

act(() => {
  result.current.increment();
});

// Or use userEvent (automatically wrapped)
await user.click(button);
```

### "Cannot read property of undefined"
```
TypeError: Cannot read property 'name' of undefined
```

**Solution:**
```ts
// ✅ Wait for data to load
expect(await screen.findByText('Data')).toBeInTheDocument();

// Or check for loading state first
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

### "Maximum update depth exceeded"
```
Error: Maximum update depth exceeded
```

**Solution:**
```tsx
// ❌ Bad: Infinite render loop
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Called on every render!
  return <div>{count}</div>;
}

// ✅ Good: Use useEffect
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1);
  }, []); // Only on mount
  
  return <div>{count}</div>;
}
```

---

## Performance Issues

### Symptom: "Tests are slow"

**Solutions:**

#### 1. Too Many Tests Running
```bash
# ✅ Run only changed files
pnpm test:changed

# ✅ Run specific test
pnpm vitest run user.test.ts
```

#### 2. No Parallelization
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    threads: true,  // Enable parallel execution
    maxThreads: 4,
  },
});
```

#### 3. Slow Setup/Teardown
```ts
// ❌ Bad: Expensive setup in each test
it('test 1', () => {
  const db = createDatabase(); // Slow!
  // ...
});

// ✅ Good: Shared setup
let db;

beforeAll(() => {
  db = createDatabase(); // Once
});

afterAll(() => {
  db.close();
});
```

---

## Debug Tips

### Enable Debug Logs
```bash
# Vitest
DEBUG=* pnpm vitest run

# Playwright
DEBUG=pw:api pnpm exec playwright test
```

### Screenshot on Failure
```ts
// Playwright
test('my test', async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ path: 'failure.png' });
  }
});
```

### Pause Test Execution
```ts
// Playwright
await page.pause(); // Opens inspector

// Vitest
await vi.waitFor(() => {
  // Inspect state here
  debugger;
});
```

---

**← Back to:** [Governance Checklists](./14-governance-checklists.md)  
**Next:** [Index](./README.md) →

