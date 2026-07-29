# Session — delivery and proof

Date: 2026-07-29
Topics: `workspace-and-packages`, `observability`, `testing`

- Selected compiled acyclic pnpm packages with independent SPA images/releases.
- Chose duplicated shared app chrome rather than a persistent runtime shell.
- Fixed local nginx at localhost:4173 as the one browser-facing development origin.
- Kept runtime JSON deployment-mounted and images environment-agnostic.
- Defined a redacted vendor-neutral auth event/trace schema and operational signals.
- Added static, unit, contract, built-nginx and three-browser release gates.
- Required protected real-Entra smoke plus scheduled CAE/24-hour proof.
- Repository/CI/tenant/vendor implementation and exact image/browser digests remain open.
