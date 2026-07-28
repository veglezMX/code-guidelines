# 0003 — MSAL stays in the browser; BFF / token handler rejected

Status: accepted
Date: 2026-07-28
Topic: bff-alternative

## Context

Microsoft's *Use API Management to Protect Access Tokens in Single-Page Applications*
(updated 2026-07-02) describes a BFF / token-handler pattern: APIM acts as a confidential
client, the access token is AES-encrypted into an `HttpOnly; Secure; SameSite=Strict`
cookie, every API call is proxied, and no MSAL runs in the browser. It is Microsoft's
security-preferred option for SPAs, and its confidential client is not subject to the
24-hour refresh-token lifetime that applies to SPA refresh tokens
(`analysis/01-microsoft-guidance-review.md` §3 Option C).

The independent approach lists BFF as an explicit non-goal (§23) — its author's recorded
decision, not ours. The app-shell pack never names the option. Choosing it would have made
the topology fork largely moot and would have emptied most of the MSAL-specific topics on
the manifest.

## Options

1. **Reject** — browser-side MSAL, decided now, unblocking topics 4–9, 13, 15.
2. **Keep open** — leave `topology` drafted until BFF is evaluated against available
   infrastructure.
3. **Phase two** — build browser MSAL now, keep a seam so the token source can be swapped
   later.

## Decision

Option 1. MSAL runs in the browser. No BFF, no server-side token storage, no token-handler
proxy. Topic 2 (`bff-alternative`) is closed as rejected.

## Why

The user's call, made after the costs were laid out. It unblocks the eight topics that
depend on how tokens are obtained in the browser, and it avoids standing up and operating
APIM (or an equivalent proxy) plus a confidential client for a three-application portal.

What would have changed the answer: an existing APIM deployment already in the request
path, or a security requirement that tokens be unreachable from page script.

## Rejected because

- **Keep open** — the evaluation has no new information to wait for; the trade is already
  documented in `analysis/01` §3 and `analysis/02` §8. Leaving it open would have kept
  every downstream topic blocked.
- **Phase two** — a swappable token source sounds cheap but is not: under BFF the browser
  stops holding tokens at all, so the account model, interaction recovery, cross-tab
  logout, and cache topics are all rewritten, not re-pointed. A seam that survives that is
  a redesign, not a seam. Rejecting outright is the honest record. If BFF is later
  adopted, supersede this record rather than pretending it was staged.

## Evidence

- *Use API Management to Protect Access Tokens in Single-Page Applications*, updated
  2026-07-02, as summarised in `analysis/01-microsoft-guidance-review.md` §3 Option C.
  Summary trusted from that analysis; **the source page was not re-fetched in this
  session**.
- `sources/independent/independent-approach.md` §23.
- `analysis/02-approach-comparison.md` §8, §9.

## Consequences

Accepted, explicitly:

- **The 24-hour SPA refresh-token lifetime applies.** Users will be forced back through
  interaction at least daily. The mitigation is the independent source's continuation
  record, which returns the user to the exact route — topic 15
  (`token-lifetime-24h`).
- **XSS in any of the three applications can mint tokens for every API.** Same origin,
  shared client ID, tokens in the browser cache. CSP and dependency hygiene are the only
  mitigations — topics 13 and 17.
- Topics 4, 5, 6, 7, 8, 9, 13, 15 are unblocked and are all browser-MSAL topics.
- Topic 14 (`cae-and-claims-challenge`) stays in scope and must be authored from Microsoft
  documentation; neither source implements it.

## Open

Nothing in scope. If APIM enters the request path for other reasons, this record should be
revisited by superseding it.
