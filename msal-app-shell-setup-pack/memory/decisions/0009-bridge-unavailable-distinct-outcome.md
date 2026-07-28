# 0009 — A bridge timeout is a distinct non-interactive failure, never `interaction-required`

Status: accepted
Date: 2026-07-28
Topic: redirect-bridge (inherited by `token-acquisition`, `observability`)

## Context

In MSAL Browser v5, `iframeHashTimeout` / `windowHashTimeout` became `iframeBridgeTimeout`
/ `popupBridgeTimeout`, and they now govern the `BroadcastChannel` wait for the bridge
response (`analysis/01` §2.5, `analysis/02` §7.4). `analysis/01` calls bridge timeouts this
architecture's most likely production failure mode.

Neither source handles it. The independent approach's §11 error classification maps silent
failures onto `login-required`, `consent-required`, `conditional-access`,
`account-selection-required` and `unknown-interaction` — every branch of which leads to the
portal for interaction. The pack does not classify it at all.

Under `0002` the exposure is larger than in either source: every child's
`acquireTokenSilent` goes through the bridge on the iframe path (`analysis/02` §7.2), so a
broken bridge breaks token acquisition in all three applications at once.

## Options

1. **Distinct outcome.** Add a non-interactive failure to the token result union, set the
   timeouts deliberately, surface it as transient.
2. **Fold into `unknown-interaction`.** Fewer states; the user is sent to the portal.

## Decision

Option 1. A bridge timeout produces a distinct result — a `bridge-unavailable`-class
outcome, named in topic 7 — which:

- never causes a redirect to the portal, and never counts as `interaction-required`;
- surfaces to the user as a transient error with a retry affordance;
- emits telemetry carrying `errorCode` and `correlationId` and no PII;
- is produced under explicitly chosen `iframeBridgeTimeout` / `popupBridgeTimeout` values
  rather than library defaults.

## Why

The two failures need opposite responses. `interaction-required` means "send the user to
the portal to interact"; a bridge timeout means "the mechanism that delivers *any*
authentication response is not working". Sending the user to the portal in that state
produces a redirect loop — portal interacts, response goes to the bridge, bridge times out,
child retries, portal interacts — against a bridge that will not load. That is a worse
outage than an honest error, and it is self-inflicted.

Distinct classification also gives the failure its own telemetry signal, which matters
because the likely causes are all operational and all diagnosable from the outside: the
bridge path being swallowed by an application's history fallback, a COOP header leaking
onto it, a failed asset load, or a redirect-URI mismatch.

## Rejected because

- **Fold into `unknown-interaction`** — trades one state for a redirect loop and blinds the
  telemetry on the failure mode most likely to occur.

## Evidence

- `analysis/01-microsoft-guidance-review.md` §2.5 (option renames; bridge timeouts govern
  the `BroadcastChannel` wait) and its recommendation 7.
- `analysis/02-approach-comparison.md` §7.2, §7.4.
- `sources/independent/independent-approach.md` §11 (error classification), §16.4–§16.5.
- Default timeout values are **unverified**.

## Consequences

- Topic 7 (`token-acquisition`) must add the outcome to `TokenAcquisitionResult` and name
  it. Adding a branch to that union is a breaking change to the shared package's public
  surface, so it belongs there rather than being bolted on later.
- Topic 9 (`interaction-recovery`) must exclude this outcome from every path that navigates
  to the portal.
- Topic 18 (`observability`) must give it an event name and a distinct `errorCode`.
- Topic 4 (`msal-instance-and-bootstrap`) must set both timeout values explicitly.
- Related, not fixed here: `analysis/02` §7.5 records that the independent approach's 401
  retry is a no-op without `forceRefresh: true` or a claims challenge. → topic 8.

## Open

Timeout values themselves — they depend on authority latency and are not chosen here.
→ topic 4.
