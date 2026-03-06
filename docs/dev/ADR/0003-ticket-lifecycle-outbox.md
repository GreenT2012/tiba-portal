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
- `attempts`
- `last_error`
- `created_at`
- `published_at`
- `next_retry_at`

### Current ticket topics

- `ticket.created`
- `ticket.status_changed`
- `ticket.assigned`
- `ticket.comment_added`
- `ticket.attachment_added`

### Current implementation split

- `TicketsService` owns the business transaction boundary
- `TicketEventsService` owns event creation for ticket lifecycle actions
- `OutboxService` owns persistence and state transitions
- `OutboxDispatcherService` owns claiming, dispatching, retry decisions, and completion/failure transitions
- `OutboxRunnerService` owns automatic in-process polling
- handler implementations own topic-specific processing

### Processing model

Current states:
- `PENDING`
- `PROCESSING`
- `PROCESSED`
- `FAILED`

Retry rule in MVP:
- failed events are retryable while `attempts < OUTBOX_MAX_ATTEMPTS`
- retryable failed events use `next_retry_at`
- permanently failed events remain `FAILED` with `attempts >= OUTBOX_MAX_ATTEMPTS` and no further retry window

### Contract ownership

Shared event topics and payload contracts live in `packages/shared/src/events.ts`.

## Consequences

- additive modules can attach to persisted lifecycle events instead of requiring direct feature-to-feature calls
- the current solution stays simple enough for a modular monolith
- automatic processing now happens inside the API process via polling, not via an external queue
- `published_at` currently acts as the successful processing timestamp; the name is semantically imperfect, but kept for MVP to avoid unnecessary invasive churn

## Follow-up

Future modules should consume outbox events instead of adding direct calls into ticket write paths wherever the integration is additive rather than transactional.
