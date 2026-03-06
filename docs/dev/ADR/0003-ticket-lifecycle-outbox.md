# ADR 0003: Ticket Lifecycle Outbox

## Status

Accepted

## Context

Ticket write operations are the current integration hotspot for future additive modules such as:
- notifications
- SLA management
- reports
- webhooks

Directly wiring these features into `TicketsService` would increase coupling quickly.

## Decision

Introduce a small persisted outbox seam for ticket lifecycle events inside the modular monolith.

### Persisted model

Ticket lifecycle events are written to `OutboxEvent` in the same transaction as the triggering ticket write.

Current fields:
- `topic`
- `aggregate_type`
- `aggregate_id`
- `customer_id`
- `payload_json`
- `status`
- `created_at`
- `published_at`

### Current ticket topics

- `ticket.created`
- `ticket.status_changed`
- `ticket.assigned`
- `ticket.comment_added`
- `ticket.attachment_added`

### Current implementation split

- `TicketsService` still owns the business transaction boundary
- `TicketEventsService` owns event creation for ticket lifecycle actions
- `OutboxService` owns persistence into `OutboxEvent`

### Contract ownership

Shared event topics and payload contracts live in `packages/shared/src/events.ts`.

## Consequences

- additive modules can attach to persisted lifecycle events instead of requiring direct feature-to-feature calls
- the current solution is still simple enough for a modular monolith
- delivery/dispatch workers are intentionally deferred; the outbox is the first stable integration seam, not yet a full eventing platform

## Follow-up

Future modules should consume outbox events instead of adding direct calls into ticket write paths wherever the integration is additive rather than transactional.
