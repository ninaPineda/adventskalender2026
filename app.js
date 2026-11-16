const LS_TEST_MODE = "advent_test_mode";
const testMode = localStorage.getItem(LS_TEST_MODE) === "true";
const LS_OPEN = "advent_opened";
const LS_HINTS = "hints_opened";
const LS_HINT_COUNTS = "advent_hint_counts";
const LS_POINTS = "advent_points";
const LS_NAME = "advent_user_name";
const LS_RESET = "advent_reset_version";
const LS_ATTEMPTS = "advent_wrong_attempts";
const LS_NIKOLAUS_QUEST = "advent_nikolaus_search";
const RESET = "2026-score-reset-2";
const LAST_CHAT_DAY = 6;
const LOG_URL = "https://script.google.com/macros/s/AKfycbx4yiiDjuIbqZ2r0DlZVQHbTEXiknKmS0AnVCiMGVSnFhZrnyVW6j_3KjPH22eyM7WRJQ/exec";

if (localStorage.getItem(LS_RESET) !== RESET) {
  localStorage.removeItem(LS_OPEN);
  localStorage.removeItem(LS_HINTS);
  localStorage.removeItem(LS_HINT_COUNTS);
  localStorage.removeItem(LS_POINTS);
  localStorage.removeItem(LS_ATTEMPTS);
  localStorage.setItem(LS_RESET, RESET);
}

restoreLegacyTestProgress();

const opened = readOpened(LS_OPEN);
const hints = new Set(JSON.parse(localStorage.getItem(LS_HINTS) || "[]"));
const wrongAttempts = JSON.parse(localStorage.getItem(LS_ATTEMPTS) || "{}");
const hintCounts = JSON.parse(localStorage.getItem(LS_HINT_COUNTS) || "{}");
let allPoints = Number(localStorage.getItem(LS_POINTS) || 10);
const SLIDE = "advent_slide";
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const save = () => {
  localStorage.setItem(LS_OPEN, JSON.stringify([...opened]));
  localStorage.setItem(LS_HINTS, JSON.stringify([...hints]));
  localStorage.setItem(LS_HINT_COUNTS, JSON.stringify(hintCounts));
  localStorage.setItem(LS_POINTS, allPoints);
  localStorage.setItem(LS_ATTEMPTS, JSON.stringify(wrongAttempts));
};

function readOpened(key) {
  try {
    const days = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(days.map(Number).filter(day => Number.isInteger(day) && day >= 1 && day <= 24));
  } catch {
    return new Set();
  }
}

function restoreLegacyTestProgress() {
  const migrationKey = "advent_shared_progress_version";
  if (localStorage.getItem(migrationKey) === RESET || localStorage.getItem(`test_${LS_RESET}`) !== RESET) return;
  const normalOpened = readOpened(LS_OPEN);
  const testOpened = readOpened(`test_${LS_OPEN}`);
  const keys = [LS_OPEN, LS_HINTS, LS_HINT_COUNTS, LS_POINTS, LS_ATTEMPTS, LS_NIKOLAUS_QUEST, chatStorageKey(6, "santa")];
  for (let day = 1; day <= LAST_CHAT_DAY; day++) keys.push(chatStorageKey(day));
  if (testOpened.size > normalOpened.size || !keys.some(key => localStorage.getItem(key) !== null)) {
    for (const key of keys) {
      const value = localStorage.getItem(`test_${key}`);
      if (value !== null) localStorage.setItem(key, value);
    }
    localStorage.setItem(LS_OPEN, JSON.stringify([...new Set([...normalOpened, ...testOpened])]));
  }
  if (!localStorage.getItem(LS_NAME)) {
    const testName = localStorage.getItem(`test_${LS_NAME}`);
    if (testName) localStorage.setItem(LS_NAME, testName);
  }
  localStorage.setItem(migrationKey, RESET);
}

function solvedDays() {
  return [...opened].map(Number).filter((n) => n >= 1 && n <= 24).sort((a, b) => a - b);
}

function canOpen(day) {
  return day === 1 || opened.has(day - 1);
}

function renderShell() {
  const solved = solvedDays();
  $(".progress-count") && ($(".progress-count").textContent = `${solved.length}/24`);
  $(".progress-count")?.style.setProperty("--done", `${(solved.length / 24) * 100}%`);
  $(".coin-count") && ($(".coin-count").textContent = allPoints);
  $$(".day-link").forEach((link) => {
    const day = Number(link.dataset.day);
    const open = canOpen(day);
    link.classList.toggle("locked", !open);
    link.classList.toggle("solved", opened.has(day));
    link.classList.toggle("current", open && !opened.has(day));
    link.querySelector(".day-status").textContent = opened.has(day)
        ? "Gelöst"
        : open ? "Öffnen" : "Gesperrt";
    if (!open) link.removeAttribute("href");
  });

  $$(".day-no").forEach((span) => {
    const day = Number(span.dataset.day);
    const open = canOpen(day);
    span.classList.toggle("locked", !open);});
}

function renderProfile() {
  if (!$("#profileName")) return;
  const savedName = localStorage.getItem(LS_NAME) || "";
  $("#profileName").textContent = savedName || "Noch kein Name gespeichert";
  const nameInput = $("#profileNameInput");
  if (nameInput) nameInput.value = savedName;
  const solved = new Set(solvedDays());
  $("#profileDays").innerHTML = Array.from({ length: 24 }, (_, i) => {
    const day = i + 1;
    return `<span class="${solved.has(day) ? "done" : ""}">${day}</span>`;
  }).join("");
  setupNameChange();
}

function normalizePlayerName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function nameKey(name) {
  return normalizePlayerName(name).toLowerCase();
}

let highscoresRequest;
function loadHighscores() {
  return highscoresRequest ??= new Promise((resolve) => {
    const callback = `onHighscores_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const done = (rows) => {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      resolve(Array.isArray(rows) ? rows : []);
    };

    window[callback] = done;
    script.src = `${LOG_URL}?callback=${callback}`;
    script.onerror = () => done();
    const timeout = setTimeout(done, 6000);
    document.body.appendChild(script);
  }).finally(() => {
    highscoresRequest = undefined;
  });
}

function scoreDay(value) {
  const match = String(value ?? "").trim().match(/^(?:Tag\s*)?(\d+)$/i);
  const day = Number(match?.[1]);
  return day >= 1 && day <= 24 ? day : 0;
}

async function restoreSolvedDays() {
  const player = nameKey(localStorage.getItem(LS_NAME) || "");
  if (!player) return;
  const rows = await loadHighscores();
  if (nameKey(localStorage.getItem(LS_NAME) || "") !== player) return;
  let lastSolved = 0;
  for (const row of rows) {
    if (typeof row?.name === "string" && nameKey(row.name) === player) {
      lastSolved = Math.max(lastSolved, scoreDay(row.solved));
    }
  }
  if (!lastSolved) return;
  const persisted = readOpened(LS_OPEN);
  for (const day of persisted) opened.add(day);
  for (let day = 1; day <= lastSolved; day++) opened.add(day);
  if ([...opened].some(day => !persisted.has(day))) {
    localStorage.setItem(LS_OPEN, JSON.stringify(solvedDays()));
  }
}

function lastSolvedDay() {
  return solvedDays().at(-1) || 0;
}

function logNameChange(oldName, newName) {
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      action: "rename",
      oldName,
      newName,
      name: newName,
      solved: `${lastSolvedDay()}`,
      points: `${allPoints}`,
    }),
  }).catch(() => {});
}

function setupNameChange() {
  const input = $("#profileNameInput");
  const saveButton = $("#saveNameButton");
  const pageStatus = $("#nameChangeStatus");
  if (!input || !saveButton || !pageStatus) return;
  if (saveButton.dataset.ready) return;
  saveButton.dataset.ready = "true";

  input.addEventListener("input", () => {
    pageStatus.textContent = "";
  });

  saveButton.addEventListener("click", async () => {
    const oldName = normalizePlayerName(localStorage.getItem(LS_NAME) || "");
    const newName = normalizePlayerName(input.value);
    if (newName.length < 2) {
      pageStatus.textContent = "Der Name muss mindestens 2 Zeichen lang sein.";
      return;
    }
    if (oldName && nameKey(newName) === nameKey(oldName)) {
      input.value = oldName;
      pageStatus.textContent = "Name ist unverändert.";
      return;
    }

    saveButton.disabled = true;
    pageStatus.textContent = "Prüfe Namen...";
    const rows = await loadHighscores();
    const takenNames = new Set(rows.map(row => row?.name).filter(name => typeof name === "string").map(nameKey));
    if (takenNames.has(nameKey(newName))) {
      saveButton.disabled = false;
      pageStatus.textContent = "Der Name ist leider schon vergeben.";
      return;
    }

    localStorage.setItem(LS_NAME, newName);
    $("#profileName").textContent = newName;
    input.value = newName;
    logNameChange(oldName, newName);
    pageStatus.textContent = "Name gespeichert.";
    saveButton.disabled = false;
  });
}

function setupSlide() {
  const side = sessionStorage.getItem(SLIDE);
  sessionStorage.removeItem(SLIDE);
  if (side) document.body.classList.add(`slide-${side}`);
  $$("[data-slide]").forEach((link) => {
    link.addEventListener("click", () => sessionStorage.setItem(SLIDE, link.dataset.slide));
  });
}

function getUserName() {
  let name = localStorage.getItem(LS_NAME);
  if (!name) {
    name = prompt("Wie heißt du? (Nur einmal nötig)")?.trim();
    if (name) localStorage.setItem(LS_NAME, name);
  }
  return name;
}

function logSolved() {
  const name = getUserName();
  if (!name) return;
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({ name, solved: `${lastSolvedDay()}`, points: `${allPoints}` }),
  }).catch(() => {});
}

function updatePoints(amount) {
  if (allPoints < (-amount)) return false;
  allPoints += amount;
  save();
  renderShell();
  return true;
}

const progressReady = restoreSolvedDays();

document.addEventListener("DOMContentLoaded", async () => {
  renderShell();
  setupSlide();
  const toggle = $("#testModeToggle");
  if (toggle) {
    toggle.checked = testMode;
    toggle.addEventListener("change", () => {
      localStorage.setItem(LS_TEST_MODE, String(toggle.checked));
      location.reload();
    });
  }
  await progressReady;
  renderShell();
  renderProfile();
  renderChatInbox();
});

// Calendar release is based on the Advent calendar's local time in Berlin.
function calendarChatDay() {
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Berlin", year:"numeric", month:"numeric", day:"numeric"}).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  if (date.year < 2026 || (date.year === 2026 && date.month < 12)) return 0;
  return date.year > 2026 ? LAST_CHAT_DAY : Math.min(LAST_CHAT_DAY, date.day);
}
function releasedChatDay() {
  const limit = testMode ? LAST_CHAT_DAY : calendarChatDay();
  for (let day = 1; day < limit; day++) {
    if (!opened.has(day)) return day;
  }
  return limit;
}
function daysForChat(character = "santa") {
  return character === "rudolf" ? [4] : character === "nikolaus" ? [6] : [1, 2, 3, 5, 6];
}
function currentChatDay(character = "santa") {
  const released = releasedChatDay();
  const available = daysForChat(character).filter(day => day <= released);
  return available.find(day => !opened.has(day)) || available[available.length - 1] || 0;
}
function readNikolausQuest() {
  try { return JSON.parse(localStorage.getItem(LS_NIKOLAUS_QUEST) || "{}"); }
  catch { return {}; }
}
function saveNikolausQuest(state) {
  localStorage.setItem(LS_NIKOLAUS_QUEST, JSON.stringify(state));
}
function hasUnreadDay(character, day) {
  if (day === 6 && character === "santa") {
    const quest = readNikolausQuest();
    return Boolean(quest.together && !quest.confirmationRead);
  }
  return !opened.has(day);
}
function chatStorageKey(day, character) {
  return `advent_chat_log_${day}${day === 6 && character === "santa" ? "_santa" : ""}`;
}
function renderChatInbox() {
  const list = document.getElementById("chatList");
  if (!list) return;
  const released = releasedChatDay();
  if (!released) {
    list.innerHTML = '<p class="inbox-empty">Am 1. Dezember schreibt dir der Weihnachtsmann. 🎅</p>';
    return;
  }
  const contacts = [
    {id:"santa", name:"Weihnachtsmann 🎅", avatar:"tage/ProfilePic.jpeg",  preview:"Eine neue Weihnachtsmission wartet auf dich."},
    {id:"nikolaus", name:"Nikolaus 🎁", avatar:"assets/avatars/nikolaus.png", preview:"Moin! Kannst du herausfinden, wo der Weihnachtsmann ist?"},
    {id:"rudolf", name:"Rudolf 🦌", avatar:"assets/avatars/rudolf.png",  preview:"Ey yo, wo ist mein Geschenkehaufen? Ich brauche deine Hilfe!"},
  ];
  list.innerHTML = contacts.filter(c => daysForChat(c.id).some(day => day <= released)).map(c => {
    const available = daysForChat(c.id).filter(day => day <= released);
    const last = available[available.length - 1];
    const unread = available.filter(day => hasUnreadDay(c.id, day)).length;
    const showReunion = c.id === "santa" && available.includes(6) && hasUnreadDay("santa", 6);
    return `<a class="chat-row" href="tage/template.html?contact=${c.id}"><img class="inbox-avatar" src="${c.avatar}" alt="" width="58" height="58"><span class="chat-row-copy"><strong>${c.name}</strong><span>${showReunion ? "Hey, ich habe gerade den Nikolaus getroffen!" : unread ? c.preview : "Keine neuen Nachrichten."}</span></span><span class="chat-row-meta"><time>${last}. Dez.</time>${unread ? `<b class="unread-badge" aria-label="${unread} ungelöste Tagesmissionen">${unread}</b>` : '<span aria-label="Keine neuen Nachrichten">✓✓</span>'}</span></a>`;
  }).join("");
}

// Restore fresh state when switching back to a cached page or another open chat.
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  window.addEventListener("storage", event => {
    if ([LS_TEST_MODE, LS_OPEN, LS_POINTS, LS_HINT_COUNTS, LS_NIKOLAUS_QUEST].includes(event.key)) location.reload();
  });
}
