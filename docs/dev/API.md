# API Notes

## Base URL

- Local: `http://localhost:3001/api/v1`

## Current Endpoints

- `GET /health` (public) -> `{ "ok": true }`
- `GET /me` (authenticated) -> `{ "sub": string, "roles": string[], "customerId": string | null, "email": string | null }`
- `GET /tickets` -> `{ items, page, pageSize, total }` with camelCase ticket summary keys
- `POST /tickets` -> returns `TicketDto` in camelCase
- `GET /tickets/:id` -> returns `TicketDto` in camelCase
- `PATCH /tickets/:id/status` -> returns `TicketDto` in camelCase
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

## Response Casing

- All external API payloads use camelCase keys.
- Database and Prisma fields remain snake_case; response mapping is done explicitly in the tickets module mapper.

Example ticket summary response item:
- `{ "id": "...", "title": "...", "status": "OPEN", "type": "Bug", "projectId": "...", "customerId": "...", "assigneeUserId": null, "createdAt": "...", "updatedAt": "..." }`

Postman flow (attachments):
1. Create a ticket (`POST /tickets`).
2. Request presigned upload (`POST /tickets/:id/attachments/presign-upload`) with `filename`, `mime`, `sizeBytes`.
3. Upload file via HTTP PUT to `uploadUrl` with header `Content-Type` from `requiredHeaders`.
4. Fetch ticket detail (`GET /tickets/:id`) and verify attachment metadata appears in `attachments`.
5. Request download URL (`GET /tickets/:id/attachments/:attachmentId/presign-download`) and open the returned URL.

## TODO

- Add ticket/customer/project resource endpoints
- Add versioning and error contract documentation
