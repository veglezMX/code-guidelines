# Workspace Design

The design this folder implements. Approved 2026-07-28, recorded as decision `0001`.
`START-HERE.md` is the operational version of this document; this one explains the
reasoning.

## Problem

Twenty flat Markdown files from three origins, with nothing marking which was which:
an eighteen-file app-shell architecture pack, a separately authored independent-SPA plan,
and analysis produced while reviewing them. A new session could not tell input from
output, or established fact from open choice, and had to read roughly 90 KB before it
could contribute anything.

The work is inherently multi-session — many iterations, each covering specific topics —
so the folder must carry its own continuity.

## Four-way split by role

| Directory | Answers | Lifecycle |
|---|---|---|
| `sources/` | What were we given? | Frozen |
| `analysis/` | What is true about it? | Grows when facts are verified |
| `curated/` | What did we choose to build? | Grows and is revised |
| `memory/` | Why, and where were we? | Grows, append-mostly |

The split exists because those are four genuinely different kinds of claim, with
different rules. A source may be wrong and stays wrong. An analysis finding needs a
citation. A curated statement needs a decision behind it. A decision record is immutable
once accepted.

## Why topic files created on demand

`curated/` starts with only a `MANIFEST.md` listing twenty topics, all `not-started`.
Files appear as sessions cover them.

Pre-stubbing chapters would have meant adopting the app-shell pack's numbering, which was
written for one of the two candidate topologies — that prejudges the single most
consequential open decision. On-demand files also avoid a directory of empty placeholders
that read as coverage.

The MANIFEST's real job is the **Sources to read** column. It names, per topic, the exact
source sections and decision records that topic needs. That is what lets step 3 of the
session protocol load a narrow slice instead of the whole corpus, and it is why
per-session context cost stays roughly flat as `curated/` grows.

## Why one decision record per decision

The stated goal is that review-pass discussions survive — that a later session can see
*why* something was selected, not just what. Two constraints follow:

- **Immutability.** An accepted record is never edited. A changed decision gets a new
  record and the old one is marked `Superseded-by`. Editing in place silently destroys
  the history the workspace exists to keep.
- **Rejected options are content.** The template requires them. Most future
  re-litigation is someone rediscovering an option that was already considered and
  dropped.

A single running log was rejected because updating a past decision cleanly is awkward and
the file grows unbounded. Rationale inline in curated files was rejected because
cross-topic decisions have no home there, and superseding one would mean rewriting
product content.

## The self-perpetuating loop

`START-HERE.md` carries the eleven-step session protocol as a checklist, and the last four
steps are bookkeeping: update the curated file, write the decision records, update the
MANIFEST and `STATE.md`, append a session note, commit.

That is what makes the structure maintain itself. Any session that follows the protocol
leaves the workspace correctly indexed for the next one, without the user having to
restate context. Global memory points at `START-HERE.md`, so a new session finds the
protocol unprompted.

## Deliberate omissions

- **`checksums.md` is not regenerated** after the move. It documents the pack as
  received; a regenerated version would document the pack as filed, which is less useful.
- **No automation.** No scripts, no link checkers, no status generators. The protocol is
  short enough to follow by hand, and tooling would be another thing to keep true.
- **No `curated/` template file.** The shape lives in `START-HERE.md`, next to the
  protocol that uses it.
