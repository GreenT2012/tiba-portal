# ADR 0002: API Auth and Tenant Context Foundation

## Status

Accepted

## Context

The API requires a consistent authentication and authorization baseline before implementing tenant-enforced business services.

## Decision

Use Keycloak OIDC access tokens with NestJS Passport JWT strategy.

- Validate issuer using `KEYCLOAK_ISSUER`.
- Validate token signature via issuer JWKS endpoint.
- Validate audience only when `KEYCLOAK_AUDIENCE` is configured.
- Map token roles from `realm_access.roles` with fallback to `resource_access[*].roles`.
- Map `customer_id` claim into request user context.
- Enforce tenant presence and tenant-scoped resource visibility in the service layer for tenant-scoped business operations.
- Allow `tiba_agent` and `tiba_admin` cross-tenant usage with optional `x-customer-id` override in MVP.

## Consequences

- Authentication and role checks are centralized and reusable.
- Tenant enforcement remains consistent as long as new modules keep role checks in controllers and tenant/resource visibility checks in services.
- Audience enforcement remains environment-configurable, requiring later hardening for production defaults.
