# Topology

Status: settled
Decisions: 0002, 0003, 0004, 0006, 0030 · refined by 0007, 0011, 0031
Sources: pack `01`, `03`, `11` · independent §2, §23 · analysis `02` §1–§6, §11 ·
analysis `01` §3

## Rule

The system is **three independently built and deployed single-page applications on one
origin**, composed by navigation, not at runtime.

1. `apps/portal`, `apps/child0`, `apps/child1` are separate documents. Each ships its own
   `index.html`, its own bundle, and its own router.
2. `/child0/*` serves **child0's own `index.html`**. It must not serve portal HTML.
   Switching applications is a full document navigation.
3. Each loaded document creates **exactly one** `PublicClientApplication`. There is no
   exported global singleton and no shell-owned instance shared across applications.
   Three documents loaded across tabs means three instances, one per document.
4. Authentication state is shared through the **same-origin MSAL browser cache only**.
   Therefore all three applications must use the **same origin, the same Entra client ID,
   the same authority, and the same `cache` configuration**. Divergence in any of those
   four breaks sharing silently. This is an invariant, not a preference.
5. Tokens are never passed between applications through a JavaScript object, a
   `postMessage`, a `BroadcastChannel`, a URL, a cookie, or application state. An
   application that needs a token acquires it from its own MSAL instance.
6. Only the portal performs interactive authentication. Children are silent-only: no
   `loginRedirect`, `loginPopup`, `acquireTokenRedirect`, `acquireTokenPopup`, and no
   application-owned `handleRedirectPromise`. `MsalProvider`'s internal idempotent call is
   accepted and returns `null`; see `0011`.
7. Runtime configuration is fetched from a single origin-relative endpoint,
   `/portal-runtime.json`, whose top level is keyed by application id. **Each application
   reads only its own key.** No build-time environment baking; the shared auth package
   must not read `import.meta.env`.
8. MSAL stays in the browser. No BFF, no server-side token storage, no token-handler
   proxy — see decision `0003` for what that costs.
9. The portal owns **application discovery**, while each child SPA/backend pair owns its
   authorization decision. The portal also owns a payload-free **cross-tab logout
   signal**. Shared frontend source and identity configuration do not merge backend
   ownership.

## Design

### Document and route map

| Route | Serves | History fallback |
|---|---|---|
| `/` | portal `index.html` | portal |
| `/auth-redirect.html` | **dedicated redirect bridge document** — no router, no `MsalProvider` | none; exact path |
| `/auth/continue` | portal `index.html` | portal |
| `/child0/*` | child0 `index.html` | child0 |
| `/child1/*` | child1 `index.html` | child1 |
| `/portal-runtime.json` | runtime config, `Cache-Control: no-store` | none |

`/auth-redirect.html` is deliberately **not** a portal SPA route. Under
`@azure/msal-browser@5` the redirect response is delivered to a bare bridge page that
calls `broadcastResponseToMainFrame()`; it must not boot a router or an `MsalProvider`,
and it needs its own COOP handling. The independent source routes `/auth/callback`
through the portal SPA, which does not work under v5. Full treatment belongs to topic
`redirect-bridge` (5); this file only fixes that the bridge is a separate document.

Deep links work by construction: `/child0/projects/123` is child0's own route, resolved
by child0's router after nginx falls back to child0's `index.html`. No shell
`NavigationPort`, no shell-owned history.

For an unauthenticated direct deep link, ingress still serves the child document first.
The child initializes only enough runtime/MSAL state to resolve that no account is cached,
blocks protected rendering, stores the validated deep link in tab-local continuation
storage, and replaces the document with portal `/auth/continue`. The portal performs the
silent-first sign-in flow from `0031` and returns to the exact child route. Ingress never
serves portal HTML at a child path.

### Runtime configuration

One endpoint, top level keyed by application id. Each document reads only its own key and
validates the result before use.

```jsonc
// GET /portal-runtime.json      Cache-Control: no-store
{
  "portal":  { "auth": { /* clientId, authority, redirectUri, cache */ },
               "apiBaseUrl": "/api/portal/v1",
               "resources": { "portal-api": { /* scopes */ } } },
  "child0":  { "auth": { /* identical clientId, authority, cache */ },
               "apiBaseUrl": "/api/child0/v1",
               "resources": { "child0-api": { /* scopes */ } } },
  "child1":  { "auth": { /* identical clientId, authority, cache */ },
               "apiBaseUrl": "/api/child1/v1",
               "resources": { "child1-api": { /* scopes */ } } }
}
```

Rules:

- The `auth` block must be identical across all three keys for `clientId`, `authority`,
  and `cache`. Serve it from one source of truth; a per-key copy that drifts breaks
  invariant 4 with no error message.
- An application reads `config[myApplicationId]` and nothing else. Reading another
  application's key is a defect, catchable in review and in unit tests.
- The document contains **no secrets**. It is publicly readable by anything running on
  the origin, and by anyone who opens the network tab. Client IDs, authorities, and scope
  URIs are not secrets; nothing else goes in.
- Fetched with `cache: "no-store"` and validated by a hand-written validator before the
  MSAL configuration is built. Config load failure is a hard startup failure, not a
  silent default.

### Entra registration shape

One shared SPA client registration, used by all three documents (required by invariant
4). Separate API registrations per backend: `portal-api`, `child0-api`, `child1-api`.
Detail belongs to topic `entra-registration` (3).

### Application discovery and child authorization

The portal uses `GET /api/portal/v1/me/applications` to build navigation, then performs a
full-document navigation to the selected child. It does not own child-specific
`applications/{id}` authorization endpoints. Child0 and child1 independently call
`GET /api/child0/v1/me` and `GET /api/child1/v1/me` during bootstrap and render their own
denial experience on `403`. A portal list entry and successful token acquisition are UX
or readiness signals, not entitlement proof. Each child backend remains authoritative.
Detail belongs to topic `authorization-layers` (12).

### Cross-tab logout

`BroadcastChannel` on a single named channel, carrying only an event name
(`logout-started`, `application-session-invalidated`) plus `sourceTabId` and `occurredAt`.
Never tokens, claims, names, emails, or roles. Only the initiating tab calls
`logoutRedirect`. Needed because a tab sitting idle on a child route otherwise learns
nothing about a logout until the user navigates. Detail belongs to topic
`cross-tab-and-logout` (10).

## Why not the alternatives

- **App-shell runtime composition** (one document, shell-owned MSAL, children `import()`ed
  and mounted into shell DOM, `/child0/*` serving shell HTML) — rejected in `0002`.
- **BFF / APIM token handler** (Microsoft's security-preferred Option C, no MSAL in the
  browser) — rejected in `0003`.
- **Per-app runtime config endpoints, or an edge that filters config by requester** —
  rejected in `0004`.
- **Portal-owned per-child entitlement endpoints** — rejected in `0030`; they couple
  independently deployed child authorization to the portal backend.
- **Treat the portal application list as entitlement proof** — rejected in `0030`; each
  child backend must make its own decision for direct and portal-originated navigation.
- **Relying on full page loads to self-heal logout state** — rejected in `0006`.

## Open

1. **The token boundary is soft.** Because child0's document runs its own MSAL instance
   against the shared cache with the shared client ID, nothing in the browser stops
   child0's bundle from requesting a `child1-api` token. Config scoping (`0004`) removes
   the *convenience* — child0 never receives child1's catalog — but not the *capability*.
   Enforcement is: backend audience validation (`0030`), resource-pinned adapters
   (`0018`, `0019`), review, and tests. Structural enforcement is not achievable under
   this topology; it was available only under the app-shell pack's injected client and
   under the rejected BFF option.
2. **XSS blast radius accepted.** Same origin plus tokens in `localStorage` means script
   execution in any of the three applications can read the shared MSAL cache and mint
   tokens for every API. Identical under the app-shell topology; only the BFF option
   changes it. `0017` accepts the storage consequence and `0026` makes enforcing CSP and
   same-origin script discipline release requirements.
3. **`/portal-runtime.json` naming.** The endpoint is named for the portal but is consumed
   by all three applications. Kept as the user specified. If a fourth consumer or a second
   environment makes the name misleading, rename it there, not here.
