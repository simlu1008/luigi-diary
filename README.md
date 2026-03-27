# Luigi Diary Web App

Einfache, mobile Web-App zum Tracken von:

- Spaziergängen mit Luigi (Start/Ende)
- Dauer draußen (automatisch berechnet)
- Ob Luigi Pipi/Pupu gemacht hat
- Fütterungen inkl. optionaler Notiz
- Tagesübersicht + letzte Einträge
- 24h- und 7-Tage-Zeitstrahl zur schnellen Auswertung
- Umschaltbare Zeitraum-Ansicht (7/30 Tage) mit Trend-Kennzahlen
- Schlaftracking (Schlafen gestartet / Aufgestanden) inkl. Schlafstunden
- Manuelles Nachtragen historischer Daten mit Datum/Uhrzeit
- Backup-Snapshot per Klick (JSON mit Zeitstempel)
- Export aller Daten als JSON/CSV
- Import aus JSON/CSV (anhängen oder komplett ersetzen)

## Stack

- Node.js + Express
- JSON-Datei (`data/events.json`) als persistenter Speicher
- Vanilla HTML/CSS/JS (mobilfreundlich)

## Datenspeicherung

- Alle Events werden fortlaufend in `data/events.json` gespeichert.
- Es gibt keine automatische Löschung/Rotation historischer Daten in der App.
- Für große Datenmengen kann später auf eine Datenbank migriert werden, das Format bleibt exportierbar.

## Datenexport

Im UI gibt es Buttons für den Download:

- `Backup Snapshot (JSON)` → sofortige Sicherung mit Zeitstempel-Dateiname
- `Export JSON` → vollständiger Export aller Einträge
- `Export CSV` → vollständiger Export für Excel/Numbers

Direkte Endpunkte:

- `GET /api/export/json`
- `GET /api/export/csv`

## Datenimport

Im UI:

- Datei auswählen (`.json` oder `.csv`)
- `Import anhängen` für Merge ohne Löschung
- `Import ersetzen` zum vollständigen Überschreiben

API:

- `POST /api/import/events`

## Manuelles Nachtragen

Im UI-Bereich `Manuell nachtragen` kannst du historische Einträge erfassen:

- `walk` mit Start/Ende (+ optional Pipi/Pupu)
- `feed` mit Zeitpunkt
- `sleep` mit Schlafstart und Aufstehzeit

API:

- `POST /api/manual/event`

Beispiel (`sleep`):

```json
{
	"type": "sleep",
	"sleep_start": "2026-03-26T21:45:00.000Z",
	"sleep_end": "2026-03-27T06:20:00.000Z",
	"note": "Nachgetragen"
}
```

Payload-Beispiel:

```json
{
	"strategy": "append",
	"events": [
		{
			"type": "walk",
			"created_at": "2026-03-27T10:00:00.000Z",
			"walk_start": "2026-03-27T09:40:00.000Z",
			"walk_end": "2026-03-27T10:00:00.000Z",
			"duration_min": 20,
			"pipi": true,
			"pupu": false,
			"note": "Morgens"
		}
	]
}
```

## Lokal starten

```bash
npm install
npm start
```

Dann öffnen:

- `http://localhost:3000`

## Umgebung

Optional kannst du Variablen setzen:

- `PORT` (Default: `3000`)
- `DATA_FILE` (Default: `./data/events.json`)
- `APP_USERNAME` und `APP_PASSWORD` (optional, aktiviert Passwortschutz per Basic Auth)
- `APP_PIN` (optional, exakt 4 Ziffern; aktiviert PIN-Abfrage beim Aufruf)
- `APP_PIN_SESSION_SECRET` (optional, zusätzlicher Secret-Wert für PIN-Session-Cookie)

Beispiel:

```bash
cp .env.example .env
```

Beispiel für Passwortschutz in `.env`:

```bash
APP_USERNAME=luigi
APP_PASSWORD=dein_starkes_passwort
```

Wenn beide Variablen gesetzt sind, schützt die App alle Seiten und API-Endpunkte per Basic Auth. Die App lädt `.env` beim Start automatisch, und beim Öffnen der Web-App fragt der Browser direkt nach Benutzername und Passwort. Nur `GET /api/health` bleibt offen, damit Deploy-Healthchecks weiter funktionieren.

### 4-stelliger PIN (empfohlen für deinen Wunsch)

Wenn `APP_PIN` gesetzt ist (genau 4 Ziffern), wird beim Aufruf zuerst eine PIN-Seite angezeigt.

Beispiel in `.env`:

```bash
APP_PIN=1234
```

Hinweise:

- Auf iPhone/Smartphones wird durch `inputmode="numeric"` direkt die Ziffern-Tastatur angezeigt.
- `APP_PIN` hat Vorrang vor `APP_USERNAME`/`APP_PASSWORD`.
- `GET /api/health` bleibt weiterhin ohne Login erreichbar.

### Passwortschutz auf Render

In Render unter `Environment` zusätzlich setzen:

- `APP_USERNAME`
- `APP_PASSWORD`

Danach neu deployen. Beim Aufruf der App fragt der Browser dann nach Benutzername und Passwort.

## Deploy (außerhalb des Hauses erreichbar)

Die App ist für einfachen Deploy auf Plattformen wie Render, Railway oder Fly.io geeignet.

### Render (empfohlen)

Es gibt eine fertige Render-Konfiguration in `render.yaml`.

Sie enthält:

- Web Service (`Node`)
- Healthcheck auf `/api/health`
- `DATA_FILE=./data/events.json` (Free-Tier kompatibel)

Schritte:

1. Projekt nach GitHub pushen
2. In Render: `New` → `Blueprint`
3. Repo auswählen (Render liest `render.yaml` automatisch)
4. Deploy starten

Wichtig für Free-Tier: Render unterstützt dort kein Disk-Volume. Das heißt, Daten können bei Redeploy/Restart verloren gehen.

Wenn du dauerhafte Speicherung willst, nutze einen bezahlten Plan und setze zusätzlich ein Persistent Disk-Volume (z. B. `/var/data`) sowie `DATA_FILE=/var/data/events.json`.

### Minimaler Ablauf (Render/Railway)

1. Projekt in ein Git-Repo pushen
2. Neue Web Service App anlegen
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Optional Env setzen: `PORT`, `DATA_FILE`

Wenn du in der Cloud deployest, achte auf persistenten Storage (Volume), damit die JSON-Datei bei Neustarts erhalten bleibt.

Hinweis: Für echte Persistenz in der Cloud solltest du ein persistentes Volume oder externe DB nutzen.
