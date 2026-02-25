# ADR 0001: Initial Architecture

## Status

Accepted

## Context

We need a fast bootstrap for a self-hosted product with a customer portal and internal operations dashboard. Early delivery speed is more important than early microservice decomposition.

## Decision

Adopt a modular monolith architecture in a pnpm monorepo:

- Next.js frontend (`apps/web`)
- NestJS API (`apps/api`)
- Shared contracts package (`packages/shared`)
- Postgres/Redis/MinIO/Keycloak via Docker Compose for local/dev deployment

Introduce an outbox pattern when domain events are added to ensure reliable integration events and async side effects.

## Consequences

- Faster iteration and lower operational complexity at MVP stage
- Clear module boundaries required to avoid tight coupling
- Event-driven integration can evolve without immediate service split
