# Microsoft Entra Registration

Use one browser SPA registration and one registration per protected API resource.

## Registration 1: portal browser SPA

Example name:

```text
company-portal-spa
```

Configure:

- Supported account type: organization-specific unless multitenancy is explicitly required.
- Platform: Single-page application.
- Redirect URI:

```text
http://localhost:5173/auth-redirect.html
https://portal.example.com/auth-redirect.html
```

- Front-channel logout URL is optional and should be treated separately from your application-level cross-tab coordination.
- Do not create a browser client secret.

Record:

```text
TENANT_ID
PORTAL_SPA_CLIENT_ID
```

## Registration 2: Portal API

Example name:

```text
company-portal-api
```

Expose a delegated scope:

```text
api://<PORTAL_API_APPLICATION_ID>/portal.access
```

The Portal API evaluates:

- Portal membership.
- Allowed child applications.
- Tenant restrictions.
- Global portal permissions.

## Registration 3: Child0 API

Example name:

```text
company-child0-api
```

Expose a delegated scope:

```text
api://<CHILD0_API_APPLICATION_ID>/child0.access
```

The Child0 API evaluates:

- Child0 domain membership.
- Child0 profile.
- Child0 permissions.
- Resource-level operation rules.

## Grant delegated permissions to the SPA

On `company-portal-spa`, grant:

```text
portal.access
child0.access
```

Only request a resource scope when calling that resource.

```ts
export const resources = {
  portalApi: {
    baseUrl: new URL("/api/portal/v1/", window.location.origin),
    scopes: [
      "api://PORTAL_API_APPLICATION_ID/portal.access",
    ],
  },
  child0Api: {
    baseUrl: new URL("/api/child0/v1/", window.location.origin),
    scopes: [
      "api://CHILD0_API_APPLICATION_ID/child0.access",
    ],
  },
} as const;
```

Do not request both resource scopes in one token request. Access tokens are resource-specific.

## App roles

Define app roles on the API registration whose token must contain those roles.

Examples:

```text
Portal.User
Portal.Administrator
Child0.Reader
Child0.Approver
Child0.Administrator
```

Prefer stable application roles and backend policies over embedding directory group object IDs throughout frontend code.

## API validation checklist

Every API independently validates:

- Signature.
- Issuer.
- Audience.
- Expiration and not-before.
- Tenant.
- Delegated scope.
- App role where required.
- Domain and resource policy.

The shell’s route guard does not replace these checks.
