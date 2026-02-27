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

## TODO

- Add ticket/customer/project resource endpoints
- Add versioning and error contract documentation
