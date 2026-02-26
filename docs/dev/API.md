# API Notes

## Base URL

- Local: `http://localhost:3001/api/v1`

## Current Endpoints

- `GET /health` (public) -> `{ "ok": true }`
- `GET /me` (authenticated) -> `{ "sub": string, "roles": string[], "customerId": string | null, "email": string | null }`
- `GET /tickets` (authenticated, tenant-aware list)
- `POST /tickets` (authenticated, tenant-aware create)
- `GET /tickets/:id` (authenticated, tenant-aware detail with comments + attachments metadata)
- `PATCH /tickets/:id/status` (authenticated, tenant-aware status change)
- `PATCH /tickets/:id/assign` (authenticated, internal roles only: `tiba_agent`/`tiba_admin`)
- `POST /tickets/:id/comments` (authenticated, tenant-aware comment create)

## Authentication

- Bearer token required for protected routes: `Authorization: Bearer <access_token>`
- Tokens are validated against Keycloak issuer and JWKS:
  - `KEYCLOAK_ISSUER` must match token `iss`
  - JWKS loaded from `<issuer>/protocol/openid-connect/certs`
- `KEYCLOAK_AUDIENCE` is optional:
  - if set, token `aud` must contain this value
  - if not set, audience validation is skipped in MVP (TODO: tighten per-environment policy)

## Claims and Tenant Context

- `customer_id` claim is mapped to `customerId` in authenticated user context.
- Roles are extracted from:
  - `realm_access.roles` (preferred)
  - `resource_access[client].roles` (fallback)
- Internal users (`tiba_agent`, `tiba_admin`) may pass optional `x-customer-id` header to scope tenant actions in MVP.

## Tickets API (MVP)

### `GET /tickets`

Query params:
- `status` (optional): `OPEN` | `IN_PROGRESS` | `CLOSED`
- `projectId` (optional)
- `assignee` (optional): `me` | `unassigned`
- `view` (optional): `new` | `open` | `my`
- `sort` (optional): `updatedAt` | `createdAt` (default `updatedAt`)
- `order` (optional): `asc` | `desc` (default `desc`)
- `page` (optional, default `1`)
- `pageSize` (optional, default `20`, max `100`)
- `customerId` (optional, only for `tiba_agent`/`tiba_admin`; forbidden for `customer_user`)

View mappings:
- `new`: `status=OPEN` and `assignee_user_id IS NULL`
- `open`: `status IN (OPEN, IN_PROGRESS)`
- `my`: `assignee_user_id=<current_user_sub>` and `status!=CLOSED`

Response:
- `{ items, page, pageSize, total }`

### `POST /tickets`

- `customer_user`:
  - scoped to token `customer_id`
  - cannot pass `customerId`
  - cannot set `assigneeUserId` (request rejected)
- `tiba_agent` / `tiba_admin`:
  - must pass `customerId`
  - may set `assigneeUserId`
- Writes `AuditLog` action `created`.

### `PATCH /tickets/:id/status`

- Body: `{ "status": "OPEN" | "IN_PROGRESS" | "CLOSED" }`
- Writes `AuditLog` action `status_changed`.

### `PATCH /tickets/:id/assign`

- Body: `{ "assigneeUserId": "..." | null }`
- Allowed only for `tiba_agent` / `tiba_admin`.
- Writes `AuditLog` action `assigned`.

### `POST /tickets/:id/comments`

- Body: `{ "body": string }`
- Writes `AuditLog` action `comment_added`.

## TODO

- Add ticket/customer/project resource endpoints
- Add versioning and error contract documentation
