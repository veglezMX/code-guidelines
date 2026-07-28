# MSAL Multi-SPA Architecture — Curation Workspace

Two independently authored architectures for authenticating several same-origin SPAs with
Microsoft Entra / MSAL are being merged, topic by topic, into one curated solution.

**New session? Read [`memory/START-HERE.md`](memory/START-HERE.md) first.**

## Layout

| Path | What | Editable |
|---|---|---|
| [`memory/`](memory/) | Session protocol, current state, decision records | Yes |
| [`sources/`](sources/) | The two input architectures, as received | **No** |
| [`analysis/`](analysis/) | Verified findings about the sources | Append only |
| [`curated/`](curated/) | The product: one file per topic | Yes |

## Fast orientation

- What is settled, what is open, what is next → [`memory/STATE.md`](memory/STATE.md)
- Every topic and its status → [`curated/MANIFEST.md`](curated/MANIFEST.md)
- How the two approaches differ → [`analysis/02-approach-comparison.md`](analysis/02-approach-comparison.md)
- What Microsoft actually recommends → [`analysis/01-microsoft-guidance-review.md`](analysis/01-microsoft-guidance-review.md)
- Why the workspace is shaped this way → [`memory/decisions/0001-curation-workspace-structure.md`](memory/decisions/0001-curation-workspace-structure.md)

## Current status

Workspace established, both sources analysed, zero architecture topics curated.
The blocking decision is `topology` — the two sources are mutually exclusive there and
that choice constrains most other topics.
