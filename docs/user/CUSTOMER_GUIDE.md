# Customer Guide (Draft)

## Purpose

This guide documents customer-facing portal flows.

## Navigation

After login, use the top navigation:
- `Dashboard` as the main overview and entry point.
- `Tickets` for ticket list and detail pages.
- `New Ticket` for the ticket creation wizard.
- `Logout` to trigger SSO logout via `/logout`.

Zielbild:

- Das Dashboard ist der zentrale Einstieg.
- Von dort führen Kacheln in die Hauptbereiche wie `Tickets` und `Projects`.

## Login Flow (MVP)

1. Open `http://localhost:3000`.
2. You are redirected to `/login`.
3. Click `Sign in with Keycloak`.
4. After successful login, navigate to `/dashboard` or `/tickets`.
4. Browser calls only web BFF routes (`/api/backend/*`); API tokens stay server-side in the session flow.

## Create Ticket With Attachments (MVP)

1. Login and open `/tickets`.
2. Click `New Ticket`.
3. Fill the wizard details step:
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

## Logout Options

- `Logout` in the header uses `/logout` for SSO logout.
- After logout, the next login should show the Keycloak credential screen (no automatic SSO re-entry).

## Rolle und Grenzen

- `customer_user` sieht nur Projekte und Tickets des eigenen Customer-Tenants.
- Projekte können nur innerhalb des eigenen Tenants ausgewählt werden.
- Archivierte Projekte erscheinen nicht in der Ticketerstellung.
