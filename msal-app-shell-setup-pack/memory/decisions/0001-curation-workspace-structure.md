# 0001 — Curation workspace structure

Status: accepted
Date: 2026-07-28
Topic: workspace

## Context

The folder held twenty flat Markdown files from three origins with no marking of which
was which: an eighteen-file app-shell architecture pack, a separately authored
independent-SPA plan, and two analysis documents produced during review. The goal is a
single curated architecture, built across many sessions, each covering specific topics.
A flat folder gives a new session no way to tell input from output, or fact from
decision, and forces it to read everything before it can do anything.

## Options

1. **Four-way split by role** — `sources/`, `analysis/`, `curated/`, `memory/`, with
   curated topic files created on demand and one decision record per decision.
2. **Leave files flat, add `curated/` only** — minimal churn, but "which file is canon"
   stays ambiguous and every session re-reads everything.
3. **Single growing `SOLUTION.md`** — easy to read end to end, but every session touches
   the same file and it grows past what fits comfortably in context.

## Decision

Option 1.

- `sources/app-shell-pack/` and `sources/independent/` hold the inputs, never edited.
- `analysis/` holds verified findings about the sources — facts, not choices.
- `curated/` holds the product: one file per topic, created when a session covers it,
  indexed by `curated/MANIFEST.md` with a status per topic.
- `memory/` holds `START-HERE.md` (the session protocol), `STATE.md` (what is settled and
  what is next), `decisions/` (one numbered record per decision), and `sessions/`.

Accepted decision records are immutable. A changed decision gets a new record, and the
old one is marked `Superseded-by`.

## Why

The split maps to a real distinction that was previously implicit: what we were given,
what is true about it, what we chose, and why. Once explicit, a session can load only the
slice a topic needs — the MANIFEST row names the source sections and decision records —
instead of the whole corpus. That keeps per-session context cost flat as `curated/`
grows, which is the binding constraint given the sources already total roughly 90 KB.

Topic files on demand rather than pre-stubbed avoids dead placeholder files and avoids
inheriting the app-shell pack's chapter split, which was written for one of the two
topologies and would prejudge the topology decision.

Immutable decision records matter because the point of this workspace is that a future
session can reconstruct *why* something was chosen. An edited record silently destroys
that.

## Rejected because

- **Flat plus `curated/`** — leaves input and output indistinguishable, which is the
  actual problem being solved.
- **Single `SOLUTION.md`** — every session edits the same file, rationale has nowhere to
  live, and the file outgrows a comfortable read.
- **Pre-stubbed curated chapters mirroring the pack's numbering** — prejudges topology by
  adopting one source's structure.
- **Rationale inline in curated files only** — cross-topic decisions have no home, and
  superseding a decision means rewriting product content.

## Evidence

None required; this is a workflow decision, not a technical claim.

## Consequences

- `sources/app-shell-pack/checksums.md` is now stale: it lists the original flat
  filenames. Left as-is deliberately, noted in `sources/README.md`.
- `INDEPENDANT-approach.md` was renamed to
  `sources/independent/independent-approach.md`. The typo in the original name is not
  preserved.
- `14-microsoft-guidance-review.md` → `analysis/01-microsoft-guidance-review.md`.
- Global memory at `~/.claude/projects/-home-veglez-own-code-guidelines/memory/` points
  at `memory/START-HERE.md`, so new sessions find the protocol without being told.
- The original pack files moved with `git mv`, so history follows them. The two analysis
  files were untracked and were moved with plain `mv`.

## Open

Nothing.
