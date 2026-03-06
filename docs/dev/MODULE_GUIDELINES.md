# Module Guidelines

## Canonical Product Modules

The product is organized around four top-level modules:

- `Dashboard`
- `Tickets`
- `Projects`
- `Admin`

## What counts as a module

A module is a durable business area with:

- a clear purpose
- its own primary data
- its own core actions
- room for future additive extension

A new feature should become a new module only when it introduces a new business core, not just another page or workflow step.

## What does not count as a module

The following are not modules unless product scope changes materially:

- detail pages
- create/edit screens
- filter or queue variants
- operational shortcuts
- historical technical areas

Examples in this project:

- `New Ticket` is a screen and flow inside `Tickets`
- `Ticket Detail` is a screen inside `Tickets`
- comments, attachments, assignment, and status changes are flows inside `Tickets`
- project management is a flow inside `Projects`
- user provisioning and password reset are flows inside `Admin`
- the former `TIBA Board` is not a module; its logic belongs to `Dashboard` and `Tickets`

## Module boundaries in this project

### Dashboard

`Dashboard` is not a business module. It is the global entry and overview screen.

It should:

- aggregate compact views from other modules
- show role-based shortcuts and counts
- link into the main module screens

It should not own business logic that belongs to `Tickets`, `Projects`, or `Admin`.

Dashboard data may use an aggregation endpoint, but that endpoint is still only an overview seam and not a separate domain module.

### Tickets

`Tickets` is the ticket business module.

It owns:

- ticket lists and queue views
- ticket detail
- ticket creation
- comments
- attachments
- assignment
- status changes

### Projects

`Projects` is the shared project business module.

It owns:

- project list
- project detail
- project management flows
- role-dependent project actions

### Admin

`Admin` owns administrative and system-near management flows.

It owns:

- customer management
- user management
- future system-near administrative areas

## Decision rule for future work

For every change, classify it in this order:

1. existing module
2. screen inside that module
3. flow inside that module
4. cross-cutting function or additive subsystem

Prefer extending an existing module over creating a new one.

## Cross-cutting features

Cross-cutting features such as `Notifications`, `Reports`, or `SLA` should attach through defined seams:

- shared contracts in `packages/shared`
- backend module boundaries in `apps/api`
- internal integration seams such as the outbox
- feature-oriented web data access in `apps/web/features`

They should not reintroduce screen-centric top-level areas or direct coupling into unrelated pages.
