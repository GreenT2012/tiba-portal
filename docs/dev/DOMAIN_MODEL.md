# Domain Model

## Kernobjekte

### Customer

- Repräsentiert einen Tenant.
- Felder:
  - `id`
  - `name`
  - `createdAt`
  - `updatedAt`

### Project

- Gehört genau zu einem Customer.
- Felder:
  - `id`
  - `customerId`
  - `name`
  - `isArchived`
  - `createdAt`
  - `updatedAt`

### Ticket

- Gehört genau zu einem Project und damit zu genau einem Customer.
- Felder:
  - `id`
  - `customerId`
  - `projectId`
  - `type`
  - `status`
  - `title`
  - `description`
  - `assigneeUserId`
  - `createdByUserId`
  - `createdAt`
  - `updatedAt`

### TicketComment

- Gehört genau zu einem Ticket.
- Ist tenant-scoped über `customerId`.
- Felder:
  - `id`
  - `ticketId`
  - `customerId`
  - `authorUserId`
  - `body`
  - `createdAt`

### TicketAttachment

- Gehört genau zu einem Ticket.
- Ist tenant-scoped über `customerId`.
- Felder:
  - `id`
  - `ticketId`
  - `customerId`
  - `filename`
  - `mime`
  - `sizeBytes`
  - `objectKey`
  - `uploadedByUserId`
  - `createdAt`

### AuditLog

- Append-only.
- Kann tenant-scoped (`customerId`) oder global (`null`) sein.
- Felder:
  - `id`
  - `customerId`
  - `entityType`
  - `entityId`
  - `action`
  - `actorUserId`
  - `actorRole`
  - `metaJson`
  - `createdAt`

## Verbindliche Werte

### Rollen

- `customer_user`
- `tiba_agent`
- `tiba_admin`

### Ticketstatus

Implementierter und verbindlicher Satz:

- `OPEN`
- `IN_PROGRESS`
- `CLOSED`

Hinweis:
- `packages/shared` verwendete zuvor ein abweichendes Altmodell (`open`, `in_progress`, `blocked`, `resolved`). Das wird an den aktuellen Implementierungsstand angepasst.

### Tickettypen

Implementierter und verbindlicher Satz:

- `Bug`
- `Feature`
- `Content`
- `Marketing`
- `Tracking`
- `Plugin`

### Projektzustände

- `active`
  - technisch: `isArchived = false`
- `archived`
  - technisch: `isArchived = true`

Archivierte Projekte:
- bleiben lesbar
- bleiben administrierbar
- sollen für Kunden nicht mehr als Ziel für neue Tickets auswählbar sein

## Tenant-Modell

- Tenant = `Customer`
- Serverseitig relevante Tenant-Felder:
  - `Project.customerId`
  - `Ticket.customerId`
  - `TicketComment.customerId`
  - `TicketAttachment.customerId`
  - `AuditLog.customerId`

Regeln:
- `customer_user` darf nur Daten mit eigener `customerId` sehen oder verändern.
- TIBA-Rollen arbeiten grundsätzlich cross-tenant.
- Bei TIBA-Ticketerstellung wird der Tenant aus dem gewählten Projekt abgeleitet, nicht frei eingegeben.
- Nicht sichtbare tenant-scoped Einzelressourcen werden nach außen als `404` behandelt.

## Listen- und Filterlogik

### Tickets

Unterstützte Filter:

- `customerId`
  - nur für TIBA
- `projectId`
- `status`
- `assignee`
  - `me`
  - `unassigned`
- `view`
  - `new`
  - `open`
  - `my`
- `sort`
  - `updatedAt`
  - `createdAt`
- `order`
  - `asc`
  - `desc`

Verbindliche View-Semantik:

- `new`
  - `status = OPEN`
  - `assigneeUserId IS NULL`
- `open`
  - `status IN (OPEN, IN_PROGRESS)`
- `my`
  - `assigneeUserId = currentUser`
  - `status != CLOSED`
- `closed`
  - keine eigene API-View
  - Abbildung über `status = CLOSED`

### Projects

Unterstützte Filter:

- `q`
- `customerId` nur für TIBA
- `page`
- `pageSize`
- `sort`
  - `name`
  - `createdAt`
- `order`
  - `asc`
  - `desc`

### Customers

Unterstützte Filter:

- `q`
- `page`
- `pageSize`
- `sort`
  - `name`
  - `createdAt`
- `order`
  - `asc`
  - `desc`

## Workflow-Implikationen

- Kommentare und Attachments verändern fachlich den Ticketkontext, aber nicht den Ticketstatus.
- Zuweisung und Statuswechsel werden auditiert.
- Projektarchivierung wirkt auf neue Ticketerstellung, nicht auf Bestandstickets.
- Benutzer-Provisionierung ist kein Domänenobjekt der Applikationsdatenbank, sondern ein Keycloak-Admin-Flow mit Zuordnung über Rollen und `customer_id`-Attribut.
