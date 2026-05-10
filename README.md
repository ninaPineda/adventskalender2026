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

## Supabase Setup

Die App nutzt Supabase Postgres fuer Username-Login, Sessions und Scores. Supabase Auth wird nicht verwendet, deshalb gibt es keine E-Mail-Adressen und keine E-Mail-Bestaetigung.

1. Lege ein Supabase-Projekt an.
2. Fuehre `supabase/schema.sql` im Supabase SQL Editor aus.
3. Kopiere Project URL und anon public key aus Project Settings -> API nach `js/supabase-config.js`.

Das Schema erstellt:

- `app_users`: Username und Passwort-Hash
- `app_sessions`: Login-Sessions fuer die statische App
- `scores`: bester Score pro Spieler und Tag, mit `timestamp` fuer den letzten gespeicherten Bestwert
- `public_users` und `leaderboard`: lesbare Views ohne Passwort-Hashes
- RPC-Funktionen: `register_user`, `login_user`, `logout_user`, `submit_score`

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
    ├── core.js         # Kern-Funktionen (Supabase, Storage, Streak)
    ├── supabase-config.js # Supabase URL und anon key
    └── puzzles.js      # Alle 24 Rätsel-Definitionen
├── supabase/
│   └── schema.sql      # Tabellen, RLS Policies und RPC-Funktion
```

## 🎮 Features
- ✅ 24 verschiedene Rätsel (Quiz, Mathe, Wordle, Sudoku, Schiebe-Puzzle, Geo, Nonogramm)
- ✅ Tägliche Freischaltung (Datum-basiert)
- ✅ Punktesystem mit Highscores pro Tag
- ✅ Streak-System mit Flammen 🔥
- ✅ Globale Rangliste via Supabase
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
