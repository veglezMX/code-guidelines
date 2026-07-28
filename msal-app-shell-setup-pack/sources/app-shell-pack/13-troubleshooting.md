# Troubleshooting

## `interaction_in_progress`

Cause:

- Multiple components initiated login or interactive token acquisition.
- An HTTP interceptor automatically started redirects.
- Several tabs each attempted logout redirection.

Resolution:

- Keep interactive login/logout owned by the shell.
- Use one explicit continuation action.
- Let only the initiating tab call `logoutRedirect()`.
- Keep generic HTTP code silent-only.

## Redirect returns to the shell but login never completes

Check:

1. `/auth-redirect.html` is an Entra SPA redirect URI.
2. The exact deployed path matches the configured path.
3. The page calls `broadcastResponseToMainFrame()`.
4. Vite built the bridge script.
5. Nginx did not rewrite the bridge to `index.html`.
6. The bridge has no COOP header.
7. CSP permits its own emitted script asset.

## Other tabs do not update after login/logout

Check:

```ts
cache: {
  cacheLocation: BrowserCacheLocation.LocalStorage,
}
```

Then check:

- All tabs use the same scheme, host, and port.
- All tabs use the same SPA client ID and authority.
- Event callbacks are registered once.
- `logoutRedirect` includes `account`.
- No code calls obsolete `enableAccountStorageEvents()`.
- BroadcastChannel names match.
- The tabs are in the same storage partition.

## Logout causes every tab to redirect

Cause:

Every tab reacts to BroadcastChannel by calling `logoutRedirect()`.

Correct behavior:

- Initiating tab broadcasts `logout-started`.
- Initiating tab calls `logoutRedirect({ account })`.
- Other tabs clear UI state and wait for MSAL account removal.

## User signs out but another protected route logs them in again

Likely cause:

A follower tab navigated to a route that automatically initiated login before the identity-provider logout completed.

Resolution:

- Store `logging-out` in the external authentication store.
- Render a non-protected logout-progress page.
- Do not mount authentication guards while logout is in progress.
- Transition to `/signed-out` after MSAL reports logout completion.

## Child receives `401`

Check:

- A Child0 token, not a Portal token, was acquired.
- `aud` matches Child0 API.
- Child0 delegated scope was consented.
- Reverse proxy preserves the Authorization header.
- Child0 API authority and tenant configuration are correct.

## Child receives `403`

The token may be valid but insufficient.

Check:

- Required scope.
- App role.
- Domain assignment.
- Resource policy.
- User’s Child0 profile.

Do not automatically reauthenticate on `403`.

## Cached user survives browser restart unexpectedly

Current MSAL localStorage behavior depends on the browser session and Keep Me Signed In behavior. The cache encryption key lifecycle affects whether existing entries remain decryptable.

Do not build application logic around manually inspecting stored artifacts. On startup, ask MSAL for accounts and handle silent failure by returning to controlled interactive authentication.

## Safari loses cached authentication

Safari may evict script-writable storage after periods without direct site interaction. Treat cache loss as normal:

1. Restore accounts through MSAL.
2. Attempt silent acquisition.
3. Present interactive continuation if required.

## Nginx security headers disappear in a nested location

Nginx `add_header` inheritance is not additive under common/default behavior. A child location that defines one header may stop inheriting parent headers.

Inspect every relevant response with `curl -I`. Repeat the full header set in an include or use explicit inheritance controls supported by your Nginx version.
