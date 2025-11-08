# Mocking Guide — Testing

**Goal:** Decision matrix for vi.mock vs MSW vs Playwright.route, when to use each, and how to avoid double-mocking.

---

## Mocking Decision Matrix

| Scenario | Unit (vi.mock) | Integration (MSW) | E2E (Playwright) | Reason |
|----------|---------------|------------------|-----------------|--------|
| Pure function dependency | ✅ | | | No network involved |
| Custom hook dependency | ✅ | | | Isolate hook logic |
| React Context | | ✅ | | Need real provider |
| API calls in component | | ✅ | | Test contract |
| External API (payment) | | | ✅ | Full browser context |
| Third-party script | | | ✅ | Browser-specific |
| WebSocket | | ✅ | ✅ | MSW for integration, Playwright for E2E |
| Local storage | ✅ | | | Mock storage API |
| Date/Time | ✅ | ✅ | ✅ | Available at all layers |

---

## Unit Layer: vi.mock()

### When to Use
- **Isolate** the unit under test
- **Fast** execution (no network)
- **Simple** dependencies
- **Deterministic** results

### Mock Modules
```ts
import { vi } from 'vitest';
import { fetchUser } from '@/api/users';

// Mock the entire module
vi.mock('@/api/users');

describe('UserProfile', () => {
  it('should display user name', async () => {
    vi.mocked(fetchUser).mockResolvedValue({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    });

    const { result } = renderHook(() => useUserProfile('1'));

    await waitFor(() => {
      expect(result.current.user?.name).toBe('John Doe');
    });
  });
});
```

### Mock Functions
```ts
import { vi } from 'vitest';

it('should call callback on success', () => {
  const onSuccess = vi.fn();
  
  render(<Form onSuccess={onSuccess} />);
  
  // Trigger form submission
  fireEvent.submit(screen.getByRole('form'));
  
  expect(onSuccess).toHaveBeenCalledWith({ id: '1', name: 'Test' });
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
```

### Mock Implementations
```ts
import { vi } from 'vitest';
import { router } from '@/router';

vi.mock('@/router', () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
}));

it('should navigate on submit', () => {
  render(<LoginForm />);
  
  fireEvent.submit(screen.getByRole('form'));
  
  expect(router.push).toHaveBeenCalledWith('/dashboard');
});
```

### Spy on Methods
```ts
import { vi } from 'vitest';

it('should log error to console', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  render(<ComponentThatErrors />);
  
  expect(consoleSpy).toHaveBeenCalledWith('Error message');
  
  consoleSpy.mockRestore();
});
```

### Mock Timers
```ts
import { vi } from 'vitest';

it('should debounce function calls', () => {
  vi.useFakeTimers();
  
  const callback = vi.fn();
  const debounced = debounce(callback, 1000);
  
  debounced();
  debounced();
  debounced();
  
  expect(callback).not.toHaveBeenCalled();
  
  vi.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalledTimes(1);
  
  vi.useRealTimers();
});
```

### Partial Mocks
```ts
import { vi } from 'vitest';
import * as utils from '@/utils';

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchUser: vi.fn(), // Mock only this function
  };
});
```

---

## Integration Layer: MSW

### When to Use
- **Realistic** network behavior
- **Contract testing** between frontend and backend
- **Shared** handlers across tests
- **Provider** integration (React Query, SWR)

### REST API Mocking
```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

describe('UserProfile Integration', () => {
  it('should fetch and display user data', async () => {
    server.use(
      http.get('/api/users/:id', ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          name: 'John Doe',
          email: 'john@example.com',
        });
      })
    );

    render(<UserProfile userId="1" />, { wrapper: AppProviders });

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should handle 404 error', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      })
    );

    render(<UserProfile userId="999" />, { wrapper: AppProviders });

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });
});
```

### GraphQL Mocking
```ts
import { graphql, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

describe('UserProfile GraphQL', () => {
  it('should fetch user with GraphQL', async () => {
    server.use(
      graphql.query('GetUser', ({ variables }) => {
        return HttpResponse.json({
          data: {
            user: {
              id: variables.id,
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        });
      })
    );

    render(<UserProfile userId="1" />, { wrapper: AppProviders });

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
  });

  it('should handle GraphQL errors', async () => {
    server.use(
      graphql.query('GetUser', () => {
        return HttpResponse.json({
          errors: [
            {
              message: 'Not authorized',
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
        });
      })
    );

    render(<UserProfile userId="1" />, { wrapper: AppProviders });

    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
  });
});
```

### Stateful Handlers
```ts
import { http, HttpResponse } from 'msw';

let users = [
  { id: '1', name: 'John' },
  { id: '2', name: 'Jane' },
];

export const userHandlers = [
  http.get('/api/users', () => {
    return HttpResponse.json(users);
  }),

  http.post('/api/users', async ({ request }) => {
    const newUser = await request.json();
    const user = { id: Date.now().toString(), ...newUser };
    users.push(user);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    users = users.filter(u => u.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Reset state between tests
afterEach(() => {
  users = [
    { id: '1', name: 'John' },
    { id: '2', name: 'Jane' },
  ];
});
```

### Network Delays and Errors
```ts
import { http, HttpResponse, delay } from 'msw';

// Simulate network delay
http.get('/api/slow', async () => {
  await delay(1000);
  return HttpResponse.json({ data: 'slow response' });
});

// Simulate network error
http.get('/api/error', () => {
  return HttpResponse.error();
});

// Simulate timeout
http.get('/api/timeout', async () => {
  await delay('infinite');
});
```

---

## E2E Layer: Playwright Route Interception

### When to Use
- **External APIs** that shouldn't be hit in tests
- **Third-party services** (payment, analytics)
- **Flaky endpoints** that cause test instability
- **Expensive operations** (file uploads, video processing)

### Basic Route Interception
```ts
import { test, expect } from '@playwright/test';

test('mock external API', async ({ page }) => {
  await page.route('**/api/external/data', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: 'mocked response' }),
    });
  });

  await page.goto('/dashboard');

  await expect(page.getByText('mocked response')).toBeVisible();
});
```

### Mock Multiple Endpoints
```ts
test('mock multiple APIs', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({
      body: JSON.stringify([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]),
    });
  });

  await page.route('**/api/settings', route => {
    route.fulfill({
      body: JSON.stringify({ theme: 'dark', locale: 'en' }),
    });
  });

  await page.goto('/dashboard');

  await expect(page.getByText('John')).toBeVisible();
  await expect(page.getByText('Jane')).toBeVisible();
});
```

### Mock Third-Party Services
```ts
test('mock payment gateway', async ({ page }) => {
  // Mock Stripe API
  await page.route('**/api.stripe.com/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 'ch_mock123',
        status: 'succeeded',
        amount: 5000,
      }),
    });
  });

  await page.goto('/checkout');
  await page.getByLabel('Card Number').fill('4111111111111111');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByText('Payment successful')).toBeVisible();
});
```

### Conditional Mocking
```ts
test('mock only specific requests', async ({ page }) => {
  await page.route('**/api/**', route => {
    const url = route.request().url();
    
    // Mock external API
    if (url.includes('/api/external')) {
      route.fulfill({
        body: JSON.stringify({ mocked: true }),
      });
    } 
    // Allow internal API
    else {
      route.continue();
    }
  });

  await page.goto('/dashboard');
});
```

### Mock with Request Validation
```ts
test('validate request before mocking', async ({ page }) => {
  await page.route('**/api/users', async route => {
    const request = route.request();
    const headers = request.headers();
    
    // Check authorization
    if (!headers['authorization']) {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }
    
    // Check method
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      
      route.fulfill({
        status: 201,
        body: JSON.stringify({ id: '123', ...body }),
      });
    }
  });

  await page.goto('/users');
});
```

---

## Avoiding Double-Mocking

### ❌ Bad: Mocking at Multiple Layers
```ts
// ❌ Unit test: Mock fetchUser
vi.mock('@/api/users', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'John' }),
}));

// ❌ Integration test: Also mock fetchUser with MSW
server.use(
  http.get('/api/users/:id', () => {
    return HttpResponse.json({ name: 'John' });
  })
);

// ❌ E2E test: Also intercept the same endpoint
await page.route('**/api/users/**', route => {
  route.fulfill({ body: JSON.stringify({ name: 'John' }) });
});
```

### ✅ Good: Mock Once at Appropriate Layer
```ts
// ✅ Unit: Mock the module
vi.mock('@/api/users', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'John' }),
}));

// ✅ Integration: Mock the network (remove vi.mock)
server.use(
  http.get('/api/users/:id', () => {
    return HttpResponse.json({ name: 'John' });
  })
);

// ✅ E2E: Only mock external APIs
await page.route('**/external-api.com/**', route => {
  route.fulfill({ body: JSON.stringify({ data: 'mocked' }) });
});
```

---

## Mock Patterns by Use Case

### Date and Time
```ts
// Unit layer
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-01'));

// Integration layer
beforeEach(() => {
  vi.setSystemTime(new Date('2025-01-01'));
});

// E2E layer
await page.addInitScript(() => {
  Date.now = () => new Date('2025-01-01').getTime();
});
```

### Local Storage
```ts
// Unit layer
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, value) => mockStorage.set(key, value),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// Integration layer
// Use real localStorage, clean up after each test
afterEach(() => {
  localStorage.clear();
});

// E2E layer
// Use real localStorage, Playwright handles cleanup
```

### Geolocation
```ts
// Unit layer
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    });
  }),
};

// E2E layer
await page.context().setGeolocation({
  latitude: 40.7128,
  longitude: -74.0060,
});
await page.context().grantPermissions(['geolocation']);
```

### File Uploads
```ts
// Unit layer
const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

// E2E layer
await page.setInputFiles('input[type="file"]', {
  name: 'test.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('file content'),
});
```

---

## Best Practices

### ✅ Mock at the Right Layer
```
Unit: Mock dependencies/modules (vi.mock)
Integration: Mock network calls (MSW)
E2E: Mock external services only (Playwright)
```

### ✅ Use Realistic Mock Data
```ts
// ✅ Good: Realistic data
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'John Doe',
  email: 'john.doe@example.com',
  createdAt: '2025-01-15T10:30:00Z',
  role: 'user',
  preferences: {
    theme: 'dark',
    locale: 'en',
  },
};

// ❌ Bad: Minimal data
const mockUser = { id: '1', name: 'Test' };
```

### ✅ Reset Mocks Between Tests
```ts
import { afterEach, vi } from 'vitest';
import { server } from '@/mocks/server';

afterEach(() => {
  vi.clearAllMocks(); // Clear unit mocks
  server.resetHandlers(); // Reset MSW handlers
});
```

### ✅ Document Why Mocking
```ts
// ✅ Good: Comment explains why
// Mock payment gateway to avoid real charges in tests
await page.route('**/api.stripe.com/**', route => {
  route.fulfill({ body: JSON.stringify({ status: 'succeeded' }) });
});

// ❌ Bad: No context
await page.route('**/api.stripe.com/**', route => {
  route.fulfill({ body: JSON.stringify({ status: 'succeeded' }) });
});
```

---

**← Back to:** [E2E Testing](./06-e2e-playwright.md)  
**Next:** [Visual Testing](./07-visual-testing.md) →

