# TIBA Internal Guide (Draft)

## Purpose

This guide will document internal support and operations workflows.

## Navigation

After login, use the top navigation:
- `Dashboard` as the main operational overview and entry point.
- `Tickets` for triage and ticket operations.
- `New Ticket` for manual ticket creation.
- `Logout` to trigger SSO logout via `/logout`.

Hinweis:

- Diese Navigation beschreibt den aktuellen Implementierungsstand.
- Das Zielbild ist:
  - Dashboard als Haupteinstieg
  - Queue-/Board-Logik innerhalb von Dashboard und `Tickets`
  - `Admin` als Rahmen für `Customers` und `Users`

## TIBA Board

Open `/tiba` to use operational triage tabs:
- `New`: unassigned incoming tickets (`view=new`).
- `Open`: active work queue (`view=open`).
- `My`: tickets assigned to your user (`view=my`).
- `Closed`: resolved items (`status=CLOSED`).

Board actions:
- `Assign to me` in `New` assigns the ticket to your current user.
- In `Open`/`My`, change status inline (`OPEN`, `IN_PROGRESS`, `CLOSED`).
- Click a ticket title to open detail view at `/tickets/[id]`.

Zielbild:

- Diese Logik bleibt fachlich relevant, aber nicht als eigener dauerhafter Produktbereich.
- Die bisherigen Board-Ansichten sollen später in Dashboard-Kacheln und Ticket-Listenansichten überführt werden.

## Project Admin

Open `/tiba/projects` to manage customer projects:
- Create projects by selecting a customer and entering a project name.
- Rename existing projects.
- Archive/unarchive projects without deleting history.

## User Management

Open `/tiba/users` to manage Keycloak users from the portal:
- Search users by username/email.
- Create users with roles (`customer_user`, `tiba_agent`, `tiba_admin`).
- For `customer_user`, assign a tenant via `customer_id` attribute (`customerId` in UI/API).
- Set a temporary password for selected users.

## Rollenhinweis

- `tiba_agent` arbeitet operativ cross-tenant an Tickets, Kunden und Projekten.
- `tiba_admin` hat zusätzlich die administrativen Benutzer-Flows für Provisionierung und Passwort-Reset.

## Planned Flows

- Access internal dashboard
- Triage and assign tickets
- Update customer-facing status and SLAs
- Export audit logs and activity views

## TODO

- Add role-specific workflows for support/admin/engineering
