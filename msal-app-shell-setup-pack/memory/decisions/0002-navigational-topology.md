# 0002 — Navigational composition, one document per application

Status: accepted
Date: 2026-07-28
Topic: topology

## Context

The two sources are mutually exclusive at the topology level and agree on almost
everything else (`analysis/02-approach-comparison.md` §1, §4). The app-shell pack composes
at runtime: one document, one shell-owned MSAL instance, children `import()`ed and mounted
into the shell's DOM, nginx serving the shell HTML for `/child0/*`. The independent
approach composes by navigation: three documents, one MSAL instance each, `/child0/*`
serving child0's own `index.html`, state shared through the same-origin MSAL cache. The
independent approach's §23 names runtime-composed microfrontends and token sharing through
a shell JavaScript object as explicit non-goals.

Microsoft publishes no app-shell reference architecture
(`analysis/01-microsoft-guidance-review.md`). Its host-brokers-children model is Nested App
Authentication, where the hub side is Microsoft's; a private portal cannot be an NAA hub.

## Options

1. **Runtime composition** — app-shell pack `01`, `03`, `11`.
2. **Navigational composition** — independent approach §2.
3. **Neither; move auth out of the browser** — Microsoft Option C, handled in `0003`.

## Decision

Option 2. Three separate documents on one origin — `apps/portal`, `apps/child0`,
`apps/child1` — each with its own `index.html`, bundle, and router. `/child0/*` serves
child0's own HTML. Application switching is a full document navigation. Exactly one
`PublicClientApplication` per loaded document, no global singleton. Authentication state
is shared exclusively through the same-origin MSAL browser cache, which makes identical
origin, client ID, authority, and `cache` configuration a hard invariant across all three
applications.

## Why

Chosen by the user as the composition model, and it is the better-supported side of the
fork on the evidence already recorded:

- Deep links and history come free. `/child0/projects/123` is child0's own route behind
  child0's history fallback. The pack's weakest area — shell-owned history, a
  `NavigationPort`, unspecified nested child routing — does not exist here
  (comparison §5.1).
- One MSAL instance per document is the clean reading of MSAL's single-instance
  constraint. Under the pack it is a discipline that a mistake can violate; here it is
  structural (comparison §5.6).
- Independent build and deploy per application, with a leaner package graph — one shared
  auth package against roughly twelve in the pack (comparison §5.7).
- Closest to documented Microsoft ground: Option A (independent SPAs, same-domain SSO),
  improved by sharing one client ID and the same-origin cache instead of `ssoSilent`, so
  no hidden iframe and no third-party-cookie dependency (comparison §8).

What would have changed the answer: a hard requirement for instant in-page application
transitions with persistent shell chrome, or a requirement that a child's bundle be
structurally incapable of naming another child's audience. The first is not a requirement;
the second is accepted as a soft boundary — see Consequences.

## Rejected because

- **Runtime composition (app-shell pack)** — pays for in-page transitions with shell-owned
  history and routing that the pack never fully specifies, a shell that owns everything
  auth, and a shape Microsoft does not document. Its genuine advantages (entitlement,
  cross-tab logout, hard token boundary, operational specificity) are portable
  individually; three of the four are ported in `0004`–`0006` and the version/nginx
  material in later topics.
- **BFF / token handler** — see `0003`.

## Evidence

- `sources/app-shell-pack/01-target-architecture.md`, `03-workspace-and-folder-structure.md`,
  `11-nginx-full-configuration.md`.
- `sources/independent/independent-approach.md` §2, §23.
- `analysis/02-approach-comparison.md` §1–§6, §8, §11.
- `analysis/01-microsoft-guidance-review.md` §3.
- MSAL single-instance constraint: `@azure/msal-browser` issues #974, #4263 — as recorded
  in the sources; **not independently re-verified in this session**.

## Consequences

- Topics 4 (`msal-instance-and-bootstrap`), 10 (`cross-tab-and-logout`),
  11 (`routing-and-deep-links`) and 16 (`workspace-and-packages`) now inherit a
  three-document, three-instance model and may proceed.
- Topic 17 (`nginx-and-headers`) must specify a per-application history fallback, not the
  pack's shell-serves-everything rule. The pack's nginx file is still the better starting
  point for CSP, cache headers, and the COOP `map`; its routing block is not.
- Topic 5 (`redirect-bridge`) is now blocking. `/auth/callback` must be a dedicated
  document with no router and no `MsalProvider`; the independent source's routed portal
  page does not work under `@azure/msal-browser@5` (comparison §7.1–§7.2).
- Topic 3 (`entra-registration`) inherits one shared SPA client registration plus
  per-backend API registrations.
- The pack's injected resource-pinned HTTP client is no longer available as a structural
  token boundary; enforcement moves to backend audience validation plus per-app adapters
  plus tests. Carried as open item in `curated/topology.md` and into topic 8.
- Persistent shell chrome is impossible. Shared navigation UI must be duplicated per
  application, packaged, or omitted — topic 16.

## Open

Whether shared chrome is packaged or duplicated. The soft token boundary. Both recorded in
`curated/topology.md` §Open.
