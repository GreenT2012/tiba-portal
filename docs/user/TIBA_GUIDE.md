# TIBA Internal Guide (Draft)

## Purpose

This guide documents internal support and administration workflows.

## Navigation

After login, use the product modules in the top navigation:
- `Dashboard` as the operational entry and overview screen, including compact module counts and direct queue shortcuts.
- `Tickets` for queue views, triage, assignment, status work, and ticket detail screens.
- `Projects` for shared project views and project management flows.
- `Admin` for customer and user administration.
- `Logout` to trigger SSO logout via `/logout`.

Important structure rule:

- `New Ticket` is a screen and flow inside `Tickets`, not its own module.
- The former `/tiba` board path is only a transitional route; operational queue logic belongs to `Tickets` and summary shortcuts belong to `Dashboard`.

## Dashboard

Use `Dashboard` as the main entry for internal work:
- jump into `New`, `Open`, or `My` ticket views
- open `Projects`
- open `Admin` for customer and user management

## Tickets Module

Use `Tickets` for operational ticket work:
- `New`: unassigned incoming tickets
- `Open`: active work queue
- `My`: tickets assigned to your current user
- `Closed`: resolved items

Key flows inside `Tickets`:
- assign ticket to yourself
- change ticket status
- open ticket detail
- create ticket manually when needed

## Projects Module

Use `Projects` for shared project work:
- browse project list and project detail screens
- internal users can open project management flows via `/projects/manage`
- create, rename, archive, and unarchive projects inside the `Projects` module

## Admin Module

Use `Admin` for administrative flows:
- `Customers`: create and review tenants
- `Users`: search users, provision users, assign roles, and reset passwords

## Rollenhinweis

- `tiba_agent` works cross-tenant on tickets, projects, and customer administration.
- `tiba_admin` additionally manages user provisioning and password reset flows.

## Planned Flows

- access dashboard and jump into the right module
- triage and assign tickets
- update ticket status and communicate through ticket detail
- manage projects and customer tenants
- manage users without the Keycloak admin console
