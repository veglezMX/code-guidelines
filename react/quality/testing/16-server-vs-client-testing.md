# Server vs Client Testing — React 19

**Goal:** React 19 RSC boundaries, observable output assertions, and when to use E2E vs integration for server components.

---

## React 19 Architecture

### Component Types

**Server Components (RSC):**
- Render on server only
- Can access backend resources directly
- Cannot use hooks or browser APIs
- File extension: `.server.tsx` (optional)

**Client Components:**
- Can render on server and client
- Use `'use client'` directive
- Can use hooks and browser APIs
- Interactive and stateful

**Shared Components:**
- Pure components without hooks
- Can be used in both contexts
- Must be carefully designed

---

## Testing Strategy by Component Type

### Decision Matrix

| Component Type | Test Layer | Why |
|----------------|-----------|-----|
| Server Component | Integration/E2E | Needs real server context |
| Client Component | Unit/Integration | Can test in isolation |
| Server Action | Integration | Needs server context |
| Server Function | Unit | Pure function testable |
| Client Hook | Unit | Isolated with renderHook |
| Shared Utility | Unit | Pure function |

---

## Testing Server Components

### ❌ Don't Test RSC Implementation Details
```tsx
// ❌ Bad: Trying to unit test server component internals
import { renderToString } from 'react-dom/server';

// This won't work properly with RSC
test('server component', () => {
  const html = renderToString(<ServerComponent />);
  expect(html).toContain('expected output');
});
```

### ✅ Test Observable Output at Boundaries
```ts
// ✅ Good: Integration test with real server
import { render, screen } from './test-utils';

describe('UserProfile Server Component', () => {
  it('should display user data', async () => {
    // Mock the database/API call
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        });
      })
    );

    render(<UserProfile userId="1" />);

    // Test what the user sees
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### ✅ E2E Test for Full RSC Journey
```ts
// ✅ Good: E2E test for server components
import { test, expect } from '@playwright/test';

test('server component displays data', async ({ page }) => {
  await page.goto('/users/1');
  
  // Wait for server component to render
  await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
  await expect(page.getByText('john@example.com')).toBeVisible();
  
  // Test that it's actually from server (no loading state)
  await expect(page.locator('[data-loading]')).not.toBeVisible();
});
```

---

## Testing Server Actions

### Server Action Pattern
```ts
// actions/users.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  const user = await db.user.create({
    data: { name, email },
  });
  
  revalidatePath('/users');
  
  return { success: true, user };
}
```

### Integration Test for Server Action
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createUser } from './actions/users';
import { UserForm } from './UserForm';

// Mock the server action
vi.mock('./actions/users', () => ({
  createUser: vi.fn(),
}));

describe('UserForm with Server Action', () => {
  it('should call server action on submit', async () => {
    const user = userEvent.setup();
    
    vi.mocked(createUser).mockResolvedValue({
      success: true,
      user: { id: '1', name: 'John', email: 'john@example.com' },
    });

    render(<UserForm />);

    await user.type(screen.getByLabelText('Name'), 'John');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    expect(createUser).toHaveBeenCalledWith(expect.any(FormData));
    
    // Verify success message
    expect(await screen.findByText('User created successfully')).toBeInTheDocument();
  });
});
```

### E2E Test for Server Action
```ts
test('create user via server action', async ({ page }) => {
  await page.goto('/users/new');
  
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByRole('button', { name: 'Create User' }).click();
  
  // Verify success
  await expect(page.getByText('User created successfully')).toBeVisible();
  
  // Verify redirect
  await expect(page).toHaveURL('/users');
  
  // Verify user appears in list
  await expect(page.getByText('John Doe')).toBeVisible();
});
```

---

## Testing Client Components

### Unit Test
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter Client Component', () => {
  it('should increment count', async () => {
    const user = userEvent.setup();
    
    render(<Counter />);
    
    const button = screen.getByRole('button', { name: 'Increment' });
    await user.click(button);
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

### Integration Test with Server Data
```tsx
import { render, screen } from './test-utils';
import { Dashboard } from './Dashboard';

describe('Dashboard Integration', () => {
  it('should display server data in client component', async () => {
    server.use(
      http.get('/api/stats', () => {
        return HttpResponse.json({
          totalUsers: 150,
          activeUsers: 42,
        });
      })
    );

    render(<Dashboard />);

    // Client component displays server data
    expect(await screen.findByText('Total Users: 150')).toBeInTheDocument();
    expect(screen.getByText('Active Users: 42')).toBeInTheDocument();
  });
});
```

---

## Testing Hydration

### Detect Hydration Mismatches
```tsx
describe('Hydration', () => {
  it('should not have hydration mismatch', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<HydratedComponent />);
    
    // Wait for hydration
    await screen.findByText('Hydrated content');
    
    // Check for hydration errors
    const hydrationErrors = consoleSpy.mock.calls.filter(call => 
      call[0]?.includes('Hydration')
    );
    
    expect(hydrationErrors).toHaveLength(0);
    
    consoleSpy.mockRestore();
  });
});
```

### E2E Hydration Test
```ts
test('page hydrates without errors', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.goto('/');
  
  // Wait for hydration
  await page.waitForLoadState('networkidle');
  
  // Check for hydration errors
  const hydrationErrors = errors.filter(err => err.includes('Hydration'));
  expect(hydrationErrors).toHaveLength(0);
  
  // Verify interactivity (confirms hydration)
  await page.getByRole('button', { name: 'Click me' }).click();
  await expect(page.getByText('Clicked!')).toBeVisible();
});
```

---

## Testing Data Fetching

### Server Component Data Fetching
```tsx
// app/users/page.tsx
export default async function UsersPage() {
  const users = await db.user.findMany();
  
  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
    </div>
  );
}
```

### Integration Test
```tsx
describe('UsersPage', () => {
  it('should display users from database', async () => {
    // Mock database
    const mockUsers = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];
    
    vi.mocked(db.user.findMany).mockResolvedValue(mockUsers);
    
    render(<UsersPage />);
    
    expect(await screen.findByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
```

### E2E Test
```ts
test('displays users from database', async ({ page }) => {
  // Seed database before test
  await page.request.post('/api/test/seed', {
    data: {
      users: [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ],
    },
  });
  
  await page.goto('/users');
  
  await expect(page.getByText('John')).toBeVisible();
  await expect(page.getByText('Jane')).toBeVisible();
});
```

---

## Testing Streaming and Suspense

### Suspense Boundary Test
```tsx
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

describe('Suspense Streaming', () => {
  it('should show fallback then content', async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    );
    
    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Eventually shows content
    expect(await screen.findByText('Content loaded')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

### E2E Streaming Test
```ts
test('page streams content progressively', async ({ page }) => {
  await page.goto('/dashboard');
  
  // First, loading state appears
  await expect(page.getByText('Loading stats...')).toBeVisible();
  
  // Then, stats appear
  await expect(page.getByText('Total Users: 150')).toBeVisible();
  
  // Loading state disappears
  await expect(page.getByText('Loading stats...')).not.toBeVisible();
});
```

---

## Testing Middleware and Route Handlers

### Route Handler
```ts
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Integration Test for Route Handler
```ts
import { GET, POST } from './route';

describe('Users Route Handler', () => {
  it('should return all users', async () => {
    const mockUsers = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];
    
    vi.mocked(db.user.findMany).mockResolvedValue(mockUsers);
    
    const request = new Request('http://localhost:3000/api/users');
    const response = await GET(request as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual(mockUsers);
  });

  it('should create new user', async () => {
    const newUser = { name: 'John', email: 'john@example.com' };
    const createdUser = { id: '1', ...newUser };
    
    vi.mocked(db.user.create).mockResolvedValue(createdUser);
    
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify(newUser),
    });
    
    const response = await POST(request as any);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data).toEqual(createdUser);
  });
});
```

---

## Best Practices

### ✅ Test at the Right Boundary
```
Server Component → Integration/E2E
Client Component → Unit/Integration
Server Action → Integration
Route Handler → Integration
Shared Utility → Unit
```

### ✅ Mock at the Right Layer
```ts
// ✅ Good: Mock database in integration tests
vi.mock('@/lib/db');

// ✅ Good: Mock server actions in client component tests
vi.mock('./actions/users');

// ❌ Bad: Trying to mock RSC internals
vi.mock('react-server-dom-webpack/server');
```

### ✅ Test Observable Behavior
```ts
// ✅ Good: Test what user sees
expect(screen.getByText('John Doe')).toBeInTheDocument();

// ❌ Bad: Test implementation
expect(component.state.user.name).toBe('John Doe');
```

---

## Common Pitfalls

### ❌ Trying to Unit Test RSC
```tsx
// ❌ Bad: Can't properly test in isolation
test('server component', () => {
  render(<ServerComponent />);
  // This won't work correctly with RSC
});

// ✅ Good: Integration or E2E test
test('server component', async ({ page }) => {
  await page.goto('/users');
  await expect(page.getByText('Users')).toBeVisible();
});
```

### ❌ Not Waiting for Async Server Components
```tsx
// ❌ Bad: Not waiting for async data
test('shows users', () => {
  render(<UsersPage />);
  expect(screen.getByText('John')).toBeInTheDocument(); // Fails
});

// ✅ Good: Wait for async data
test('shows users', async () => {
  render(<UsersPage />);
  expect(await screen.findByText('John')).toBeInTheDocument();
});
```

### ❌ Testing Hydration Timing
```tsx
// ❌ Bad: Testing when hydration happens
test('hydrates at exact time', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(component.isHydrated).toBe(true);
  }, { timeout: 100 }); // Flaky
});

// ✅ Good: Test that it eventually hydrates and works
test('becomes interactive after hydration', async () => {
  render(<Component />);
  const button = screen.getByRole('button');
  await user.click(button);
  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

---

**← Back to:** [Performance Testing](./09-performance-testing.md)  
**Next:** [Test Data Factories](./10-test-data-factories.md) →

