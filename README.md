# Adventskalender weiterentwickeln

Das Projekt besteht aus HTML, CSS und JavaScript. Es braucht kein Framework und keinen Build-Schritt.

## Lokal starten

Im Projektordner `python3 -m http.server 8000` ausführen und `http://localhost:8000` öffnen. Die HTML-Dateien benötigen einen Webserver, weil Chats und Rätseldaten nachgeladen werden.

## Wo ändere ich was?

| Aufgabe | Datei |
| --- | --- |
| Texte, Fotos und Rätsel eines Tages | `tage/content/1.html` bis `24.html` |
| Akzeptierte Antworten | `solutions.json` |
| Drei Hinweise je Tag | `hints.json` |
| Eigenes Verhalten eines Rätsels | `tage/scripts/<Tag>.js` |
| Chat, Nachrichten, Hinweise und Bildergalerie | `tage/gamey.js` |
| Profil, Punkte, Bestenlistenabruf und Chat-Auswahl | `app.js` |
| Spielstand speichern und alte Daten übernehmen | `storage.js` |
| Aussehen und mobile Darstellung | `style.css` |
| Automatischer Nachtmodus | `theme.js` |
| Darstellung der Bestenliste | `highscores.html` |

## Nur ein gespeicherter Spielstand

Im Local Storage steht jetzt ausschließlich der eigene Eintrag `advent_state`. Andere Anwendungen dürfen ihre Einträge behalten. Der Spielstand enthält:

```js
{
  name: "Nina",
  points: 25,
  opened: [1, 2],
  hintCounts: { "2": 1 },
  wrongAttempts: {},
  quest: {},
  chats: { "1": { messages: [], pendingHint: false } }
}
```

`chats` enthält einen Verlauf je Tag. Nur Tag 6 braucht zwei Verläufe: `6` für Nikolaus und `6_santa` für den Weihnachtsmann. Gekaufte Hinweise werden ausschließlich in `hintCounts` gezählt; eine zusätzliche Liste ist nicht nötig.

- `store.read()` liest den aktuellen Spielstand.
- `store.update({ name: "Neuer Name" })` ersetzt die angegebenen Felder und behält den Rest.
- `store.saveChat(id, chatLog)` speichert einen Chat und behält die anderen Verläufe.
- In der Spiellogik verändert `updatePoints(amount)` das Guthaben und aktualisiert die Anzeige. `opened`, `hintCounts` und `wrongAttempts` werden mit `save()` gespeichert.
- Tagesmodule erhalten `saveChat`, `saveQuest`, `appendBubble`, `complete` usw. über `setupDay(...)`. Dort ist kein direkter Speicherzugriff nötig.

Die alten Einträge werden einmalig übernommen und erst nach erfolgreichem Speichern entfernt. Der alte automatische Punkte-Reset entfällt, damit bestehende Spielstände erhalten bleiben. Fehlende `points` oder `opened` bedeuten, dass eine Wiederherstellung aus der Bestenliste noch nötig sein kann; ein Guthaben von `0` ist dagegen ein gültiger Spielstand.

## Einen Tag bearbeiten

1. Texte und Bilder in `tage/content/<Tag>.html` ändern.
2. Antworten in `solutions.json` und Hinweise in `hints.json` anpassen.
3. Für normale Textantworten reicht `data-answer-mode="text"` im Tagesinhalt. Mehrstufige Antworten stehen als Liste von Listen in `solutions.json`: jede innere Liste enthält die akzeptierten Varianten eines Schritts.
4. Nur bei besonderem Verhalten ein Tagesmodul mit `export function setupDay(...)` anlegen und im Tagesinhalt `data-day-script` setzen.
5. Die Zuordnung zu Weihnachtsmann, Rudolf oder Nikolaus steht in `daysForChat()` in `app.js`.

`releasedChatDay()` gibt derzeit wie bisher zum Testen Tag 7 frei. Die darunter auskommentierte Datumsprüfung kann für den Kalenderbetrieb wieder aktiviert werden.

## Prüfen

Alle Tests ohne zusätzliche Installation ausführen:

```sh
for test in tests/*.cjs; do node "$test" || exit 1; done
```

Die Tests prüfen Rätsel, Hinweise, Chatverläufe, Wiederherstellung, Speicherübernahme und Nachtmodus. Eine Sichtprüfung im Browser ergänzt diese Logiktests, besonders bei Änderungen an HTML oder CSS.

## Design anpassen

`tokens.css` ist die zentrale Design-Datei. Farben stehen ausschließlich dort – einschließlich Nachtpalette und Papier-Icons. `style.css` definiert die Komponenten und verwendet die Variablen.

- `--primary`, `--sage`, `--berry`, `--gold`: Weihnachtsfarben.
- `--surface`, `--canvas`, `--text`, `--muted`, `--border`: Oberflächen und Text.
- `--shadow-x`, `--shadow-y`, `--shadow-blur`, `--shadow-color`: gemeinsame Kartenschatten.
- `--shadow-paper`, `--paper-shadow-color`: Papier-Icons.
- `--radius-card`, `--radius-bubble`, `--radius-pill`: Rundungen.
- `--font-family`, `--text-*`, `--space-*`: Schrift und Abstände.
- `--nav-size`, `--icon-size`, `--avatar-size`: Navigation und Bilder.

„Advent Pro“ liegt inklusive OFL-Lizenz in `assets/fonts/` und wird lokal geladen. Es gibt keinen externen Schriftabruf. Die Navigation enthält Chats, Bestenliste, Profil und Hilfe. Der bestehende automatische Nachtmodus überschreibt nur zentrale Farbvariablen.
