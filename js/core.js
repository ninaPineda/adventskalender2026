// ── CONFIG ──────────────────────────────────────────────
const SCORE_CACHE_TTL = 60 * 1000;
const USER_CACHE_TTL = 5 * 60 * 1000;
const SCORE_CACHE_KEY = 'advent_supabase_score_cache_v1';
const USER_CACHE_KEY = 'advent_supabase_user_cache_v1';
const SESSION_TOKEN_KEY = 'advent_session_token_v1';
const TEST_UNLOCK_ALL_PUZZLES = true;
let leaderboardCache = null;
let leaderboardPromise = null;
let userCache = null;
let userPromise = null;
let supabaseClient = null;

// ── PUZZLE METADATA ──────────────────────────────────────
const PUZZLES = [
  { day: 1,  type: 'map',     icon: 'map-pin',         label: 'Map',     title: 'Christmas Market Guessr', maxPts: 10 },
  { day: 2,  type: 'math',    icon: 'calculator',      label: 'Mathe',   title: 'Zahlen-Rätsel',          maxPts: 10 },
  { day: 3,  type: 'wordle',  icon: 'type',            label: 'Wörter',  title: 'Weihnachts-Wordle',      maxPts: 10 },
  { day: 4,  type: 'slide',   icon: 'gift',            label: 'Puzzle',  title: 'Schiebe-Puzzle',         maxPts: 10 },
  { day: 5,  type: 'geo',     icon: 'globe-2',         label: 'Geo',     title: 'Weihnachts-Geografie',   maxPts: 10 },
  { day: 6,  type: 'logic',   icon: 'puzzle',          label: 'Logik',   title: 'Nonogramm',              maxPts: 10 },
  { day: 7,  type: 'quiz',    icon: 'sparkle',         label: 'Quiz',    title: 'Winter-Quiz',            maxPts: 10 },
  { day: 8,  type: 'sudoku',  icon: 'grid-3x3',        label: 'Sudoku',  title: 'Mini-Sudoku',            maxPts: 10 },
  { day: 9,  type: 'math',    icon: 'plus',            label: 'Mathe',   title: 'Nikolaus-Rechnen',       maxPts: 10 },
  { day: 10, type: 'wordle',  icon: 'text-cursor-input', label: 'Wörter', title: 'Rentier-Wordle',         maxPts: 10 },
  { day: 11, type: 'quiz',    icon: 'snowflake',       label: 'Quiz',    title: 'Schnee-Quiz',            maxPts: 10 },
  { day: 12, type: 'slide',   icon: 'star',            label: 'Puzzle',  title: 'Stern-Puzzle',           maxPts: 10 },
  { day: 13, type: 'geo',     icon: 'map',             label: 'Geo',     title: 'Welt-Hauptstädte',       maxPts: 10 },
  { day: 14, type: 'logic',   icon: 'music-2',         label: 'Logik',   title: 'Melodie-Muster',         maxPts: 10 },
  { day: 15, type: 'math',    icon: 'circle-dot',      label: 'Mathe',   title: 'Plätzchen-Rechnen',      maxPts: 10 },
  { day: 16, type: 'sudoku',  icon: 'bell',            label: 'Sudoku',  title: 'Glocken-Sudoku',         maxPts: 10 },
  { day: 17, type: 'quiz',    icon: 'circle-help',     label: 'Quiz',    title: 'Advent-Quiz',            maxPts: 10 },
  { day: 18, type: 'wordle',  icon: 'flame',           label: 'Wörter',  title: 'Kerzen-Wordle',          maxPts: 10 },
  { day: 19, type: 'geo',     icon: 'mountain-snow',   label: 'Geo',     title: 'Weihnachts-Länder',      maxPts: 10 },
  { day: 20, type: 'slide',   icon: 'shapes',          label: 'Puzzle',  title: 'Winter-Puzzle',          maxPts: 10 },
  { day: 21, type: 'logic',   icon: 'blocks',          label: 'Logik',   title: 'Spielzeug-Logik',        maxPts: 10 },
  { day: 22, type: 'math',    icon: 'percent',         label: 'Mathe',   title: 'Weihnachts-Mathe',       maxPts: 10 },
  { day: 23, type: 'quiz',    icon: 'house',           label: 'Quiz',    title: 'Traditions-Quiz',        maxPts: 10 },
  { day: 24, type: 'special', icon: 'party-popper',    label: 'Special', title: 'Heiligabend-Challenge',  maxPts: 10 },
];

// ── USER DATA ────────────────────────────────────────────
function getUserName() {
  return localStorage.getItem('advent_name') || '';
}
function setUserName(name) {
  localStorage.setItem('advent_name', normalizeUsername(name));
}
function clearUserName() {
  const sessionToken = getSessionToken();
  localStorage.removeItem('advent_name');
  localStorage.removeItem(SESSION_TOKEN_KEY);
  if (sessionToken) logoutSession(sessionToken).catch(() => {});
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
  return normalizeUsername(name);
}

function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

function setSessionToken(token) {
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, String(token));
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const config = window.ADVENT_SUPABASE || {};
  const hasConfig = config.url
    && config.anonKey
    && !String(config.url).includes('YOUR-PROJECT-REF')
    && !String(config.anonKey).includes('YOUR-SUPABASE-ANON-KEY');

  if (!window.supabase || !hasConfig) {
    throw new Error('Supabase ist noch nicht konfiguriert. Trage URL und anon key in js/supabase-config.js ein.');
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
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

  userPromise = getSupabaseClient()
    .from('public_users')
    .select('username')
    .order('username', { ascending: true })
    .then(({ data, error }) => {
      userPromise = null;
      if (error) return getStaleSessionCache(USER_CACHE_KEY, userCache) || [];
      userCache = setSessionCache(USER_CACHE_KEY, data || []);
      return data || [];
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

  try {
    const client = getSupabaseClient();
    const passwordHash = await hashPassword(cleanName, password);
    const { data, error } = await client.rpc('login_user', {
      p_username: cleanName,
      p_password_hash: passwordHash
    });

    if (error) return { ok: false, message: 'Username oder Passwort stimmt nicht.' };

    const row = Array.isArray(data) ? data[0] : data;
    setUserName(row?.username || cleanName);
    setSessionToken(row?.session_token);
    return { ok: true, username: getUserName() };
  } catch (error) {
    return { ok: false, message: error.message || 'Login ist gerade nicht verfügbar.' };
  }
}

async function registerUser(username, password) {
  const cleanName = normalizeUsername(username);
  if (cleanName.length < 2) return { ok: false, message: 'Der Username ist zu kurz.' };
  if (password.length < 6) return { ok: false, message: 'Das Passwort braucht mindestens 6 Zeichen.' };

  try {
    const existing = await findUser(cleanName);
    if (existing) return { ok: false, message: 'Diesen Username gibt es schon.' };

    const client = getSupabaseClient();
    const passwordHash = await hashPassword(cleanName, password);
    const { data, error } = await client.rpc('register_user', {
      p_username: cleanName,
      p_password_hash: passwordHash
    });

    if (error) return { ok: false, message: error.message || 'Account konnte nicht erstellt werden.' };

    const row = Array.isArray(data) ? data[0] : data;
    appendCachedUser({ username: row?.username || cleanName });
    setUserName(row?.username || cleanName);
    setSessionToken(row?.session_token);
    return { ok: true, username: cleanName };
  } catch (error) {
    return { ok: false, message: error.message || 'Registrierung ist gerade nicht verfügbar.' };
  }
}

async function logoutSession(sessionToken) {
  return getSupabaseClient().rpc('logout_user', {
    p_session_token: sessionToken
  });
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

// Streak aus gespeicherten Score-Zeitstempeln berechnen
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

// ── SCORE ROW HELPERS ────────────────────────────────────
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
  return Number.isFinite(points) ? normalizePuzzlePoints(points) : 0;
}

function getRowTimestamp(row) {
  return getRowValue(row, ['timestamp', 'time', 'date', 'datum', 'zeit']);
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
  const cached = getStaleSessionCache(SCORE_CACHE_KEY, leaderboardCache) || [];
  const withoutPrevious = cached.filter(entry => {
    return !(getRowName(entry) === getRowName(row) && getRowDay(entry) === getRowDay(row));
  });
  leaderboardCache = setSessionCache(SCORE_CACHE_KEY, [...withoutPrevious, row]);
}

// Scores aus Supabase berechnen: { day: { pts, solved, timestamp } }
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
  pts = normalizePuzzlePoints(pts);
  const scores = await getScores();
  const prev = scores[day]?.pts || 0;

  if (pts > prev) {
    try {
      await submitScore(day, pts);
      return true; // new highscore
    } catch (error) {
      showToast('Score konnte nicht gespeichert werden.', 'error');
      return false;
    }
  }

  return false;
}

async function isNewHighscore(day, pts) {
  pts = normalizePuzzlePoints(pts);
  const scores = await getScores();
  return pts > (scores[day]?.pts || 0);
}

function normalizePuzzlePoints(pts) {
  const value = Math.round(Number(pts) || 0);
  return Math.max(0, Math.min(10, value));
}

async function getTotalPoints() {
  const scores = await getScores();
  return Object.values(scores).reduce((sum, s) => sum + (s.pts || 0), 0);
}

async function isSolved(day) {
  const scores = await getScores();
  return !!scores[day]?.solved;
}

async function submitScore(day, pts) {
  pts = normalizePuzzlePoints(pts);
  const name = getUserName();
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('submit_score', {
    p_session_token: getSessionToken(),
    p_day: Number(day),
    p_points: pts
  });

  if (error) throw error;

  const saved = Array.isArray(data) ? data[0] : data;
  const timestamp = saved?.submitted_at || saved?.timestamp || new Date().toISOString();
  const points = saved?.points ?? pts;
  appendCachedScore({ name, day: String(day), solved: String(day), points: String(points), timestamp });
  return saved;
}

async function fetchLeaderboard(options = {}) {
  const force = options.force === true;
  const cached = !force ? getSessionCache(SCORE_CACHE_KEY, SCORE_CACHE_TTL, leaderboardCache) : null;
  if (cached) return cached;

  const stale = !force ? getStaleSessionCache(SCORE_CACHE_KEY, leaderboardCache) : null;
  if (stale) {
    refreshLeaderboardCache();
    return stale;
  }

  return refreshLeaderboardCache();
}

function refreshLeaderboardCache() {
  if (leaderboardPromise) return leaderboardPromise;

  const stale = getStaleSessionCache(SCORE_CACHE_KEY, leaderboardCache) || [];

  leaderboardPromise = getSupabaseClient()
    .from('leaderboard')
    .select('name, day, solved, points, timestamp')
    .order('points', { ascending: false })
    .then(({ data, error }) => {
      leaderboardPromise = null;
      if (error) return stale;

      const rows = (data || []).map(row => ({
        name: row.name || 'Anonym',
        day: String(row.day),
        solved: String(row.day),
        points: String(row.points),
        timestamp: row.timestamp
      }));

      leaderboardCache = setSessionCache(SCORE_CACHE_KEY, rows);
      return rows;
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

function getMissingPreviousDays(scores, day) {
  const missing = [];
  for (let d = 1; d < day; d++) {
    if (!scores[d]?.solved) missing.push(d);
  }
  return missing;
}

function formatDayList(days) {
  if (!days.length) return '';
  const ranges = [];
  let start = days[0];
  let prev = days[0];

  for (let i = 1; i <= days.length; i++) {
    const current = days[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = current;
    prev = current;
  }

  return ranges.join(', ');
}

function getPuzzleUnlockState(day, scores = {}) {
  if (TEST_UNLOCK_ALL_PUZZLES) {
    return { unlocked: true, reason: 'test', message: 'Testmodus: alle Rätsel sind freigeschaltet.' };
  }

  const today = getCurrentAdventDay();
  if (day > today) {
    return {
      unlocked: false,
      reason: 'future',
      message: today === 0
        ? 'Der Adventskalender startet am 1. Dezember.'
        : `Tag ${day} liegt in der Zukunft.`
    };
  }

  const missing = getMissingPreviousDays(scores, day);
  if (missing.length) {
    return {
      unlocked: false,
      reason: 'previous',
      missing,
      message: `Löse erst Rätsel ${formatDayList(missing)}, bevor du Tag ${day} öffnen darfst.`
    };
  }

  return { unlocked: true, reason: 'available', message: 'Freigeschaltet' };
}

function isUnlocked(day) {
  return TEST_UNLOCK_ALL_PUZZLES || day <= getCurrentAdventDay();
}

function setTopBadges(streakCount, totalPoints) {
  const streakBadge = document.getElementById('streakBadge');
  const pointsBadge = document.getElementById('pointsBadge');

  if (streakBadge) {
    streakBadge.innerHTML = `${iconHtml('flame', 'badge-icon')}<span>${streakCount}</span>`;
    renderIcons(streakBadge);
  }
  if (pointsBadge) {
    pointsBadge.innerHTML = `${iconHtml('star', 'badge-icon')}<span>${totalPoints}</span>`;
    renderIcons(pointsBadge);
  }
}

async function updateTopBadges() {
  const [streak, total] = await Promise.all([getStreak(), getTotalPoints()]);
  setTopBadges(streak.count, total);
  return { streak, total };
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
