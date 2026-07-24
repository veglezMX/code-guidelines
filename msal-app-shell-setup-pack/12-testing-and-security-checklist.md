# Testing and Security Checklist

## Unit tests

### Authentication store

- Initial state is `initializing`.
- One account produces `authenticated`.
- No account produces `unauthenticated`.
- `setLoggingOut()` removes the exposed account.
- Subscribers are removed correctly.

### Account selection

- Existing active account remains active.
- Exactly one cached account becomes active.
- Multiple cached accounts do not trigger arbitrary selection.

### BroadcastChannel

- Reject malformed messages.
- Ignore messages from the same tab ID.
- Remote logout invokes child unmount and cache cleanup.
- No message contains tokens or user profile data.

### Authorized HTTP

- Uses only configured scopes.
- Rejects paths that escape the configured resource base.
- Adds bearer token only at request time.
- Distinguishes `401` and `403`.
- Does not automatically begin interactive login.

## Integration tests

- Shell initializes before profile loading.
- Sign-in restores the active account.
- Portal entitlement is checked before child assets load.
- Child0 receives only the Child0 HTTP client.
- Child0 domain profile loads after mount.
- Logout unmounts Child0 and clears child state.
- A second tab receives logout progress immediately.
- A second tab receives MSAL `LOGOUT_SUCCESS` after cache removal.
- `logoutRedirect` includes the active account.

## End-to-end matrix

| Scenario | Expected result |
|---|---|
| Anonymous user opens `/` | Public or sign-in landing page |
| Anonymous user opens `/child0/orders` | Shell initiates login |
| User can access portal but not Child0 | Access-denied page; Child0 assets are not loaded |
| User can access Child0 | Child mounts and profile loads |
| Child0 profile denies approval | Approval action hidden or disabled |
| Direct approval API call without permission | Child0 API returns `403` |
| Portal token sent to Child0 API | Child0 API rejects wrong audience |
| Child0 token sent to Portal API | Portal API rejects wrong audience |
| Logout in tab A | Tab B immediately enters logout state |
| Logout completes | All tabs have no active MSAL account |
| Multiple accounts cached | Account-selection flow appears |
| Silent token fails with interaction required | One controlled continuation action appears |

## Redirect bridge tests

- `/auth-redirect.html` is present in the build output.
- It loads only the bridge entry.
- It does not load the React application bundle.
- It has `Cache-Control: no-store`.
- It has no COOP response header.
- It is registered exactly in Entra.
- It is not rewritten to `index.html`.

## CSP tests

Start CSP in report-only mode in staging, then enforce it.

Required checks:

- No `unsafe-inline` for scripts.
- No `unsafe-eval`.
- Only approved Microsoft authority origins in `connect-src` and `frame-src`.
- Child scripts are served from the same approved origin.
- `object-src 'none'`.
- `base-uri 'self'`.
- `frame-ancestors 'none'` unless embedding is explicitly required.

## Same-origin micro-frontend risk

The shell and child assets share one browser origin. A compromised child bundle can affect the shell and its MSAL session.

Apply the same controls to every child:

- Protected branches.
- Mandatory review.
- Dependency scanning.
- Lockfile integrity.
- Artifact provenance.
- Immutable image digests.
- CSP compliance.
- No runtime loading from arbitrary URLs.
- Validated child manifests.
- Fast rollback.

## Logging rules

Allowed examples:

```text
auth_login_started
auth_login_succeeded
auth_login_failed
auth_logout_started
auth_logout_succeeded
auth_cross_tab_logout_received
child_mount_started
child_mount_failed
api_authentication_rejected
api_authorization_rejected
```

Never log:

```text
access token
ID token
refresh token
Authorization header
raw token claims
BroadcastChannel payload containing PII
MSAL localStorage entries
```

MSAL events are for application reactions, not telemetry contracts. Emit your own stable telemetry events after handling them.

## Release gate

- Type check passes.
- Unit and integration tests pass.
- End-to-end sign-in and logout pass.
- Header tests pass.
- CSP report contains no unexplained violation.
- Wrong-audience API tests pass.
- Child contract compatibility passes.
- Bundle and dependency review passes.
