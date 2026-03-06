# RBAC Matrix

## Grundlage

Diese Matrix beschreibt den aktuell implementierten Stand in `apps/api` und `apps/web`.

- Bei Widerspruch zwischen bisheriger Dokumentation und Implementierung gilt der Code.
- "Sichtbar" bedeutet: über vorhandene API-Endpunkte oder bestehende Web-Flows erreichbar.
- `customer` ist der Tenant.
- Produktstruktur wird entlang von Modulen, Screens und Flows beschrieben.

## Rollen

| Rolle | Sichtbarkeit | Erlaubte Aktionen | Tenant-Grenze |
| --- | --- | --- | --- |
| `customer_user` | Eigenes Profil (`/me`), eigene Projekte, eigene Tickets inkl. Kommentare/Attachments, eigene Projektseiten | Ticket anlegen, Ticketliste lesen, Ticketdetail lesen, Kommentare hinzufügen, Attachments hinzufügen, Attachment-Download anfordern | Immer auf `customerId` aus Token begrenzt |
| `tiba_agent` | Alle Kunden, Projekte, Tickets, Kundenlisten, Benutzerlisten | Tickets lesen, Tickets anlegen, Tickets zuweisen, Ticketstatus ändern, kommentieren, Attachments verwalten, Kunden anlegen/umbenennen, Projekte anlegen/umbenennen/archivieren, Benutzer suchen | Cross-tenant erlaubt; optionaler Scope über `customerId`-Query bzw. UI-Filter |
| `tiba_admin` | Alles, was `tiba_agent` sieht | Alles von `tiba_agent` plus Benutzer provisionieren und temporäre Passwörter setzen | Cross-tenant erlaubt |

## API-Matrix

| Bereich | Endpoint / Flow | `customer_user` | `tiba_agent` | `tiba_admin` | Tenant-Regel |
| --- | --- | --- | --- | --- | --- |
| Public | `GET /health` | Ja | Ja | Ja | Keine |
| Auth | `GET /me` | Ja | Ja | Ja | Liefert Token-Kontext |
| Customers | `GET /customers` | Nein | Ja | Ja | Keine Tenant-Begrenzung für TIBA |
| Customers | `POST /customers` | Nein | Ja | Ja | Global |
| Customers | `PATCH /customers/:id` | Nein | Ja | Ja | Global |
| Projects | `GET /projects` | Ja | Ja | Ja | `customer_user` immer auf Token-`customerId`; TIBA optional `customerId`-Filter |
| Projects | `GET /projects/:id` | Ja | Ja | Ja | `customer_user` nur eigenes Projekt |
| Projects | `POST /projects` | Nein | Ja | Ja | TIBA wählt Ziel-Customer explizit |
| Projects | `PATCH /projects/:id` | Nein | Ja | Ja | Global |
| Tickets | `GET /tickets` | Ja | Ja | Ja | `customer_user` nur eigener Tenant; TIBA optional `customerId` |
| Tickets | `POST /tickets` | Ja | Ja | Ja | `customer_user` nur eigenes Projekt; TIBA-Tenant wird aus Projekt abgeleitet |
| Tickets | `GET /tickets/:id` | Ja | Ja | Ja | `customer_user` nur eigener Tenant |
| Tickets | `PATCH /tickets/:id/status` | Nein | Ja | Ja | Nur TIBA; tenant-fremde Tickets bleiben unsichtbar |
| Tickets | `PATCH /tickets/:id/assign` | Nein | Ja | Ja | Nur TIBA |
| Tickets | `POST /tickets/:id/comments` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Tickets | `POST /tickets/:id/attachments/presign-upload` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Tickets | `GET /tickets/:id/attachments/:attachmentId/presign-download` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Users | `GET /users` | Nein | Ja | Ja | Global |
| Users | `POST /users/provision` | Nein | Nein | Ja | Global |
| Users | `POST /users/:id/reset-password` | Nein | Nein | Ja | Global |

## Web-Matrix nach Modulen

| Modul / Screen | `customer_user` | `tiba_agent` | `tiba_admin` |
| --- | --- | --- | --- |
| Dashboard `/dashboard` | Ja | Ja | Ja |
| Tickets Modul `/tickets` | Ja | Ja | Ja |
| Ticket Detail `/tickets/[id]` | Ja | Ja | Ja |
| Ticket anlegen `/tickets/new` | Ja | Ja | Ja |
| Projects Modul `/projects` und `/projects/[id]` | Ja | Ja | Ja |
| Project Management `/projects/manage` | Nein | Ja | Ja |
| Admin Modul `/admin` | Nein | Ja | Ja |
| Admin Customers `/admin/customers` | Nein | Ja | Ja |
| Admin Users `/admin/users` | Nein | Ja, aber mit eingeschränkten Aktionen | Ja |

## Übergangs- und Altpfade

- `/tiba` ist nur noch Übergangsroute und leitet in das `Tickets`-Modul weiter.
- `/tiba/customers` leitet in `Admin / Customers` weiter.
- `/tiba/users` leitet in `Admin / Users` weiter.
- `/tiba/projects` leitet in `Projects / Manage` weiter.

## Wichtige Architekturregeln

- Rollenprüfung erfolgt an den API-Endpunkten.
- Tenant-/Sichtbarkeitsprüfung erfolgt produktiv bewusst service-zentriert.
- Web-Sichtbarkeit ersetzt keine API-Autorisierung.
- Screens und Flows sind keine eigenen Module. `New Ticket`, `Ticket Detail` und Queue-Varianten bleiben Teil von `Tickets`.
