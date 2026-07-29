# Session: authorization endpoint ownership

Date: 2026-07-29

- Corrected the authorization layer to match independently deployed child backends.
- Kept `GET /api/portal/v1/me/applications` as portal navigation discovery only.
- Moved initial child access and capabilities to `GET /api/child0/v1/me` and
  `GET /api/child1/v1/me`.
- Confirmed that all three SPAs share the same tenant and SPA client ID.
- Preserved separate API resource registrations, audiences, scopes, and policy owners.
- Decision `0030` supersedes portal-owned per-child checks in `0005` and `0025`.
