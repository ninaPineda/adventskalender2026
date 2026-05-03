// ── CONFIG ──────────────────────────────────────────────
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzewl84KjS__hMI7eeb1Upa-aQAQD-RtrfSS62CRvRXEUAbhibgdEvRhldODNfEeebGjA/exec';
const READ_URL = SHEET_URL + '?callback=onScores';
const AUTH_URL = 'https://script.google.com/macros/s/AKfycbzhDmg5P0cOmh0lQzL2LUplCdApUo96Y2rp62eLXOSUW105MNq6zC4BiQu5sR8CYjqx1A/exec';
const AUTH_READ_URL = AUTH_URL + '?callback=onUsers';
const SHEET_CACHE_TTL = 60 * 1000;
const USER_CACHE_TTL = 5 * 60 * 1000;
const SHEET_CACHE_KEY = 'advent_sheet_cache_v1';
const USER_CACHE_KEY = 'advent_user_cache_v1';
let leaderboardCache = null;
let leaderboardPromise = null;
let userCache = null;
let userPromise = null;
let jsonpCounter = 0;

// ── PUZZLE METADATA ──────────────────────────────────────
const PUZZLES = [
  { day: 1,  type: 'quiz',    icon: 'tree-pine',       label: 'Quiz',    title: 'Weihnachts-Quiz',        maxPts: 300 },
  { day: 2,  type: 'math',    icon: 'calculator',      label: 'Mathe',   title: 'Zahlen-Rätsel',          maxPts: 400 },
  { day: 3,  type: 'wordle',  icon: 'type',            label: 'Wörter',  title: 'Weihnachts-Wordle',      maxPts: 500 },
  { day: 4,  type: 'slide',   icon: 'gift',            label: 'Puzzle',  title: 'Schiebe-Puzzle',         maxPts: 350 },
  { day: 5,  type: 'geo',     icon: 'globe-2',         label: 'Geo',     title: 'Weihnachts-Geografie',   maxPts: 300 },
  { day: 6,  type: 'logic',   icon: 'puzzle',          label: 'Logik',   title: 'Nonogramm',              maxPts: 450 },
  { day: 7,  type: 'quiz',    icon: 'sparkle',         label: 'Quiz',    title: 'Winter-Quiz',            maxPts: 300 },
  { day: 8,  type: 'sudoku',  icon: 'grid-3x3',        label: 'Sudoku',  title: 'Mini-Sudoku',            maxPts: 500 },
  { day: 9,  type: 'math',    icon: 'plus',            label: 'Mathe',   title: 'Nikolaus-Rechnen',       maxPts: 400 },
  { day: 10, type: 'wordle',  icon: 'text-cursor-input', label: 'Wörter', title: 'Rentier-Wordle',         maxPts: 500 },
  { day: 11, type: 'quiz',    icon: 'snowflake',       label: 'Quiz',    title: 'Schnee-Quiz',            maxPts: 300 },
  { day: 12, type: 'slide',   icon: 'star',            label: 'Puzzle',  title: 'Stern-Puzzle',           maxPts: 350 },
  { day: 13, type: 'geo',     icon: 'map',             label: 'Geo',     title: 'Welt-Hauptstädte',       maxPts: 300 },
  { day: 14, type: 'logic',   icon: 'music-2',         label: 'Logik',   title: 'Melodie-Muster',         maxPts: 450 },
  { day: 15, type: 'math',    icon: 'circle-dot',      label: 'Mathe',   title: 'Plätzchen-Rechnen',      maxPts: 400 },
  { day: 16, type: 'sudoku',  icon: 'bell',            label: 'Sudoku',  title: 'Glocken-Sudoku',         maxPts: 500 },
  { day: 17, type: 'quiz',    icon: 'circle-help',     label: 'Quiz',    title: 'Advent-Quiz',            maxPts: 300 },
  { day: 18, type: 'wordle',  icon: 'flame',           label: 'Wörter',  title: 'Kerzen-Wordle',          maxPts: 500 },
  { day: 19, type: 'geo',     icon: 'mountain-snow',   label: 'Geo',     title: 'Weihnachts-Länder',      maxPts: 300 },
  { day: 20, type: 'slide',   icon: 'shapes',          label: 'Puzzle',  title: 'Winter-Puzzle',          maxPts: 350 },
  { day: 21, type: 'logic',   icon: 'blocks',          label: 'Logik',   title: 'Spielzeug-Logik',        maxPts: 450 },
  { day: 22, type: 'math',    icon: 'percent',         label: 'Mathe',   title: 'Weihnachts-Mathe',       maxPts: 400 },
  { day: 23, type: 'quiz',    icon: 'house',           label: 'Quiz',    title: 'Traditions-Quiz',        maxPts: 300 },
  { day: 24, type: 'special', icon: 'party-popper',    label: 'Special', title: 'Heiligabend-Challenge',  maxPts: 1000 },
];

// ── USER DATA ────────────────────────────────────────────
function getUserName() {
  return localStorage.getItem('advent_name') || '';
}
function setUserName(name) {
  localStorage.setItem('advent_name', normalizeUsername(name));
}
function clearUserName() {
  localStorage.removeItem('advent_name');
}
function isLoggedIn() {
  return !!getUserName();
}
function requireLogin() {
  if (isLoggedIn()) return true;
  window.location.href = 'index.html';
  return false;
}
function normalizeUsername(name) {
  return String(name || '').trim();
}
function normalizeUsernameKey(name) {
  return normalizeUsername(name).toLowerCase();
}

async function hashPassword(username, password) {
  const normalized = normalizeUsernameKey(username);
  const data = new TextEncoder().encode(`advent2026:${normalized}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getUserRowName(row) {
  return String(getRowValue(row, ['username','name']) || '').trim();
}

function getUserRowHash(row) {
  return String(getRowValue(row, ['passwordhash']) || '').trim();
}

async function fetchUsers() {
  const cached = getSessionCache(USER_CACHE_KEY, USER_CACHE_TTL, userCache);
  if (cached) return cached;
  if (userPromise) return userPromise;

  userPromise = new Promise((resolve) => {
    const id = createJsonpCallbackName('auth');
    window[id] = (data) => {
      delete window[id];
      cleanupJsonpScript(id);
      const rows = Array.isArray(data) ? data : [];
      userCache = setSessionCache(USER_CACHE_KEY, rows);
      userPromise = null;
      resolve(rows);
    };
    const script = document.createElement('script');
    script.dataset.jsonpId = id;
    script.src = AUTH_READ_URL.replace('onUsers', id);
    script.onerror = () => {
      delete window[id];
      cleanupJsonpScript(id);
      userPromise = null;
      resolve([]);
    };
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window[id]) return;
      delete window[id];
      cleanupJsonpScript(id);
      userPromise = null;
      resolve([]);
    }, 5000);
  });

  return userPromise;
}

async function findUser(username) {
  const key = normalizeUsernameKey(username);
  const users = await fetchUsers();
  return users.find(row => normalizeUsernameKey(getUserRowName(row)) === key) || null;
}

async function loginUser(username, password) {
  const cleanName = normalizeUsername(username);
  if (!cleanName || !password) return { ok: false, message: 'Bitte Username und Passwort eingeben.' };

  const user = await findUser(cleanName);
  if (!user) return { ok: false, message: 'Diesen Username gibt es noch nicht.' };

  const expectedHash = getUserRowHash(user);
  const actualHash = await hashPassword(cleanName, password);
  if (expectedHash !== actualHash) return { ok: false, message: 'Das Passwort stimmt nicht.' };

  setUserName(getUserRowName(user) || cleanName);
  return { ok: true, username: getUserName() };
}

async function registerUser(username, password) {
  const cleanName = normalizeUsername(username);
  if (cleanName.length < 2) return { ok: false, message: 'Der Username ist zu kurz.' };
  if (password.length < 6) return { ok: false, message: 'Das Passwort braucht mindestens 6 Zeichen.' };

  const existing = await findUser(cleanName);
  if (existing) return { ok: false, message: 'Diesen Username gibt es schon.' };
  const passwordhash = await hashPassword(cleanName, password);
  const parameter = new URLSearchParams({
    username: String(cleanName),
    passwordhash: String(passwordhash)
  });

  fetch(AUTH_URL, { method: 'POST', mode: 'no-cors', body: parameter }).catch(() => {});
  appendCachedUser({ username: cleanName, passwordhash });
  setUserName(cleanName);
  return { ok: true, username: cleanName };
}
function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
  updateThemeSwitch();
}

function iconHtml(name, className = '') {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function renderIcons() {
  if (!window.lucide) return;
  window.lucide.createIcons({
    attrs: {
      'stroke-width': 2.4
    }
  });
}

// Streak aus Google-Sheet-Zeitstempeln berechnen
async function getStreak() {
  const name = getUserName();
  const rows = await fetchLeaderboard();
  const dates = [...new Set(rows
    .filter(r => getRowName(r) === name)
    .map(r => getRowTimestamp(r))
    .filter(Boolean)
    .map(ts => new Date(ts).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));

  if (!dates.length) return { count: 0, lastDay: null };

  let count = 1;
  let cursor = new Date(dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const expected = new Date(cursor);
    expected.setDate(expected.getDate() - 1);
    const actual = new Date(dates[i]);
    if (actual.toDateString() !== expected.toDateString()) break;
    count++;
    cursor = actual;
  }

  return { count, lastDay: dates[0] };
}
function updateStreak() {
  return getStreak();
}
function checkStreakVisit() {
  return getStreak();
}

// ── GOOGLE SHEETS ────────────────────────────────────────
function getRowValue(row, names) {
  if (!row || typeof row !== 'object') return '';
  const normalized = {};
  Object.keys(row).forEach(key => {
    normalized[String(key).trim().toLowerCase()] = row[key];
  });
  for (const name of names) {
    const value = normalized[String(name).trim().toLowerCase()];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function getRowName(row) {
  return String(getRowValue(row, ['name', 'Name', 'spieler', 'player']) || 'Anonym').trim();
}

function getRowDay(row) {
  const day = Number(getRowValue(row, ['day', 'tag']));
  if (Number.isInteger(day) && day >= 1 && day <= 24) return day;
  const solvedDay = Number(getRowValue(row, ['solved', 'gelöst', 'geloest']));
  if (Number.isInteger(solvedDay) && solvedDay >= 1 && solvedDay <= 24) return solvedDay;
  return 0;
}

function getRowPoints(row) {
  const raw = getRowValue(row, ['points', 'pts', 'punkte', 'score']);
  const normalized = String(raw).replace(',', '.').replace(/[^\d.-]/g, '');
  const points = Number(normalized);
  return Number.isFinite(points) ? points : 0;
}

function getRowTimestamp(row) {
  return getRowValue(row, ['timestamp', 'time', 'date', 'datum', 'zeit']);
}

function createJsonpCallbackName(prefix) {
  jsonpCounter += 1;
  return `${prefix}_${Date.now()}_${jsonpCounter}`;
}

function cleanupJsonpScript(id) {
  document.querySelectorAll(`script[data-jsonp-id="${id}"]`).forEach(script => script.remove());
}

function getSessionCache(key, ttl, memoryCache) {
  const now = Date.now();
  if (memoryCache?.data && now - memoryCache.at < ttl) return memoryCache.data;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || now - parsed.at >= ttl) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function getStaleSessionCache(key, memoryCache) {
  if (memoryCache?.data) return memoryCache.data;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

function setSessionCache(key, data) {
  const entry = { at: Date.now(), data };
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // If session storage is unavailable or full, the in-memory cache still helps this page.
  }
  return entry;
}

function appendCachedUser(row) {
  const cached = getStaleSessionCache(USER_CACHE_KEY, userCache) || [];
  userCache = setSessionCache(USER_CACHE_KEY, [...cached, row]);
}

function appendCachedScore(row) {
  const cached = getStaleSessionCache(SHEET_CACHE_KEY, leaderboardCache) || [];
  leaderboardCache = setSessionCache(SHEET_CACHE_KEY, [...cached, row]);
}

// Scores aus Google Sheets berechnen: { day: { pts, solved, timestamp } }
async function getScores() {
  const name = getUserName();
  const rows = await fetchLeaderboard();

  const scores = {};

  rows
    .filter(r => getRowName(r) === name)
    .forEach(r => {
      const day = getRowDay(r);
      const pts = getRowPoints(r);
      const rowTimestamp = getRowTimestamp(r);
      const timestamp = rowTimestamp ? new Date(rowTimestamp).getTime() : Date.now();

      if (!day) return;

      const prev = scores[day]?.pts || 0;

      // nur besten Score pro Tag speichern
      if (!scores[day] || pts > prev) {
        scores[day] = {
          pts,
          solved: true,
          timestamp
        };
      }
    });

  return scores;
}

async function saveScore(day, pts) {
  const scores = await getScores();
  const prev = scores[day]?.pts || 0;

  if (pts > prev) {
    logToSheet(day, pts);
    return true; // new highscore
  }

  return false;
}

async function isNewHighscore(day, pts) {
  const scores = await getScores();
  return pts > (scores[day]?.pts || 0);
}

async function getTotalPoints() {
  const scores = await getScores();
  return Object.values(scores).reduce((sum, s) => sum + (s.pts || 0), 0);
}

async function isSolved(day) {
  const scores = await getScores();
  return !!scores[day]?.solved;
}

function logToSheet(day, pts) {
  const name = getUserName();
  const timestamp = new Date().toISOString();
  const params = new URLSearchParams({
    name,
    day: String(day),
    solved: String(day),
    points: String(pts),
    timestamp
  });
  fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: params }).catch(() => {});
  appendCachedScore({ name, day: String(day), solved: String(day), points: String(pts), timestamp });
}

async function fetchLeaderboard(options = {}) {
  const force = options.force === true;
  const cached = !force ? getSessionCache(SHEET_CACHE_KEY, SHEET_CACHE_TTL, leaderboardCache) : null;
  if (cached) return cached;

  const stale = !force ? getStaleSessionCache(SHEET_CACHE_KEY, leaderboardCache) : null;
  if (stale) {
    refreshLeaderboardCache();
    return stale;
  }

  return refreshLeaderboardCache();
}

function refreshLeaderboardCache() {
  if (leaderboardPromise) return leaderboardPromise;

  leaderboardPromise = new Promise((resolve) => {
    const stale = getStaleSessionCache(SHEET_CACHE_KEY, leaderboardCache) || [];
    const id = createJsonpCallbackName('cb');
    window[id] = (data) => {
      delete window[id];
      cleanupJsonpScript(id);
      const rows = Array.isArray(data) ? data : [];
      leaderboardCache = setSessionCache(SHEET_CACHE_KEY, rows);
      leaderboardPromise = null;
      resolve(rows);
    };
    const script = document.createElement('script');
    script.dataset.jsonpId = id;
    script.src = READ_URL.replace('onScores', id);
    script.onerror = () => {
      delete window[id];
      cleanupJsonpScript(id);
      leaderboardPromise = null;
      resolve(stale);
    };
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window[id]) return;
      delete window[id];
      cleanupJsonpScript(id);
      leaderboardPromise = null;
      resolve(stale);
    }, 5000);
  });

  return leaderboardPromise;
}

// ── DATE HELPERS ─────────────────────────────────────────
function getCurrentAdventDay() {
  const now = new Date();
  const year = now.getFullYear();
  const dec1 = new Date(year, 11, 1);
  if (now < dec1) return 0;
  const day = now.getDate();
  return now.getMonth() === 11 ? Math.min(day, 24) : 24;
}

function getDaysUntilChristmas() {
  const now = new Date();
  const christmas = new Date(now.getFullYear(), 11, 24);
  if (now > christmas) {
    christmas.setFullYear(christmas.getFullYear() + 1);
  }
  const diff = christmas - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isUnlocked(day) {
  // For testing: always unlock all days. 
  // Remove the line below to use real date locking:
  return true;
  //return day <= getCurrentAdventDay();
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = '') {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── CONFETTI ──────────────────────────────────────────────
function launchConfetti() {
  const styles = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--tile', '--tile-light', '--paper', '--paper-soft']
    .map(name => styles.getPropertyValue(name).trim())
    .filter(Boolean);
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      animation-duration: ${2 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
}

// ── SNOW ──────────────────────────────────────────────────
function initSnow(count = 8) {
  const flakes = ['•', '·', '✦'];
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
    flake.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${0.6 + Math.random() * 0.8}rem;
      animation-duration: ${8 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: 0.4;
    `;
    document.body.appendChild(flake);
  }
}

// ── NAV HIGHLIGHT ─────────────────────────────────────────
function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ── THEME TOGGLE ──────────────────────────────────────────
function toggleTheme() {
  const next = getTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  updateThemeSwitch();
}

function updateThemeSwitch() {
  const isDark = getTheme() === 'dark';
  document.querySelectorAll('.theme-switch').forEach(btn => {
    btn.classList.toggle('is-on', isDark);
    btn.setAttribute('aria-pressed', String(isDark));
  });
}
