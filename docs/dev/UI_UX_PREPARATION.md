# UI/UX Preparation

## Entscheidung

Empfehlung: `beibehalten, aber strukturell neu ordnen`.

Die Produktbasis kann für den UI/UX-Track genutzt werden. Die bestehende fachliche Modellierung (`Tickets`, `Projects`, `Customers`, `Users`) ist tragfähig. Die aktuelle Seiten- und Navigationsstruktur wurde bereits in Richtung Zielbild bereinigt, bleibt aber in Teilen noch eine Übergangsstruktur.

Verbindliche Zielentscheidung:

- `Dashboard` wird für alle Rollen der Haupteinstieg.
- `Dashboard` zeigt rollenabhängige Kacheln als Primäreinstieg in Aufgaben und Bereiche.
- `TIBA Board` bleibt kein eigener dauerhafter Produktbereich.
- Die bisherige TIBA-Board-Logik wird in `Dashboard` und `Tickets` überführt.
- `Projects` bleibt ein gemeinsamer Bereich mit rollenabhängigen Aktionen.
- `Ticket Detail` bleibt reine Detailseite und kein Einstiegspunkt.

## Ist-Zustand im Code

Der aktuelle Web-Stand zeigt:

- `/dashboard` ist als globaler Einstieg vorhanden und zeigt inzwischen modulbezogene Kacheln und kompakte Overview-Daten.
- Die Primärnavigation ist aktuell modulzentriert:
  - `Dashboard`
  - `Tickets`
  - `Projects`
  - für interne Rollen zusätzlich `Admin`
- `/tickets` bündelt für interne Rollen die operative Queue-Logik (`new`, `open`, `my`, `closed`).
- `/projects` und `/projects/[id]` sind gemeinsame Bereiche; `/projects/manage` enthält interne Projektverwaltungs-Flows.
- `/admin/customers` und `/admin/users` bündeln die administrativen Screens.
- Alte `/tiba*`-Pfade bestehen nur noch als Übergangs-Redirects.

Bewertung:

- fachlich tragfähig
- strukturell noch zu technisch
- Navigation für TIBA aktuell zu breit und zu speziell
- `Create Ticket` ist fachlich eine Aktion bzw. ein Screen innerhalb des Moduls `Tickets`
- die frühere `TIBA Board`-Logik ist eine Queue-/Arbeitslogik innerhalb von `Tickets`, kein dauerhafter Top-Level-Bereich

## Verbindliche Ziel-Informationsarchitektur

## Primärnavigation

### Für `customer_user`

- `Dashboard`
- `Tickets`
- `Projects`

### Für `tiba_agent`

- `Dashboard`
- `Tickets`
- `Projects`

### Für `tiba_admin`

- `Dashboard`
- `Tickets`
- `Projects`
- `Admin`

## Sekundärnavigation

### Unter `Tickets`

- `All Tickets`
- rollenabhängige Filteransichten
  - `New`
  - `Open`
  - `My`
  - `Closed`

Hinweis:

- Diese Ansichten sind keine eigenen Produktbereiche, sondern Ticket-Listenmodi.

### Unter `Projects`

- `Project List`
- `Project Detail`

### Unter `Admin`

- `Customers`
- `Users`

## Dashboard als globaler Einstieg

## Grundprinzip

Das Dashboard ist für alle Rollen der erste Screen nach dem Login.

Es beantwortet drei Fragen:

1. Was ist gerade relevant?
2. Was ist mein nächster sinnvoller Schritt?
3. In welchen Hauptbereich muss ich jetzt wechseln?

## Dashboard-Kacheln pro Rolle

### `customer_user`

Empfohlene Kacheln:

- `Open Tickets`
  - zeigt Anzahl und Einstieg in `/tickets`
- `My Recent Tickets`
  - zeigt letzte Aktivität, Einstieg in `/tickets`
- `Projects`
  - Einstieg in `/projects`
- `Create Ticket`
  - primäre Aktionskachel, Einstieg in `/tickets/new`

### `tiba_agent`

Empfohlene Kacheln:

- `New Tickets`
  - basiert auf bisherigem `view=new`
  - Einstieg in `/tickets?view=new`
- `Open Tickets`
  - Einstieg in `/tickets?view=open`
- `My Tickets`
  - Einstieg in `/tickets?view=my`
- `Projects`
  - Einstieg in `/projects`

Zusatzbereich auf Dashboard:

- kompakte Arbeitsliste mit wenigen dringendsten Tickets
- Schnellaktionen:
  - `Assign to me`
  - `Open ticket`

### `tiba_admin`

Empfohlene Kacheln:

- `New Tickets`
- `Open Tickets`
- `My Tickets`
- `Projects`
- `Admin`
  - Einstieg in Verwaltungsbereiche

Admin-Unterkacheln oder Shortcuts:

- `Customers`
- `Users`

## Verortung der bisherigen TIBA-Board-Logik

## Was ins Dashboard gehört

- Ticket-Zähler für:
  - `New`
  - `Open`
  - `My`
  - optional `Closed`
- kleine priorisierte Arbeitsliste
- Schnellaktionen für interne Rollen:
  - `Assign to me`
  - `Open ticket`

Das Dashboard wird damit zur operativen Einstiegsseite für TIBA, ohne einen separaten Sonderbereich zu benötigen.

## Was in `Tickets` gehört

- vollständige Listenansichten
- Such- und Filterlogik
- Status- und Typ-Filter
- Umschaltung zwischen:
  - `All`
  - `New`
  - `Open`
  - `My`
  - `Closed`

Damit wird die bisherige Board-Logik als Ticket-Listenlogik integriert.

## Was nicht als eigener Bereich bleiben sollte

- `/tiba` als dauerhafter Top-Level-Bereich

Empfohlene Zukunft:

- kurzfristig kann `/tiba` als Übergangsroute bestehen bleiben
- mittelfristig sollten seine Inhalte im Dashboard und in `/tickets` aufgehen

## Hauptseiten der Zielstruktur

## 1. Dashboard

Zweck:

- globaler Einstieg
- Überblick
- schnelle Orientierung

Rollen:

- alle

Wichtigste Daten:

- Session/Rolle
- Ticketzahlen je relevanter Sicht
- letzte relevante Tickets
- Projektanzahl oder zuletzt genutzte Projekte
- für TIBA Admin-Hinweise oder Verwaltungszugänge

Wichtigste Aktionen:

- `Open Tickets`
- `Open Projects`
- `Create Ticket`
- für TIBA:
  - `Assign to me`
  - `Go to New Tickets`
  - `Go to My Tickets`
  - `Open Admin`

Einstiegspfade:

- Login -> Dashboard
- globale Primärnavigation -> Dashboard

## 2. Tickets

Zweck:

- zentraler Arbeitsbereich für Tickets

Rollen:

- alle

Wichtigste Daten:

- Ticketlisten
- Rollen-/Tenant-gerechte Filter
- Projektlabels
- optional Customerlabels und Assignee-Labels

Wichtigste Aktionen:

- Ticket öffnen
- Filter umschalten
- Ticket anlegen
- für TIBA:
  - Status ändern
  - Zuweisen

Einstiegspfade:

- Dashboard-Kacheln
- Primärnavigation

## 3. Ticket Detail

Zweck:

- Detail- und Arbeitssicht eines einzelnen Tickets

Rollen:

- alle mit Sichtbarkeit auf das Ticket

Wichtigste Daten:

- Ticketstammdaten
- Beschreibung
- Kommentare
- Attachments
- Assignee
- Status

Wichtigste Aktionen:

- Kommentar hinzufügen
- Attachments ansehen/herunterladen/hochladen
- für TIBA:
  - Status ändern
  - Assignee ändern

Einstiegspfade:

- aus `Tickets`
- aus `Projects / Detail`
- aus Dashboard-Arbeitslisten

## 4. Ticket Create

Zweck:

- neue Arbeit schnell und korrekt erfassen

Rollen:

- alle

Wichtigste Daten:

- Projekte
- optional Kundenliste für TIBA
- optional Assignee-Auswahl für TIBA

Wichtigste Aktionen:

- Ticket erstellen
- Attachments hinzufügen

Einstiegspfade:

- Dashboard-Kachel `Create Ticket`
- CTA aus `Tickets`

## 5. Projects

Zweck:

- Überblick über Projektkontexte

Rollen:

- alle

Wichtigste Daten:

- Projektliste
- für TIBA zusätzlich Kundenkontext

Wichtigste Aktionen:

- Projekt öffnen
- für TIBA:
  - Projektdaten pflegen
  - Projekt archivieren

Einstiegspfade:

- Dashboard-Kachel
- Primärnavigation

## 6. Project Detail

Zweck:

- Tickets innerhalb eines Projekts bündeln

Rollen:

- alle mit Projektsichtbarkeit

Wichtigste Daten:

- Projektdaten
- projektbezogene Tickets

Wichtigste Aktionen:

- Tickets nach Status ansehen
- Ticket öffnen

Einstiegspfade:

- aus `Projects`

## 7. Admin

Zweck:

- Verwaltungsbereich für interne Administration

Rollen:

- `tiba_admin`

Wichtigste Daten:

- Admin-Zugänge
- Kunden- und Benutzerzugänge

Wichtigste Aktionen:

- `Open Customers`
- `Open Users`

Einstiegspfade:

- Dashboard-Kachel
- Primärnavigation

## 8. Admin / Customers

Zweck:

- Tenant-Verwaltung

Rollen:

- `tiba_admin`

Wichtigste Daten:

- Kundenliste

Wichtigste Aktionen:

- Kunde anlegen
- Kunde suchen
- Kunde umbenennen

Einstiegspfade:

- `Admin`

## 9. Admin / Users

Zweck:

- Benutzer-Provisionierung und Passwort-Reset

Rollen:

- `tiba_admin`

Wichtigste Daten:

- Benutzerliste
- Kundenliste
- Rollen

Wichtigste Aktionen:

- Benutzer suchen
- Benutzer provisionieren
- Passwort zurücksetzen

Einstiegspfade:

- `Admin`

## Bestehende Routen: Zielbewertung

## Bestehen bleiben

- `/dashboard`
- `/tickets`
- `/tickets/new`
- `/tickets/[id]`
- `/projects`
- `/projects/[id]`

## Zusammenführen oder umschneiden

- `/tiba`
  - nicht als dauerhafter eigener Bereich
  - Board-Logik in Dashboard und Ticket-Listen integrieren
- `/tiba/projects`
  - nicht als eigener Produktbereich
  - langfristig in gemeinsamen `Projects`-Bereich mit rollenabhängigen Aktionen überführen

## Umbenennen oder neu rahmen

- `TIBA Board` -> keine dauerhafte Zielbezeichnung
- interne Queue-Logik wird:
  - Dashboard-Kacheln
  - Ticket-Listenfilter
  - optionale Unteransichten innerhalb von `Tickets`

## Langfristig entfallen

- die Idee eines separaten Top-Level-Produktsilos `TIBA`

## Übergang von aktueller Struktur zur Zielstruktur

## Kurzfristig

- `/dashboard` fachlich als echter Einstieg neu definieren
- `/tiba` als Übergangsroute bestehen lassen
- `/tickets` um interne Filteransichten erweitern
- `Projects` als gemeinsames Zielbild festschreiben

## Mittelfristig vor dem eigentlichen Design-Track

1. Dashboard-Kachelmodell definieren
2. Ticketlisten-IA definieren:
   - welche Views als Tabs/Filter erscheinen
3. Admin als Zielrahmen definieren:
   - `Customers`
   - `Users`
4. entscheiden, wie Projektverwaltung im gemeinsamen `Projects`-Bereich sichtbar wird

## Rollen-Navigation im Zielbild

## `customer_user`

Primär:

- `Dashboard`
- `Tickets`
- `Projects`

Aktionsebene:

- `Create Ticket`

## `tiba_agent`

Primär:

- `Dashboard`
- `Tickets`
- `Projects`

Aktionsebene:

- `Assign to me`
- `Update status`
- `Create Ticket`

## `tiba_admin`

Primär:

- `Dashboard`
- `Tickets`
- `Projects`
- `Admin`

Sekundär unter `Admin`:

- `Customers`
- `Users`

## Empfohlene Reihenfolge für den UX/UI-Track

1. `Dashboard`
   - weil es der globale Einstieg und die neue strukturelle Klammer wird
2. `Tickets`
   - inklusive Überführung der bisherigen Queue-/Board-Logik
3. `Projects`
   - als gemeinsamer Bereich mit rollenabhängigen Aktionen
4. `Admin`
   - `Customers` und `Users`
5. Detailsichten verfeinern
   - `Ticket Detail`
   - `Project Detail`
   - `Ticket Create`

## Strukturelle Änderungen vor UI/UX-Phase

1. Dashboard-Inhalte und Kachelmodell verbindlich definieren.
2. Ticket-Listenmodell verbindlich definieren:
   - `All`
   - `New`
   - `Open`
   - `My`
   - `Closed`
3. Entscheidung treffen, wie Projektverwaltung in den gemeinsamen `Projects`-Bereich eingeht.
4. `Admin` als Zielrahmen für `Customers` und `Users` festziehen.
5. `/tiba` ausdrücklich als Übergangsroute markieren und nicht als Zielbereich weiterdenken.

## Offene Unsicherheiten

- Noch offen ist, ob `tiba_agent` im Zielbild weiterhin dieselben Projektverwaltungsaktionen wie `tiba_admin` erhält.
- Noch offen ist, ob `customer_user` auf dem Dashboard eher Kennzahlen plus letzte Aktivität oder stärker auf direkte CTAs fokussiert werden soll.
- Noch offen ist, ob `Closed` im Dashboard nur als Kennzahl oder auch als eigene Kachel sichtbar sein sollte.
