# Testing — MSAL for React

**Goal:** Test MSAL authentication without calling live Azure AD in CI/CD.

---

## Overview

This document covers MSAL-specific testing patterns. For comprehensive testing strategies, see:

- **[Testing Framework](../../quality/testing/)** - Complete testing guide
- **[Unit Testing (Vitest)](../../quality/testing/03-unit-vitest.md)** - Unit test patterns
- **[Integration Testing (MSW)](../../quality/testing/04-integration-vitest-msw.md)** - Integration patterns
- **[E2E Testing (Playwright)](../../quality/testing/06-e2e-playwright.md)** - E2E patterns
- **[Mocking Guide](../../quality/testing/11-mocking-guide.md)** - Mocking strategies

---

## Testing Strategy

### Testing Pyramid for Auth

```
         ┌─────────────────┐
         │   E2E (Dev)     │  Dev login pattern, no live Azure AD
         │   5-10 tests    │  Critical flows only
         └─────────────────┘
              ▲
         ┌─────────────────┐
         │  Integration    │  MSW handlers with Bearer tokens
         │  20-30 tests    │  Protected API calls
         └─────────────────┘
              ▲
         ┌─────────────────┐
         │     Unit        │  Mock MSAL at boundary
         │  50-100 tests   │  Hooks, components, utilities
         └─────────────────┘
```

---

## Unit Testing with Vitest

### Mock MSAL at Boundary

```ts
// src/__tests__/setup.ts
import { vi } from 'vitest';

// Mock @azure/msal-react
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
  useIsAuthenticated: vi.fn(),
  MsalProvider: ({ children }: any) => children,
}));

// Mock @azure/msal-browser
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: vi.fn(),
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {
    errorCode = 'interaction_required';
  },
}));
```

### Test useAccessToken Hook

```ts
// src/hooks/__tests__/useAccessToken.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useAccessToken } from '../useAccessToken';

describe('useAccessToken', () => {
  const mockInstance = {
    acquireTokenSilent: vi.fn(),
    acquireTokenPopup: vi.fn(),
  };
  
  const mockAccount = {
    homeAccountId: 'test-account',
    localAccountId: 'test-local',
    username: 'test@example.com',
    name: 'Test User',
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useMsal as any).mockReturnValue({
      instance: mockInstance,
      accounts: [mockAccount],
    });
  });
  
  it('should acquire token silently on success', async () => {
    const mockToken = 'mock-access-token';
    mockInstance.acquireTokenSilent.mockResolvedValue({
      accessToken: mockToken,
    });
    
    const { result } = renderHook(() => 
      useAccessToken(['api://my-api/read'])
    );
    
    const token = await result.current();
    
    expect(mockInstance.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: ['api://my-api/read'],
      account: mockAccount,
    });
    expect(token).toBe(mockToken);
  });
  
  it('should fallback to popup on interaction required', async () => {
    const mockToken = 'mock-popup-token';
    mockInstance.acquireTokenSilent.mockRejectedValue(
      new InteractionRequiredAuthError()
    );
    mockInstance.acquireTokenPopup.mockResolvedValue({
      accessToken: mockToken,
    });
    
    const { result } = renderHook(() => 
      useAccessToken(['api://my-api/read'])
    );
    
    const token = await result.current();
    
    expect(mockInstance.acquireTokenSilent).toHaveBeenCalled();
    expect(mockInstance.acquireTokenPopup).toHaveBeenCalledWith({
      scopes: ['api://my-api/read'],
      account: mockAccount,
    });
    expect(token).toBe(mockToken);
  });
  
  it('should throw error when no account', async () => {
    (useMsal as any).mockReturnValue({
      instance: mockInstance,
      accounts: [],
    });
    
    const { result } = renderHook(() => 
      useAccessToken(['api://my-api/read'])
    );
    
    await expect(result.current()).rejects.toThrow('No active account');
  });
});
```

### Test Protected Component

```tsx
// src/components/__tests__/ProtectedRoute.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  const mockInstance = {
    loginRedirect: vi.fn(),
  };
  
  it('should render children when authenticated', () => {
    (useIsAuthenticated as any).mockReturnValue(true);
    (useMsal as any).mockReturnValue({
      instance: mockInstance,
      inProgress: InteractionStatus.None,
    });
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
  
  it('should redirect to login when not authenticated', () => {
    (useIsAuthenticated as any).mockReturnValue(false);
    (useMsal as any).mockReturnValue({
      instance: mockInstance,
      inProgress: InteractionStatus.None,
    });
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    
    expect(mockInstance.loginRedirect).toHaveBeenCalled();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('should show loading during authentication', () => {
    (useIsAuthenticated as any).mockReturnValue(false);
    (useMsal as any).mockReturnValue({
      instance: mockInstance,
      inProgress: InteractionStatus.Login,
    });
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

---

## Integration Testing with MSW

### MSW Handler Requiring Bearer Token

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Protected endpoint requiring Bearer token
  http.get('/api/users', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    // Check for Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    // Validate token (simple check for testing)
    if (token !== 'mock-access-token') {
      return HttpResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Return protected data
    return HttpResponse.json([
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
    ]);
  }),
  
  // Endpoint requiring specific scope
  http.post('/api/admin/users', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Check for admin scope (mock validation)
    if (!token.includes('admin')) {
      return HttpResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return HttpResponse.json({ success: true });
  }),
];
```

### Test API Integration

```tsx
// src/api/__tests__/apiClient.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers';
import { apiClient } from '../apiClient';
import { useMsal } from '@azure/msal-react';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiClient', () => {
  beforeEach(() => {
    // Mock MSAL to return valid token
    (useMsal as any).mockReturnValue({
      instance: {
        getAllAccounts: () => [{ homeAccountId: 'test' }],
        acquireTokenSilent: vi.fn().mockResolvedValue({
          accessToken: 'mock-access-token',
        }),
      },
      accounts: [{ homeAccountId: 'test' }],
    });
  });
  
  it('should add Bearer token to request', async () => {
    const response = await apiClient.get('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
  });
  
  it('should return 401 without token', async () => {
    // Mock MSAL to return no accounts
    (useMsal as any).mockReturnValue({
      instance: {
        getAllAccounts: () => [],
      },
      accounts: [],
    });
    
    await expect(apiClient.get('/api/users')).rejects.toThrow();
  });
  
  it('should handle 403 for insufficient permissions', async () => {
    // Mock token without admin scope
    (useMsal as any).mockReturnValue({
      instance: {
        getAllAccounts: () => [{ homeAccountId: 'test' }],
        acquireTokenSilent: vi.fn().mockResolvedValue({
          accessToken: 'mock-access-token', // No admin scope
        }),
      },
      accounts: [{ homeAccountId: 'test' }],
    });
    
    await expect(apiClient.post('/api/admin/users')).rejects.toThrow();
  });
});
```

---

## E2E Testing with Dev Login Pattern

### Dev Login Route

**⚠️ CRITICAL:** Only enable in test builds, never in production

```tsx
// src/routes/DevLogin.tsx
export function DevLogin() {
  const navigate = useNavigate();
  
  // Only available in test builds
  if (import.meta.env.MODE !== 'test') {
    return <Navigate to="/" />;
  }
  
  const handleDevLogin = async (role: string) => {
    // Set dev token in sessionStorage
    const devToken = {
      accessToken: `dev-token-${role}`,
      idToken: {
        name: `Test ${role}`,
        email: `test-${role}@example.com`,
        roles: [role],
      },
      account: {
        homeAccountId: `dev-${role}`,
        username: `test-${role}@example.com`,
        name: `Test ${role}`,
      },
    };
    
    sessionStorage.setItem('msal.dev.token', JSON.stringify(devToken));
    
    navigate('/dashboard');
  };
  
  return (
    <div className="dev-login">
      <h2>Dev Login (Test Only)</h2>
      <button onClick={() => handleDevLogin('User')}>Login as User</button>
      <button onClick={() => handleDevLogin('Admin')}>Login as Admin</button>
    </div>
  );
}
```

### Backend Validation for Dev Tokens

```ts
// backend/middleware/auth.ts
export function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  // In test environment, accept dev tokens
  if (process.env.NODE_ENV === 'test' && token.startsWith('dev-token-')) {
    const role = token.replace('dev-token-', '');
    req.user = {
      roles: [role],
      email: `test-${role}@example.com`,
    };
    return next();
  }
  
  // In production, validate real Azure AD token
  try {
    const decoded = verifyAzureToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Gherkin Scenarios

```gherkin
# features/auth/login.feature
@auth @smoke
Feature: User Authentication

  Background:
    Given the application is in test mode
    
  @critical
  Scenario: User logs in and accesses protected page
    Given I am on the login page
    When I click "Login as User"
    Then I should be redirected to the dashboard
    And I should see "Welcome, Test User"
    
  @admin
  Scenario: Admin accesses admin panel
    Given I am on the login page
    When I click "Login as Admin"
    And I navigate to "/admin"
    Then I should see the admin panel
    And I should not see "Access denied"
    
  @authorization
  Scenario: User cannot access admin panel
    Given I am logged in as "User"
    When I navigate to "/admin"
    Then I should see "Access denied"
    
  @api
  Scenario: Authenticated user calls protected API
    Given I am logged in as "User"
    When I navigate to "/dashboard"
    Then the API should receive a Bearer token
    And I should see the user data
```

### Playwright Step Definitions

```ts
// features/steps/auth.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('the application is in test mode', async function () {
  // Ensure test mode is enabled
  expect(process.env.MODE).toBe('test');
});

Given('I am on the login page', async function () {
  await this.page.goto('/dev-login');
});

When('I click {string}', async function (buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('I should be redirected to the dashboard', async function () {
  await expect(this.page).toHaveURL(/\/dashboard/);
});

Then('I should see {string}', async function (text: string) {
  await expect(this.page.locator(`text=${text}`)).toBeVisible();
});

Given('I am logged in as {string}', async function (role: string) {
  await this.page.goto('/dev-login');
  await this.page.click(`button:has-text("Login as ${role}")`);
  await this.page.waitForURL(/\/dashboard/);
});

When('I navigate to {string}', async function (path: string) {
  await this.page.goto(path);
});

Then('the API should receive a Bearer token', async function () {
  // Intercept API calls and verify token
  await this.page.route('/api/**', (route) => {
    const headers = route.request().headers();
    expect(headers.authorization).toMatch(/^Bearer dev-token-/);
    route.continue();
  });
});
```

---

## DO/DON'T

### ✅ Do

- Mock MSAL at the boundary in unit tests
- Use MSW handlers requiring Bearer tokens in integration tests
- Use dev login pattern for E2E tests
- Validate dev tokens only in test builds
- Test with different roles and permissions
- Test token expiration and renewal
- Test error scenarios (401, 403, network errors)

### ❌ Don't

- Call live Azure AD from CI/CD
- Test with production credentials
- Enable dev login in production builds
- Skip testing authentication flows
- Forget to test authorization (roles/permissions)
- Hardcode tokens in tests
- Test only happy paths

---

## CI/CD Configuration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run unit tests
        run: pnpm test:unit
        
      - name: Run integration tests
        run: pnpm test:integration
        
      - name: Build test mode
        run: pnpm build --mode test
        env:
          MODE: test
          
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          MODE: test
          
      # ❌ NEVER set real Azure AD credentials in CI
      # ✅ Use dev login pattern instead
```

---

## Templates

See `_templates/` for ready-to-use templates:

- **[unit-useAccessToken.test.ts](../_templates/unit-useAccessToken.test.ts)** - Unit test template
- **[msw-protected-api.handler.ts](../_templates/msw-protected-api.handler.ts)** - MSW handler template
- **[e2e-login.feature](../_templates/e2e-login.feature)** - Gherkin scenarios
- **[e2e-login.steps.ts](../_templates/e2e-login.steps.ts)** - Playwright steps

---

## Related Documentation

- **[Testing Framework](../../quality/testing/)** - Complete testing guide
- **[Unit Testing](../../quality/testing/03-unit-vitest.md)** - Vitest patterns
- **[Integration Testing](../../quality/testing/04-integration-vitest-msw.md)** - MSW patterns
- **[E2E Testing](../../quality/testing/06-e2e-playwright.md)** - Playwright patterns
- **[Mocking Guide](../../quality/testing/11-mocking-guide.md)** - Mocking strategies

---

**← Back to:** [Error Handling](./08-error-handling.md)  
**Next:** [Security Checklist](./10-security-checklist.md) →

