# Integration Test Template

Use this template for testing component + provider interactions with MSW.

## Checklist

- [ ] MSW handlers are properly configured
- [ ] All providers are included in test wrapper
- [ ] API contracts are validated
- [ ] Loading and error states are tested
- [ ] State is reset between tests
- [ ] No real network calls
- [ ] Realistic test data is used

## Template Code

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { describe, it, expect, beforeEach } from 'vitest';
import { AllProvidersWrapper } from './test-utils';
import { FeatureName } from './FeatureName';

describe('FeatureName Integration', () => {
  // ============================================================================
  // SETUP
  // ============================================================================
  
  beforeEach(() => {
    // Reset any stateful handlers
  });

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================
  
  it('should fetch and display data', async () => {
    // Arrange: Mock API response
    server.use(
      http.get('/api/resource', () => {
        return HttpResponse.json({
          id: '1',
          name: 'Test Resource',
          status: 'active',
        });
      })
    );

    // Act: Render component
    render(<FeatureName />, { wrapper: AllProvidersWrapper });

    // Assert: Data is displayed
    expect(await screen.findByText('Test Resource')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================
  
  it('should show loading state while fetching', () => {
    render(<FeatureName />, { wrapper: AllProvidersWrapper });
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // ============================================================================
  // ERROR STATE TESTS
  // ============================================================================
  
  it('should handle API errors gracefully', async () => {
    // Arrange: Mock error response
    server.use(
      http.get('/api/resource', () => {
        return HttpResponse.json(
          { message: 'Resource not found' },
          { status: 404 }
        );
      })
    );

    // Act: Render component
    render(<FeatureName />, { wrapper: AllProvidersWrapper });

    // Assert: Error is displayed
    expect(await screen.findByText('Resource not found')).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    // Arrange: Mock network error
    server.use(
      http.get('/api/resource', () => {
        return HttpResponse.error();
      })
    );

    // Act: Render component
    render(<FeatureName />, { wrapper: AllProvidersWrapper });

    // Assert: Generic error is displayed
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  // ============================================================================
  // USER INTERACTION TESTS
  // ============================================================================
  
  it('should submit form and update UI', async () => {
    const user = userEvent.setup();
    
    // Arrange: Mock API response
    server.use(
      http.post('/api/resource', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
          { id: '2', ...body },
          { status: 201 }
        );
      })
    );

    // Act: Render and fill form
    render(<FeatureName />, { wrapper: AllProvidersWrapper });
    
    await user.type(screen.getByLabelText('Name'), 'New Resource');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // Assert: Success message is displayed
    expect(await screen.findByText('Resource created')).toBeInTheDocument();
  });

  // ============================================================================
  // PROVIDER INTERACTION TESTS
  // ============================================================================
  
  it('should update context on action', async () => {
    const user = userEvent.setup();
    
    render(<FeatureName />, { wrapper: AllProvidersWrapper });
    
    // Action that updates context
    await user.click(screen.getByRole('button', { name: 'Update' }));
    
    // Assert: Context change reflected in UI
    expect(await screen.findByText('Updated')).toBeInTheDocument();
  });
});
```

## Provider Wrapper Template

```tsx
// tests/test-utils.tsx
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

export function AllProvidersWrapper({ children }: { children: ReactNode }) {
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
```

## MSW Setup Template

```ts
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// vitest.setup.ts
import { server } from './tests/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

