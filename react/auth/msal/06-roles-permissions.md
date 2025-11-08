# Roles & Permissions — MSAL for React

**Goal:** Implement role-based access control (RBAC) using ID token claims.

---

## ID Token Claims Structure

### Understanding Claims

```ts
interface IdTokenClaims {
  aud: string;              // Audience (your client ID)
  iss: string;              // Issuer (Azure AD)
  iat: number;              // Issued at (timestamp)
  exp: number;              // Expiration (timestamp)
  sub: string;              // Subject (user identifier)
  name?: string;            // Display name
  preferred_username?: string; // Email/UPN
  oid?: string;             // Object ID
  tid?: string;             // Tenant ID
  roles?: string[];         // App roles assigned to user
  groups?: string[];        // Group memberships
  // Custom claims...
}
```

### Accessing Claims

```tsx
import { useMsal } from '@azure/msal-react';

function UserInfo() {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims;
  
  return (
    <div>
      <p>Name: {claims?.name}</p>
      <p>Email: {claims?.preferred_username}</p>
      <p>Roles: {claims?.roles?.join(', ')}</p>
    </div>
  );
}
```

---

## Helper Functions

### hasRole

```ts
// src/utils/auth.ts
import { AccountInfo } from '@azure/msal-browser';

export function hasRole(account: AccountInfo | null, role: string): boolean {
  if (!account?.idTokenClaims?.roles) {
    return false;
  }
  
  return account.idTokenClaims.roles.includes(role);
}
```

### hasAnyRole

```ts
export function hasAnyRole(
  account: AccountInfo | null,
  roles: string[]
): boolean {
  if (!account?.idTokenClaims?.roles) {
    return false;
  }
  
  return roles.some(role => account.idTokenClaims.roles!.includes(role));
}
```

### hasAllRoles

```ts
export function hasAllRoles(
  account: AccountInfo | null,
  roles: string[]
): boolean {
  if (!account?.idTokenClaims?.roles) {
    return false;
  }
  
  return roles.every(role => account.idTokenClaims.roles!.includes(role));
}
```

### Custom Hook

```ts
// src/hooks/useUserRoles.ts
import { useMsal } from '@azure/msal-react';
import { useMemo } from 'react';

export function useUserRoles() {
  const { accounts } = useMsal();
  const account = accounts[0];
  
  return useMemo(() => {
    const roles = account?.idTokenClaims?.roles || [];
    
    return {
      roles,
      hasRole: (role: string) => roles.includes(role),
      hasAnyRole: (requiredRoles: string[]) => 
        requiredRoles.some(r => roles.includes(r)),
      hasAllRoles: (requiredRoles: string[]) => 
        requiredRoles.every(r => roles.includes(r)),
      isAdmin: roles.includes('Admin'),
      isUser: roles.includes('User'),
    };
  }, [account]);
}
```

---

## Feature Flag Integration

### Role-Based Feature Flags

```tsx
// src/components/FeatureFlag.tsx
import { useUserRoles } from '../hooks/useUserRoles';

interface FeatureFlagProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function FeatureFlag({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback = null,
}: FeatureFlagProps) {
  const { hasAnyRole } = useUserRoles();
  const { hasAnyPermission } = useUserPermissions();
  
  // Check roles
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return <>{fallback}</>;
  }
  
  // Check permissions
  if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

### Usage

```tsx
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show admin panel only to admins */}
      <FeatureFlag requiredRoles={['Admin']}>
        <AdminPanel />
      </FeatureFlag>
      
      {/* Show delete button to admins or moderators */}
      <FeatureFlag 
        requiredRoles={['Admin', 'Moderator']}
        fallback={<p>You don't have permission to delete</p>}
      >
        <button>Delete</button>
      </FeatureFlag>
    </div>
  );
}
```

---

## Render-Time Guards vs Route Guards

### When to Use Each

| Type | Use Case | Example |
|------|----------|---------|
| **Route Guard** | Entire page requires role | Admin dashboard |
| **Render Guard** | Specific feature within page | Delete button |

### Route Guard

```tsx
// Protect entire route
<Route
  path="/admin"
  element={
    <ProtectedRoute requireRoles={['Admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

### Render Guard

```tsx
// Protect specific feature
function UserList() {
  const { hasRole } = useUserRoles();
  
  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name}
            {hasRole('Admin') && (
              <button onClick={() => deleteUser(user.id)}>Delete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Server-Side Authorization

### Client-Side is UX Only

⚠️ **Critical:** Client-side role checks are for UX only. Always validate on the server.

```tsx
// ❌ Bad: Only client-side check
function deleteUser(userId: string) {
  const { hasRole } = useUserRoles();
  
  if (!hasRole('Admin')) {
    alert('Access denied');
    return;
  }
  
  // Delete user (no server-side check)
  api.delete(`/users/${userId}`);
}
```

```tsx
// ✅ Good: Client check + server validation
function deleteUser(userId: string) {
  const { hasRole } = useUserRoles();
  
  // Client-side check for UX
  if (!hasRole('Admin')) {
    alert('Access denied');
    return;
  }
  
  // Server validates token and roles
  api.delete(`/users/${userId}`)
    .catch(error => {
      if (error.response?.status === 403) {
        alert('Access denied by server');
      }
    });
}
```

### Server-Side Validation Example

```ts
// Backend (Node.js example)
app.delete('/users/:id', authenticateToken, (req, res) => {
  // Validate token (done by authenticateToken middleware)
  
  // Check roles from token
  const roles = req.user.roles || [];
  
  if (!roles.includes('Admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Proceed with deletion
  deleteUser(req.params.id);
  res.json({ success: true });
});
```

---

## Debugging Claims

### Development Claims Viewer

```tsx
// src/components/ClaimsViewer.tsx
import { useMsal } from '@azure/msal-react';

export function ClaimsViewer() {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims;
  
  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }
  
  return (
    <details className="claims-viewer">
      <summary>ID Token Claims (Dev Only)</summary>
      <pre>{JSON.stringify(claims, null, 2)}</pre>
    </details>
  );
}
```

### Console Logging

```tsx
function App() {
  const { accounts } = useMsal();
  
  useEffect(() => {
    if (import.meta.env.DEV && accounts[0]) {
      console.group('User Claims');
      console.log('Name:', accounts[0].name);
      console.log('Email:', accounts[0].username);
      console.log('Roles:', accounts[0].idTokenClaims?.roles);
      console.log('All claims:', accounts[0].idTokenClaims);
      console.groupEnd();
    }
  }, [accounts]);
  
  return <App />;
}
```

---

## Permission-Based Authorization

### Custom Permissions Claim

```ts
// Custom claims structure
interface CustomClaims extends IdTokenClaims {
  permissions?: string[];
}

// Hook for permissions
export function useUserPermissions() {
  const { accounts } = useMsal();
  const account = accounts[0];
  
  return useMemo(() => {
    const permissions = (account?.idTokenClaims as CustomClaims)?.permissions || [];
    
    return {
      permissions,
      hasPermission: (permission: string) => permissions.includes(permission),
      hasAnyPermission: (requiredPermissions: string[]) =>
        requiredPermissions.some(p => permissions.includes(p)),
      hasAllPermissions: (requiredPermissions: string[]) =>
        requiredPermissions.every(p => permissions.includes(p)),
    };
  }, [account]);
}
```

### Usage

```tsx
function UserManagement() {
  const { hasPermission } = useUserPermissions();
  
  return (
    <div>
      <h2>User Management</h2>
      
      {hasPermission('users.read') && <UserList />}
      
      {hasPermission('users.create') && (
        <button>Create User</button>
      )}
      
      {hasPermission('users.delete') && (
        <button>Delete User</button>
      )}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Role-Based Navigation

```tsx
function Navigation() {
  const { hasRole } = useUserRoles();
  
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/dashboard">Dashboard</Link>
      
      {hasRole('Admin') && (
        <>
          <Link to="/admin">Admin</Link>
          <Link to="/users">User Management</Link>
        </>
      )}
      
      {hasRole('Moderator') && (
        <Link to="/moderation">Moderation</Link>
      )}
    </nav>
  );
}
```

### Pattern 2: Conditional Actions

```tsx
function DocumentActions({ document }: { document: Document }) {
  const { hasAnyRole } = useUserRoles();
  const { accounts } = useMsal();
  const isOwner = document.ownerId === accounts[0]?.localAccountId;
  
  const canEdit = isOwner || hasAnyRole(['Admin', 'Editor']);
  const canDelete = isOwner || hasAnyRole(['Admin']);
  
  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### Pattern 3: Role-Based Data Filtering

```tsx
function useFilteredData<T>(data: T[], filterFn: (item: T) => boolean) {
  const { roles } = useUserRoles();
  
  return useMemo(() => {
    if (roles.includes('Admin')) {
      return data; // Admins see everything
    }
    
    return data.filter(filterFn);
  }, [data, roles, filterFn]);
}

// Usage
function DocumentList() {
  const { accounts } = useMsal();
  const userId = accounts[0]?.localAccountId;
  
  const documents = useFilteredData(
    allDocuments,
    (doc) => doc.ownerId === userId // Non-admins see only their docs
  );
  
  return <ul>{documents.map(doc => <li key={doc.id}>{doc.title}</li>)}</ul>;
}
```

---

## Common Pitfalls

### ❌ Don't Trust Client-Side Checks

```tsx
// ❌ Bad: Security relies on client
function AdminPanel() {
  const { hasRole } = useUserRoles();
  
  if (!hasRole('Admin')) {
    return <div>Access denied</div>;
  }
  
  // Anyone can bypass this by modifying client code
  return <div>Admin panel</div>;
}
```

```tsx
// ✅ Good: Client check + server validation
function AdminPanel() {
  const { hasRole } = useUserRoles();
  const { data, error } = useQuery('/api/admin/data'); // Server validates
  
  if (!hasRole('Admin')) {
    return <div>Access denied</div>; // UX only
  }
  
  if (error?.response?.status === 403) {
    return <div>Access denied by server</div>; // Real security
  }
  
  return <div>Admin panel: {data}</div>;
}
```

### ❌ Don't Hardcode Role Names

```tsx
// ❌ Bad: Hardcoded strings everywhere
if (roles.includes('Admin')) { /* ... */ }
if (roles.includes('Admin')) { /* ... */ }
if (roles.includes('Admin')) { /* ... */ }
```

```tsx
// ✅ Good: Centralized constants
// src/constants/roles.ts
export const ROLES = {
  ADMIN: 'Admin',
  USER: 'User',
  MODERATOR: 'Moderator',
  READER: 'Reader',
} as const;

// Usage
if (roles.includes(ROLES.ADMIN)) { /* ... */ }
```

### ❌ Don't Forget Fallback UI

```tsx
// ❌ Bad: No feedback when unauthorized
{hasRole('Admin') && <AdminPanel />}
```

```tsx
// ✅ Good: Clear feedback
{hasRole('Admin') ? (
  <AdminPanel />
) : (
  <div className="access-denied">
    <p>You need Admin role to access this feature.</p>
    <Link to="/dashboard">Back to Dashboard</Link>
  </div>
)}
```

---

## Best Practices

### ✅ Do

- Use helper functions/hooks for role checks
- Validate roles server-side (always)
- Provide clear feedback for unauthorized access
- Use constants for role names
- Check roles at appropriate granularity (route vs render)
- Log authorization failures for monitoring
- Test with different role combinations

### ❌ Don't

- Trust client-side checks for security
- Hardcode role names throughout codebase
- Forget fallback UI for unauthorized users
- Check roles on every render (use memoization)
- Expose sensitive data to client (filter server-side)
- Mix authorization logic with business logic

---

**← Back to:** [Calling APIs](./05-calling-apis.md)  
**Next:** [Session & Storage](./07-session-and-storage.md) →

