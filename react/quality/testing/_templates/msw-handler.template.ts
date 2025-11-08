/**
 * MSW Handler Template
 * 
 * Use this template to create reusable MSW handlers for API mocking
 */

import { http, HttpResponse, graphql, delay } from 'msw';

// ============================================================================
// REST API HANDLERS
// ============================================================================

export const resourceHandlers = [
  // GET: Fetch single resource
  http.get('/api/resources/:id', ({ params }) => {
    const { id } = params;
    
    // Simulate not found
    if (id === '999') {
      return HttpResponse.json(
        { message: 'Resource not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      id,
      name: `Resource ${id}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }),

  // GET: Fetch all resources with pagination
  http.get('/api/resources', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const resources = Array.from({ length: limit }, (_, i) => ({
      id: `${(page - 1) * limit + i + 1}`,
      name: `Resource ${(page - 1) * limit + i + 1}`,
      status: 'active',
    }));
    
    return HttpResponse.json({
      data: resources,
      meta: {
        page,
        limit,
        total: 100,
        totalPages: Math.ceil(100 / limit),
      },
    });
  }),

  // POST: Create resource
  http.post('/api/resources', async ({ request }) => {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return HttpResponse.json(
        {
          message: 'Validation failed',
          errors: {
            name: 'Name is required',
          },
        },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // PUT: Update resource
  http.put('/api/resources/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    
    return HttpResponse.json({
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE: Delete resource
  http.delete('/api/resources/:id', () => {
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
    
    // Simulate successful login
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
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
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
];

// ============================================================================
// GRAPHQL HANDLERS
// ============================================================================

export const graphqlHandlers = [
  // Query: Get resource
  graphql.query('GetResource', ({ variables }) => {
    return HttpResponse.json({
      data: {
        resource: {
          id: variables.id,
          name: 'Resource Name',
          status: 'active',
        },
      },
    });
  }),

  // Mutation: Create resource
  graphql.mutation('CreateResource', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createResource: {
          id: crypto.randomUUID(),
          ...variables.input,
          status: 'active',
        },
      },
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
    await delay(2000);
    return HttpResponse.json({ data: 'slow response' });
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
// STATEFUL HANDLERS (with in-memory database)
// ============================================================================

// In-memory database
let database = {
  resources: [
    { id: '1', name: 'Resource 1', status: 'active' },
    { id: '2', name: 'Resource 2', status: 'inactive' },
  ],
};

export const statefulHandlers = [
  http.get('/api/stateful/resources', () => {
    return HttpResponse.json(database.resources);
  }),

  http.post('/api/stateful/resources', async ({ request }) => {
    const newResource = await request.json();
    const resource = { id: crypto.randomUUID(), ...newResource };
    database.resources.push(resource);
    return HttpResponse.json(resource, { status: 201 });
  }),

  http.delete('/api/stateful/resources/:id', ({ params }) => {
    database.resources = database.resources.filter(r => r.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Reset state between tests
export const resetDatabase = () => {
  database = {
    resources: [
      { id: '1', name: 'Resource 1', status: 'active' },
      { id: '2', name: 'Resource 2', status: 'inactive' },
    ],
  };
};

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export const handlers = [
  ...resourceHandlers,
  ...authHandlers,
  ...graphqlHandlers,
  ...errorHandlers,
  ...statefulHandlers,
];

// ============================================================================
// USAGE
// ============================================================================

/*
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// vitest.setup.ts
import { server } from './tests/mocks/server';
import { resetDatabase } from './tests/mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDatabase();
});
afterAll(() => server.close());

// In tests:
import { server } from './mocks/server';

it('should handle error', async () => {
  server.use(
    http.get('/api/resources', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );
  
  // Test error handling...
});
*/

