# MVP Scope

## Zielbild des MVP

Das MVP ist ein selbst gehostetes Kundenportal plus internes TIBA-Operations-Frontend für ticketbasierte Zusammenarbeit zwischen Kunden und TIBA.

## In Scope

### Auth und Identität

- Login über Keycloak
- Rollenbasierte Session im Web (`customer_user`, `tiba_agent`, `tiba_admin`)
- Tenant-Zuordnung über `customer_id` Claim für Kunden
- Verlässlicher Logout mit App-Loginseite `/login`

### Kunden- und Projektstamm

- Kunden anlegen und umbenennen
- Projekte anlegen, umbenennen, archivieren und auflisten
- Projektansicht mit zugehörigen Tickets

### Ticketing-Kern

- Ticket anlegen
- Ticketlisten mit den implementierten Views:
  - `new`
  - `open`
  - `my`
  - `closed` über `status=CLOSED`
- Ticketdetail anzeigen
- Kommentare hinzufügen
- Attachments per Presign-Upload/-Download
- Zuweisung durch TIBA
- Statusänderung über API; im Web aktuell primär durch TIBA

### Interne Operations-Flows

- operative Queue-Logik für Eingang, Bearbeitung und Zuweisung
- Suche nach Benutzern
- Benutzer-Provisionierung in Keycloak durch `tiba_admin`
- Temporäres Passwort setzen durch `tiba_admin`

### Audit und Nachvollziehbarkeit

- Audit-Log für:
  - Ticket erstellt
  - Status geändert
  - Zuweisung geändert
  - Kommentar hinzugefügt
  - Attachment hinzugefügt

## Zwingende MVP-Workflows

1. Kunde meldet sich an und sieht nur eigene Projekte und Tickets.
2. Kunde erstellt ein Ticket mit Beschreibung und optionalen Attachments.
3. TIBA sieht neue Tickets über Dashboard-/Ticket-Queue-Logik, weist sie zu und bearbeitet sie.
4. TIBA kann Kommentare hinzufügen und den Bearbeitungsstand ändern.
5. TIBA kann Kunden, Projekte und Benutzer ohne Keycloak-Admin-Console im Tagesgeschäft verwalten.

## Bewusst Out of Scope

- SLA- und Eskalationslogik
- E-Mail-Benachrichtigungen
- Vollständige Benutzerverwaltung inkl. Deaktivieren/Löschen/Editieren bestehender Profile
- Projektlöschen
- Ticket-Löschen
- Freigabeworkflows, Mehrstufigkeit, Abnahmen
- Historisierung jenseits des bestehenden Audit-Logs
- Reporting, KPIs, Exportfunktionen
- Mandantenübergreifende Berechtigungsmodelle jenseits der drei bestehenden Rollen
- Feingranulare Rechte pro Projekt oder pro Ticket
- Outbox/Eventing als produktiver Prozess
- Content-Sniffing oder Malware-Checks für Uploads

## Nicht-funktionale MVP-Grenzen

- API-Casing ist camelCase, Datenbank bleibt snake_case.
- Keycloak bleibt die einzige Identity-Quelle.
- Browser spricht nur mit dem Web-BFF, nicht direkt mit der API.
- Tenant-Isolation für Kunden ist serverseitig erzwungen.

## Verbindliche MVP-Annahmen

- Ein `customer_user` gehört genau zu einem Customer-Tenant.
- Ein Projekt gehört genau zu einem Customer.
- Ein Ticket gehört genau zu einem Projekt und damit genau zu einem Customer.
- Archivierte Projekte bleiben sichtbar für Verwaltung, sollen aber nicht mehr für neue Kunden-Tickets auswählbar sein.
