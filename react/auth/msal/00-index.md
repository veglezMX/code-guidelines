# MSAL for React - Authentication Guide

**Stack:** React 19, TypeScript 5, @azure/msal-react, @azure/msal-browser  

---

## 📚 Documentation Structure

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[Concepts](./01-concepts.md)** | Mental model: tokens, scopes, cache | Starting with MSAL or onboarding |
| **[Setup](./02-setup.md)** | Installation, configuration, environment | Initial project setup |
| **[Core Usage](./03-core-usage.md)** | Sign-in/out, token acquisition, events | Daily authentication tasks |
| **[Routing & Guards](./04-routing-and-guards.md)** | Protected routes, React Router integration | Adding protected features |
| **[Calling APIs](./05-calling-apis.md)** | Bearer token injection, 401 handling | Integrating with backend APIs |
| **[Roles & Permissions](./06-roles-permissions.md)** | RBAC, claims, feature flags | Implementing authorization |
| **[Session & Storage](./07-session-and-storage.md)** | Cache location, persistence, multi-account | Session management |
| **[Error Handling](./08-error-handling.md)** | MSAL errors, retries, user messages | Debugging auth issues |
| **[Testing](./09-testing.md)** | Unit, integration, E2E with Vitest & Playwright | Writing auth tests |
| **[Security Checklist](./10-security-checklist.md)** | Best practices, do/don't, audit | Security review |
| **[Advanced](./11-advanced.md)** | B2C, multi-tenant, custom authorities | Complex scenarios |

---

## 🎯 Quick Start Paths

### New Developer (10 minutes)
1. Read [Concepts](./01-concepts.md) → Understand tokens and scopes
2. Follow [Setup](./02-setup.md) → Install and configure
3. Use [Core Usage](./03-core-usage.md) → Implement sign-in
4. Copy `_examples/AuthProvider.example.tsx` → Wrap your app

### Adding a Protected Route
1. Review [Routing & Guards](./04-routing-and-guards.md)
2. Copy `_examples/ProtectedRoute.example.tsx`
3. Apply to your route configuration

### Calling a Protected API
1. Read [Calling APIs](./05-calling-apis.md)
2. Copy `_examples/axios-interceptor.example.ts`
3. Configure scopes in `msalConfig`

### Writing Tests
1. Review [Testing](./09-testing.md)
2. Copy templates from `_templates/`
3. Reference [Testing Framework](../../quality/testing/) for patterns

### Security Review
1. Complete [Security Checklist](./10-security-checklist.md)
2. Use `_templates/feature-auth-checklist.md` for new features
3. Verify all items before deployment

---

## 📖 Glossary

### Token Types

**ID Token**
- **What:** Proves who the user is (identity)
- **Contains:** User claims (name, email, roles)
- **Used for:** UI personalization, role checks
- **Lifetime:** Short (1 hour typical)

**Access Token**
- **What:** Grants access to protected resources (APIs)
- **Contains:** Scopes, permissions
- **Used for:** API authorization (Bearer header)
- **Lifetime:** Short (1 hour typical)

**Refresh Token**
- **What:** Used to get new access tokens silently
- **Contains:** Long-lived credential
- **Used for:** Silent token renewal
- **Lifetime:** Long (days to weeks)

### Key Concepts

**Scopes**
- Permissions requested for an API
- Format: `api://app-id/scope-name`
- Example: `api://my-api/read`, `api://my-api/write`
- Requested during login or token acquisition

**Roles**
- User's assigned roles from Azure AD
- Found in ID token claims
- Example: `Admin`, `User`, `Reader`
- Used for authorization decisions

**Cache**
- Where MSAL stores tokens and account info
- Options: `sessionStorage`, `localStorage`, `memoryStorage`
- Recommended: `sessionStorage` for security

**Authority**
- Azure AD endpoint for authentication
- Format: `https://login.microsoftonline.com/{tenant-id}`
- B2C: `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}`

**Redirect URI**
- Where Azure AD sends user after authentication
- Must be registered in Azure AD app registration
- Must match exactly (including trailing slash)

**PKCE (Proof Key for Code Exchange)**
- Security enhancement for auth code flow
- Prevents authorization code interception
- Enabled by default in MSAL v2+

---

## 🔄 Authentication Flows

### Interactive Flow (User Present)
```
1. User clicks "Sign In"
2. Redirect to Azure AD (or popup)
3. User enters credentials
4. Azure AD redirects back with auth code
5. MSAL exchanges code for tokens
6. Tokens stored in cache
```

### Silent Flow (Background)
```
1. App needs access token
2. MSAL checks cache for valid token
3. If expired, use refresh token
4. Get new access token silently
5. Return token to app
```

### When Silent Fails
```
1. Silent renewal fails (refresh token expired)
2. MSAL throws InteractionRequiredAuthError
3. App triggers interactive flow
4. User re-authenticates
5. New tokens acquired
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Your React App                     │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │   MsalProvider (Root)               │   │
│  │   ├── Event Callbacks               │   │
│  │   └── PublicClientApplication       │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   Custom Hooks                       │   │
│  │   ├── useIsAuthenticated()          │   │
│  │   ├── useAccount()                   │   │
│  │   └── useAccessToken({ scopes })    │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   Protected Routes                   │   │
│  │   └── ProtectedRoute wrapper        │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   API Integration                    │   │
│  │   └── Axios interceptor              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│         Azure Active Directory              │
│   ├── Authentication                        │
│   ├── Token Issuance                        │
│   └── User Management                       │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│         Your Backend APIs                   │
│   ├── Bearer Token Validation              │
│   ├── Scope Verification                   │
│   └── Business Logic                       │
└─────────────────────────────────────────────┘
```

---

## 🎓 Learning Path by Role

### Frontend Developer
1. [Concepts](./01-concepts.md) → Understand the basics
2. [Setup](./02-setup.md) → Get running locally
3. [Core Usage](./03-core-usage.md) → Implement auth
4. [Routing & Guards](./04-routing-and-guards.md) → Protect routes
5. [Calling APIs](./05-calling-apis.md) → Integrate backend
6. [Testing](./09-testing.md) → Write tests

### Backend Developer
1. [Concepts](./01-concepts.md) → Understand tokens
2. [Calling APIs](./05-calling-apis.md) → See how frontend sends tokens
3. [Roles & Permissions](./06-roles-permissions.md) → Understand claims
4. [Security Checklist](./10-security-checklist.md) → Validation requirements

### DevOps Engineer
1. [Setup](./02-setup.md) → Environment configuration
2. [Session & Storage](./07-session-and-storage.md) → Deployment considerations
3. [Testing](./09-testing.md) → CI/CD integration
4. [Security Checklist](./10-security-checklist.md) → Security gates

### Security Reviewer
1. [Security Checklist](./10-security-checklist.md) → Audit requirements
2. [Session & Storage](./07-session-and-storage.md) → Storage security
3. [Error Handling](./08-error-handling.md) → Error exposure
4. [Advanced](./11-advanced.md) → Complex scenarios

---

## 🔗 Related Documentation

- **[Testing Framework](../../quality/testing/)** - Comprehensive testing guides
- **[Zustand State Management](../../state/zustand/)** - State management patterns
- **[Microsoft MSAL Docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)** - Official documentation

---

## 📦 What's Included

### Working Examples (`_examples/`)
- `msalConfig.example.ts` - Complete MSAL configuration
- `AuthProvider.example.tsx` - Provider setup with events
- `useAccessToken.example.ts` - Token acquisition hook
- `ProtectedRoute.example.tsx` - Route guard component
- `axios-interceptor.example.ts` - API token injection
- `feature-flag-guard.example.tsx` - Role-based rendering
- `dev-login/` - E2E testing dev login pattern

### Templates (`_templates/`)
- `feature-auth-checklist.md` - New feature checklist
- `e2e-login.feature` - Gherkin login scenarios
- `e2e-login.steps.ts` - Playwright step definitions
- `unit-useAccessToken.test.ts` - Unit test template
- `msw-protected-api.handler.ts` - MSW handler template

---

## ⚠️ Important Notes

### Security
- **Never commit** production client IDs or secrets to version control
- Use **environment variables** for all sensitive configuration
- Enable **PKCE** (enabled by default in MSAL v2+)
- Use **sessionStorage** for cache location (most secure)
- Validate tokens **server-side** (client checks are UX only)

### Testing
- **Never use live Azure AD** in CI/CD pipelines
- Use **dev login pattern** for E2E tests (see [Testing](./09-testing.md))
- Mock **MSAL at the boundary** in unit tests
- Use **MSW** for API mocking in integration tests

### Performance
- **Silent renewal** should be the default flow
- **Cache tokens** appropriately (don't fetch on every request)
- **Queue requests** during token refresh
- **Preload tokens** for known scopes on login

---

## 🆘 Getting Help

- **Questions?** Check [Error Handling](./08-error-handling.md) → Common Issues
- **Security concerns?** Review [Security Checklist](./10-security-checklist.md)
- **Testing issues?** See [Testing](./09-testing.md) → Troubleshooting
- **Complex scenario?** Check [Advanced](./11-advanced.md)

---

**Next:** [Concepts](./01-concepts.md) →

