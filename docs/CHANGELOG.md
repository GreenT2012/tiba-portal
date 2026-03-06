# Changelog

## Unreleased

- Add a dashboard overview API and shared contracts for module-level counts, making `Dashboard` a functional entry point across `Tickets`, `Projects`, and `Admin`.
- Reorganize web routing, navigation, and documentation around the canonical product modules `Dashboard`, `Tickets`, `Projects`, and `Admin`, while keeping legacy `/tiba*` paths as transitional redirects.
- Add automatic in-process outbox polling, retry windows with `maxAttempts`, failed backlog stats, and admin observability/dispatch endpoints for MVP outbox operations.
- Add a persisted ticket lifecycle outbox seam plus internal ticket sub-services and shared domain-sliced contracts to reduce feature coupling across API, shared, and web layers.
- Add an MVP outbox dispatcher with explicit processing states, handler registry, manual dispatch endpoint, and regression tests for status transitions and failure handling.
- Add modularity review documentation covering current coupling hotspots, extension strategy, and the architectural path for additive modules such as notifications.
- Bootstrap monorepo with API, web app, shared package, infra, CI, and docs skeleton.
- Add initial Prisma domain schema and baseline migration for customers, projects, tickets, comments, attachments, and audit logs.
- Add API auth/authorization foundation with Keycloak JWT validation, public/roles/tenant guards, and `/api/v1/me`.
- Load API environment variables from `apps/api/.env` via Nest `ConfigModule` so Keycloak issuer config is available at runtime.
- Add ticket audit logging (`created`, `status_changed`, `assigned`, `comment_added`) persisted via `AuditLog` in ticket write transactions.
- Add `AuditLog.actor_role` to persist primary actor role (`tiba_admin` > `tiba_agent` > `customer_user`) alongside `actor_user_id`.
- Add MinIO-backed ticket attachment presign upload/download endpoints with MIME/size validation and `attachment_added` audit events.
- Add NextAuth Keycloak login in web app and a backend proxy (`/api/backend/*`) so browser traffic stays on web origin and API tokens remain server-side.
- Add customer ticket creation wizard in web with attachment step and BFF-based ticket list loading via `/api/backend/*`.
- Add `GET /api/v1/projects` with tenant-scoped customer access, internal cross-tenant filtering, pagination, sorting, and search for project dropdowns.
- Add `GET /api/v1/users` for TIBA roles, backed by Keycloak Admin API client credentials, to search assignable users.
- Extend TIBA project management APIs with reliable `PATCH /api/v1/projects/:id`, plus `POST /api/v1/projects` support for `{ customerName, name }` lookup in addition to `{ customerId, name }`.
- Add TIBA-only Customers API (`GET /api/v1/customers`, `POST /api/v1/customers`, `PATCH /api/v1/customers/:id`) with camelCase responses for customer administration.
- Add TIBA user management MVP: Keycloak provisioning endpoint (`POST /api/v1/users/provision`), temporary password reset endpoint (`POST /api/v1/users/:id/reset-password`), and new web admin page at `/tiba/users`.
- Harden API contracts and authorization: canonical shared domain contracts, stable JSON error envelope, consistent tenant visibility semantics (`404` for hidden tenant resources), and TIBA-only ticket status changes.
- Harden web/API integration boundaries: BFF now preserves or normalizes the standard error envelope, web fetch flows read structured API errors consistently, auth config fails fast on missing Keycloak env, and setup docs include Prisma migrate plus integration checks.
- Add targeted regression coverage for service-centered tenant enforcement, `404` tenant-visibility semantics, stable API error envelopes, and BFF/web error normalization helpers.
- Add explicit UI/UX preparation documentation with critical IA review, target navigation model, screen inventory, and entry criteria for the later UI/UX track.
