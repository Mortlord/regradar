# briefing-pusher

Railway-Service, der montags ab 09:00 Uhr viertelstündlich Google Drive prüft,
ob das Weekly Regulatory Briefing von Cowork abgelegt wurde, und die Top-3
Consulting-Themen per Telegram pushed.

## Setup

### 1. Google Service Account anlegen (einmalig)

1. Google Cloud Console aufrufen: https://console.cloud.google.com
2. Neues Projekt anlegen (oder bestehendes nutzen)
3. "APIs & Services" > "Bibliothek" > "Google Drive API" aktivieren
4. "APIs & Services" > "Anmeldedaten" > "Dienstkonto erstellen"
5. JSON-Schlüssel herunterladen
6. In Google Drive: Ordner `/Briefings/Regulatory` erstellen
7. Diesen Ordner mit der E-Mail-Adresse des Dienstkontos teilen (Lesezugriff)

### 2. Umgebungsvariablen auf Railway setzen

```bash
railway variables set \
  TELEGRAM_TOKEN="dein_bot_token" \
  TELEGRAM_CHAT_ID="deine_chat_id" \
  GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}' \
  DRIVE_FOLDER_NAME="Regulatory"
```

Den kompletten JSON-Inhalt der heruntergeladenen Schlüsseldatei als
eine einzeilige Zeichenkette in GOOGLE_SERVICE_ACCOUNT_JSON einfügen.

### 3. Deployen

```bash
railway up
```

## Verhalten

- Montag 09:00 Uhr MEZ: Polling startet
- Alle 15 Minuten: Drive-Prüfung ob neue .md-Datei heute erstellt wurde
- Sobald Briefing gefunden: Telegram-Push + Polling stoppt
- 20:00 Uhr Sicherheitsnetz: Warnung per Telegram falls kein Briefing gefunden

## Cowork-Speicheranweisung

Im Cowork-Prompt muss dieser Block am Anfang stehen:

```
SPEICHERANWEISUNG (vor allem anderen ausführen):
Erstelle in Google Drive den Ordner /Briefings/Regulatory, falls er noch
nicht existiert. Speichere das fertige Briefing-Dokument dort als Markdown-Datei
mit dem Dateinamen:

  regulatory-briefing-KW[XX]-[YYYY].md

Beispiel: regulatory-briefing-KW23-2026.md

Speichere die Datei erst, wenn das vollständige Dokument inkl. aller vier
Abschnitte fertig ist. Kein Zwischenspeichern.
```
