# Concepts — MSAL for React

**Goal:** Build a clear mental model of MSAL authentication concepts before implementation.

---

## Token Types

### ID Token vs Access Token

| Aspect | ID Token | Access Token |
|--------|----------|--------------|
| **Purpose** | Proves **who** the user is | Grants **access** to resources |
| **Audience** | Your application | Backend API |
| **Contains** | User claims (name, email, roles) | Scopes, permissions |
| **Used for** | UI personalization, role checks | API authorization (Bearer header) |
| **Lifetime** | Short (1 hour typical) | Short (1 hour typical) |
| **Validation** | Client-side (for UX only) | Server-side (required) |

### When to Use Each

```tsx
// ✅ Use ID Token for UI decisions
const { accounts } = useMsal();
const user = accounts[0];
const userName = user?.idTokenClaims?.name; // From ID token
const userRole = user?.idTokenClaims?.roles?.[0]; // From ID token

// Show/hide UI based on role
{userRole === 'Admin' && <AdminPanel />}

// ✅ Use Access Token for API calls
const getAccessToken = useAccessToken(['api://my-api/read']);
const token = await getAccessToken();

fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Refresh Token

**What it does:**
- Allows silent token renewal without user interaction
- Long-lived (days to weeks)
- Stored securely by MSAL
- Never exposed to your application code

**How it works:**
```
1. Access token expires
2. MSAL uses refresh token automatically
3. New access token acquired silently
4. Your app continues without interruption
```

---

## Scopes vs Roles vs Permissions

### Decision Tree

```
Need to control access to an API?
├─ Yes → Use SCOPES
│  └─ Example: api://my-api/read, api://my-api/write
│
└─ Need to control features in UI?
   ├─ Based on user type → Use ROLES
   │  └─ Example: Admin, User, Reader
   │
   └─ Based on specific permissions → Use PERMISSIONS
      └─ Example: can_delete_users, can_approve_invoices
```

### Scopes

**Definition:** Permissions requested for a specific API

**Format:** `api://{app-id}/{scope-name}`

**Example:**
```ts
// Request read access to your API
const scopes = ['api://12345678-1234-1234-1234-123456789012/read'];

// Request multiple scopes
const scopes = [
  'api://my-api/read',
  'api://my-api/write',
];
```

**Where defined:** Azure AD App Registration → Expose an API

**When requested:** During login or token acquisition

**Best practice:** Request minimal scopes needed for each feature

### Roles

**Definition:** User's assigned roles from Azure AD

**Format:** Simple strings (e.g., `Admin`, `User`)

**Example:**
```ts
// Check user's role from ID token
const { accounts } = useMsal();
const roles = accounts[0]?.idTokenClaims?.roles || [];

if (roles.includes('Admin')) {
  // Show admin features
}
```

**Where defined:** Azure AD → Enterprise Applications → Users and groups

**When available:** In ID token claims after login

**Best practice:** Use for broad feature access (admin vs user)

### Permissions

**Definition:** Fine-grained permissions assigned to roles

**Format:** Custom strings (e.g., `can_delete_users`)

**Example:**
```ts
// Check specific permission
const permissions = accounts[0]?.idTokenClaims?.permissions || [];

if (permissions.includes('can_delete_users')) {
  // Show delete button
}
```

**Where defined:** Custom claims in Azure AD (requires custom policy or app logic)

**When available:** In ID token claims (if configured)

**Best practice:** Use for specific actions within features

---

## App Registrations

### What is an App Registration?

An **App Registration** in Azure AD represents your application and defines:
- Who can sign in (single tenant, multi-tenant, personal accounts)
- Where to redirect after authentication
- What APIs it can access
- What permissions it needs

### Key Components

```
App Registration
├── Application (client) ID
│   └── Unique identifier for your app
│
├── Directory (tenant) ID
│   └── Your Azure AD tenant identifier
│
├── Redirect URIs
│   └── Where Azure AD sends users after auth
│       ├── http://localhost:3000/auth/callback (dev)
│       └── https://app.example.com/auth/callback (prod)
│
├── API Permissions
│   └── What your app can access
│       ├── Microsoft Graph (user.read)
│       └── Your custom API (api://my-api/read)
│
└── Expose an API (if your app has an API)
    └── Scopes other apps can request
```

### Single vs Multi-Tenant

**Single Tenant**
- Users from **one** Azure AD tenant only
- Authority: `https://login.microsoftonline.com/{tenant-id}`
- Use for: Internal company apps

**Multi-Tenant**
- Users from **any** Azure AD tenant
- Authority: `https://login.microsoftonline.com/common`
- Use for: SaaS applications

**Personal Accounts**
- Microsoft personal accounts (Outlook, Xbox)
- Authority: `https://login.microsoftonline.com/consumers`
- Use for: Consumer applications

---

## Authentication Flows

### Authorization Code Flow with PKCE (Recommended)

**What:** Most secure flow for SPAs

**How it works:**
```
1. User clicks "Sign In"
2. App generates code verifier + challenge (PKCE)
3. Redirect to Azure AD with challenge
4. User authenticates
5. Azure AD redirects back with auth code
6. App exchanges code + verifier for tokens
7. Tokens stored in cache
```

**Enabled by default** in MSAL v2+

### Implicit Flow (Deprecated)

**What:** Legacy flow, less secure

**Why deprecated:** Tokens exposed in URL

**Don't use** unless required for legacy reasons

---

## Account Objects

### What is an Account?

An **Account** object represents a signed-in user:

```ts
interface AccountInfo {
  homeAccountId: string;      // Unique identifier
  environment: string;         // login.microsoftonline.com
  tenantId: string;           // User's tenant
  username: string;           // User's email/UPN
  localAccountId: string;     // Local identifier
  name?: string;              // Display name
  idTokenClaims?: {           // Claims from ID token
    roles?: string[];
    email?: string;
    // ... other claims
  };
}
```

### Accessing Accounts

```tsx
import { useMsal } from '@azure/msal-react';

function UserProfile() {
  const { accounts } = useMsal();
  const account = accounts[0]; // Primary account
  
  if (!account) {
    return <div>Not signed in</div>;
  }
  
  return (
    <div>
      <p>Welcome, {account.name}</p>
      <p>Email: {account.username}</p>
      <p>Roles: {account.idTokenClaims?.roles?.join(', ')}</p>
    </div>
  );
}
```

### Multiple Accounts

MSAL supports multiple signed-in accounts:

```ts
const { accounts } = useMsal();

// Primary account (first signed in)
const primaryAccount = accounts[0];

// All accounts
accounts.forEach(account => {
  console.log(account.username);
});

// Switch active account
instance.setActiveAccount(accounts[1]);
```

---

## Cache Structure

### What MSAL Caches

```
Cache
├── Access Tokens
│   ├── Keyed by: scope + account + authority
│   └── Lifetime: 1 hour (typical)
│
├── ID Tokens
│   ├── Keyed by: account + authority
│   └── Lifetime: 1 hour (typical)
│
├── Refresh Tokens
│   ├── Keyed by: account + authority
│   └── Lifetime: Days to weeks
│
└── Account Information
    ├── User profile data
    └── Claims from ID token
```

### Cache Locations

| Location | Security | Persistence | Use Case |
|----------|----------|-------------|----------|
| **sessionStorage** | ✅ High | Tab only | **Recommended** for most apps |
| **localStorage** | ⚠️ Medium | Browser-wide | Multi-tab SSO needed |
| **memoryStorage** | ✅ Highest | None | Maximum security (no persistence) |

**Recommendation:** Use `sessionStorage` (default)

### Cache Lookup

When you request a token:

```
1. Check cache for valid access token
   ├─ Found & valid → Return immediately
   └─ Not found or expired → Continue
   
2. Check for refresh token
   ├─ Found → Silent renewal
   │   ├─ Success → Cache new token, return
   │   └─ Fail → Continue
   └─ Not found → Continue
   
3. Trigger interactive flow
   └─ User authenticates → Cache tokens
```

---

## Interactive vs Silent Authentication

### Interactive Authentication

**When:** User must interact (first login, consent, expired refresh token)

**Methods:**
- **Redirect:** Full page redirect to Azure AD
- **Popup:** Opens popup window for auth

**Use redirect when:**
- Mobile browsers (popups often blocked)
- Simpler UX (no popup management)
- Default choice for most apps

**Use popup when:**
- Need to preserve app state
- Multi-step wizard flows
- Embedded scenarios

### Silent Authentication

**When:** Renewing tokens without user interaction

**Method:** `acquireTokenSilent()`

**How it works:**
```ts
try {
  // Try silent renewal first
  const response = await instance.acquireTokenSilent({
    scopes: ['api://my-api/read'],
    account: accounts[0],
  });
  
  return response.accessToken;
} catch (error) {
  if (error instanceof InteractionRequiredAuthError) {
    // Silent failed, need user interaction
    const response = await instance.acquireTokenPopup({
      scopes: ['api://my-api/read'],
      account: accounts[0],
    });
    
    return response.accessToken;
  }
  throw error;
}
```

**Best practice:** Always try silent first, fallback to interactive

---

## Common Patterns

### Pattern 1: Check Authentication State

```tsx
import { useIsAuthenticated } from '@azure/msal-react';

function App() {
  const isAuthenticated = useIsAuthenticated();
  
  return isAuthenticated ? <Dashboard /> : <Login />;
}
```

### Pattern 2: Get Current User

```tsx
import { useMsal } from '@azure/msal-react';

function UserMenu() {
  const { accounts } = useMsal();
  const user = accounts[0];
  
  return <div>{user?.name}</div>;
}
```

### Pattern 3: Acquire Token for API

```tsx
import { useMsal } from '@azure/msal-react';

function useApiToken() {
  const { instance, accounts } = useMsal();
  
  return async () => {
    const response = await instance.acquireTokenSilent({
      scopes: ['api://my-api/read'],
      account: accounts[0],
    });
    
    return response.accessToken;
  };
}
```

### Pattern 4: Role-Based Rendering

```tsx
import { useMsal } from '@azure/msal-react';

function AdminPanel() {
  const { accounts } = useMsal();
  const roles = accounts[0]?.idTokenClaims?.roles || [];
  
  if (!roles.includes('Admin')) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin features...</div>;
}
```

---

## Key Takeaways

### ✅ Remember

1. **ID Token** = Who you are (UI personalization)
2. **Access Token** = What you can access (API calls)
3. **Scopes** = API permissions
4. **Roles** = User types (Admin, User)
5. **Silent first** = Try silent renewal before interactive
6. **Cache** = MSAL handles token storage automatically
7. **PKCE** = Security enhancement (enabled by default)

### ❌ Common Misconceptions

- **"ID token is for API calls"** → No, use access token
- **"Roles are requested like scopes"** → No, roles are assigned in Azure AD
- **"I need to manage refresh tokens"** → No, MSAL handles this
- **"Client-side role checks are secure"** → No, always validate server-side
- **"I should store tokens myself"** → No, let MSAL manage the cache

---

**← Back to:** [Index](./00-index.md)  
**Next:** [Setup](./02-setup.md) →

