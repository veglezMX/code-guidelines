# Microsoft Guidance Review

Research date: **July 28, 2026**. Sources listed at the end.

This document compares the architecture in this pack against current Microsoft
guidance for MSAL.js / Microsoft Entra ID, and against the architectures
Microsoft actually publishes for multi-application front ends.

---

## 1. Pack claims verified against Microsoft documentation

| Pack claim | Verdict | Microsoft source |
|---|---|---|
| MSAL Browser v5 requires a dedicated redirect bridge page | **Correct** | v4→v5 migration: COOP support; all flows (`acquireTokenSilent`, `ssoSilent`, `loginPopup`, `loginRedirect`) now route through the bridge |
| Bridge must call `broadcastResponseToMainFrame()` and nothing else | **Correct** | Redirect-bridge how-to; page must not run the router or MSAL APIs |
| Bridge must not receive a COOP header | **Correct** | Explicit warning: COOP on the bridge causes a browsing-context-group swap and severs the channel |
| Vite needs both HTML files as `rollupOptions.input` | **Correct** | Microsoft's Vite section is the same pattern (Microsoft names it `redirect.html`) |
| Redirect URI must match app registration exactly | **Correct** | Otherwise `redirect_uri_mismatch` |
| `LOGIN_SUCCESS` payload is now `AccountInfo` | **Correct** | v5 behavioral breaking changes; reserve `AuthenticationResult` for `ACQUIRE_TOKEN_SUCCESS` |
| `enableAccountStorageEvents()` / `disableAccountStorageEvents()` removed, events always on | **Correct** | v5 removals |
| `temporaryCacheLocation`, `storeAuthStateInCookie`, `secureCookies`, `claimsBasedCachingEnabled`, `cacheMigrationEnabled` removed | **Correct** | v5 `CacheOptions` removals |
| `createStandardPublicClientApplication()` is the v5 factory | **Correct** | `PublicClientNext` and the static `createPublicClientApplication` were removed |
| `localStorage` encryption is not an XSS defense | **Correct, and Microsoft says it more bluntly** | MSAL caching doc: "The purpose of this encryption is to reduce the persistence of auth artifacts, **not** to provide additional security" |
| `localStorage` is required for cross-tab shared auth state | **Correct** | SSO doc: set `cacheLocation: "localStorage"` so tabs share the MSAL cache |
| Logout cannot be guaranteed everywhere at once | **Correct** | Front-channel logout limitation without third-party cookies is documented |

Two pack claims were **not** verifiable in this research and remain open:

- The exact version pins in `00-version-baseline.md` (React `19.2.8`, TypeScript `7.0.2`,
  Vite `8.1.5`, React Router `8.3.0`, `@azure/msal-react@5.5.3`). MSAL Browser v5 and the
  bridge are confirmed; the rest were not checked.
- Nginx `add_header_inherit merge` and the 1.29.3 requirement. Not checked.

---

## 2. Gaps in the pack versus Microsoft guidance

### 2.1 Error handling is broken by a v5 change the pack does not mention

In v5, error messages were moved out of the bundle. `error.message` now returns a
documentation link, not a description:

```javascript
// v5
error.message = "See https://aka.ms/msal.js.errors#request_cannot_be_made for details";
```

`09-route-protection-and-child-lifecycle.md` renders `{error.message}` directly in
`AuthenticationFailure`. In v5 that shows users a URL. Microsoft's guidance: branch on and
display from `errorCode`, which is stable across v4 and v5; log both.

```tsx
const userMessages: Record<string, string> = {
  login_required: "Your session expired. Sign in again.",
  interaction_required: "Additional verification is needed.",
  consent_required: "Administrator approval is required.",
};

function AuthenticationFailure({ error }: { error: unknown }) {
  const code = (error as { errorCode?: string }).errorCode ?? "unknown";
  return (
    <main role="alert">
      <h1>Authentication failed</h1>
      <p>{userMessages[code] ?? "An authentication error occurred."}</p>
    </main>
  );
}
```

Same applies to the pack's `loggerCallback`: v5 console log messages are **hashed** to
reduce bundle size. The pack's `console.warn(message)` will emit hashes such as `7f3a9b2c`.
Use the MSAL `decode-logs.cjs` script, or note this in `13-troubleshooting.md`.

### 2.2 No CAE / claims-challenge handling

Microsoft's Continuous Access Evaluation guidance: a CAE-enabled API returns `401` with a
`WWW-Authenticate` header carrying a claims challenge. The app must extract the claims and
re-request a token with them. Apps declare readiness with client capability `cp1`.

The pack's `createAuthorizedHttpClient` treats every `401` as terminal
(`api-unauthorized`) and never inspects `WWW-Authenticate`. In a tenant with Conditional
Access this produces a hard failure loop instead of a step-up.

```ts
auth: {
  clientId,
  authority,
  redirectUri,
  clientCapabilities: ["cp1"],   // declare CAE readiness
}
```

```ts
if (response.status === 401) {
  const challenge = parseClaimsChallenge(
    response.headers.get("WWW-Authenticate"),
  );

  if (challenge) {
    // Surface to the shell boundary; retry acquireTokenSilent/Redirect
    // with { claims: challenge } — do not silently swallow.
    throw createApplicationError("interaction-required", "Claims challenge", {
      status: 401,
      cause: challenge,
    });
  }

  throw createApplicationError("api-unauthorized", "...", { status: 401 });
}
```

The pack's rule "never interpret 403 as a reason to reauthenticate" stays correct. The gap
is only on `401` + claims challenge.

### 2.3 The 24-hour refresh-token wall is never mentioned

Microsoft: refresh tokens issued to `spa`-type redirect URIs live **24 hours**, not 90 days.
After that the app must obtain a new authorization code via a top-level navigation.
Also, `ssoSilent` / hidden-iframe renewal fails wherever third-party cookies are blocked
(Safari, Brave, Chrome's rollout).

Consequences for this architecture, none of which the pack plans for:

- Every user hits a forced interactive redirect at least daily.
- That redirect happens mid-session, potentially while a child app has unsaved state.
  The shell owns history and the child mount, so **the shell must persist and restore
  in-flight child state** across the redirect, or the child loses work.
- The pack's `ContinueSessionButton` covers the manual case but nothing pre-empts it.

### 2.4 `handleRedirectPromise` and `navigateToLoginRequestUrl` moved

In v5, `navigateToLoginRequestUrl` was removed from `BrowserAuthOptions` and is now an
option on `handleRedirectPromise({ hash, navigateToLoginRequestUrl })`. For an app shell
that owns history and supports deep links into `/child0/orders`, this option controls
whether the user lands back on the deep link after an interactive redirect. The pack
uses `createStandardPublicClientApplication()` (which handles the redirect internally)
and never discusses deep-link restoration. This is the same weak spot flagged earlier in
the routing analysis.

### 2.5 Other v5 changes worth adding to `00-version-baseline.md`

- `getAccountByUsername()` / `getAccountByHomeId()` / `getAccountByLocalId()` removed → `getAccount({ ... })`.
- `logout()` removed → `logoutRedirect()` / `logoutPopup()`.
- Events consolidated: `SSO_SILENT` and `ACQUIRE_TOKEN_BY_CODE` → `ACQUIRE_TOKEN`;
  `ACCOUNT_ADDED` / `ACCOUNT_REMOVED` → `LOGIN_SUCCESS` / `LOGOUT_SUCCESS`;
  `LOGIN_START` / `LOGIN_FAILURE` → `ACQUIRE_TOKEN_START` / `ACQUIRE_TOKEN_FAILURE`.
  Every successful login now emits **both** `LOGIN_SUCCESS` and `ACQUIRE_TOKEN_SUCCESS` —
  the pack's `registerMsalEvents` will fire `refresh()` twice per login. Harmless, but
  worth knowing.
- `asyncPopups` → `navigatePopups`, semantics reversed, default `true`.
- `iframeHashTimeout` / `windowHashTimeout` → `iframeBridgeTimeout` / `popupBridgeTimeout`
  (these now govern the BroadcastChannel wait for the bridge — directly relevant to this
  architecture's failure modes).
- `cacheRetentionDays` (default 5) controls old-cache retention across MSAL upgrades.
- Extra request params consolidated into `extraParameters`.

### 2.6 Cache-location framing

MSAL's default is `sessionStorage`, not `localStorage`. Microsoft frames the three options
as an explicit tradeoff: `localStorage` = best UX, `sessionStorage` = middle,
`memoryStorage` = best security, and recommends `memoryStorage` where XSS risk cannot be
accepted. The pack asserts `localStorage` as a requirement without presenting the
alternative or the compensating-control cost. Note also that MSAL only encrypts
`localStorage` artifacts when the user did **not** select "Keep me signed in" — the
encryption is bypassed exactly for the users most likely to stay logged in.

---

## 3. Does Microsoft propose a different architecture for multiple SPAs?

Microsoft publishes **no** "app shell mounts independently deployed child SPAs" reference
architecture. There is no official micro-frontend guidance in the Azure Architecture
Center. What Microsoft does publish are three patterns that cover the same problem space.

### Option A — Independent SPAs, SSO via the Entra session cookie

Microsoft's documented multi-app model. Each SPA is its own app registration with its own
`clientId` and its own MSAL instance. SSO comes from two independent mechanisms working
together: the Entra session cookie on the login domain, and the per-domain MSAL cache.

- Same app, multiple tabs → `cacheLocation: "localStorage"`.
- Different apps → `ssoSilent()`, ideally with a hint. Microsoft's ranked preference:
  `login_hint` (as an optional ID token claim — "the most reliable account hint"),
  then `sid`, then an `account` object. Without a hint and with multiple accounts you get
  `AADSTS16000`.
- `ssoSilent` uses a hidden iframe → fails wherever third-party cookies are blocked.
  Always implement an interactive fallback.

Distance from this pack: Microsoft assumes N autonomous SPAs, each owning its own auth.
This pack has one broker and N passengers. Microsoft does not describe the pack's model —
but does not prohibit it either.

### Option B — Nested App Authentication (NAA)

This is Microsoft's *actual* "host brokers authentication for child apps" architecture, and
conceptually it is what this pack hand-rolls.

- `createNestablePublicClientApplication()` creates a nestable client; the child app calls
  MSAL normally and the **host** ("hub") brokers the tokens.
- Falls back to `createStandardPublicClientApplication` when no bridge/hub is present.
- Generally available across Microsoft 365: Teams personal tabs, Outlook, Office add-ins,
  Azure Portal as hub.
- No middle-tier server needed; child calls Graph directly with a brokered token.

**The catch:** the hub side is Microsoft's. NAA works when the host is a MetaOS/M365
surface. You cannot declare your own portal a hub. So the honest framing is: *this pack
builds a private NAA without the supported hub protocol.* That is a legitimate thing to
do, but it means no Microsoft support path, and no MSAL-side guarantees.

Related constraint confirming the pack's core decision: MSAL creates a global instance and
**multiple MSAL instances on one page are not supported** (open issue since the
micro-frontend use case was raised; `MsalProvider` used twice desynchronizes state). So
"only the shell owns MSAL" is not a style preference — it is the only workable client-side
design.

### Option C — BFF / token handler (Microsoft's security-preferred answer)

Azure Architecture Center, *Use API Management to Protect Access Tokens in Single-Page
Applications* (updated July 2, 2026). This is the closest thing Microsoft has to an
official position on SPA token security, and it is a direct rejection of browser-stored
tokens.

Flow:

1. SPA navigates to `/auth/login` on API Management.
2. APIM policy generates and caches a random `state`, redirects to the Entra authorize endpoint.
3. Entra redirects the authorization code back to the APIM `/auth/callback`.
4. APIM verifies `state` (CSRF), exchanges the code for a token as a **confidential client**.
5. APIM AES-encrypts the access token into an `HttpOnly; Secure; SameSite=Strict` cookie.
6. All API calls are proxied through APIM, which decrypts the cookie and sets `Authorization`.

Result: **no MSAL.js in the browser at all**, and no tokens in `localStorage`,
`sessionStorage`, or JS memory.

Microsoft's own stated limitations (the article says explicitly it is not production-ready):

- No access-token expiry handling, no refresh tokens, no ID tokens in the sample.
- Stateless design works for **one** downstream API. Multiple APIs exceed cookie size
  limits and require server-side token cache (APIM cache or external Redis).
- `SameSite=Strict` requires APIM and the SPA to share a custom domain; otherwise
  `SameSite=None`, which is weaker.
- No CSRF protection for non-GET methods in the sample — must be added.
- Encryption key and client secret must move to Key Vault and be rotated.

The same BFF direction shows up elsewhere in Microsoft's stack: the Backends for Frontends
pattern in Azure Architecture Center, and the Blazor Web App + Entra ID sample that uses
Aspire and YARP to proxy to a backend API with the token held in the sign-in cookie.

---

## 4. Comparison

| Dimension | This pack (shell brokers MSAL) | A: independent SPAs | B: NAA | C: BFF / APIM |
|---|---|---|---|---|
| Tokens reachable by page JS | Yes (encrypted `localStorage`) | Yes | Yes (brokered, still in page) | **No** |
| XSS steals a usable session | Yes | Yes | Yes | Cookie is `HttpOnly`; attacker can still *call* the proxy from the page |
| Microsoft-supported pattern | Not documented | Documented | Documented, hub must be Microsoft's | Documented reference architecture |
| Cross-tab sync | Built in (`localStorage` + MSAL events) | Built in | Host-managed | Cookie is inherently shared |
| Child app can run standalone | No | Yes | Yes (falls back to standard PCA) | Yes |
| Entra objects per child API | 1 registration + scope + consent | Same | Same | Same, plus one confidential client |
| Extra infra | None | None | None | APIM (+ Redis for multi-API), custom domain |
| 24h SPA refresh-token wall | Applies | Applies | Applies | **Does not** — APIM is a confidential client |
| Interactive redirect interrupts UI | Yes | Yes | Reduced (host brokers) | No |
| Logout | App-coordinated, best effort | Per app | Host-coordinated | Server clears cookie |

Note the row that usually decides it: with a confidential-client BFF, the 24-hour SPA
refresh-token restriction disappears, because that restriction exists specifically to
limit the damage of a refresh token stolen from a browser.

---

## 5. Recommendation

**If the deployment stays client-side, this pack's shape is the right one.** Given that
MSAL does not support multiple instances per page, "only the shell owns MSAL, children get
injected ports" is the only coherent client-side design for composed SPAs, and the pack
executes it more carefully than anything Microsoft publishes for this case. Keep it.

**But the pack's own security section describes the threat it does not defend against**,
and Microsoft's published answer to exactly that threat is Option C. Same-origin child apps
plus browser-held tokens means any child's dependency chain can take over the portal
identity. If the APIs are sensitive B2E APIs, move to the BFF/token-handler model.

**Hybrid worth considering** — it preserves most of this pack:

- Keep the shell, the child lifecycle, the manifest loader, the runtime ports, the
  portal-entitlement layer, the nginx routing.
- Delete MSAL from the browser. Replace `createAuthorizedHttpClient`'s token acquisition
  with plain `credentials: "same-origin"` fetches through the gateway.
- The `AuthorizedHttpPort` abstraction the pack already defines is the correct seam for
  this swap — children never notice the change, which is a genuine payoff of the port design.
- The shell's auth store then reads a `/api/portal/v1/me/session` endpoint instead of MSAL.
- Cross-tab logout becomes a server-side cookie clear plus the existing BroadcastChannel
  cleanup, which is strictly simpler than the current MSAL event choreography.
- Cost: APIM or an equivalent gateway, a token cache for multi-API, CSRF protection on
  mutations, and a shared custom domain.

---

## 6. Concrete changes to this pack (in priority order)

1. **Fix v5 error surfacing** — branch on `errorCode`, never render `error.message`
   (`09-route-protection-and-child-lifecycle.md`). Note hashed console logs and the decode
   script in `13-troubleshooting.md`.
2. **Add CAE support** — `clientCapabilities: ["cp1"]` in `04-install-and-runtime-config.md`;
   parse `WWW-Authenticate` claims challenges on `401` in
   `08-authorized-http-and-api-scopes.md`.
3. **Document the 24-hour refresh-token wall** and define how the shell persists/restores
   child state across the forced interactive redirect.
4. **Document `handleRedirectPromise({ navigateToLoginRequestUrl })`** and how deep links
   into `/child0/*` survive an interactive redirect.
5. **Reconcile `01` and `06`** — map `AccountInfo` to the redacted `AuthenticatedUser` before
   handing it to children; restore the `interaction-required` status (this was already
   flagged in the earlier review and is independent of Microsoft guidance).
6. **Reframe the `localStorage` decision** as Microsoft's documented tradeoff
   (`sessionStorage` default, `memoryStorage` for maximum security), and note that
   encryption is skipped when the user selects "Keep me signed in".
7. **Add the remaining v5 deltas** to `00-version-baseline.md` (§2.5 above), especially
   `iframeBridgeTimeout` / `popupBridgeTimeout`, since bridge timeouts are this
   architecture's most likely production failure mode.
8. **Add an architecture-alternatives section** to `README.md` naming Options A/B/C so the
   choice is recorded as a decision rather than an assumption. State plainly that the pack
   is a private NAA-style broker with no Microsoft support path.
9. **Verify the version pins** in `00-version-baseline.md` and the nginx
   `add_header_inherit` requirement. MSAL v5 and the bridge are confirmed; the rest are not.
10. **Add a bridge-hosting warning**: Microsoft states the bridge page and its assets must
    not be hosted on a third-party CDN, because the bridge receives raw authorization codes
    and tokens. The pack's nginx config satisfies this, but the constraint should be stated
    in `05-msal-v5-redirect-bridge.md` so nobody "optimizes" it onto a CDN later.

---

## Sources

- [Migrate from MSAL Browser v4 to v5](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration)
- [Set up the redirect bridge page in MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge)
- [MSAL Browser caching (GitHub)](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/caching.md)
- [Single sign-on (MSAL.js)](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/single-sign-on)
- [Sign in users — MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user)
- [Initialize MSAL Browser (nested app configuration)](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization)
- [Handle errors and exceptions in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/handle-errors-and-exceptions)
- [How to use Continuous Access Evaluation enabled APIs](https://learn.microsoft.com/en-us/entra/identity-platform/app-resilience-continuous-access-evaluation)
- [Claims challenge, claims request, and client capabilities](https://learn.microsoft.com/en-us/entra/identity-platform/claims-challenge)
- [How to handle third-party cookie blocking in browsers](https://learn.microsoft.com/en-us/entra/identity-platform/reference-third-party-cookies-spas)
- [Single-page app sign-in & sign-out code](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-sign-in)
- [Get started with MSAL React](https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started)
- [Performance in MSAL React](https://learn.microsoft.com/en-us/entra/msal/javascript/react/performance)
- [Use API Management to Protect Access Tokens in Single-Page Applications](https://learn.microsoft.com/en-us/azure/architecture/web-apps/guides/security/secure-single-page-application-authorization)
- [Backends for Frontends pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [Secure an ASP.NET Core Blazor Web App with Microsoft Entra ID (BFF with YARP)](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/blazor-web-app-with-entra)
- [SSO authentication for nested apps (Teams)](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/authentication/nested-authentication)
- [Nested App Authentication now GA across Microsoft 365](https://devblogs.microsoft.com/microsoft365dev/nested-app-authentication-now-generally-available-across-microsoft-365/)
- [MSAL.js issue #974 — multiple MSAL instances](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/974)
- [MSAL.js issue #4263 — MsalProvider with single-spa](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4263)
