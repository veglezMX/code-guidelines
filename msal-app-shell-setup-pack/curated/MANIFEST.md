# Curated Manifest

Index of every topic in the curated architecture. One row per topic. A session picks a
topic here, reads only the sources and decisions its row names, then writes
`curated/<topic>.md`.

Status vocabulary: `not-started` · `drafted` · `settled` · `revisit`.
Definitions in `../memory/START-HERE.md`.

Legend for the Sources column:
**P** = `../sources/app-shell-pack/` · **I** = `../sources/independent/independent-approach.md`
· **A** = `../analysis/`.

| # | Topic | Status | Decisions | Sources to read |
|---|---|---|---|---|
| 1 | `topology` | settled | 0002, 0003, 0004, 0005, 0006 | P `01`, P `03`, P `11` · I §2, §23 · A `02` §1–§6, §11 |
| 2 | `bff-alternative` | settled | 0003 | A `01` §3 Option C · I §23 |
| 3 | `entra-registration` | not-started | — | P `02` · I §3, §6 |
| 4 | `msal-instance-and-bootstrap` | not-started | inherits 0002, 0004, 0006 | P `04`, P `06` · I §7, §8, §15 · A `02` §7.3 |
| 5 | `redirect-bridge` | not-started | — | P `00` "MSAL v5 changes", P `05`, P `11` · I §12, §15 · A `02` §7.1–§7.2, §7.4 |
| 6 | `account-resolution` | not-started | — | P `01`, P `06` · I §9 · A `02` §5.3, §10 |
| 7 | `token-acquisition` | not-started | — | P `08` · I §10, §11 · A `02` §7.5 |
| 8 | `authorized-http` | not-started | — | P `08` · I §16.4–§16.5 · A `02` §6.3 |
| 9 | `interaction-recovery` | not-started | — | P `09` · I §13, §15.4 · A `02` §5.2, §5.5 |
| 10 | `cross-tab-and-logout` | not-started | 0006 (mechanism chosen) | P `07` · I §18 E2E 9 · A `02` §6.2 |
| 11 | `routing-and-deep-links` | not-started | inherits 0002 | P `09`, P `11` · I §2.1, §15.2, §16.2 · A `02` §5.1 |
| 12 | `authorization-layers` | not-started | 0005 (layer required) | P `10` · I §16.6, §17 · A `02` §6.1 |
| 13 | `cache-and-storage` | not-started | — | P `00` "localStorage security note" · I §7 · A `01`, A `02` §9 |
| 14 | `cae-and-claims-challenge` | not-started | — | A `01` · neither source implements it |
| 15 | `token-lifetime-24h` | not-started | — | A `01` · A `02` §9 |
| 16 | `workspace-and-packages` | not-started | inherits 0002, 0004 | P `03` · I §4, §5, §6 |
| 17 | `nginx-and-headers` | not-started | inherits 0002, 0004 | P `11` · I §2.1 (thin) · A `02` §6.5 |
| 18 | `observability` | not-started | — | P `12` · I §20 · A `02` §5.4 |
| 19 | `testing` | not-started | — | P `12` · I §18 |
| 20 | `version-baseline` | not-started | — | P `00` · I §21 · A `02` §10 |

## Ordering constraint

`topology` (1) and `bff-alternative` (2) gated the rest. **Both are settled as of
2026-07-28** — navigational composition, MSAL in the browser (`0002`, `0003`). Topics 4,
10, 11, 16 and 17 inherit from that choice; read `curated/topology.md` before curating any
of them.

Next constraint: topic 5 (`redirect-bridge`) is blocking for every token topic. Under
`0002` the independent source's routed `/auth/callback` does not work against
`@azure/msal-browser@5`, and all flows including `acquireTokenSilent` route through the
bridge.

## Coverage note

Topics 14 and 15 are absent from both sources. They are on this list because the review
found the gap, not because a source addresses them. Expect to author them from primary
Microsoft documentation.
