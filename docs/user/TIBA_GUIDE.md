# TIBA Internal Guide (Draft)

## Purpose

This guide will document internal support and operations workflows.

## Navigation

After login, use the top navigation:
- `Dashboard` for internal overview.
- `Tickets` for triage and ticket operations.
- `New Ticket` for manual ticket creation.
- `TIBA Board` for role-specific operational views.
- `Logout` to trigger SSO logout via `/logout`.

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

## Project Admin

Open `/tiba/projects` to manage customer projects:
- Create projects with `customerId` + `name`.
- Rename existing projects.
- Archive/unarchive projects without deleting history.

## Planned Flows

- Access internal dashboard
- Triage and assign tickets
- Update customer-facing status and SLAs
- Export audit logs and activity views

## TODO

- Add role-specific workflows for support/admin/engineering
