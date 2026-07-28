# MSAL App-Shell Setup Pack

## Scope

This pack describes a production-oriented authentication and authorization setup for a React app shell that mounts independently deployed child SPAs under one origin.

The examples assume:

- React and TypeScript.
- A pnpm workspace.
- `app-shell` owns interactive Microsoft Entra authentication.
- Child applications do not import MSAL.
- The shell obtains one access token per protected API resource.
- A Portal API determines whether the user may launch a child application.
- Each child API loads its own domain profile and enforces domain authorization.
- Nginx exposes the shell, child assets, and APIs under a single public origin.
- Cross-tab authentication state and logout coordination are required.

All custom examples prefer functions, hooks, factory functions, and plain objects over custom classes.

## Read in this order

1. [`00-version-baseline.md`](./00-version-baseline.md)
2. [`01-target-architecture.md`](./01-target-architecture.md)
3. [`02-entra-registration.md`](./02-entra-registration.md)
4. [`03-workspace-and-folder-structure.md`](./03-workspace-and-folder-structure.md)
5. [`04-install-and-runtime-config.md`](./04-install-and-runtime-config.md)
6. [`05-msal-v5-redirect-bridge.md`](./05-msal-v5-redirect-bridge.md)
7. [`06-shell-bootstrap-and-providers.md`](./06-shell-bootstrap-and-providers.md)
8. [`07-cross-tab-authentication-and-logout.md`](./07-cross-tab-authentication-and-logout.md)
9. [`08-authorized-http-and-api-scopes.md`](./08-authorized-http-and-api-scopes.md)
10. [`09-route-protection-and-child-lifecycle.md`](./09-route-protection-and-child-lifecycle.md)
11. [`10-portal-and-child-authorization.md`](./10-portal-and-child-authorization.md)
12. [`11-nginx-full-configuration.md`](./11-nginx-full-configuration.md)
13. [`12-testing-and-security-checklist.md`](./12-testing-and-security-checklist.md)
14. [`13-troubleshooting.md`](./13-troubleshooting.md)
15. [`glossary.md`](./glossary.md)
16. [`references.md`](./references.md)

## Non-negotiable boundaries

```text
app-shell
├── owns MSAL
├── owns login and logout
├── owns browser history
├── checks portal-level app access
└── injects restricted runtime services into children

app-child0
├── does not import MSAL
├── receives an authentication snapshot abstraction
├── receives a Child0-restricted HTTP client
├── loads its own domain profile
└── controls Child0 UI authorization only

Portal.Api
└── authoritatively evaluates portal and application entitlements

Child0.Api
└── authoritatively evaluates Child0 domain operations
```

## Security model

A protected React route is a user-experience control. It is not a security boundary. Every backend must validate the access token and independently enforce scopes, roles, tenant restrictions, and resource-level policies.

## Cross-tab model

The cross-tab design uses two layers:

1. MSAL with `cacheLocation: localStorage` for shared authentication cache and built-in cross-tab account events.
2. `BroadcastChannel` for immediate application-specific cleanup, child unmounting, query-cache clearing, and logout-progress UI.

Never send access tokens, ID tokens, account claims, email addresses, or user profiles through BroadcastChannel.
