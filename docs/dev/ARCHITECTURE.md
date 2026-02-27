# Architecture (MVP)

## Overview

This repository starts as a modular monolith split into workspace apps/packages.

- `apps/web`: UI surface for customer portal and internal dashboard
- `apps/api`: HTTP API + background processing entry points
- `packages/shared`: shared contracts (Zod schemas and inferred TS types)

## Planned Modules

- Auth and identity integration (Keycloak OIDC)
- Customers
- Projects
- Tickets
- Attachments (S3-compatible via MinIO)
- Notifications and audit trail

## Data and Infra

- Postgres for application data
- Redis for caching/queues
- MinIO for object storage
- Keycloak (+ dedicated Postgres) for identity and access

## Auth and Access Control (MVP)

- API authentication uses Keycloak OIDC access tokens with NestJS Passport JWT strategy.
- Token verification uses:
  - `iss` validation against `KEYCLOAK_ISSUER`
  - signature verification via Keycloak JWKS endpoint (`<issuer>/protocol/openid-connect/certs`)
- Optional `KEYCLOAK_AUDIENCE` can enforce audience membership when configured.

### Role Mapping

- Roles are extracted from `realm_access.roles` first.
- If realm roles are not present, `resource_access[*].roles` are used as fallback.
- Current role set used in guards:
  - `customer_user`
  - `tiba_agent`
  - `tiba_admin`

### Tenant Context

- `customer_id` token claim is mapped into request user context as `customerId`.
- `TenantGuard` enforces tenant presence for routes marked with `@RequireTenant()`:
  - `customer_user` requires non-null `customerId` (otherwise 403)
  - `tiba_agent` and `tiba_admin` are allowed without token tenant for cross-tenant operations
- For internal users, `x-customer-id` request header can optionally provide tenant scope in MVP.

## API Casing

- Postgres/Prisma models use snake_case column/field names.
- External API responses use camelCase consistently.
- Translation is explicit in module mappers (for tickets: `tickets.mapper.ts`) to prevent leaking raw Prisma shapes.

## Audit Events (Tickets)

- Ticket writes also persist `AuditLog` records in the same transaction for consistency.
- Current actions:
  - `created`
  - `status_changed`
  - `assigned`
  - `comment_added`
- `AuditLog.customer_id` represents the tenant (customer) scope for the event.
- `AuditLog.actor_user_id` identifies the acting user and `AuditLog.actor_role` stores the actor's primary role (`tiba_admin` > `tiba_agent` > `customer_user`).

## Data Model Notes (MVP)

- Multi-tenant isolation is enforced at the data layer with `customer_id` on all tenant-scoped entities (`Project`, `Ticket`, `TicketComment`, `TicketAttachment`, and tenant-scoped `AuditLog` rows).
- `Ticket.status` and `Ticket.type` are stored as `TEXT` intentionally to keep workflow/category expansion backward-compatible without immediate schema migrations; strict validation happens in application code.

## TODO

- Define bounded contexts and ownership boundaries per module
- Add outbox/inbox processing workers and delivery guarantees
- Define event contracts in `packages/shared`
