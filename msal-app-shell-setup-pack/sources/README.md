# Sources

Inputs to the curation. **Do not edit anything in this directory.**

If a source document is wrong, incomplete, or contradicts itself, do not fix it here.
Record the correction in `../curated/<topic>.md` and open a decision record in
`../memory/decisions/`. These files are the record of what was proposed, and their value
depends on staying unchanged.

## `app-shell-pack/`

Eighteen files, dated 2026-07-23. A runtime-composition architecture: one document, one
MSAL instance owned by a shell, children loaded as modules and mounted into the shell's
DOM, services injected in memory. Nginx serves the shell HTML for `/child0/*`.

Read the pack's own `README.md` for its intended reading order.

**`checksums.md` is stale.** It lists the original flat filenames from before these files
were moved into `sources/app-shell-pack/`. Deliberately not regenerated — see decision
`0001`.

## `independent/`

One file, 2093 lines, dated 2026-07-28. Authored with no knowledge of the app-shell pack.
A navigational-composition architecture: three separate SPAs on one origin, each with its
own MSAL instance, sharing authentication state through the same-origin MSAL cache.

Originally named `INDEPENDANT-approach.md`. Renamed on move; the typo is not preserved.

## Relationship

The two are mutually exclusive at the topology level. The independent approach's §23
names runtime-composed microfrontends and shell-object token sharing as explicit
non-goals — it rejects the pack's core mechanism by design, without having seen it.

Comparison: `../analysis/02-approach-comparison.md`.
