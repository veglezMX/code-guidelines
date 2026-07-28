# Approach Comparison: App-Shell Pack vs Independent Approach

Written 2026-07-28. Compares the two source documents against each other and against
the Microsoft guidance recorded in `01-microsoft-guidance-review.md`.

Sources compared:

- `../sources/app-shell-pack/` — 18-file pack, "app shell" runtime composition.
- `../sources/independent/independent-approach.md` — 2093-line plan, authored with
  zero knowledge of the pack.

This file records **findings**, not decisions. Decisions live in
`../memory/decisions/`.

---

## 1. Verdict

Two genuinely different topologies, not two flavours of one.

| | App-shell pack | Independent approach |
|---|---|---|
| Composition | Runtime | Navigational |
| Documents in the browser | One | Three |
| MSAL instances | One, in the shell | One per document, three total |
| Child delivery | `import()`ed module mounted into shell DOM | Its own SPA, own `index.html` |
| `/child0/*` serves | The **shell** HTML | **Child0's own** HTML |
| State sharing | In-memory injected ports | Shared same-origin MSAL `localStorage` |
| App switch | In-page, no reload | Full page navigation |

The independent approach's §23 non-goals name **"runtime-composed microfrontends"** and
**"token sharing through a shell JavaScript object"** explicitly. It rejects the pack's
core mechanism by design, not by oversight — despite never having seen it.

---

## 2. What the app-shell pack does

Single origin, single document. Nginx serves the shell HTML for `/` **and** `/child0/*`;
`/mfe/child0/*` serves independently deployed child assets. The pack states outright:
"`/child0/*` must return the shell document… Serving a separate Child0 `index.html` at
that route would unload the shell."

- **Shell owns everything auth.** One MSAL instance, login/logout, browser history,
  portal entitlement checks, injection of restricted runtime services. Children never
  import MSAL.
- **Bootstrap order:** `loadRuntimeConfig()` (fetch `/runtime-config.json`,
  `cache: no-store`, hand-written validator) → `createMsalConfiguration()` →
  `createMsalInstance()` (v5 `createStandardPublicClientApplication`, then
  `selectInitialAccount`, which sets an active account only when exactly one exists) →
  `createAuthenticationStore(instance)` → `registerMsalEvents` → `store.refresh()` →
  render `<MsalProvider><AuthenticationStoreProvider><App/>`.
- **Cross-root state:** a framework-independent external store consumed via
  `useSyncExternalStore`, so each independent React root shares one snapshot.
- **Token boundary:** children receive a resource-pinned HTTP client, never
  `getToken(scopes)`. The client rejects cross-origin targets and paths that escape the
  configured resource base, attaches `Authorization: Bearer` plus `X-Correlation-ID`,
  and maps 401 → `api-unauthorized`, 403 → `api-forbidden`.
- **Child lifecycle:** `ChildRuntimeContext` → `MicroFrontendModule.mount(container, ctx)`
  → `UnmountChild`. `ChildApplicationHost` loads a manifest + module, mounts into a
  ref'd `<div>`, unmounts on dispose.
- **Cross-tab:** `localStorage` + always-on MSAL v5 account events + `BroadcastChannel`
  (`company.portal.auth.v1`) carrying only `logout-started` /
  `application-session-invalidated` with `sourceTabId` / `occurredAt` — never tokens or
  claims. Only the initiating tab calls `logoutRedirect`.
- **Authorization layering:** MSAL = authenticated? · shell policy = which account ·
  Portal API `GET /api/portal/v1/me/applications/child0` = may launch · Child0 API
  `GET /api/child0/v1/me` = UI permissions · Child0 API = resource policy. Protected
  routes are declared UX, not security.

## 3. What the independent approach does

A reusable pnpm package `@workspace/auth` shared by three independently built and
deployed SPAs: `apps/portal`, `apps/child0`, `apps/child1`.

- **Topology (§2.1):** same origin, three separate documents. `/`, `/auth/callback`,
  `/auth/continue` → portal SPA; `/child0/*` → child0 SPA; `/child1/*` → child1 SPA,
  each with its own history fallback to its own `index.html`.
- **Sharing mechanism:** each document creates its own `PublicClientApplication`. They
  share authentication state through compatible MSAL browser storage because they use
  the same origin, client ID, authority, and cache configuration. One shared Entra SPA
  registration; separate API registrations per child.
- **Invariants (§2.3):** exactly one MSAL client per loaded document; no exported global
  singleton; children never call `loginRedirect` / `loginPopup` /
  `acquireTokenRedirect` / `acquireTokenPopup`; all interaction routes through the
  portal; separate tokens per child API; tokens never in URLs, cookies, custom storage,
  `BroadcastChannel`, or app state; backend authoritative; return URLs internal only;
  no URL-supplied scopes.
- **Package is framework-free:** may depend on `@azure/msal-browser`; must not depend on
  React, `@azure/msal-react`, axios, or zustand. No hooks, no context, no
  `MsalProvider`, no child profile types, no permission evaluation. Root-only exports
  enforced by the `exports` field. Must not read `import.meta.env` — each app injects
  config.
- **Typed unions instead of thrown control flow:**

  ```ts
  export type AccountResolution =
    | { readonly status: "authenticated"; readonly account: AccountInfo }
    | { readonly status: "unauthenticated" }
    | { readonly status: "selection-required"; readonly accounts: readonly AccountInfo[] };

  export type TokenAcquisitionResult =
    | { status: "success"; accessToken: string; expiresOn: Date | null;
        account: AccountInfo; scopes: readonly string[] }
    | { status: "interaction-required";
        reason: "login-required" | "consent-required" | "conditional-access"
              | "account-selection-required" | "unknown-interaction" }
    | { status: "unauthenticated" };
  ```

- **Account resolution:** active → all → 0 = unauthenticated → 1 = set active → many =
  match stored `homeAccountId`, else `selection-required` (routed to the portal).
  Persists only `{homeAccountId, tenantId?}` under
  `workspace.auth.selected-home-account-id`. Never tokens, claims, name, email, roles.
- **Scopes:** `getResourceScopes`, `assertSingleResourceScopes`. Rejects a mixed
  `["api://child0-api/…", "api://child1-api/…"]` array. Named scope sets (`default`,
  `profile`) instead of one `allScopes`. `/auth/continue?resource=child0-api` allowed;
  `?scope=api://anything/admin` rejected.
- **Interaction recovery:** `normalizeInternalReturnPath`, `createPortalLoginUrl`,
  `createPortalContinuationUrl`, `parsePortalContinuation`, `processPortalRedirect`,
  plus `beginPortalLogin/TokenConsent/Logout` guarded by
  `config.applicationId === "portal"`. Open-redirect defence rejects `https://attacker…`,
  `//attacker`, `/\attacker`, `javascript:`, `data:`, and encoded variants; falls back to
  `/`. Continuation persisted in `sessionStorage` (`workspace.auth.continuation`) as
  `{nonce, action, resource?, returnPath, createdAt}` with a ~10-minute window —
  navigation intent only, no tokens.
- **Child integration (§16):** bootstrap → `createAuthClient` → `resolveAccount` →
  `switch`: `unauthenticated` → portal login, `selection-required` → portal selection,
  `authenticated` → render. Child must **not** call `handleRedirectPromise`. Per-child
  adapter, e.g. `acquireChild0ProfileToken`. Token acquired immediately before each call,
  reference discarded. Interceptor: 401 → one fresh silent attempt plus at most one
  retry; 403 → show denial, never re-auth loop.
- **§18–§22:** unit tests per module, portal/child integration tests, 10 E2E scenarios,
  security section, observability with event names and `errorCode`/`correlationId` and
  no PII, 14 rollout phases, acceptance criteria.
- **§23 non-goals:** no BFF, no server-side token storage, no OBO, no cross-origin auth
  sharing, no runtime-composed microfrontends, no token sharing through a shell
  JavaScript object.

---

## 4. Convergence — what both reached independently

Two authors with no shared context landed on the same invariants:

- Same origin is mandatory.
- One shared Entra SPA client registration.
- Portal / shell monopolises interactive auth; children are silent-only.
- One token per API audience; mixed-resource requests rejected.
- Redirect, not popup.
- Tokens never in URL, cookie, `BroadcastChannel`, or application state.
- No token copies in Zustand / Redux / Context / query cache.
- Backend is the authority; frontend permissions are presentation hints.
- Each child loads its own domain profile from its own API.
- Never silently pick the first of multiple accounts.
- Functions over classes.
- Runtime config injected and validated, not build-time env baked in.
- `localStorage` chosen deliberately.
- Observability without PII.

Convergence this strong is evidence these are the load-bearing constraints, not
stylistic preferences.

---

## 5. Where the independent approach is stronger

1. **Deep links and history are free.** Each SPA owns its router and its own history
   fallback. `/child0/projects/123` survives a refresh. The pack's weakest area
   (`NavigationPort`, shell-owned history, unspecified nested child routing) does not
   exist here.
2. **Return-path security is actually designed.** `normalizeInternalReturnPath` rejects
   protocol-relative, backslash-confusion, encoded-external, `javascript:` and `data:`
   URLs. The continuation record is nonce'd, expiring, in `sessionStorage`, cleared
   before navigation.
3. **Deterministic account selection.** Explicit `selection-required` state, persisted
   `homeAccountId` only, stale-selection detection, never first-account-wins. The pack
   says "show an account-selection UI" and never designs it.
4. **v5-correct error handling, by reasoning rather than luck.** §11 requires stable
   error codes and `InteractionRequiredAuthError`, "without depending exclusively on
   human-readable messages". That is exactly right for MSAL v5, where `error.message`
   is now a docs URL. The pack renders `{error.message}` — broken under v5.
5. **Interaction recovery survives the redirect.** Child hits `interaction-required` →
   `/auth/continue?action=…&resource=child0-api&returnUrl=<child route>` → portal
   interacts → user lands back on the exact child route. This also answers the 24-hour
   SPA refresh-token wall for free: one place handles it, and the user returns where they
   were. The pack's `ContinueSessionButton` preserves no state.
6. **No MSAL instance-count risk.** One instance per document is the clean reading of
   MSAL's single-instance constraint (issues #974, #4263). Structural here, careful
   discipline in the pack.
7. **Leaner package graph.** One `@workspace/auth`, root-only exports, peer dependency,
   catalog pin. The pack has roughly twelve packages, several unspecified.
8. **Observability specified** — event names, fields, explicit deny-list. The pack has a
   `TelemetryPort` type and nothing behind it.

---

## 6. Where the app-shell pack is stronger

1. **Portal entitlement layer.** Pack: `GET /api/portal/v1/me/applications/child0` →
   `canLaunch`, guarded route, `/access-denied`. The independent approach has **no**
   "may this user launch child0" concept — the portal performs a silent token acquisition
   as a *readiness check* only, and an unentitled user simply navigates to `/child0/` and
   collects a 403 from the child API. If per-app entitlement is a requirement, this is a
   functional gap, not a style difference.
2. **Cross-tab / logout coordination.** Pack has `BroadcastChannel` + MSAL event wiring,
   single-initiator logout, cleanup ports. The independent approach lists "two browser
   tabs observe logout state appropriately" as E2E scenario 9 with no mechanism behind
   it. Full page loads partly self-heal, but a tab already sitting on a child route
   learns nothing until it navigates.
3. **Hard token boundary.** Pack injects a resource-pinned HTTP client plus origin and
   path-prefix checks; a child cannot name an audience. The independent approach passes
   `resource: "child0-api"` as an argument, so child0's bundle can call
   `acquireResourceToken({resource: "child1-api"})`. `assertSingleResourceScopes` blocks
   *mixing*, not *choosing*. Enforcement is convention plus adapter plus a test.
   Related: §6.1's example config ships **both** resource catalogs into child0.
4. **Composition UX.** App switch is a full document reload, fresh MSAL init, fresh token
   fetch, shell chrome re-rendered. No shared nav bar, no in-page transitions; portal
   chrome must be duplicated per app or omitted.
5. **Operational specificity.** Pack ships the full nginx config, CSP, cache headers, and
   the COOP `map`. The independent approach says the routing layer "must send
   `/auth/* → portal`" and stops.
6. **Version baseline.** Pack pins exact versions. The independent approach says "confirm
   approved MSAL versions" — which is precisely where §7 below bites it.

---

## 7. MSAL v5 defects in the independent approach

The substantive finding. The plan is written to the pre-v5 model.

### 7.1 `/auth/callback` as a portal SPA route is invalid under v5 — blocking

MSAL Browser v5 routes **all** flows — `loginRedirect`, `loginPopup`, `ssoSilent`, and
`acquireTokenSilent` — through a dedicated redirect bridge. The `redirectUri` must point
at a page that calls `broadcastResponseToMainFrame()` and does nothing else: no router,
no `MsalProvider`, no app bootstrap, no COOP header, `Cache-Control: no-store`.
§15.3 has that route bootstrap MSAL and call `handleRedirectPromise`. That is the v4
shape.

Fix preserves the plan's structure:

```text
/auth-redirect.html   → bridge page only (no COOP, no-store, no router)  ← redirectUri
/auth/callback        → delete, or demote to a plain landing route
/auth/continue        → keep, unchanged
```

All three SPAs point `redirectUri` at the same bridge — cleaner than the plan's version,
one registered URI shared by portal and both children.

### 7.2 Children depend on the bridge too — undocumented

The plan assumes children never touch redirect infrastructure because they are
silent-only. In v5, `acquireTokenSilent`'s iframe path also goes through the bridge. Each
child's MSAL config needs the bridge `redirectUri`, and the bridge must be reachable and
non-COOP from every route. §16.1's "the child must not call `handleRedirectPromise`" is
right for the wrong reason.

### 7.3 `navigateToLoginRequestUrl: false` in `auth` config is invalid in v5

Removed from `BrowserAuthOptions`; it is now an option on `handleRedirectPromise`. §7
mandates it inside the config object. Note the plan does not need it at all — its own
continuation record already owns return navigation, which is the better mechanism.

### 7.4 Bridge timeouts are an unhandled failure mode

`iframeHashTimeout` / `windowHashTimeout` became `iframeBridgeTimeout` /
`popupBridgeTimeout` and now govern the `BroadcastChannel` wait for the bridge. Silent
acquisition failures in children surface here first. §11's error classification does not
cover it.

### 7.5 401 retry is under-specified

§16.5 says "perform one fresh silent token attempt, retry once". A plain
`acquireTokenSilent` returns the same cached token; the retry is a no-op unless it passes
`forceRefresh: true` or a claims challenge.

---

## 8. Positioning against Microsoft guidance

From `01-microsoft-guidance-review.md`: Microsoft publishes **no** app-shell /
micro-frontend reference architecture. It publishes three things.

- **Option A — independent SPAs, same-domain SSO** via the Entra session cookie and
  `ssoSilent` with `login_hint` / `sid`.
- **Option B — Nested App Authentication (NAA)**, Microsoft's real host-brokers-children
  model. GA across M365, but the hub side is Microsoft's; a private portal cannot be a
  hub.
- **Option C — BFF / token handler**, *Use API Management to Protect Access Tokens in
  Single-Page Applications* (updated 2026-07-02). APIM as a confidential client,
  AES-encrypted access token in an `HttpOnly; Secure; SameSite=Strict` cookie, all API
  calls proxied, no MSAL in the browser.

Placement:

- **Pack** = a private Option B without the supported hub protocol. Furthest from
  documented ground.
- **Independent approach** = closest to **Option A**, with one deviation worth crediting:
  it shares one client ID across all three SPAs and relies on the shared same-origin MSAL
  cache rather than per-app registrations plus `ssoSilent`. That is *more* robust than
  Microsoft's Option A — no hidden iframe, no third-party-cookie dependency.
- **Option C** remains the security-preferred alternative for both. Its confidential
  client also removes the 24-hour SPA refresh-token restriction entirely. The independent
  approach lists BFF as an explicit non-goal, which is a recorded decision; the pack never
  names the option at all.

---

## 9. Blind spots shared by both

- **CAE / claims challenge.** Neither declares `clientCapabilities: ["cp1"]` nor parses
  `WWW-Authenticate` on 401. The independent approach gets closer — it has a
  `"conditional-access"` interaction reason — but no plumbing.
- **24-hour SPA refresh-token wall.** Neither plans for it explicitly. The independent
  approach absorbs it more gracefully by accident (§5.5).
- **`localStorage` tradeoff not presented.** Both commit to it without laying out
  Microsoft's `sessionStorage` / `memoryStorage` alternatives. Both correctly note the
  AES-GCM encryption is persistence-reduction, not an XSS defence. Neither mentions that
  the encryption is skipped when the user selects "Keep me signed in".
- **XSS blast radius is identical.** Same origin plus tokens in `localStorage`. Separate
  bundles change nothing: child0's JavaScript can read the shared MSAL cache and mint
  child1 tokens.

---

## 10. Pre-existing defects in the pack (carried from `01-microsoft-guidance-review.md`)

- **Internal contradiction.** `01-target-architecture.md` defines a redacted
  `AuthenticatedUser` (`homeAccountId`, `tenantId`, `subjectId`, `displayName`) and a
  status union including `interaction-required`.
  `06-shell-bootstrap-and-providers.md` instead puts raw `AccountInfo` — which carries
  `idTokenClaims` — into the store and drops `interaction-required`. Children therefore
  receive raw ID-token claims, contradicting the pack's own boundary.
- **Broken error rendering.** `09-route-protection-and-child-lifecycle.md` renders
  `{error.message}`; under v5 that string is
  `"See https://aka.ms/msal.js.errors#… for details"`. Same class of problem for the
  `loggerCallback`, since v5 console messages are hashed.
- **Unverified.** The version pins (React `19.2.8`, TypeScript `7.0.2`, Vite `8.1.5`,
  React Router `8.3.0`, `@azure/msal-react@5.5.3`) and the nginx `add_header_inherit merge`
  / 1.29.3 requirement were **not** verified.

---

## 11. Implication for curation

The two topologies are mutually exclusive — the topology decision must be made first, and
it constrains most other topics.

**Choose the independent topology if:** teams deploy independently, deep links and
browser-native routing matter, each app should run standalone, and full-reload app
switching is acceptable. It is also closer to documented Microsoft ground.

**Choose the pack topology if:** instant in-app transitions, one persistent shell chrome,
portal-level launch entitlement, and coordinated cross-tab logout are requirements.

If the independent topology wins, five things must be ported from the pack:

1. Portal entitlement endpoint plus launch guard before navigating to a child.
2. `BroadcastChannel` logout signal so idle tabs react without a navigation.
3. Per-app config trimming — child0's catalog contains only `child0-api`.
4. The nginx / ingress spec: bridge routing, COOP exception, `no-store` on HTML and
   runtime config, immutable on hashed assets.
5. A pinned version baseline.

And §7.1–§7.3 must be fixed regardless of topology — the independent plan will not
authenticate as written against `@azure/msal-browser@5`.
