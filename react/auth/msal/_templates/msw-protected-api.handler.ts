/**
 * MSW Protected API Handler Template
 * 
 * Copy this template and customize for your MSW handlers.
 * Demonstrates Bearer token validation in integration tests.
 */

import { http, HttpResponse } from 'msw';

/**
 * Helper: Extract Bearer token from request
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Helper: Validate dev token (for testing)
 */
function validateDevToken(token: string): { valid: boolean; role?: string; scopes?: string[] } {
  // Check if it's a dev token
  if (!token.startsWith('dev-token-')) {
    return { valid: false };
  }
  
  // Parse role from token (format: dev-token-{role}-{timestamp})
  const parts = token.split('-');
  if (parts.length < 3) {
    return { valid: false };
  }
  
  const role = parts[2];
  
  // TODO: Customize scopes based on role
  const scopesByRole: Record<string, string[]> = {
    'User': ['read'],
    'Admin': ['read', 'write', 'admin'],
    'Moderator': ['read', 'write'],
    'Reader': ['read'],
  };
  
  return {
    valid: true,
    role,
    scopes: scopesByRole[role] || ['read'],
  };
}

/**
 * Protected API Handlers
 */

export const protectedApiHandlers = [
  /**
   * GET /api/users - Requires authentication
   */
  http.get('/api/users', ({ request }) => {
    const token = extractBearerToken(request);
    
    // Check for token
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized', message: 'No token provided' },
        { status: 401 }
      );
    }
    
    // Validate token
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Return mock data
    return HttpResponse.json([
      { id: 1, name: 'User 1', email: 'user1@example.com' },
      { id: 2, name: 'User 2', email: 'user2@example.com' },
    ]);
  }),
  
  /**
   * POST /api/users - Requires 'write' scope
   */
  http.post('/api/users', async ({ request }) => {
    const token = extractBearerToken(request);
    
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for 'write' scope
    if (!validation.scopes?.includes('write')) {
      return HttpResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Return created user
    return HttpResponse.json(
      {
        id: 3,
        ...body,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
  
  /**
   * DELETE /api/users/:id - Requires 'admin' scope
   */
  http.delete('/api/users/:id', ({ request, params }) => {
    const token = extractBearerToken(request);
    
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for 'admin' scope
    if (!validation.scopes?.includes('admin')) {
      return HttpResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return HttpResponse.json(
      { success: true, deletedId: params.id },
      { status: 200 }
    );
  }),
  
  /**
   * GET /api/admin/data - Requires 'Admin' role
   */
  http.get('/api/admin/data', ({ request }) => {
    const token = extractBearerToken(request);
    
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for Admin role
    if (validation.role !== 'Admin') {
      return HttpResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }
    
    return HttpResponse.json({
      adminData: 'Sensitive admin information',
      stats: { users: 100, activeUsers: 75 },
    });
  }),
  
  /**
   * GET /api/profile - Returns user profile based on token
   */
  http.get('/api/profile', ({ request }) => {
    const token = extractBearerToken(request);
    
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Return profile based on role
    return HttpResponse.json({
      name: `Test ${validation.role}`,
      email: `test-${validation.role?.toLowerCase()}@example.com`,
      role: validation.role,
      scopes: validation.scopes,
    });
  }),
  
  /**
   * POST /api/items - Requires authentication, returns different data based on role
   */
  http.post('/api/items', async ({ request }) => {
    const token = extractBearerToken(request);
    
    if (!token) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const validation = validateDevToken(token);
    if (!validation.valid) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Admins can create any item, users can only create their own
    if (validation.role !== 'Admin' && body.ownerId !== validation.role) {
      return HttpResponse.json(
        { error: 'Forbidden', message: 'Can only create items for yourself' },
        { status: 403 }
      );
    }
    
    return HttpResponse.json(
      {
        id: Math.random().toString(36).substring(7),
        ...body,
        createdBy: validation.role,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
];

/**
 * Error Simulation Handlers
 * 
 * TODO: Use these to test error scenarios
 */

export const errorSimulationHandlers = [
  // Simulate 401 error
  http.get('/api/test-401', () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }),
  
  // Simulate 403 error
  http.get('/api/test-403', () => {
    return HttpResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }),
  
  // Simulate network error
  http.get('/api/test-network-error', () => {
    return HttpResponse.error();
  }),
  
  // Simulate timeout
  http.get('/api/test-timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than typical timeout
    return HttpResponse.json({ data: 'Too late' });
  }),
];

/**
 * Public API Handlers (no authentication required)
 */

export const publicApiHandlers = [
  http.get('/api/public/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  
  http.get('/api/public/config', () => {
    return HttpResponse.json({
      apiVersion: '1.0.0',
      features: ['auth', 'users', 'items'],
    });
  }),
];

/**
 * Export all handlers
 */

export const handlers = [
  ...protectedApiHandlers,
  ...publicApiHandlers,
  // Uncomment to test error scenarios
  // ...errorSimulationHandlers,
];

/**
 * Usage in Tests:
 * 
 * // src/setupTests.ts
 * import { setupServer } from 'msw/node';
 * import { handlers } from './mocks/handlers';
 * 
 * export const server = setupServer(...handlers);
 * 
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * 
 * // In test file
 * import { server } from '../setupTests';
 * 
 * it('should handle 401 error', async () => {
 *   server.use(
 *     http.get('/api/users', () => {
 *       return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *     })
 *   );
 *   
 *   // Test code...
 * });
 */

/**
 * TODO: Add handlers for your specific API endpoints
 * 
 * Examples:
 * - User management endpoints
 * - Item CRUD operations
 * - Search and filter endpoints
 * - File upload endpoints
 * - Webhook endpoints
 */

