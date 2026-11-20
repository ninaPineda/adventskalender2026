const LOG_URL = "https://script.google.com/macros/s/AKfycbx4yiiDjuIbqZ2r0DlZVQHbTEXiknKmS0AnVCiMGVSnFhZrnyVW6j_3KjPH22eyM7WRJQ/exec";

// Spielfortschritt im Arbeitsspeicher; storage.js übernimmt das Speichern.
const progress = store.read();
const opened = new Set(progress.opened || []);
const wrongAttempts = progress.wrongAttempts || {};
const hintCounts = progress.hintCounts || {};
let allPoints = progress.points ?? 10;
const SLIDE = "advent_slide";
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const save = () => store.update({ opened: [...opened], points: allPoints, hintCounts, wrongAttempts });

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
  const savedName = savedPlayerName();
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

let scoreRequest;
function loadScoreRows() {
  if (scoreRequest) return scoreRequest;
  scoreRequest = new Promise((resolve, reject) => {
    const callback = `onScoreRows_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const done = (rows) => {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      if (Array.isArray(rows)) resolve(rows);
      else reject(new Error("Bestenliste konnte nicht geladen werden"));
    };

    window[callback] = done;
    script.src = `${LOG_URL}?callback=${callback}`;
    script.onerror = () => done();
    const timeout = setTimeout(() => done(), 6000);
    document.body.appendChild(script);
  }).finally(() => { scoreRequest = undefined; });
  return scoreRequest;
}

function savedPlayerName() {
  const name = store.read().name;
  return name && name !== "undefined" && name !== "null" ? name : "";
}

async function restorePlayerProgress(name) {
  const rows = (await loadScoreRows()).filter(row =>
    typeof row?.name === "string" && nameKey(row.name) === nameKey(name)
  ).sort((a, b) => (new Date(a.timestamp).getTime() || 0) - (new Date(b.timestamp).getTime() || 0));
  if (!rows.length) return false;

  const recovered = new Set();
  let points = 10;
  let recordedPoints;
  for (const row of rows) {
    const match = String(row.solved ?? "").trim().match(/^(?:Tag\s*)?(\d+)$/i);
    const day = Number(match?.[1]);
    const balanceText = String(row.points ?? "").trim();
    const balance = Number(balanceText.replace(",", "."));
    const hasBalance = balanceText !== "" && Number.isFinite(balance) && balance >= 0;
    // Ältere Hinweiskäufe wurden mit der Tagesnummer und fünf Sternen Abzug gespeichert.
    if (day >= 1 && day <= 24 && !(hasBalance && balance === points - 5)) recovered.add(day);
    if (hasBalance) points = recordedPoints = balance;
  }

  const hasNewDays = [...recovered].some(day => !opened.has(day));
  const hasLocalOnlyDays = solvedDays().some(day => !recovered.has(day));
  if (recordedPoints !== undefined &&
      (store.read().points == null || (hasNewDays && !hasLocalOnlyDays))) {
    allPoints = recordedPoints;
  }
  recovered.forEach(day => opened.add(day));
  store.update({ name: normalizePlayerName(rows.at(-1).name) });
  restoreNikolausQuest();
  save();
  return true;
}

let initialProgress;
function loadInitialProgress() {
  if (initialProgress) return initialProgress;
  const name = savedPlayerName();
  if (name && (store.read().opened == null || store.read().points == null)) {
    initialProgress = restorePlayerProgress(name).catch(() => {});
  } else {
    restoreNikolausQuest();
    initialProgress = Promise.resolve();
  }
  return initialProgress;
}

function restoreNikolausQuest() {
  if (!opened.has(6)) return;
  const quest = readNikolausQuest();
  if (!quest.together) {
    store.update({ quest: {...quest, together: true} });
  }
}

function setupProgressRestore() {
  const button = $("#restoreProgressButton");
  if (!button) return;
  const input = $("#profileNameInput");
  const status = $("#nameChangeStatus");
  const saveButton = $("#saveNameButton");
  button.addEventListener("click", async () => {
    const name = normalizePlayerName(input.value);
    if (!name) {
      status.textContent = "Gib deinen bisherigen Spielernamen ein.";
      return;
    }
    if (savedPlayerName() && nameKey(savedPlayerName()) !== nameKey(name)) {
      status.textContent = "Gib den Namen ein, der in deinem Profil gespeichert ist.";
      return;
    }
    button.disabled = saveButton.disabled = true;
    status.textContent = "Lade deinen Spielstand …";
    try {
      if (await restorePlayerProgress(name)) {
        renderShell();
        renderProfile();
        status.textContent = "Dein Spielstand wurde aus der Bestenliste geladen.";
      } else {
        status.textContent = "In der Bestenliste gibt es keinen Eintrag für diesen Namen.";
      }
    } catch {
      status.textContent = "Die Bestenliste ist gerade nicht erreichbar. Versuch es erneut.";
    } finally {
      button.disabled = saveButton.disabled = false;
    }
  });
}

function logNameChange(oldName, newName) {
  const days = solvedDays();
  const lastSolved = days.length ? days[days.length - 1] : 0;
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      action: "rename",
      oldName,
      newName,
      name: newName,
      solved: `${lastSolved}`,
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
    const oldName = normalizePlayerName(savedPlayerName());
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
    const restoreButton = $("#restoreProgressButton");
    if (restoreButton) restoreButton.disabled = true;
    pageStatus.textContent = "Prüfe Namen...";
    let rows;
    try {
      rows = await loadScoreRows();
    } catch {
      saveButton.disabled = false;
      if (restoreButton) restoreButton.disabled = false;
      pageStatus.textContent = "Die Bestenliste ist gerade nicht erreichbar. Versuch es erneut.";
      return;
    }
    if (rows.some(row => typeof row?.name === "string" && nameKey(row.name) === nameKey(newName))) {
      saveButton.disabled = false;
      if (restoreButton) restoreButton.disabled = false;
      pageStatus.textContent = "Der Name ist leider schon vergeben.";
      return;
    }

    store.update({ name: newName });
    $("#profileName").textContent = newName;
    input.value = newName;
    logNameChange(oldName, newName);
    pageStatus.textContent = "Name gespeichert.";
    saveButton.disabled = false;
    if (restoreButton) restoreButton.disabled = false;
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
  let name = savedPlayerName();
  if (!name) {
    name = normalizePlayerName(prompt("Wie heißt du? (Nur einmal nötig)") || "");
    if (name) store.update({ name });
  }
  return name;
}

function logScore(day) {
  const name = getUserName();
  if (!name) return;
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    body: new URLSearchParams({ name, solved: String(day ?? 0), points: String(allPoints) }),
  }).catch(() => {});
}

function updatePoints(amount) {
  if (allPoints < (-amount)) return false;
  allPoints += amount;
  save();
  renderShell();
  return true;
}

document.addEventListener("DOMContentLoaded", async () => {
  setupSlide();
  await loadInitialProgress();
  renderShell();
  renderProfile();
  setupProgressRestore();
  renderChatInbox();
  const restoreLink = $("#restoreProgressLink");
  if (restoreLink) restoreLink.hidden = Boolean(savedPlayerName());
});

// Calendar release is based on the Advent calendar's local time in Berlin.
function releasedChatDay() {
  return 8; // Datumssperre zum Testen aus: alle acht fertigen Tage verfügbar.
  //const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Berlin", year:"numeric", month:"numeric", day:"numeric"}).formatToParts(new Date());
  //const date = Object.fromEntries(parts.map(p => [p.type, Number(p.value)]));
  //if (date.year < 2026 || (date.year === 2026 && date.month < 12)) return 0;
  //return date.year > 2026 ? 8 : Math.min(8, date.day);
}
function daysForChat(character = "santa") {
  return character === "rudolf" ? [4] : character === "nikolaus" ? [6] : [1, 2, 3, 5, 6, 7, 8];
}
function currentChatDay(character = "santa") {
  const available = daysForChat(character).filter(day => day <= releasedChatDay());
  return available.find(day => !opened.has(day)) || available[available.length - 1] || 0;
}
function readNikolausQuest() {
  return store.read().quest || {};
}
function hasUnreadDay(character, day) {
  if (day === 6 && character === "santa") {
    const quest = readNikolausQuest();
    return Boolean(quest.together && !quest.confirmationRead);
  }
  return !opened.has(day);
}
function chatStorageKey(day, character) {
  return `${day}${day === 6 && character === "santa" ? "_santa" : ""}`;
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
    return `<a class="chat-row" href="tage/template.html?contact=${c.id}"><img class="inbox-avatar" src="${c.avatar}" alt="" width="58" height="58"><span class="chat-row-copy"><strong>${c.name}</strong><span>${c.id === "santa" && readNikolausQuest().together && !readNikolausQuest().confirmationRead ? "Hey, ich habe gerade den Nikolaus getroffen!" : unread ? c.preview : "Alle Weihnachtsmissionen erledigt. ⭐"}</span></span><span class="chat-row-meta"><time>${last}. Dez.</time>${unread ? `<b class="unread-badge" aria-label="${unread} ungelöste Tagesmissionen">${unread}</b>` : '<span aria-label="Alles gelöst">✓✓</span>'}</span></a>`;
  }).join("");
}

// Restore fresh state when switching back to a cached page or another open chat.
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  window.addEventListener("storage", event => {
    if (event.key === store.key || event.key === null) location.reload();
  });
}
