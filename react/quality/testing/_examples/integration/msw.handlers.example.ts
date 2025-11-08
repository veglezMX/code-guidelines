/**
 * MSW Handlers Example
 * 
 * Demonstrates creating reusable MSW handlers for:
 * - REST APIs
 * - GraphQL APIs
 * - Error scenarios
 * - Auth flows
 * - Stateful handlers
 */

import { http, HttpResponse, graphql, delay } from 'msw';

// ============================================================================
// REST API HANDLERS
// ============================================================================

export const userHandlers = [
  // GET: Fetch single user
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    
    // Simulate user not found
    if (id === '999') {
      return HttpResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      role: 'user',
      createdAt: new Date().toISOString(),
    });
  }),

  // GET: Fetch all users with pagination
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const users = Array.from({ length: limit }, (_, i) => ({
      id: `${(page - 1) * limit + i + 1}`,
      name: `User ${(page - 1) * limit + i + 1}`,
      email: `user${(page - 1) * limit + i + 1}@example.com`,
    }));
    
    return HttpResponse.json({
      data: users,
      meta: {
        page,
        limit,
        total: 100,
        totalPages: Math.ceil(100 / limit),
      },
    });
  }),

  // POST: Create user
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return HttpResponse.json(
        {
          message: 'Validation failed',
          errors: {
            name: !body.name ? 'Name is required' : undefined,
            email: !body.email ? 'Email is required' : undefined,
          },
        },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // PUT: Update user
  http.put('/api/users/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    
    return HttpResponse.json({
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE: Delete user
  http.delete('/api/users/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================================
// AUTH HANDLERS
// ============================================================================

export const authHandlers = [
  // POST: Login
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    
    // Simulate authentication
    if (email === 'user@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: '1',
          name: 'John Doe',
          email: 'user@example.com',
          role: 'user',
        },
      });
    }
    
    // Invalid credentials
    if (email === 'admin@example.com' && password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-admin-token',
        user: {
          id: '2',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        },
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // POST: Register
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json();
    
    // Simulate email already exists
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { message: 'Email already exists' },
        { status: 409 }
      );
    }
    
    return HttpResponse.json(
      {
        token: 'mock-jwt-token',
        user: {
          id: crypto.randomUUID(),
          ...body,
          role: 'user',
        },
      },
      { status: 201 }
    );
  }),

  // GET: Current user (requires auth)
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      id: '1',
      name: 'John Doe',
      email: 'user@example.com',
      role: 'user',
    });
  }),

  // POST: Logout
  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================================
// GRAPHQL HANDLERS
// ============================================================================

export const graphqlHandlers = [
  // Query: Get user
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: {
          id: variables.id,
          name: 'John Doe',
          email: 'john@example.com',
          posts: [
            { id: '1', title: 'First Post' },
            { id: '2', title: 'Second Post' },
          ],
        },
      },
    });
  }),

  // Mutation: Create user
  graphql.mutation('CreateUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: {
          id: crypto.randomUUID(),
          ...variables.input,
        },
      },
    });
  }),

  // Error scenario
  graphql.query('GetUsers', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'Not authorized',
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        },
      ],
    });
  }),
];

// ============================================================================
// ERROR SCENARIOS
// ============================================================================

export const errorHandlers = [
  // Network error
  http.get('/api/network-error', () => {
    return HttpResponse.error();
  }),

  // Timeout
  http.get('/api/timeout', async () => {
    await delay('infinite');
  }),

  // Slow response
  http.get('/api/slow', async () => {
    await delay(3000);
    return HttpResponse.json({ data: 'slow response' });
  }),

  // Rate limit
  http.get('/api/rate-limited', () => {
    return HttpResponse.json(
      { message: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }),

  // Server error
  http.get('/api/server-error', () => {
    return HttpResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }),
];

// ============================================================================
// STATEFUL HANDLERS
// ============================================================================

// In-memory database
let users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

export const statefulHandlers = [
  http.get('/api/stateful/users', () => {
    return HttpResponse.json(users);
  }),

  http.post('/api/stateful/users', async ({ request }) => {
    const newUser = await request.json();
    const user = { id: crypto.randomUUID(), ...newUser };
    users.push(user);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.delete('/api/stateful/users/:id', ({ params }) => {
    users = users.filter(u => u.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Reset state between tests
export const resetStatefulHandlers = () => {
  users = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ];
};

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export const handlers = [
  ...userHandlers,
  ...authHandlers,
  ...graphqlHandlers,
  ...errorHandlers,
  ...statefulHandlers,
];

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// vitest.setup.ts
import { server } from './tests/mocks/server';
import { resetStatefulHandlers } from './tests/mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetStatefulHandlers();
});
afterAll(() => server.close());

// In tests:
import { server } from './mocks/server';

it('should handle error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );
  
  // Test error handling...
});
*/

