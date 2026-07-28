# 2026-07-28 — Workspace setup

Topics: `workspace` (meta, not an architecture topic).

## Covered

- Read both source architectures in full.
- Researched Microsoft's current MSAL/Entra guidance; established that Microsoft
  publishes no app-shell reference architecture, and publishes three alternatives
  (independent SPAs with same-domain SSO, Nested App Authentication, BFF / token handler).
  Written up as `analysis/01-microsoft-guidance-review.md`.
- Compared the two sources against each other and against that guidance. Written up as
  `analysis/02-approach-comparison.md`.
- Reorganised the flat folder into `sources/` · `analysis/` · `curated/` · `memory/`.
  Decision `0001`.

## Decided

- `0001` — curation workspace structure. Four-way split by role, curated topic files on
  demand, one immutable decision record per decision.

## Deferred

Every architecture topic. All twenty MANIFEST rows are `not-started`.

## Next session

Start with `topology`. It is the fork between the two sources and it constrains most
other topics. Consider `bff-alternative` immediately before or alongside it — choosing
BFF would make the fork moot.

## Note

`analysis/02-approach-comparison.md` §7 records three defects that make the independent
approach fail against `@azure/msal-browser@5` as written. Whatever topology wins, those
need fixing.
