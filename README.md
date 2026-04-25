# 🎄 Weihnachts-Adventskalender

Ein interaktiver Adventskalender mit 24 täglichen Rätseln, gebaut für GitHub Pages.

## 🚀 Deployment auf GitHub Pages

1. **Repository erstellen:**
   ```
   git init
   git add .
   git commit -m "🎄 Initial advent calendar"
   ```

2. **GitHub Remote hinzufügen & pushen:**
   ```
   git remote add origin https://github.com/DEIN-USERNAME/advent-calendar.git
   git branch -M main
   git push -u origin main
   ```

3. **GitHub Pages aktivieren:**
   - Gehe zu: Repository → Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main`, Folder: `/ (root)`
   - Speichern → Deine URL: `https://DEIN-USERNAME.github.io/advent-calendar/`

## 📊 Google Sheets Setup

Deine Tabelle braucht diese Spalten:
| name | solved | points | timestamp |
|------|--------|--------|-----------|
| Max  | 3      | 250    | 2024-12-03T... |

`solved` enthält die Nummer des gelösten Tages. Die App kann zusätzlich auch alte `day`-Spalten lesen, falls noch ältere Einträge vorhanden sind.

Wenn Punkte in der App nicht angezeigt werden, prüfe die Google-Apps-Script-Web-App: Sie muss beim Lesen auch `points` zurückgeben. Eine passende Vorlage liegt in `google-apps-script.js`.

## 🗂️ Dateistruktur
```
advent-calendar/
├── index.html          # Kalender-Hauptseite
├── puzzle.html         # Rätsel-Seite (lädt je nach Tag)
├── highscore.html      # Rangliste & Statistiken
├── profile.html        # Profil & Einstellungen
├── howto.html          # Anleitung
├── css/
│   └── style.css       # Alle Styles (Light/Dark Theme)
└── js/
    ├── core.js         # Kern-Funktionen (Storage, Streak, API)
    └── puzzles.js      # Alle 24 Rätsel-Definitionen
```

## 🎮 Features
- ✅ 24 verschiedene Rätsel (Quiz, Mathe, Wordle, Sudoku, Schiebe-Puzzle, Geo, Nonogramm)
- ✅ Tägliche Freischaltung (Datum-basiert)
- ✅ Punktesystem mit Highscores pro Tag
- ✅ Streak-System mit Flammen 🔥
- ✅ Globale Rangliste via Google Sheets
- ✅ Light / Dark Mode
- ✅ Mobile-only (Desktop zeigt Hinweis)
- ✅ Countdown bis Weihnachten
- ✅ Schneeflocken-Animation ❄️
- ✅ Wiederholbar für bessere Scores

## 🔧 Rätsel hinzufügen/anpassen

Bearbeite `js/puzzles.js` → `PUZZLE_DEFS[TAG_NR]`.
Jedes Rätsel hat eine `render(container, onComplete)` Funktion.
`onComplete(pts)` aufrufen wenn das Rätsel gelöst ist.

## 📅 Datum-Sperre deaktivieren (zum Testen)
In `js/core.js`, Funktion `isUnlocked()`:
```js
function isUnlocked(day) {
  return true; // ← Diese Zeile einfügen zum Testen aller Tage
}
```
