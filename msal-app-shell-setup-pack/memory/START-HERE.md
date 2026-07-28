# START HERE

Entry point for every session working on this folder. Read this file, then `STATE.md`,
then `../curated/MANIFEST.md`. Nothing else, until you have picked a topic.

## What this folder is

A curation workspace. Two independently authored architectures for multi-SPA
authentication with Microsoft Entra / MSAL are being merged, topic by topic, into one
curated solution. Each session takes one to three topics, decides, records why, and
stops.

## Directory contract

| Directory | Contains | Editable |
|---|---|---|
| `sources/` | The two input architectures, as received | **No.** Inputs only. |
| `analysis/` | Findings about the sources. Facts, not choices. | Append when new facts are verified |
| `curated/` | The final solution, one file per topic | Yes — this is the product |
| `memory/` | Why decisions were made, and how to resume | Yes |

If a source document is wrong, do **not** fix the source. Record the correction in
`curated/<topic>.md` and open a decision record.

## Session protocol

Follow in order. Create a task per step.

1. **Orient.** Read `START-HERE.md`, `STATE.md`, `../curated/MANIFEST.md`.
2. **Pick.** Take the topic from the user's request, or the first entry under
   "Next up" in `STATE.md`. One to three topics per session, no more.
3. **Load the slice.** Read *only* what the topic needs:
   - the source sections named in the MANIFEST row,
   - the decision records listed in that row,
   - the existing `curated/<topic>.md` if any,
   - the relevant sections of `analysis/`.
   Do not read the whole of `sources/`. Keeping this narrow is what keeps context cost
   flat as `curated/` grows.
4. **Review pass.** Compare how each source handles the topic, check it against verified
   Microsoft guidance, surface conflicts, present options with a recommendation.
5. **Decide with the user.** Do not write curated content before the user agrees.
6. **Write `curated/<topic>.md`.** Use the topic file shape below.
7. **Write one decision record per decision made** in `decisions/`, numbered next in
   sequence. Never edit an accepted decision record — supersede it with a new one and set
   `Superseded-by:` on the old one.
8. **Update `../curated/MANIFEST.md`** — status, decision numbers, sources consulted.
9. **Update `STATE.md`** — move the topic out of "Next up", add anything newly open.
10. **Append `sessions/YYYY-MM-DD-<topic>.md`** — five to ten lines. What was decided,
    what was deferred.
11. **Commit.** One commit per session, message `curate(<topic>): <decision summary>`.

## Topic file shape (`curated/<topic>.md`)

```md
# <Topic>

Status: drafted | settled
Decisions: 0003, 0007
Sources: pack §05 · independent §7 · MS Learn <url>

## Rule
Normative statement. Short. What must be true.

## Design
Code, config, sequence. Copy-ready.

## Why not the alternatives
One line per rejected option, each linking its decision record.

## Open
What remains unresolved, and what would resolve it.
```

## Status vocabulary

- `not-started` — no curated file exists.
- `drafted` — curated file exists, decision not final, expect revision.
- `settled` — decided, recorded, and consistent with every other `settled` topic.
- `revisit` — was settled, but a later decision or new evidence invalidated part of it.
  Say why in the topic file's `## Open`.

## Rules that hold across all sessions

- **Decide the `topology` topic before anything else.** The two sources are mutually
  exclusive there, and that choice constrains most other topics.
- Every normative claim about MSAL, Entra, or nginx behaviour must cite a primary source
  or be marked explicitly as unverified. `analysis/01-microsoft-guidance-review.md`
  records which pack claims were verified and which were not.
- A decision record is required for any choice a future reader could reasonably question.
  Rejected options are as important as the chosen one.
- Frontend permission checks are UX. The backend is always the authority. Never write
  curated content that contradicts this.
- Never put tokens, claims, names, emails, or roles into logs, telemetry, URLs,
  `BroadcastChannel` messages, or application state.
