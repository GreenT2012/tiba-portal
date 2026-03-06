# Modularity Review

## Verdict

The current architecture is `fundamentally modular, but with clear extension risks`.

The project already follows a usable modular monolith shape:
- backend modules exist for `customers`, `projects`, `tickets`, and `users`
- the web app is separated from the API by a BFF boundary
- shared contracts exist in `packages/shared`
- tenant and authorization rules are explicit and testable

That is enough to keep building. It is not yet enough to guarantee cheap additive feature work without touching central orchestration code.

The main reason is simple: the system has module folders, but some critical business flows are still concentrated in a few high-knowledge services and page-level integrations.

## Scope Reviewed

This review is based on the actual code in:
- `apps/api`
- `apps/web`
- `packages/shared`
- `docs/dev`

It does not assess visual design or UX quality.

## What Is Already Modular

### API module shape is real

The API is not a random file collection. It has clear top-level modules:
- `customers`
- `projects`
- `tickets`
- `users`
- cross-cutting infrastructure around `prisma`, `auth`, `audit`, and `storage`

Adding a new Nest module is technically straightforward.

### Tenant and auth rules are explicit

Tenant and visibility logic is not hidden in controllers or Prisma queries scattered everywhere. The current code centralizes the critical rules in service-level helpers and service methods. That is good for correctness and testability.

### BFF boundary reduces browser coupling

The web app does not talk directly to Nest. Authentication tokens stay server-side, and the BFF already normalizes error behavior. That is a solid integration boundary.

### Shared contracts are starting to matter

`packages/shared` is already used for important shared rules:
- roles
- ticket status and type values
- response contracts
- API error envelope

That is a real foundation, not just a placeholder.

## Where Modularity Breaks Down

### 1. `TicketsService` is the main coupling hotspot

`apps/api/src/tickets/tickets.service.ts` currently knows too much:
- ticket persistence and filtering
- tenant visibility rules
- audit writes
- attachment presign flow
- assignee enrichment through the users/keycloak integration
- operational list semantics like `new`, `open`, and `my`

This is still manageable for MVP, but it means new ticket-adjacent features will almost certainly require editing the existing ticket module instead of attaching themselves cleanly.

Examples:
- notifications
- SLA timers
- escalations
- reporting snapshots
- webhook emission

That is the biggest modularity risk in the current codebase.

### 2. Cross-cutting concerns exist, but mostly as direct helpers

The project has reusable building blocks such as:
- `AuditService`
- `StorageService`
- auth helper functions in `auth/authz.ts`

That is useful, but they are still called directly by feature services. There is no explicit extension seam such as domain events, ports, or an outbox-based integration pipeline.

Result: new modules are likely to be integrated by adding more direct calls into existing services.

### 3. There is no real additive event model yet

The docs already point toward outbox/event contracts, but the implemented code does not use them yet.

That means a future module like `notifications` would currently need one of these approaches:
- add direct calls into `TicketsService`
- add more logic into `AuditService`
- re-query the database indirectly after ticket writes

All three create tighter coupling than necessary.

### 4. `packages/shared` is useful, but too flat

`packages/shared/src/index.ts` currently acts as a single contract barrel for many domains.

This is acceptable at MVP size, but it does not scale well.

Risks:
- unrelated contracts accumulate in one place
- domain ownership becomes unclear
- downstream code starts importing everything from one flat surface

The package should remain the contract boundary, but it should evolve into domain-sliced exports rather than a single growing file.

### 5. The web is still page-centric, not module-centric

In `apps/web`, most backend interaction still lives close to pages and local components. The BFF gives a clean transport boundary, but feature composition is not yet strongly modular inside the web app.

Current consequences:
- repeated local fetch/orchestration patterns
- page-level knowledge about query params, filters, and lookup composition
- adding a new feature area often requires touching navigation, middleware assumptions, page code, and local data helpers separately

This is not broken, but it is less additive than it should become before the product gets much larger.

### 6. Some architecture docs still lag behind implementation

The most relevant example is tenant enforcement:
- current implementation is service-centered
- older architecture wording still suggests guard-centered tenant enforcement in places

That does not break runtime behavior, but it does create extension risk because future contributors may extend the wrong way.

## Dependency Assessment

## Direct service dependencies

Current state:
- `projects` and `customers` are relatively self-contained
- `users` owns Keycloak admin integration and is a reasonable boundary
- `tickets` depends on multiple cross-cutting services and optional `UsersService`

Assessment:
- acceptable for MVP
- too centralized in `tickets` for long-term additive growth

## Shared contracts

Current state:
- `packages/shared` is already valuable
- contracts are shared across API and web, especially for errors and enums

Assessment:
- this is the right direction
- the package should grow by domain, not as a generic dumping ground

## API/BFF coupling

Current state:
- BFF mainly handles auth, forwarding, and error normalization
- business-specific semantics still live mostly in pages

Assessment:
- transport boundary is good
- feature-level composition is still thin

## Roles and tenant logic

Current state:
- role checks are primarily controller-level
- tenant and visibility checks are primarily service-level
- `404` semantics for hidden tenant resources are established

Assessment:
- this is coherent enough
- it is a good extension rule if kept strict
- new modules must follow the same split or the architecture will drift

## Can New Modules Be Added Easily?

## Backend modules

### Good

Adding a new module such as `reports` or `notifications` is technically easy:
- create a Nest module
- wire it into `AppModule`
- use `PrismaService` and shared auth helpers if needed

### Risk

If the new module depends on ticket lifecycle changes, the current architecture offers no clean subscription seam. In practice, developers will be tempted to modify `TicketsService` directly.

## Web modules

### Good

Adding a new route area is straightforward.

### Risk

A new web feature usually needs coordinated edits across:
- route/page files
- navigation
- BFF usage patterns
- local fetch state/error handling
- role-based visibility logic

That means the web can grow, but not yet with minimal touch points.

## Example Feature: Notifications

## Likely affected existing modules

A real notification feature would likely touch:
- `tickets` for lifecycle triggers such as `created`, `assigned`, `status_changed`, `comment_added`, `attachment_added`
- `users` for recipient resolution and profile metadata
- `customers` or tenant context for routing and scoping
- `web` for future inbox/badge/settings surfaces

## Best integration points

Preferred future shape:
- ticket operations emit domain events or outbox records
- notification module consumes these events
- notification delivery logic stays outside `tickets`
- user/channel preferences are owned by the notification module

## Current unnecessary couplings

Without that seam, notifications would likely be implemented by editing multiple existing ticket write paths directly.

That would make:
- ticket logic harder to reason about
- testing more coupled
- future replacement of delivery channels harder

## What would make notifications cheap to add

Minimum structural preparation:
1. Define domain events for ticket lifecycle changes.
2. Add an outbox or internal event publisher boundary.
3. Keep notification policy and delivery in a separate module.
4. Reuse `packages/shared` for event payload contracts.

The same preparation would also help for:
- SLA management
- reports/analytics extraction
- webhook integrations
- audit stream consumers

## Overall Assessment by Area

## `apps/api`

Assessment: `mostly modular with one dominant orchestration hotspot`

Strengths:
- clear feature modules
- good cross-cutting infrastructure placement
- explicit auth/tenant model

Weaknesses:
- too much ticket-centered orchestration
- no additive event seam
- some cross-module interactions are still direct rather than via stable ports

## `apps/web`

Assessment: `functionally modular, structurally still page-oriented`

Strengths:
- clear BFF boundary
- route-based feature separation
- role-aware navigation and access control already exist

Weaknesses:
- feature data logic is spread across pages/components
- no strong per-domain client module layer
- navigation and feature visibility remain somewhat hard-coded

## `packages/shared`

Assessment: `valuable and necessary, but needs domain slicing`

Strengths:
- already useful as contract boundary
- prevents drift in core enums and error contracts

Weaknesses:
- single-file growth path will become a maintenance problem
- unclear future ownership if it expands without structure

## Recommended Architecture Rule Set

These rules should be treated as the default extension strategy from now on:

1. New business features should land as new modules, not as extra branches inside unrelated services.
2. Controller layer owns authentication and role gates.
3. Service layer owns tenant visibility and resource access rules.
4. Shared contracts belong in `packages/shared`, but grouped by domain.
5. Cross-module reactions should prefer events/outbox over direct service-to-service calls when the integration is additive rather than transactional.
6. Web routes may stay page-based, but shared feature data access and state handling should move into per-domain helpers/components before the surface grows much further.

## Priority Improvements

### P1. Introduce an explicit domain event or outbox seam

Problem:
- additive modules currently need to edit core write services directly

Why it blocks extensibility:
- notifications, SLA, and reporting will otherwise couple tightly to `tickets`

Recommended improvement:
- introduce internal domain events or outbox records for ticket lifecycle actions first

### P2. Break up the ticket orchestration hotspot gradually

Problem:
- `TicketsService` combines too many responsibilities

Why it blocks extensibility:
- the module becomes the forced integration point for unrelated concerns

Recommended improvement:
- extract internal collaborators over time, for example:
  - ticket query logic
  - attachment workflow orchestration
  - assignee enrichment
  - ticket domain event publication

### P3. Split `packages/shared` by domain

Problem:
- one flat shared barrel will not scale

Why it blocks extensibility:
- contracts become harder to own, review, and evolve safely

Recommended improvement:
- move toward structure such as:
  - `tickets/*`
  - `projects/*`
  - `customers/*`
  - `users/*`
  - `errors/*`
  - `pagination/*`

### P4. Add a lightweight web feature data layer

Problem:
- page-local fetch orchestration creates repeated coupling

Why it blocks extensibility:
- new product areas must repeat role checks, filters, error mapping, and lookup composition

Recommended improvement:
- introduce small per-domain web helpers/hooks for tickets, projects, customers, and users

### P5. Keep architecture docs aligned with runtime reality

Problem:
- stale architecture guidance causes extension drift

Why it blocks extensibility:
- people build the wrong pattern when code and docs disagree

Recommended improvement:
- document service-centered tenant enforcement and additive module guidance explicitly

## Final Assessment

The project has not failed its modular architecture goal.

But it has also not yet reached the point where new features can be added with consistently low coupling.

The correct summary is:

`The codebase is fundamentally modular, but it currently relies on a few central orchestration paths that will make future feature modules more expensive unless explicit extension seams are added next.`
