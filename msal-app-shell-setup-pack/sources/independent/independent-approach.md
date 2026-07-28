# Shared MSAL Authentication Package — Implementation Plan

## 1. Objective

Implement a reusable pnpm workspace package named `@workspace/auth` that defines the shared authentication contract for three independently built React SPAs:

```text
apps/
├── portal/
├── child0/
└── child1/

packages/
└── auth/
```

The architecture must provide:

* One shared Microsoft Entra SPA client registration.
* One consistent MSAL configuration across all SPAs.
* Portal-owned interactive authentication.
* Silent token acquisition inside each child SPA.
* Separate access tokens for each child API.
* Deterministic account selection.
* Safe navigation back to the portal when interaction is required.
* Child-owned profile retrieval and business authorization.
* No manual access-token transfer between applications.

The package must remain framework-independent. It may depend on `@azure/msal-browser`, but it must not depend on React or export React components.

The portal and each child will create their own `PublicClientApplication` for their own page lifetime. They will share authentication state through compatible MSAL browser storage because they use the same origin, client ID, authority, and cache configuration.

MSAL initialization is asynchronous and must complete before other MSAL APIs are used. Redirect-based applications must process the redirect response through `handleRedirectPromise`.

---

# 2. Architecture Model

## 2.1 Runtime topology

```text
https://portal.example.com/
├── /                  → portal SPA
├── /auth/callback     → portal SPA
├── /auth/continue     → portal SPA
├── /child0/*          → child0 SPA
└── /child1/*          → child1 SPA
```

All applications must be served from the same origin:

```text
scheme + hostname + port
```

Example:

```text
https://portal.example.com/
https://portal.example.com/child0/
https://portal.example.com/child1/
```

The following would not share browser storage because they are different origins:

```text
https://portal.example.com/
https://child0.example.com/
```

## 2.2 Responsibility boundaries

| Responsibility                 | Shared auth package |      Portal |           Child SPA | Child API |
| ------------------------------ | ------------------: | ----------: | ------------------: | --------: |
| Construct MSAL configuration   |                 Yes |        Uses |                Uses |        No |
| Create initialized MSAL client |                 Yes |        Uses |                Uses |        No |
| Interactive login              | Provides primitives |        Owns |     Never initiates |        No |
| Interactive consent            | Provides primitives |        Owns |     Never initiates |        No |
| Account selection              |      Provides rules | Coordinates |   Resolves silently |        No |
| Silent token acquisition       |   Provides function | May preload |                Uses |        No |
| Redirect URL validation        |                 Yes |        Uses |                Uses |        No |
| API authorization              |                  No |          No |       UI hints only |  Enforces |
| Child profile retrieval        |                  No |          No |           Initiates |      Owns |
| Logout                         |  Provides primitive |        Owns | Redirects to portal |        No |

## 2.3 Mandatory invariants

The implementation must enforce these rules:

1. There is exactly one MSAL client instance per loaded SPA document.
2. The shared package must not export a global MSAL singleton.
3. Child applications must never call `loginRedirect`, `loginPopup`, `acquireTokenRedirect`, or `acquireTokenPopup`.
4. All interactive authentication must occur through portal-owned routes.
5. Tokens must be requested separately for Child 0 API and Child 1 API.
6. Access tokens must never be passed through URLs, cookies, custom storage keys, `BroadcastChannel`, or application state.
7. Access tokens must not be persisted by application code.
8. The backend must enforce authorization regardless of frontend visibility rules.
9. Return URLs must be restricted to internal, approved application paths.
10. Arbitrary OAuth scopes must never be accepted from URL parameters.

An access token is issued for a specific resource. Requests involving different APIs must be separated so each token has the correct audience.

---

# 3. Assumptions

The agent should implement against the following assumptions unless repository evidence requires an adjustment.

## 3.1 Authentication assumptions

* Microsoft Entra ID is the identity provider.
* All SPAs use the same tenant.
* All SPAs use the same SPA client ID.
* Child 0 and Child 1 have separate backend API registrations.
* Each child backend exposes one or more delegated scopes.
* The portal callback URI is registered in Entra.
* The default interaction method is redirect, not popup.
* The applications use the OAuth 2.0 authorization-code flow with PKCE through MSAL.
* Administrative consent is preferred for internal enterprise deployments.
* Incremental consent through the portal must still be supported.

## 3.2 Application assumptions

* React and Vite are used by the applications.
* TypeScript strict mode is enabled.
* The repository uses pnpm workspaces.
* Applications are independently built and deployed.
* A common root dependency policy or pnpm catalog controls compatible MSAL versions.
* The repository already has, or will add, Vitest for unit tests.
* Playwright may be used for browser-level integration tests.

## 3.3 Deployment assumptions

The Kubernetes routing layer must send:

```text
/auth/* → portal application
/child0/* → child0 application
/child1/* → child1 application
```

Each SPA must have an appropriate history fallback so nested client routes return that SPA’s `index.html`.

---

# 4. Deliverables

The implementation agent must produce:

```text
packages/auth/
├── src/
│   ├── config.ts
│   ├── client.ts
│   ├── account.ts
│   ├── scopes.ts
│   ├── token.ts
│   ├── redirect.ts
│   └── index.ts
├── test/
│   ├── config.test.ts
│   ├── client.test.ts
│   ├── account.test.ts
│   ├── scopes.test.ts
│   ├── token.test.ts
│   └── redirect.test.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

Small application integrations must also be added:

```text
apps/portal/src/auth/
├── bootstrap-auth.ts
├── login.ts
├── continue-auth.ts
├── logout.ts
└── open-child.ts

apps/child0/src/auth/
├── bootstrap-auth.ts
├── child0-token.ts
└── interaction-recovery.ts

apps/child1/src/auth/
├── bootstrap-auth.ts
├── child1-token.ts
└── interaction-recovery.ts
```

The exact filenames may follow existing repository conventions, but responsibility boundaries must remain equivalent.

---

# 5. Package Design Principles

## 5.1 Framework-independent core

`@workspace/auth` must contain only browser authentication logic.

It must not contain:

* React hooks.
* React context.
* `MsalProvider`.
* Axios instances.
* Child profile types.
* Child-specific React route guards.
* Business permission evaluation.
* Backend authorization logic.

React integration remains in each application.

## 5.2 Functional API

Prefer functions and immutable data over service classes.

Recommended:

```ts
const authClient = await createAuthClient(runtimeConfig);
const accountResult = resolveAccount(authClient);
const tokenResult = await acquireResourceToken(...);
```

Avoid:

```ts
const authService = new AuthenticationService(...);
```

A custom error class may be used only when it improves interoperability with existing error handling. A typed result union is preferred for expected outcomes such as interaction-required.

## 5.3 No deep imports

Consumers must import only from the package root:

```ts
import {
  createAuthClient,
  resolveAccount,
  acquireResourceToken,
} from "@workspace/auth";
```

Consumers must not import:

```ts
import { resolveAccount } from "@workspace/auth/src/account";
```

The package `exports` field must prevent accidental deep imports.

## 5.4 No authentication secrets

The frontend configuration contains public identifiers, not secrets.

The package must never accept or expose:

* Client secrets.
* Certificates.
* Backend credentials.
* Refresh tokens.
* Kubernetes secrets intended for confidential clients.

---

# 6. Runtime Configuration Contract

## 6.1 Define the configuration shape

In `config.ts`, define an application-neutral configuration contract.

Suggested shape:

```ts
export type AuthApplicationId =
  | "portal"
  | "child0"
  | "child1";

export type AuthResourceId =
  | "child0-api"
  | "child1-api";

export interface AuthResourceDefinition {
  readonly id: AuthResourceId;
  readonly audience: string;
  readonly scopes: Readonly<Record<string, readonly string[]>>;
}

export interface AuthRuntimeConfig {
  readonly applicationId: AuthApplicationId;

  readonly tenantId: string;
  readonly clientId: string;
  readonly authority: string;

  readonly portalBaseUrl: string;
  readonly redirectUri: string;
  readonly postLogoutRedirectUri: string;

  readonly cacheLocation: "localStorage";

  readonly resources: Readonly<
    Record<AuthResourceId, AuthResourceDefinition>
  >;
}
```

Example runtime value:

```ts
const authRuntimeConfig: AuthRuntimeConfig = {
  applicationId: "child0",

  tenantId: "<tenant-id>",
  clientId: "<shared-spa-client-id>",
  authority:
    "https://login.microsoftonline.com/<tenant-id>",

  portalBaseUrl: "https://portal.example.com",
  redirectUri:
    "https://portal.example.com/auth/callback",
  postLogoutRedirectUri:
    "https://portal.example.com/",

  cacheLocation: "localStorage",

  resources: {
    "child0-api": {
      id: "child0-api",
      audience:
        "api://<child0-api-application-id>",
      scopes: {
        profile: [
          "api://<child0-api-application-id>/profile.read",
        ],
        default: [
          "api://<child0-api-application-id>/access",
        ],
      },
    },

    "child1-api": {
      id: "child1-api",
      audience:
        "api://<child1-api-application-id>",
      scopes: {
        profile: [
          "api://<child1-api-application-id>/profile.read",
        ],
        default: [
          "api://<child1-api-application-id>/access",
        ],
      },
    },
  },
};
```

## 6.2 Configuration source

The shared package must not access `import.meta.env` directly.

Each application must load or construct its own `AuthRuntimeConfig` and pass it into the package.

This prevents the shared package from becoming coupled to:

* Vite.
* Build-time environment variables.
* A specific deployment system.
* Kubernetes ConfigMap injection.
* A particular runtime-config implementation.

Recommended application boundary:

```ts
const runtimeConfig = loadApplicationRuntimeConfig();

const authClient = await createAuthClient(
  runtimeConfig.auth,
);
```

## 6.3 Runtime configuration validation

Implement:

```ts
export function validateAuthRuntimeConfig(
  value: unknown,
): AuthRuntimeConfig;
```

Validation must fail fast on:

* Missing tenant ID.
* Missing client ID.
* Invalid authority URL.
* Non-HTTPS production URLs.
* Callback route not owned by the portal.
* Unsupported cache location.
* Missing child resource.
* Empty scope arrays.
* A scope that does not belong to the declared resource.
* Portal and redirect origins that differ unexpectedly.
* Unknown application or resource IDs.

Do not silently apply security-sensitive defaults.

Development localhost URLs may use HTTP when explicitly permitted.

## 6.4 Configuration compatibility fingerprint

Implement a non-secret compatibility function:

```ts
export interface AuthCompatibilityFingerprint {
  readonly tenantId: string;
  readonly clientId: string;
  readonly authority: string;
  readonly cacheLocation: "localStorage";
}

export function getAuthCompatibilityFingerprint(
  config: AuthRuntimeConfig,
): AuthCompatibilityFingerprint;
```

Each application can log this fingerprint in sanitized startup diagnostics.

Never include:

* Tokens.
* Account claims.
* User IDs.
* Email addresses.

---

# 7. `config.ts` Implementation

## Purpose

Convert validated runtime configuration into an MSAL `Configuration`.

## Required exports

```ts
export interface AuthRuntimeConfig;
export interface AuthResourceDefinition;
export type AuthApplicationId;
export type AuthResourceId;

export function validateAuthRuntimeConfig(
  value: unknown,
): AuthRuntimeConfig;

export function createMsalConfiguration(
  config: AuthRuntimeConfig,
): Configuration;

export function getAuthCompatibilityFingerprint(
  config: AuthRuntimeConfig,
): AuthCompatibilityFingerprint;
```

## MSAL configuration requirements

The generated configuration must include:

```ts
{
  auth: {
    clientId,
    authority,
    redirectUri,
    postLogoutRedirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage
  }
}
```

The implementation must use MSAL-provided constants instead of manually repeating string literals where possible.

MSAL supports browser cache locations including session, local, and memory storage. This architecture requires compatible same-origin storage across full-page application navigation, so the package should deliberately use `localStorage` rather than inheriting the library default.

## Logging requirements

Configure an MSAL logger callback that:

* Integrates with the application-provided logger.
* Does not log personally identifiable information.
* Supports severity mapping.
* Is disabled or reduced in production.
* Never logs tokens or raw claims.

Allow optional logger injection:

```ts
export interface AuthLogger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
}
```

Do not make a logging implementation mandatory.

---

# 8. `client.ts` Implementation

## Purpose

Create and initialize one MSAL browser client for the currently loaded SPA.

## Required exports

```ts
export interface CreateAuthClientOptions {
  readonly config: AuthRuntimeConfig;
  readonly logger?: AuthLogger;
}

export async function createAuthClient(
  options: CreateAuthClientOptions,
): Promise<IPublicClientApplication>;
```

## Required behavior

`createAuthClient` must:

1. Validate the runtime configuration.
2. Create the MSAL configuration.
3. Instantiate or use the current supported standard SPA `PublicClientApplication` creation API.
4. Await asynchronous initialization.
5. Return the initialized client.
6. Avoid processing redirect results automatically.
7. Avoid creating more than one client internally.
8. Avoid exporting or storing the client in a package-level singleton.

The current MSAL Browser API supports asynchronous initialization and standard SPA client creation. The package should hide the exact MSAL construction method so application code remains stable when MSAL initialization APIs evolve.

## Why redirect processing is separate

Only the portal owns redirect callbacks. Therefore:

* `client.ts` initializes MSAL.
* `redirect.ts` processes portal redirect responses.
* Child applications initialize MSAL but do not process portal callback routes.

This keeps the child authentication contract explicit.

## Optional duplicate-initialization protection

The package may maintain a `WeakMap` keyed by the MSAL client to prevent duplicate initialization operations, but it must not use a global client singleton.

Application bootstrap code should still be structured so initialization occurs once.

---

# 9. `account.ts` Implementation

## Purpose

Resolve the authenticated account deterministically across separately loaded SPAs.

## Required exports

```ts
export type AccountResolution =
  | {
      readonly status: "authenticated";
      readonly account: AccountInfo;
    }
  | {
      readonly status: "unauthenticated";
    }
  | {
      readonly status: "selection-required";
      readonly accounts: readonly AccountInfo[];
    };

export function resolveAccount(
  client: IPublicClientApplication,
): AccountResolution;

export function setSelectedAccount(
  client: IPublicClientApplication,
  account: AccountInfo,
): void;

export function clearSelectedAccount(
  client: IPublicClientApplication,
): void;
```

## Account resolution algorithm

Use this order:

```text
1. Read client.getActiveAccount().
2. If it exists, return it.
3. Read client.getAllAccounts().
4. If there are no accounts, return unauthenticated.
5. If there is exactly one account:
   - set it as active;
   - return authenticated.
6. If multiple accounts exist:
   - attempt to match a previously selected homeAccountId;
   - if one match exists, set it active and return it;
   - otherwise return selection-required.
```

MSAL provides `getActiveAccount`, `setActiveAccount`, and account enumeration APIs. Silent token acquisition must be associated with an account when multiple accounts may be present.

## Selected account persistence

Use a package-owned, namespaced storage key containing only the selected account identifier:

```text
workspace.auth.selected-home-account-id
```

The stored value may contain:

```ts
{
  homeAccountId: string;
  tenantId?: string;
}
```

Do not persist:

* ID tokens.
* Access tokens.
* Raw claims.
* Display name.
* Email.
* Roles.
* Profile responses.

## Multiple account behavior

Child applications must not choose the first account when multiple accounts exist.

Instead:

```text
selection-required
    ↓
redirect to portal account-selection route
```

The portal owns the account-selection interaction.

---

# 10. `scopes.ts` Implementation

## Purpose

Provide typed, resource-specific scope lookup while preventing mixed-resource token requests.

## Required exports

```ts
export type ScopeSetId =
  | "default"
  | "profile";

export interface ResourceScopeRequest {
  readonly resource: AuthResourceId;
  readonly scopeSet: ScopeSetId;
}

export function getResourceScopes(
  config: AuthRuntimeConfig,
  request: ResourceScopeRequest,
): readonly string[];

export function assertSingleResourceScopes(
  config: AuthRuntimeConfig,
  resource: AuthResourceId,
  scopes: readonly string[],
): void;
```

## Resource isolation

The package must reject this:

```ts
[
  "api://child0-api/profile.read",
  "api://child1-api/profile.read",
]
```

The package must allow:

```ts
[
  "api://child0-api/access",
  "api://child0-api/profile.read",
]
```

A token request must contain scopes for one resource only. Microsoft documents separate resource-token requests rather than treating tokens as general portal credentials.

## No URL-driven scopes

The portal may receive:

```text
/auth/continue?resource=child0-api
```

It must not receive:

```text
/auth/continue?scope=api://anything/admin
```

The portal must resolve the known resource ID through the package-owned resource catalog.

## Scope-set design

Initially provide:

```text
child0-api
├── default
└── profile

child1-api
├── default
└── profile
```

Additional named sets may be added later:

```text
reports
administration
projects
```

Avoid exposing one large `allScopes` array that encourages over-requesting permissions.

---

# 11. `token.ts` Implementation

## Purpose

Acquire a resource-specific access token silently and return a typed result.

## Required result type

```ts
export type TokenAcquisitionResult =
  | {
      readonly status: "success";
      readonly accessToken: string;
      readonly expiresOn: Date | null;
      readonly account: AccountInfo;
      readonly scopes: readonly string[];
    }
  | {
      readonly status: "interaction-required";
      readonly reason:
        | "login-required"
        | "consent-required"
        | "conditional-access"
        | "account-selection-required"
        | "unknown-interaction";
    }
  | {
      readonly status: "unauthenticated";
    };
```

## Required function

```ts
export interface AcquireResourceTokenOptions {
  readonly client: IPublicClientApplication;
  readonly config: AuthRuntimeConfig;
  readonly resource: AuthResourceId;
  readonly scopeSet: ScopeSetId;
  readonly account?: AccountInfo;
}

export async function acquireResourceToken(
  options: AcquireResourceTokenOptions,
): Promise<TokenAcquisitionResult>;
```

## Algorithm

```text
1. Resolve the account if none was provided.
2. If unauthenticated:
   return { status: "unauthenticated" }.
3. If account selection is required:
   return interaction-required/account-selection-required.
4. Resolve scopes from the resource catalog.
5. Assert that all scopes belong to the same resource.
6. Call acquireTokenSilent().
7. Return only the access token and essential metadata.
8. Convert expected interaction errors into interaction-required.
9. Re-throw or return a distinct fatal result for unexpected failures.
```

The standard MSAL pattern is to attempt `acquireTokenSilent` first. MSAL checks its browser cache and can renew tokens without forcing the application to manage refresh tokens directly.

## Error classification

Classify MSAL interaction conditions without depending exclusively on human-readable messages.

Use:

* MSAL error classes.
* Stable error codes where documented.
* `InteractionRequiredAuthError`.

Unexpected errors must retain:

* Error type.
* Correlation ID when available.
* Sanitized error code.

Never retain:

* Access tokens.
* Raw token responses.
* Claims.
* Authorization codes.

## Token storage rules

The package must not:

* Store the returned access token.
* Put it in local storage.
* Put it in session storage.
* Cache it in a module variable.
* Broadcast it.
* Log it.
* Add it to URLs.

The caller should use the token for the immediate API request and then discard its reference.

## Request deduplication

Optionally deduplicate concurrent silent requests with the same key:

```text
homeAccountId + resource + normalized scopes
```

This avoids multiple simultaneous profile requests causing duplicate token acquisitions.

The in-flight cache must:

* Store promises only.
* Remove entries after resolution or rejection.
* Never become a long-term token cache.
* Never replace MSAL’s cache.

---

# 12. `redirect.ts` Implementation

## Purpose

Implement portal-owned interactive navigation and safe return-route handling.

## Required exports

```ts
export type PortalAuthAction =
  | "login"
  | "acquire-token"
  | "select-account"
  | "logout";

export interface PortalContinuation {
  readonly action: PortalAuthAction;
  readonly resource?: AuthResourceId;
  readonly returnPath: string;
}

export function normalizeInternalReturnPath(
  value: string | null | undefined,
  fallback?: string,
): string;

export function createPortalLoginUrl(
  config: AuthRuntimeConfig,
  returnPath: string,
): string;

export function createPortalContinuationUrl(
  config: AuthRuntimeConfig,
  continuation: PortalContinuation,
): string;

export function parsePortalContinuation(
  config: AuthRuntimeConfig,
  url: URL,
): PortalContinuation;

export async function processPortalRedirect(
  client: IPublicClientApplication,
): Promise<AuthenticationResult | null>;
```

## Return-path rules

Valid:

```text
/
/child0/
/child0/projects/123
/child1/dashboard?tab=active
```

Invalid:

```text
https://attacker.example/
/\attacker.example
//attacker.example
javascript:alert(1)
data:text/html,...
```

The function must:

1. Accept relative root-based paths only.
2. Reject protocol-relative URLs.
3. Reject backslash-based URL confusion.
4. Reject encoded variants that become external after decoding.
5. Optionally restrict paths to known route prefixes.
6. Return `/` when validation fails.

## Continuation storage

Do not rely solely on query parameters surviving a third-party redirect.

Before an interactive redirect, persist a short-lived continuation record in `sessionStorage`:

```ts
interface StoredAuthContinuation {
  readonly nonce: string;
  readonly action: PortalAuthAction;
  readonly resource?: AuthResourceId;
  readonly returnPath: string;
  readonly createdAt: number;
}
```

Use a namespaced key:

```text
workspace.auth.continuation
```

Apply an expiration window, such as ten minutes.

The continuation record contains navigation intent, not tokens.

## Portal redirect processing

`processPortalRedirect` must:

1. Call `handleRedirectPromise` once.
2. Set the response account as active when present.
3. Persist the selected account identifier.
4. Read and validate the stored continuation.
5. Clear the continuation before navigating.
6. Return the authentication result to the portal.
7. Let the portal decide when to navigate.

Redirect-based MSAL flows require the redirect response to be processed by the application.

## Portal interactive functions

The package may expose low-level functions:

```ts
export async function beginPortalLogin(...): Promise<void>;

export async function beginPortalTokenConsent(
  ...
): Promise<void>;

export async function beginPortalLogout(
  ...
): Promise<void>;
```

These functions must verify that:

```ts
config.applicationId === "portal"
```

A child-configured package instance must not be allowed to start an interactive operation.

---

# 13. `index.ts` Implementation

## Purpose

Expose the supported public contract.

## Export policy

Export:

* Public configuration types.
* Public resource and scope types.
* Client factory.
* Account resolution functions.
* Token acquisition functions.
* Redirect URL helpers.
* Portal interaction functions.
* Sanitized error/result types.

Do not export:

* Internal storage-key helpers.
* Internal error parser implementation.
* Raw test mocks.
* Internal URL parsing utilities.
* Internal promise maps.
* Mutable resource maps.
* Package-private logger adapters.

## Example public surface

```ts
export {
  createMsalConfiguration,
  getAuthCompatibilityFingerprint,
  validateAuthRuntimeConfig,
} from "./config";

export {
  createAuthClient,
} from "./client";

export {
  clearSelectedAccount,
  resolveAccount,
  setSelectedAccount,
} from "./account";

export {
  assertSingleResourceScopes,
  getResourceScopes,
} from "./scopes";

export {
  acquireResourceToken,
} from "./token";

export {
  beginPortalLogin,
  beginPortalLogout,
  beginPortalTokenConsent,
  createPortalContinuationUrl,
  createPortalLoginUrl,
  normalizeInternalReturnPath,
  parsePortalContinuation,
  processPortalRedirect,
} from "./redirect";

export type {
  AccountResolution,
  AcquireResourceTokenOptions,
  AuthApplicationId,
  AuthCompatibilityFingerprint,
  AuthResourceDefinition,
  AuthResourceId,
  AuthRuntimeConfig,
  PortalAuthAction,
  PortalContinuation,
  ResourceScopeRequest,
  ScopeSetId,
  TokenAcquisitionResult,
} from "./...";
```

---

# 14. `package.json` Implementation

## Package identity

```json
{
  "name": "@workspace/auth",
  "private": true,
  "type": "module",
  "sideEffects": false
}
```

## Exports

Generate ESM JavaScript and TypeScript declarations.

Conceptual configuration:

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ]
}
```

## Dependencies

The package should depend on or declare a peer dependency for:

```text
@azure/msal-browser
```

It must not depend on:

```text
@azure/msal-react
react
react-dom
axios
zustand
```

The monorepo root must guarantee one compatible MSAL Browser version through the pnpm lockfile, catalog, or override policy.

## Scripts

Provide:

```json
{
  "scripts": {
    "build": "<repository-standard-build-command>",
    "clean": "<remove-dist-command>",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "<repository-standard-lint-command>"
  }
}
```

Use the repository’s existing build tool. When none exists, choose a minimal TypeScript ESM build that emits declaration files.

pnpm workspaces allow multiple repository packages to be managed as one workspace while retaining package boundaries.

---

# 15. Portal Integration Guide

## 15.1 Portal bootstrap

The portal must:

1. Load runtime configuration.
2. Validate the authentication configuration.
3. Create the MSAL client.
4. Process any redirect response.
5. Resolve the active account.
6. Render the React application under `MsalProvider`.

Conceptual flow:

```ts
const runtimeConfig = loadPortalRuntimeConfig();

const msalClient = await createAuthClient({
  config: runtimeConfig.auth,
  logger,
});

const redirectResult =
  await processPortalRedirect(msalClient);

const accountResolution =
  resolveAccount(msalClient);

createRoot(rootElement).render(
  <MsalProvider instance={msalClient}>
    <App
      accountResolution={accountResolution}
      redirectResult={redirectResult}
    />
  </MsalProvider>,
);
```

`MsalProvider` exposes the application’s client through React context to descendants.

## 15.2 Portal login route

Route:

```text
/login?returnUrl=/child0/
```

Behavior:

```text
1. Normalize returnUrl.
2. Resolve current account.
3. If authenticated:
   navigate to returnUrl.
4. Otherwise:
   beginPortalLogin().
5. Store the continuation before redirecting.
```

Login should request identity scopes and only the resource scopes needed for the immediate destination.

Do not automatically request every child API permission unless that is an explicit consent policy.

## 15.3 Portal authentication callback

Route:

```text
/auth/callback
```

Behavior:

```text
1. Bootstrap MSAL.
2. Process redirect result.
3. Select and persist the returned account.
4. Read the continuation.
5. Validate its return path.
6. Navigate with window.location.replace().
```

The callback page should not render application content before processing completes.

## 15.4 Portal continuation route

Route:

```text
/auth/continue
```

Accepted parameters:

```text
action
resource
returnUrl
```

Example:

```text
/auth/continue
  ?action=acquire-token
  &resource=child0-api
  &returnUrl=/child0/projects/123
```

Behavior:

```text
1. Parse and validate the request.
2. Reject unknown resource IDs.
3. Resolve the account.
4. Attempt acquireResourceToken().
5. If successful:
   return to the child.
6. If interaction is required:
   invoke beginPortalTokenConsent().
7. If unauthenticated:
   invoke beginPortalLogin().
```

The portal maps `child0-api` to scopes internally. It never trusts scope strings supplied by the browser URL.

## 15.5 Opening a child application

Portal navigation must use a helper:

```ts
async function openChild(
  resource: AuthResourceId,
  destination: string,
): Promise<void>;
```

Algorithm:

```text
1. Resolve account.
2. If unauthenticated:
   redirect through portal login.
3. Attempt silent token acquisition for the child.
4. If successful:
   navigate to the child.
5. If interaction is required:
   begin portal-owned consent.
```

The portal’s silent acquisition is a readiness check. The child must still request its own token through MSAL immediately before calling its API.

## 15.6 Portal logout

Only the portal initiates logout.

Child logout buttons should navigate to:

```text
/logout
```

Portal logout behavior:

```text
1. Resolve the active account.
2. Clear package-owned selected-account metadata.
3. Call MSAL logoutRedirect for the account.
4. Use the configured post-logout redirect URI.
```

MSAL logout clears local cache data and navigates to the identity provider to terminate the server session. The logout navigation must be allowed to finish.

---

# 16. Child Integration Guide

The same pattern applies independently to Child 0 and Child 1.

## 16.1 Child bootstrap

Each child must:

1. Load its runtime configuration.
2. Create an initialized MSAL client.
3. Resolve the account.
4. Redirect unauthenticated users to the portal.
5. Redirect ambiguous multi-account cases to the portal.
6. Render under its own `MsalProvider`.

Conceptual flow:

```ts
const runtimeConfig = loadChild0RuntimeConfig();

const msalClient = await createAuthClient({
  config: runtimeConfig.auth,
  logger,
});

const accountResolution =
  resolveAccount(msalClient);

switch (accountResolution.status) {
  case "unauthenticated":
    redirectToPortalLogin();
    break;

  case "selection-required":
    redirectToPortalAccountSelection();
    break;

  case "authenticated":
    renderChild(msalClient, accountResolution.account);
    break;
}
```

The child must not call `handleRedirectPromise` for the portal callback because `/auth/callback` is routed to the portal.

## 16.2 Child token provider

Child 0 creates a small application adapter:

```ts
export async function acquireChild0ProfileToken(
  client: IPublicClientApplication,
): Promise<TokenAcquisitionResult> {
  return acquireResourceToken({
    client,
    config: child0RuntimeConfig.auth,
    resource: "child0-api",
    scopeSet: "profile",
  });
}
```

Child 1 does the equivalent with `child1-api`.

## 16.3 Profile request

The child API call must:

1. Request a token immediately before the API call.
2. Add the token as a Bearer header.
3. Call the child’s own `/me` or `/profile` endpoint.
4. Discard the local token reference after the request.
5. Store only the returned application profile.

Example request:

```http
GET /api/child0/me
Authorization: Bearer <child0-api-token>
```

Do not store the access token in:

* React context.
* Zustand.
* Redux.
* Browser storage.
* Query caches.
* Debug tooling.

## 16.4 Interaction-required handling

When the package returns:

```ts
{
  status: "interaction-required"
}
```

the child must navigate to:

```text
/auth/continue
  ?action=acquire-token
  &resource=child0-api
  &returnUrl=<current-child-route>
```

The portal performs the interaction and returns the user to the original child route.

The child must not directly fall back to popup or redirect token acquisition.

## 16.5 API client interceptor

An Axios or fetch wrapper may call the shared package, but the wrapper belongs to the child application.

Recommended behavior:

```text
Before request
├── acquire token silently
├── attach Bearer header
└── execute request

Token interaction required
└── navigate to portal continuation

HTTP 401
├── perform one fresh silent token attempt
├── retry once when appropriate
└── otherwise return to portal authentication

HTTP 403
└── display authorization failure; do not reauthenticate repeatedly
```

Avoid infinite 401 retry loops.

## 16.6 Child profile state

The child may retain:

```ts
interface ChildProfile {
  user: {
    id: string;
    displayName: string;
  };
  roles: readonly string[];
  permissions: readonly string[];
  preferences: Record<string, unknown>;
}
```

The child must treat frontend permissions as presentation hints.

The child backend remains responsible for authorizing every protected operation.

---

# 17. Authentication Sequences

## 17.1 First portal login

```text
User opens /
    ↓
Portal creates MSAL client
    ↓
No account found
    ↓
Portal starts login redirect
    ↓
Microsoft Entra authentication
    ↓
Redirect to /auth/callback
    ↓
Portal processes redirect
    ↓
Portal sets selected account
    ↓
Portal renders authenticated navigation
```

## 17.2 Open Child 0

```text
User selects Child 0
    ↓
Portal requests Child 0 token silently
    ├── success
    │     ↓
    │  navigate to /child0/
    │
    └── interaction required
          ↓
       portal requests consent interactively
          ↓
       return through /auth/callback
          ↓
       navigate to /child0/
```

## 17.3 Child 0 profile retrieval

```text
Child 0 loads
    ↓
Creates its own initialized MSAL client
    ↓
Resolves shared account
    ↓
Requests Child 0 profile token silently
    ↓
Calls Child 0 API /me
    ↓
API validates Child 0 audience and scope
    ↓
API returns Child 0 profile and permissions
```

## 17.4 Child session requires interaction

```text
Child 0 API request begins
    ↓
acquireTokenSilent requires interaction
    ↓
Child navigates to portal /auth/continue
    ↓
Portal completes interactive flow
    ↓
Portal returns user to original Child 0 path
```

## 17.5 Logout

```text
User selects logout in any SPA
    ↓
Navigate to portal /logout
    ↓
Portal clears selected-account metadata
    ↓
Portal calls logoutRedirect
    ↓
Entra session termination
    ↓
Return to portal public route
```

---

# 18. Testing Plan

## 18.1 Unit tests: `config.ts`

Test:

* Valid production configuration.
* Valid localhost development configuration.
* Missing tenant ID.
* Missing client ID.
* Invalid authority.
* Mismatched origins.
* Unsupported cache location.
* Unknown application ID.
* Unknown resource ID.
* Empty scope catalog.
* Scope outside the declared audience.
* Sanitized compatibility fingerprint.

## 18.2 Unit tests: `account.ts`

Test:

* Active account is returned.
* No cached accounts returns unauthenticated.
* One cached account becomes active.
* Multiple accounts with a selected identifier resolve correctly.
* Multiple accounts without a selected identifier require selection.
* Stale selected identifier requires selection.
* Clearing selection removes only package-owned metadata.

## 18.3 Unit tests: `scopes.ts`

Test:

* Child 0 profile scopes resolve.
* Child 1 profile scopes resolve.
* Unknown scope set fails.
* Unknown resource fails.
* Mixed Child 0 and Child 1 scopes fail.
* Empty scopes fail.
* Scope ordering is deterministic.
* Returned arrays cannot mutate the source catalog.

## 18.4 Unit tests: `token.ts`

Mock `IPublicClientApplication`.

Test:

* Cached token success.
* Renewed silent token success.
* Missing account.
* Multiple-account selection required.
* Interaction-required error classification.
* Consent-required classification.
* Conditional Access interaction classification.
* Unexpected network error propagation.
* No token logging.
* Concurrent request deduplication.
* In-flight cache cleanup after failure.

## 18.5 Unit tests: `redirect.ts`

Test:

* Root-relative return path.
* Nested child route.
* Query string retention.
* Hash retention when supported.
* External HTTPS URL rejection.
* Protocol-relative URL rejection.
* Backslash attack rejection.
* Encoded external URL rejection.
* Expired continuation rejection.
* Unknown action rejection.
* Unknown resource rejection.
* Child application blocked from interactive functions.
* Continuation cleared before final navigation.

## 18.6 Portal integration tests

Test:

* Unauthenticated portal redirects to login.
* Callback sets the active account.
* Authenticated user opens Child 0.
* Child 0 consent interaction returns to Child 0.
* Invalid return URL falls back to `/`.
* Multiple accounts route to portal selection.
* Logout completes through the portal.

## 18.7 Child integration tests

For each child:

* Existing account bootstraps without interactive login.
* Missing account redirects to portal login.
* Multiple accounts redirect to portal selection.
* Silent token success calls `/me`.
* Interaction-required redirects to `/auth/continue`.
* 403 displays authorization denial.
* 401 retry occurs at most once.
* The wrong API token is never attached.
* Child 0 cannot request Child 1 scopes through its adapter.

## 18.8 End-to-end tests

Use a test tenant or controlled identity environment.

Minimum browser scenarios:

```text
1. Login at portal → open Child 0 → profile loaded.
2. Login at portal → open Child 1 → profile loaded.
3. Navigate Child 0 → portal → Child 1 without credential prompt.
4. Refresh a nested Child 0 route.
5. Open child route directly while authenticated.
6. Open child route directly while unauthenticated.
7. Token interaction required → portal → child return.
8. Logout from child → all application routes require login.
9. Two browser tabs observe logout state appropriately.
10. Multiple account state requires explicit portal selection.
```

MSAL and Entra browser sessions contribute independently to SSO behavior, so tests should cover both cached-state navigation and identity-provider-session recovery.

---

# 19. Security Requirements

## 19.1 Browser security

Apply:

* Strict Content Security Policy.
* No unsafe inline scripts where avoidable.
* Dependency auditing.
* Trusted Types where practical.
* No token logging.
* No custom token persistence.
* Secure production HTTPS.
* Sanitized telemetry.
* Controlled redirect destinations.

## 19.2 Authorization

The child backend must validate:

* Token signature.
* Issuer.
* Tenant.
* Audience.
* Expiration.
* Required delegated scope.
* Required application role when applicable.

The child backend must derive user identity from validated token claims.

Do not accept a user ID from a query parameter or request body as the authenticated identity.

## 19.3 Stable profile identity

Use a stable identity key, typically:

```text
tenant identifier + object identifier
```

Do not use email as the primary profile key.

## 19.4 Package API safety

Prevent:

* Arbitrary scope input from untrusted URLs.
* Mixed-resource scopes.
* External return URLs.
* Interactive calls from child configurations.
* Silent fallback to the first of multiple accounts.
* Access-token inclusion in diagnostics.
* Raw MSAL cache access by consumers.

---

# 20. Observability

Emit structured authentication events without sensitive data.

Suggested events:

```text
auth.client.initialized
auth.redirect.processed
auth.account.resolved
auth.account.selection_required
auth.token.silent.success
auth.token.interaction_required
auth.token.failed
auth.portal.continuation.started
auth.portal.continuation.completed
auth.logout.started
```

Suggested fields:

```ts
{
  applicationId: "portal" | "child0" | "child1";
  resource?: "child0-api" | "child1-api";
  action?: string;
  outcome: "success" | "failure" | "interaction-required";
  errorCode?: string;
  correlationId?: string;
  durationMs?: number;
}
```

Never emit:

* Access tokens.
* Authorization codes.
* ID tokens.
* Raw claims.
* Usernames.
* Email addresses.
* Object IDs unless explicitly approved and appropriately protected.

---

# 21. Implementation Sequence

## Phase 1 — Repository preparation

1. Confirm pnpm workspace package patterns.
2. Confirm TypeScript, lint, test, and build conventions.
3. Confirm approved MSAL Browser and MSAL React versions.
4. Add `packages/auth` to the workspace if not already included.
5. Confirm all applications resolve one compatible MSAL Browser installation.

## Phase 2 — Package skeleton

1. Create package metadata.
2. Configure ESM output.
3. Configure declaration generation.
4. Add root-only exports.
5. Add Vitest configuration.
6. Add package README.

## Phase 3 — Configuration

1. Implement configuration types.
2. Implement runtime validation.
3. Implement MSAL configuration construction.
4. Add sanitized logger support.
5. Add compatibility fingerprint.
6. Complete configuration tests.

## Phase 4 — Client initialization

1. Implement the client factory.
2. Hide MSAL construction details.
3. Ensure initialization is awaited.
4. Add initialization error handling.
5. Complete client tests.

## Phase 5 — Account resolution

1. Implement active-account resolution.
2. Implement selected-account metadata.
3. Implement multiple-account handling.
4. Complete account tests.

## Phase 6 — Scope registry

1. Implement resource definitions.
2. Implement named scope sets.
3. Implement single-resource validation.
4. Complete scope tests.

## Phase 7 — Silent tokens

1. Implement typed token results.
2. Implement silent acquisition.
3. Implement interaction classification.
4. Add optional in-flight deduplication.
5. Complete token tests.

## Phase 8 — Portal continuation

1. Implement safe return-path normalization.
2. Implement continuation serialization.
3. Implement expiration and nonce validation.
4. Implement redirect-result processing.
5. Implement portal-only interaction guards.
6. Complete redirect tests.

## Phase 9 — Public API

1. Export the supported contract through `index.ts`.
2. Remove accidental internal exports.
3. Verify deep imports fail.
4. Build package declarations.
5. Add usage examples to README.

## Phase 10 — Portal integration

1. Replace portal-local MSAL construction with `@workspace/auth`.
2. Add callback route.
3. Add continuation route.
4. Add login route.
5. Add logout route.
6. Add child-launch readiness checks.
7. Add portal integration tests.

## Phase 11 — Child 0 integration

1. Replace local MSAL configuration.
2. Add child bootstrap account check.
3. Add Child 0 token adapter.
4. Add `/me` profile request.
5. Add portal interaction recovery.
6. Add Child 0 integration tests.

## Phase 12 — Child 1 integration

Repeat the Child 0 pattern using only Child 1 resource definitions.

## Phase 13 — Browser validation

1. Validate same-origin storage behavior.
2. Validate direct child navigation.
3. Validate refresh on nested child routes.
4. Validate consent recovery.
5. Validate multi-tab logout.
6. Validate multiple-account handling.
7. Validate production ingress routing.

## Phase 14 — Rollout

Use staged rollout:

```text
1. Portal package integration
2. Child 0 integration
3. Child 0 production validation
4. Child 1 integration
5. Cross-child navigation validation
6. Remove duplicated auth utilities
7. Enforce package-only imports
```

---

# 22. Acceptance Criteria

The implementation is complete only when all conditions below are satisfied.

## Shared package

* `@workspace/auth` builds independently.
* Type declarations are generated.
* No React dependency exists.
* No MSAL singleton is exported.
* Consumers cannot deep-import internals.
* Runtime configuration is validated.
* Account resolution is deterministic.
* Mixed-resource token requests are rejected.
* Return URLs cannot escape the portal origin.
* Expected interaction conditions use typed results.
* Tokens are never persisted by package code.

## Portal

* Portal owns every interactive authentication operation.
* Portal callback processes redirect responses.
* Portal preserves safe child return paths.
* Portal can obtain consent for each child API.
* Portal controls account selection.
* Portal owns logout.

## Children

* Each child creates one initialized MSAL client.
* Each child only acquires tokens silently.
* Each child redirects interaction-required cases to the portal.
* Child 0 requests only Child 0 API tokens.
* Child 1 requests only Child 1 API tokens.
* Each child retrieves its own backend profile.
* Each child stores profile data but not access tokens.
* Each child treats frontend permissions as non-authoritative.

## End-to-end

* A user signs in once and can navigate between applications without unnecessary credential prompts.
* Each child API receives a token with the correct audience.
* Direct navigation to an authenticated child route succeeds.
* Direct navigation while unauthenticated returns through the portal.
* Consent-required conditions recover through the portal.
* Logout initiated from any application is completed by the portal.
* Invalid continuation URLs cannot redirect outside the application.
* Multiple cached accounts never cause an implicit first-account selection.

---

# 23. Explicit Non-Goals

This implementation does not include:

* A backend-for-frontend.
* Server-side token storage.
* On-behalf-of token exchange.
* Child backend JWT-validation implementation.
* Entra app-registration provisioning.
* Kubernetes ingress implementation.
* Business-role administration.
* A general policy engine.
* Cross-origin authentication sharing.
* Runtime-composed microfrontends.
* Token sharing through a shell JavaScript object.

These may be separate future workstreams.

---

# 24. Agent Execution Guidance

Before changing code, the implementation agent must inspect:

```text
pnpm-workspace.yaml
root package.json
root tsconfig files
existing app MSAL configuration
existing runtime-config mechanism
portal router
child routers
API client wrappers
test setup
lint setup
build pipeline
Kubernetes route configuration
```

The agent should preserve existing repository conventions unless they conflict with the security invariants in this plan.

The agent must not duplicate authentication implementations across applications. Application-specific code should be limited to:

* Loading runtime configuration.
* Connecting the MSAL client to React.
* Mapping a child to its resource.
* Calling its own backend.
* Rendering its own profile and permissions.
* Navigating to the portal when interaction is required.

The final implementation should make the boundary visible in code:

```text
@workspace/auth
    owns authentication mechanics

portal
    owns authentication interaction

child SPA
    owns token consumption and profile loading

child API
    owns authorization enforcement
```
