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

## TODO

- Define bounded contexts and ownership boundaries per module
- Add outbox/inbox processing workers and delivery guarantees
- Define event contracts in `packages/shared`
