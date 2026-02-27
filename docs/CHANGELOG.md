# Changelog

## Unreleased

- Bootstrap monorepo with API, web app, shared package, infra, CI, and docs skeleton.
- Add initial Prisma domain schema and baseline migration for customers, projects, tickets, comments, attachments, and audit logs.
- Add API auth/authorization foundation with Keycloak JWT validation, public/roles/tenant guards, and `/api/v1/me`.
- Load API environment variables from `apps/api/.env` via Nest `ConfigModule` so Keycloak issuer config is available at runtime.
- Add ticket audit logging (`created`, `status_changed`, `assigned`, `comment_added`) persisted via `AuditLog` in ticket write transactions.
- Add `AuditLog.actor_role` to persist primary actor role (`tiba_admin` > `tiba_agent` > `customer_user`) alongside `actor_user_id`.
