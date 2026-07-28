# 0006 — Port the payload-free cross-tab logout signal

Status: accepted
Date: 2026-07-28
Topic: cross-tab-and-logout (decided during `topology`)

## Context

The app-shell pack coordinates logout across tabs with `localStorage`, always-on MSAL v5
account events, and a `BroadcastChannel` (`company.portal.auth.v1`) carrying only
`logout-started` / `application-session-invalidated` with `sourceTabId` and `occurredAt` —
never tokens or claims. Only the initiating tab calls `logoutRedirect`.

The independent approach asserts the behaviour as E2E scenario 9 ("two browser tabs observe
logout state appropriately") with no mechanism behind it
(`analysis/02-approach-comparison.md` §6.2). Under decision `0002` full page loads partly
self-heal, because each navigation re-resolves the account from the shared cache — but a tab
sitting idle on a child route learns nothing until the user moves.

## Options

1. **Port the `BroadcastChannel` signal.**
2. **Rely on navigation self-healing**, and drop or rewrite E2E scenario 9.

## Decision

Option 1. A single named `BroadcastChannel` carries logout coordination events. The message
payload is an event name plus `sourceTabId` and `occurredAt` — nothing else. Only the
initiating tab calls `logoutRedirect`; other tabs react locally.

## Why

The user's call, and it closes a gap the independent source itself claims to have. An idle
tab still rendering an authenticated child route after logout elsewhere is a real defect,
not a cosmetic one: the user believes they are signed out.

Under this topology the mechanism is *more* necessary than under the app-shell pack, not
less. The pack has one document per tab and could rely on in-memory state; here the three
applications only ever learn about each other through the shared cache, and cache changes
in another document do not notify a document that is not navigating.

## Rejected because

- **Navigation self-healing** — leaves a window whose length is "until the user clicks
  something", which is unbounded. It also means E2E scenario 9 would have to be deleted, so
  the plan would lose the assertion rather than satisfy it.

## Evidence

- `sources/app-shell-pack/07-cross-tab-authentication-and-logout.md`.
- `sources/independent/independent-approach.md` §18, E2E scenario 9.
- `analysis/02-approach-comparison.md` §6.2.

## Consequences

- Hard rule, inherited by every topic: the channel never carries tokens, claims, names,
  emails, roles, or any account identifier beyond an opaque tab id. It is a notification
  bus, not a state bus.
- Topic 10 (`cross-tab-and-logout`) must define the channel name, the event union, the
  single-initiator rule, what a receiving tab actually does (re-resolve account, then
  render the unauthenticated state), and the `BroadcastChannel`-unavailable fallback.
- Topic 4 (`msal-instance-and-bootstrap`) must wire MSAL account events per document, since
  each document now has its own instance and its own subscription.
- `BroadcastChannel` is same-origin, which the topology already guarantees.

## Open

- Whether the same channel also carries a login/account-switch signal, or only logout.
  Deferred to topic 10.
- Fallback when `BroadcastChannel` is unavailable — `storage` event, or accept
  navigation-only healing. Deferred to topic 10.
