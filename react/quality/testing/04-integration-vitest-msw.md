# Integration Testing — Vitest + MSW

**Goal:** Test component + provider interactions with MSW for network mocking, including auth/session wiring and state reset guarantees.

---

## Setup and Configuration

### Install Dependencies
```bash
pnpm add -D msw
```

### MSW Setup
```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    
    if (email === 'user@example.com' && password === 'password') {
      return HttpResponse.json({
        token: 'mock-token',
        user: { id: '1', name: 'John Doe', email },
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),
];
```

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { server } from './src/mocks/server';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());
```

---

## App Providers Harness

### Create Test Wrapper
```tsx
// tests/test-utils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): ReturnType<typeof render> {
  if (options?.initialRoute) {
    window.history.pushState({}, 'Test page', options.initialRoute);
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

---

## Testing with MSW Handlers

### Basic API Integration
```tsx
import { render, screen, waitFor } from './test-utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('should display user data from API', async () => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        });
      })
    );

    render(<UserProfile />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should display error message on API failure', async () => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      })
    );

    render(<UserProfile />);

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    server.use(
      http.get('/api/user', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ id: '1', name: 'John' });
      })
    );

    render(<UserProfile />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Testing Forms with API
```tsx
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should submit valid credentials', async () => {
    const user = userEvent.setup();
    
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        const { email, password } = await request.json();
        
        return HttpResponse.json({
          token: 'mock-token',
          user: { id: '1', name: 'John', email },
        });
      })
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Welcome, John')).toBeInTheDocument();
  });

  it('should display error for invalid credentials', async () => {
    const user = userEvent.setup();
    
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
```

---

## MSW Handler Patterns

### REST Handlers
```ts
import { http, HttpResponse, delay } from 'msw';

export const userHandlers = [
  // GET request
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, name: `User ${id}` });
  }),

  // POST request
  http.post('/api/users', async ({ request }) => {
    const newUser = await request.json();
    return HttpResponse.json(
      { id: '123', ...newUser },
      { status: 201 }
    );
  }),

  // PUT request
  http.put('/api/users/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json();
    return HttpResponse.json({ id, ...updates });
  }),

  // DELETE request
  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Network delay
  http.get('/api/slow', async () => {
    await delay(1000);
    return HttpResponse.json({ data: 'slow response' });
  }),

  // Network error
  http.get('/api/error', () => {
    return HttpResponse.error();
  }),
];
```

### GraphQL Handlers
```ts
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
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
  }),

  graphql.mutation('CreateUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: {
          id: '123',
          ...variables.input,
        },
      },
    });
  }),

  graphql.query('GetUsers', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'Not authorized',
          extensions: { code: 'UNAUTHENTICATED' },
        },
      ],
    });
  }),
];
```

---

## Testing with Providers

### React Query Provider
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { UserList } from './UserList';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

describe('UserList', () => {
  it('should fetch and display users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' },
        ]);
      })
    );

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    );

    expect(await screen.findByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
```

### Router Provider
```tsx
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDetails } from './UserDetails';
import { UserList } from './UserList';

describe('Navigation', () => {
  it('should navigate to user details', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/users" element={<UserList />} />
          <Route path="/users/:id" element={<UserDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByText('View John'));

    expect(await screen.findByText('User Details')).toBeInTheDocument();
  });
});
```

### Auth Provider
```tsx
import { render, screen } from './test-utils';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    const mockAuthValue = {
      user: { id: '1', name: 'John' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthProvider value={mockAuthValue}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect when not authenticated', () => {
    const mockAuthValue = {
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthProvider value={mockAuthValue}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

---

## State Reset Guarantees

### Clean Up After Each Test
```ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  // React Testing Library cleanup
  cleanup();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Reset MSW handlers
  server.resetHandlers();
  
  // Clear all mocks
  vi.clearAllMocks();
});
```

### Reset Query Client
```ts
import { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
});

afterEach(() => {
  queryClient.clear();
});
```

---

## Contract Testing

### Verify Request/Response Contracts
```tsx
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

describe('API Contracts', () => {
  it('should send correct request payload', async () => {
    const user = userEvent.setup();
    let capturedRequest: any;

    server.use(
      http.post('/api/users', async ({ request }) => {
        capturedRequest = await request.json();
        return HttpResponse.json({ id: '123', ...capturedRequest });
      })
    );

    render(<CreateUserForm />);

    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(capturedRequest).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  it('should handle response structure', async () => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John',
          email: 'john@example.com',
          createdAt: '2025-01-01T00:00:00Z',
        });
      })
    );

    render(<UserProfile />);

    expect(await screen.findByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Member since: 2025')).toBeInTheDocument();
  });
});
```

---

## Testing Edge Cases

### Network Errors
```tsx
it('should handle network error', async () => {
  server.use(
    http.get('/api/user', () => {
      return HttpResponse.error();
    })
  );

  render(<UserProfile />);

  expect(await screen.findByText('Network error')).toBeInTheDocument();
});
```

### Timeout Errors
```tsx
import { delay } from 'msw';

it('should handle timeout', async () => {
  server.use(
    http.get('/api/user', async () => {
      await delay('infinite');
    })
  );

  render(<UserProfile />);

  expect(await screen.findByText('Request timeout')).toBeInTheDocument();
}, { timeout: 5000 });
```

### Rate Limiting
```tsx
it('should handle rate limit', async () => {
  server.use(
    http.get('/api/user', () => {
      return HttpResponse.json(
        { message: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    })
  );

  render(<UserProfile />);

  expect(await screen.findByText('Too many requests. Please try again in 60 seconds.')).toBeInTheDocument();
});
```

---

## Best Practices

### ✅ Use Realistic Mock Data
```ts
// ✅ Good: Realistic data structure
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'John Doe',
  email: 'john.doe@example.com',
  createdAt: '2025-01-15T10:30:00Z',
  role: 'user',
};

// ❌ Bad: Unrealistic data
const mockUser = { id: '1', name: 'test' };
```

### ✅ Test Loading States
```tsx
it('should show loading spinner', () => {
  server.use(
    http.get('/api/data', async () => {
      await delay(100);
      return HttpResponse.json({ data: 'value' });
    })
  );

  render(<DataComponent />);
  
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### ✅ Test Error Boundaries
```tsx
it('should display error boundary', async () => {
  server.use(
    http.get('/api/user', () => {
      return HttpResponse.error();
    })
  );

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <UserProfile />
    </ErrorBoundary>
  );

  expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
});
```

---

**← Back to:** [Unit Testing](./03-unit-vitest.md)  
**Next:** [BDD Testing](./05-bdd-cucumber-playwright.md) →

