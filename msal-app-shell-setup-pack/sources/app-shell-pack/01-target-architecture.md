# Target Architecture

## Public URL layout

```text
https://portal.example.com/
https://portal.example.com/child0/*
https://portal.example.com/mfe/child0/*
https://portal.example.com/api/portal/*
https://portal.example.com/api/child0/*
https://portal.example.com/auth-redirect.html
```

Recommended routing:

| Public path | Owner |
|---|---|
| `/` | App shell HTML and shell routes |
| `/child0/*` | App shell HTML; shell mounts Child0 |
| `/mfe/child0/*` | Independently deployed Child0 assets |
| `/api/portal/*` | Portal API |
| `/api/child0/*` | Child0 API |
| `/auth-redirect.html` | Dedicated MSAL v5 bridge |

`/child0/*` must return the shell document if the shell is expected to manage the child lifecycle. Serving a separate Child0 `index.html` at that route would unload the shell.

## Runtime flow

```text
1. User opens /child0/orders.
2. Nginx returns app-shell/index.html.
3. App shell initializes MSAL.
4. Shell restores the active account from MSAL localStorage.
5. If no account exists, shell starts interactive login.
6. Entra returns through /auth-redirect.html.
7. The MSAL v5 bridge sends the response to the main application frame.
8. Shell requests a Portal API token.
9. Shell calls GET /api/portal/v1/me/applications/child0.
10. Portal API validates the token and app entitlement.
11. Shell loads /mfe/child0/manifest.json and its entry asset.
12. Shell mounts Child0 with restricted runtime ports.
13. Child0 uses the injected Child0 HTTP client.
14. Child0 calls GET /api/child0/v1/me.
15. Child0 API returns domain profile and UI permissions.
16. Every protected mutation is authorized again by Child0 API.
```

## Authentication versus authorization

| Question | Owner |
|---|---|
| Is an account signed in? | MSAL in app shell |
| Which account is active? | App shell policy |
| May the user launch Child0? | Portal API |
| Which Child0 UI actions should be visible? | Child0 profile response |
| May the user approve this specific order? | Child0 API resource policy |

## Shared authentication context

Independent React roots do not automatically share React Context. Share a framework-independent external store instead.

```ts
export type AuthenticationStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "interaction-required"
  | "logging-out"
  | "error";

export type AuthenticatedUser = Readonly<{
  homeAccountId: string;
  tenantId: string;
  subjectId: string;
  displayName: string;
}>;

export type AuthenticationSnapshot = Readonly<{
  status: AuthenticationStatus;
  user: AuthenticatedUser | null;
}>;

export type AuthenticationPort = Readonly<{
  getSnapshot(): AuthenticationSnapshot;
  subscribe(
    listener: (snapshot: AuthenticationSnapshot) => void,
  ): () => void;
  ensureAuthenticated(): Promise<void>;
  logoutEverywhere(): Promise<void>;
}>;
```

The shell creates one implementation. Each React root wraps that same object in a local provider.

## Token boundary

Do not inject a generic `getToken(scopes)` function into children. Inject an HTTP client that is restricted to one resource definition.

```ts
export type ApiResourceDefinition = Readonly<{
  baseUrl: URL;
  scopes: readonly string[];
}>;

export type AuthorizedHttpPort = Readonly<{
  request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T>;
}>;
```

This reduces accidental token use against the wrong audience.
