# API Notes

## Base URL

- Local: `http://localhost:3001/api/v1`

## Current Endpoints

- `GET /health` (public) -> `{ "ok": true }`
- `GET /me` (authenticated) -> `{ "sub": string, "roles": string[], "customerId": string | null, "email": string | null }`
- `GET /users` (tiba roles only) -> `[{ "id", "username", "email", "firstName", "lastName" }]`
- `POST /users/provision` (tiba_admin) -> provision Keycloak user with roles/customer attribute
- `POST /users/:id/reset-password` (tiba_admin) -> set temporary password `{ temporaryPassword }` -> `{ ok: true }`
- `GET /customers` (tiba roles only) -> `{ items, page, pageSize, total }`
- `POST /customers` (tiba roles only) -> create customer `{ name }`
- `PATCH /customers/:id` (tiba roles only) -> update customer `{ name }`
- `GET /projects` -> `{ items, page, pageSize, total }` with camelCase project keys
- `POST /projects` (tiba roles only) -> create project with either `{ customerId, name }` or `{ customerName, name }`
- `PATCH /projects/:id` (tiba roles only) -> update project `{ name?, isArchived? }`
- `GET /tickets` -> `{ items, page, pageSize, total }` with camelCase ticket summary keys
- `POST /tickets` -> returns `TicketDto` in camelCase
- `GET /tickets/:id` -> returns `TicketDto` in camelCase
- `PATCH /tickets/:id/status` (tiba roles only) -> returns `TicketDto` in camelCase
- `PATCH /tickets/:id/assign` -> returns `TicketDto` in camelCase
- `POST /tickets/:id/comments` -> returns `TicketCommentDto` in camelCase
- `POST /tickets/:id/attachments/presign-upload` -> returns upload URL payload (camelCase)
- `GET /tickets/:id/attachments/:attachmentId/presign-download` -> returns `{ downloadUrl }`

Tickets audit actions written to `AuditLog`:
- `POST /tickets` -> `created` with `{ type, status, projectId }`
- `PATCH /tickets/:id/status` -> `status_changed` with `{ from, to }`
- `PATCH /tickets/:id/assign` -> `assigned` with `{ from, to }`
- `POST /tickets/:id/comments` -> `comment_added` with `{ commentId }`
- `POST /tickets/:id/attachments/presign-upload` -> `attachment_added` with `{ filename, mime, sizeBytes, attachmentId }`
- Audit records include actor attribution fields: `actor_user_id` and derived `actor_role` (`tiba_admin` > `tiba_agent` > `customer_user`).

Attachment upload rules:
- Allowed mime types: `application/pdf` and `image/*`
- Max file size from `MAX_ATTACHMENT_BYTES` (default 10MB)

Presign upload response example:
- `{ "attachmentId": "...", "objectKey": "...", "uploadUrl": "...", "requiredHeaders": { "Content-Type": "application/pdf" } }`

Presign download response example:
- `{ "downloadUrl": "..." }`

Projects list query params:
- `q` (optional, case-insensitive name contains search)
- `customerId` (optional, honored only for `tiba_agent`/`tiba_admin`; forbidden for `customer_user`)
- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `sort` (`name` | `createdAt`, default `name`)
- `order` (`asc` | `desc`, default `asc`)

Customers list query params:
- `q` (optional, case-insensitive name contains search)
- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `sort` (`name` | `createdAt`, default `name`)
- `order` (`asc` | `desc`, default `asc`)

Projects response item example:
- `{ "id": "...", "customerId": "...", "name": "...", "isArchived": false, "createdAt": "...", "updatedAt": "..." }`

Project create notes:
- `customerId` and `customerName` are alternatives; provide one.
- `customerName` uses exact match lookup.
- If no customer is found by `customerName`, API returns `400` with a clear message.

Project management policy:
- Prefer archive/unarchive via `PATCH /projects/:id` (`isArchived`) instead of hard-delete.
- `customer_user` is forbidden from project create/update operations.

Create ticket (`POST /tickets`) behavior:
- Request body: `{ projectId, type, title, description, status?, assigneeUserId?, customerId? }`
- `customer_user`:
  - `customerId` in body is rejected
  - `assigneeUserId` in body is rejected
  - tenant is enforced by token `customerId`; selected `projectId` must belong to same customer
- `tiba_agent` / `tiba_admin`:
  - `customerId` is not required when `projectId` is provided
  - tenant/customer is always derived from selected `projectId`
  - optional `assigneeUserId` is allowed at creation

Users query params:
- `q` (optional, search by username/email)
- `role` (optional, realm role filter such as `tiba_agent`)
- `limit` (default `20`, max `50`)

Users endpoint authorization:
- Allowed roles: `tiba_agent`, `tiba_admin`
- `customer_user` is forbidden

Users provisioning endpoint authorization:
- Allowed role: `tiba_admin`
- `customer_user` and `tiba_agent` are forbidden

Users provisioning request (`POST /users/provision`):
- `{ email, username?, firstName?, lastName?, roles, customerId? }`
- `roles` allowed values: `customer_user`, `tiba_agent`, `tiba_admin`
- if `roles` includes `customer_user`, `customerId` is required and must reference an existing customer

Users provisioning response example:
- `{ "id": "...", "username": "john", "email": "john@example.com", "firstName": "John", "lastName": "Doe", "roles": ["customer_user"], "customerId": "..." }`

Keycloak admin service account configuration for `/users`:
1. Create a confidential Keycloak client `api-admin` for API admin access.
2. Enable service accounts on the client.
3. Grant realm-management permissions required to read/provision users and roles:
   - `view-users`
   - `manage-users`
   - `view-realm`
   - `manage-realm`
4. Set API env vars:
   - `KEYCLOAK_ADMIN_CLIENT_ID`
   - `KEYCLOAK_ADMIN_CLIENT_SECRET`
   - `KEYCLOAK_ADMIN_REALM` (default `tiba`)
   - optional `KEYCLOAK_BASE_URL` (otherwise derived from `KEYCLOAK_ISSUER`)

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
- `GET /projects` tenant behavior:
  - `customer_user`: always scoped to token `customerId`
  - `tiba_agent`/`tiba_admin`: cross-tenant by default, optional `customerId` filter

## Response Casing

- All external API payloads use camelCase keys.
- Database and Prisma fields remain snake_case; response mapping is done explicitly in the tickets module mapper.

## Error Format

- All API errors use a stable JSON envelope:
- `{ "error": { "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|UNPROCESSABLE_ENTITY|BAD_GATEWAY|INTERNAL_SERVER_ERROR", "message": "...", "statusCode": 400, "details": [...]? } }`
- Tenant-fremde tenant-scoped Einzelressourcen werden als `404` behandelt, nicht als `403`.
- The web BFF (`/api/backend/*`) preserves this envelope for upstream API errors and normalizes BFF-originated failures to the same shape.
- Web clients should read `error.message` as the stable primary display field.

## Authorization and Tenant Enforcement

- Tenant enforcement is currently service-centered by design.
- Global guards handle authentication and role metadata.
- Service methods enforce tenant scope and resource visibility consistently for tenant-scoped entities.
- `PATCH /tickets/:id/status` and `PATCH /tickets/:id/assign` are both TIBA-only operations.
- Integration rule:
  - controller: authentication + role metadata
  - service: tenant scope + visibility checks
  - hidden tenant-fremde Einzelressource: `404`

Example ticket summary response item:
- `{ "id": "...", "title": "...", "status": "OPEN", "type": "Bug", "projectId": "...", "customerId": "...", "assigneeUserId": null, "createdAt": "...", "updatedAt": "..." }`

Postman flow (attachments):
1. Create a ticket (`POST /tickets`).
2. Request presigned upload (`POST /tickets/:id/attachments/presign-upload`) with `filename`, `mime`, `sizeBytes`.
3. Upload file via HTTP PUT to `uploadUrl` with header `Content-Type` from `requiredHeaders`.
4. Fetch ticket detail (`GET /tickets/:id`) and verify attachment metadata appears in `attachments`.
5. Request download URL (`GET /tickets/:id/attachments/:attachmentId/presign-download`) and open the returned URL.

## Current Integration Limits

- Browser-to-API traffic is intentionally routed only through the web BFF.
- Keycloak login/logout and MinIO object upload/download still require live external services for full end-to-end verification.
- The standard JSON error envelope is stable at API and BFF boundaries; web pages should not parse raw upstream JSON strings directly.


## Internal outbox

Ticket write actions also persist internal outbox events (`ticket.created`, `ticket.status_changed`, `ticket.assigned`, `ticket.comment_added`, `ticket.attachment_added`) in the same database transaction. This is an internal integration seam for future modules such as notifications, SLA, and reporting; it is not an external HTTP API.
