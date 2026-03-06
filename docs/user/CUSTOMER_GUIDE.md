# Customer Guide (Draft)

## Purpose

This guide documents customer-facing portal flows.

## Navigation

After login, use the product modules in the top navigation:
- `Dashboard` as the main overview and entry point, including compact ticket/project counts.
- `Tickets` for ticket list, ticket detail, and the ticket creation flow.
- `Projects` for project list and project detail screens.
- `Logout` to trigger SSO logout via `/logout`.

Structure rule:

- `Create Ticket` is a screen and flow inside `Tickets`, not its own module.

## Login Flow (MVP)

1. Open `http://localhost:3000`.
2. You are redirected to `/login`.
3. Click `Sign in with Keycloak`.
4. After successful login, you are routed into `/dashboard`.
5. Browser calls only web BFF routes (`/api/backend/*`); API tokens stay server-side in the session flow.

## Tickets Module

Use `Tickets` to:
- review your open tickets
- open ticket detail
- create a new ticket from the module entry or dashboard shortcut

## Create Ticket With Attachments (MVP)

1. Login and open `/tickets`.
2. Click `Create Ticket`.
3. Fill the ticket creation screen:
   - `Project` (searchable dropdown, scoped to your active customer projects; archived projects are hidden)
   - `type`
   - `title`
   - `description`
4. Continue to the attachments step.
5. Select one or more files (allowed: `image/*`, `application/pdf`).
6. Submit `Create Ticket`.
7. The web app will:
   - create the ticket via `/api/backend/tickets`
   - request presigned upload URLs via `/api/backend/tickets/:id/attachments/presign-upload`
   - upload files with HTTP `PUT` to the returned URLs
8. You are redirected back to `/tickets`; uploaded attachments are linked to the created ticket.

## Projects Module

Use `Projects` to browse the projects available in your tenant and open project detail screens.

## Logout

- `Logout` in the header uses `/logout` for SSO logout.
- After logout, the next login should show the Keycloak credential screen (no automatic SSO re-entry).

## Rolle und Grenzen

- `customer_user` sees only projects and tickets of the current customer tenant.
- Project selection in ticket creation stays tenant-scoped.
- Archived projects do not appear in the ticket creation flow.
