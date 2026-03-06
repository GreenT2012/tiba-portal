# RBAC Matrix

## Grundlage

Diese Matrix beschreibt den aktuell implementierten Stand in `apps/api` und `apps/web`.

- Bei Widerspruch zwischen bisheriger Dokumentation und Implementierung gilt der Code.
- "Sichtbar" bedeutet: über vorhandene API-Endpunkte oder bestehende Web-Flows erreichbar.
- "Tenant" entspricht `customer`.

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
| Tickets | `PATCH /tickets/:id/status` | Nein | Ja | Ja | Nur TIBA; tenant-fremde Tickets für Kunden/Tenants nicht sichtbar |
| Tickets | `PATCH /tickets/:id/assign` | Nein | Ja | Ja | Nur TIBA |
| Tickets | `POST /tickets/:id/comments` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Tickets | `POST /tickets/:id/attachments/presign-upload` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Tickets | `GET /tickets/:id/attachments/:attachmentId/presign-download` | Ja | Ja | Ja | Sichtbarkeit des Tickets entscheidet |
| Users | `GET /users` | Nein | Ja | Ja | Global |
| Users | `POST /users/provision` | Nein | Nein | Ja | Global |
| Users | `POST /users/:id/reset-password` | Nein | Nein | Ja | Global |

## Web-Matrix

| Bereich | `customer_user` | `tiba_agent` | `tiba_admin` |
| --- | --- | --- | --- |
| Login | Ja | Ja | Ja |
| Dashboard | Ja | Ja | Ja |
| Ticketliste `/tickets` | Ja | Ja | Ja |
| Ticketdetail `/tickets/[id]` | Ja | Ja | Ja |
| Ticket anlegen `/tickets/new` | Ja | Ja | Ja |
| Projekte `/projects` und `/projects/[id]` | Ja | Ja | Ja |
| TIBA Board `/tiba` | Nein | Ja | Ja |
| TIBA Customers `/tiba/customers` | Nein | Ja | Ja |
| TIBA Projects `/tiba/projects` | Nein | Ja | Ja |
| TIBA Users `/tiba/users` | Nein | Ja, aber mit eingeschränkten Aktionen | Ja |

## Wichtige Abweichungen und Ist-Stand

### API vs Web

- `PATCH /tickets/:id/status` ist jetzt in API und Web auf TIBA ausgerichtet.
- `GET /projects/:id` und tenant-scoped Ticket-Einzelzugriffe verwenden jetzt dieselbe Nicht-Sichtbarkeitssemantik (`404`).
- `TenantGuard` und `@RequireTenant()` bleiben als Grundlage vorhanden, die produktive Tenant-Prüfung erfolgt aber bewusst service-zentriert.

### Doku vs Code

- Frühere Texte implizierten teils, dass Statuswechsel TIBA-only seien. Implementiert ist das aktuell nicht.
- Frühere Login-Texte sprachen von Landingpage/Buttons. Implementiert ist jetzt `/login` als App-seitiger Einstieg.
- Frühere Projekt-Admin-Texte erwähnten teilweise `customerId` als Texteingabe. Implementiert ist inzwischen Customer-Auswahl im Web.

## Verbindliche Arbeitsannahmen

- Für fachliche Entscheidungen gilt bis zu einer expliziten Änderung: `tiba_agent` ist operativ gleichberechtigt zu `tiba_admin`, außer bei Benutzer-Provisionierung und Passwort-Reset.
- Tenant-Isolation ist Kernregel für `customer_user` und darf nicht auf UI-Checks allein beruhen.
- Web-Sichtbarkeit ersetzt keine API-Autorisierung. Wenn ein API-Endpoint restriktiver sein soll, muss das im Backend nachgezogen werden.
