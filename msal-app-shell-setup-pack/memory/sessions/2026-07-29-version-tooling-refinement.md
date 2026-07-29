# Session — version/tooling refinement

Date: 2026-07-29
Topics: `version-baseline`

- Registry-checked the missing unit, browser, DOM, type, and lint dependencies.
- Found that `typescript-eslint@8.65.0` excludes TypeScript 7.
- Selected Oxlint plus `oxlint-tsgolint` and retained `tsc --noEmit`.
- Raised the Node floor from `22.22.0` to `22.22.2` for jsdom compatibility.
- Added exact Vitest, Playwright, Testing Library, jsdom, Oxlint, and type pins.
- Implementation installation and execution remain owned by the testing topic.
