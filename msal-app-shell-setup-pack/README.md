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
- What still must be implemented/provisioned/proven → [`IMPLEMENTATION-GAPS.md`](IMPLEMENTATION-GAPS.md)
- How the two approaches differ → [`analysis/02-approach-comparison.md`](analysis/02-approach-comparison.md)
- What Microsoft actually recommends → [`analysis/01-microsoft-guidance-review.md`](analysis/01-microsoft-guidance-review.md)
- Why the workspace is shaped this way → [`memory/decisions/0001-curation-workspace-structure.md`](memory/decisions/0001-curation-workspace-structure.md)

## Current status

Research and architecture curation are complete. All twenty topics are settled, with
decision records `0001`–`0031` (`0005` and `0025` are superseded by `0030`). The next
phase is implementation, environment provisioning and release evidence; see the
implementation-gaps report.
