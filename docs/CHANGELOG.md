# Changelog

## Unreleased

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
- Add TIBA-only Customers API (`GET /api/v1/customers`, `POST /api/v1/customers`, `PATCH /api/v1/customers/:id`) with camelCase responses for customer administration.
