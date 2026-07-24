# Workspace and Folder Structure

## Recommended slice

```text
code/frontend/
├── apps/
│   ├── app-shell/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   └── AppProviders.tsx
│   │   │   ├── auth/
│   │   │   │   ├── authConfig.ts
│   │   │   │   ├── createAuthenticationStore.ts
│   │   │   │   ├── createMsalInstance.ts
│   │   │   │   ├── createSessionChannel.ts
│   │   │   │   ├── registerMsalEvents.ts
│   │   │   │   ├── logoutEverywhere.ts
│   │   │   │   └── redirect-bridge.ts
│   │   │   ├── authorization/
│   │   │   │   ├── PortalAuthorizationProvider.tsx
│   │   │   │   └── RequireApplicationAccess.tsx
│   │   │   ├── composition/
│   │   │   │   ├── ChildApplicationHost.tsx
│   │   │   │   ├── loadChildManifest.ts
│   │   │   │   └── loadChildModule.ts
│   │   │   ├── configuration/
│   │   │   │   ├── loadRuntimeConfig.ts
│   │   │   │   └── runtimeConfigSchema.ts
│   │   │   ├── routing/
│   │   │   │   ├── AppRoutes.tsx
│   │   │   │   └── RequireAuthentication.tsx
│   │   │   ├── services/
│   │   │   │   └── createShellServices.ts
│   │   │   └── main.tsx
│   │   ├── auth-redirect.html
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── app-child0/
│       ├── src/
│       │   ├── app/
│       │   │   ├── Child0Application.tsx
│       │   │   └── Child0Providers.tsx
│       │   ├── authorization/
│       │   │   ├── Child0AuthorizationProvider.tsx
│       │   │   └── RequireChild0Permission.tsx
│       │   ├── bootstrap/
│       │   │   ├── mount.tsx
│       │   │   └── RuntimeProvider.tsx
│       │   ├── profile/
│       │   │   ├── loadChild0Profile.ts
│       │   │   └── Child0ProfileProvider.tsx
│       │   ├── routes/
│       │   │   └── Child0Routes.tsx
│       │   └── entry.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   ├── auth-contracts/
│   ├── auth-react/
│   ├── auth-msal/
│   ├── authorized-http/
│   ├── microfrontend-contracts/
│   ├── navigation-contracts/
│   ├── observability-contracts/
│   ├── portal-contracts/
│   ├── runtime-config/
│   ├── test-utils/
│   ├── eslint-config/
│   └── tsconfig/
│
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Important redirect-page placement

Place `auth-redirect.html` at the Vite application root and register it as a separate build input. Do not place an HTML file with a bare package import under `public/`, because Vite copies public files without transforming their module imports.

The HTML should load a Vite-processed TypeScript entry:

```html
<script
  type="module"
  src="/src/auth/redirect-bridge.ts"
></script>
```

## Package dependency direction

```text
app-shell
├── auth-msal
├── auth-react
├── authorized-http
├── portal-contracts
└── microfrontend-contracts

app-child0
├── auth-contracts
├── auth-react
├── authorized-http
├── microfrontend-contracts
└── portal-contracts

app-child0 ─X→ auth-msal
app-child0 ─X→ app-shell source files
```

## `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*
```

## Root `package.json`

```json
{
  "name": "@company/frontend-workspace",
  "private": true,
  "packageManager": "pnpm@11.16.0",
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

## Boundary enforcement

Add lint or architecture tests that reject:

- MSAL imports outside `auth-msal` and app-shell composition.
- Raw access-token storage.
- Child imports from app-shell source.
- Direct `window.history` mutation in children.
- Direct calls from a child to an unapproved API origin.
