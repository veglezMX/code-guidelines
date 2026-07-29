# Interaction Recovery

Status: settled
Decisions: 0021 · inherits 0008, 0009, 0016, 0020
Sources: pack `09` · independent §13, §15.4 · analysis `02` §5.2, §5.5 ·
[MSAL interaction errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors) ·
[OWASP redirect guidance](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)

## Rule

Silent failure never triggers interaction inside a child. It creates one short-lived,
tab-local continuation and performs a full navigation to the portal. The portal validates
the record, resolves silently first, and asks for an explicit user action before starting
an interactive redirect caused by background/API recovery.

## Design

The sole application continuation key is `workspace.auth.continuation` in
`sessionStorage`:

```ts
type ContinuationV1 = Readonly<{
  version: 1;
  nonce: string; // at least 128 random bits, base64url
  action: "sign-in" | "select-account" | "acquire-token";
  resourceId?: "portal-api" | "child0-api" | "child1-api";
  returnPath: string;
  challengeId?: string; // opaque relay handle, never raw claims
  createdAt: number;    // epoch milliseconds
}>;
```

The serialized record is at most 2 KiB and lives for at most ten minutes. Validate exact
keys and types, nonce/handle syntax, clock skew, action/resource combinations, and the
return path on every read. A claims continuation must have `action: "acquire-token"`,
an allowed resource, and a challenge ID. Other records must not carry one.

`returnPath` must:

- be at most 2,048 characters and begin with one `/`, not `//`;
- contain no control characters, backslashes, credentials, scheme, or invalid percent
  encoding;
- decode to a route owned by the portal router or to exact/prefix
  `/child0`, `/child0/`, `/child1`, or `/child1/`;
- never target `/api`, `/auth-redirect.html`, `/portal-runtime.json`, `/healthz`, or an
  absolute/protocol-relative URL;
- contain no token, authorization code, claims value, account identifier, email, or role.

The portal's compiled route manifest is the allowlist for portal-owned paths. Validation
failure, expiry, missing storage, or nonce mismatch falls back to `/` and emits only a
stable error code.

### Flow

1. The child creates/replaces the continuation and calls
   `window.location.replace("/auth/continue")`.
2. Portal bootstrap resolves any redirect result, active account, and continuation before
   rendering.
3. `/auth/continue` attempts the requested operation silently. A claims flow retrieves
   the relay value into memory exactly once.
4. If interaction is still required, render a product page with a Continue button. Only
   that user action invokes `loginRedirect` or `acquireTokenRedirect`.
5. Pass custom MSAL `state` containing only the opaque continuation nonce and compare the
   returned user state after `handleRedirectPromise`.
6. On success, re-resolve the account, validate the record again, remove it from
   `sessionStorage`, then `window.location.replace(validatedReturnPath)`.
7. On cancellation or terminal failure, delete the record and render a stable portal
   recovery page.

`/login` is the direct sign-in entry, `/account/select` is the portal account chooser,
and `/auth/continue` owns interrupted work. A direct sign-in button may start
`loginRedirect`; an API/background failure must first show the continuation page.
Only one interaction may be in progress in a portal document.

A `bridge-unavailable` result bypasses this flow and renders operational recovery
(retry after the bridge is healthy). It is never converted into an interaction.

If `sessionStorage` is unavailable, exact-route recovery is disabled: children show a
normal link to portal `/login`, and successful authentication lands at `/`. Never move
the continuation into a query string or localStorage as a fallback.

## Why not the alternatives

- **Child-owned redirect** — rejected in `0021`; it duplicates interaction and callback
  behavior across independently deployed apps.
- **Automatic redirect after any API failure** — rejected in `0021`; it surprises users
  and can loop.
- **Return URL/action in the query string** — rejected in `0021`; URLs are logged and are
  a redirect-validation surface.
- **Rely solely on `navigateToLoginRequestUrl`** — rejected by `0008`; it cannot carry
  the recovery action/resource.
- **Treat bridge timeout as sign-in recovery** — rejected by `0009`.

## Open

1. Product content and accessibility design for continue, cancelled, expired, and
   bridge-unavailable pages.
2. The implementation route manifest must enumerate portal routes before the validator
   can be runtime-proven.
