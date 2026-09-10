const LS_OPEN = "advent_opened";
const LS_HINTS = "hints_opened";
const LS_POINTS = "advent_points";
const LS_NAME = "advent_user_name";
const LS_RESET = "advent_reset_version";
const LS_ATTEMPTS = "advent_wrong_attempts";
const RESET = "2026-score-reset-2";
const LOG_URL = "https://script.google.com/macros/s/AKfycbx4yiiDjuIbqZ2r0DlZVQHbTEXiknKmS0AnVCiMGVSnFhZrnyVW6j_3KjPH22eyM7WRJQ/exec";

if (localStorage.getItem(LS_RESET) !== RESET) {
  localStorage.removeItem(LS_OPEN);
  localStorage.removeItem(LS_HINTS);
  localStorage.removeItem(LS_POINTS);
  localStorage.removeItem(LS_ATTEMPTS);
  localStorage.setItem(LS_RESET, RESET);
}

const opened = new Set(JSON.parse(localStorage.getItem(LS_OPEN) || "[]"));
const hints = new Set(JSON.parse(localStorage.getItem(LS_HINTS) || "[]"));
const wrongAttempts = JSON.parse(localStorage.getItem(LS_ATTEMPTS) || "{}");
let allPoints = Number(localStorage.getItem(LS_POINTS) || 0);
let HINTS = {};
const SLIDE = "advent_slide";
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const save = () => {
  localStorage.setItem(LS_OPEN, JSON.stringify([...opened]));
  localStorage.setItem(LS_HINTS, JSON.stringify([...hints]));
  localStorage.setItem(LS_POINTS, allPoints);
  localStorage.setItem(LS_ATTEMPTS, JSON.stringify(wrongAttempts));
};

function dayFromURL() {
  return Number(new URLSearchParams(location.search).get("tag")) || 1;
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
        ? "done"
        : open ? "open" : "closed";
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

function loadTakenNames() {
  return new Promise((resolve) => {
    const callback = `onNameCheck_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    let finished = false;
    const done = (names = []) => {
      if (finished) return;
      finished = true;
      delete window[callback];
      script.remove();
      resolve(new Set(names.map(nameKey)));
    };

    window[callback] = (rows) => {
      done((Array.isArray(rows) ? rows : []).map((row) => row.name).filter(Boolean));
    };
    script.src = `${LOG_URL}?callback=${callback}`;
    script.onerror = () => done();
    document.body.appendChild(script);
    setTimeout(() => done(), 6000);
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
    const takenNames = await loadTakenNames();
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
    localStorage.setItem(LS_NAME, name);
  }
  return name;
}

function logSolved(day) {
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({ name: getUserName(), solved: `${day}`, points: `${allPoints}` }),
  }).catch(() => {});
}

function updatePoints(amount) {
  if (allPoints < (-amount)) return false;
  allPoints += amount;
  save();
  renderShell();
  return true;
}

function pointsForDay(day) {
  return Math.max(10 - (Number(wrongAttempts[day]) || 0) * 2, 0);
}

function updateAttemptInfo() {
  const info = $("#attemptInfo");
  if (!info) return;
  info.textContent = `Aktuell gibt diese Frage ${pointsForDay(dayFromURL())} Punkte.`;
}

function wrongSolution(day = dayFromURL()) {
  wrongAttempts[day] = (Number(wrongAttempts[day]) || 0) + 1;
  save();
  updateAttemptInfo();
  $("#failOverlay")?.classList.remove("hidden");
  setTimeout(() => $("#failOverlay")?.classList.add("hidden"), 800);
}

function rightSolution(day, points) {
  if (!opened.has(day)) {
    opened.add(day);
    const earnedPoints = Number.isFinite(Number(points)) ? Number(points) : pointsForDay(day);
    delete wrongAttempts[day];
    updatePoints(earnedPoints);
    save();
    logSolved(day);
  }
  setTimeout(() => (location.href = "../index.html"), 500);
}

function openExplanaition() {
  $("#hintDialog")?.showModal();
}

function showCheckDialog() {
  $("#checkDialog")?.showModal();
}

function closeHint() {
  $("#hintDialog")?.close();
}

function closeCheckDialog() {
  $("#checkDialog")?.close();
}

function closeNoCoinsDialog() {
  $("#noCoinsDialog")?.close();
}

function closeNoAnswerDialog() {
  $("#noAnswerDialog")?.close();
}

function getHintForDay(day) {
  return HINTS[String(Math.floor(day))] || null;
}

function showHintDirect() {
  const hint = getHintForDay(dayFromURL());
  if (!hint) return;
  $("#hintText").innerHTML = hint;
  $("#hintDialog")?.showModal();
}

function openHint() {
  closeCheckDialog();
  const day = dayFromURL();
  if (hints.has(day)) return showHintDirect();
  if (!updatePoints(-5)) return $("#noCoinsDialog")?.showModal();
  hints.add(day);
  save();
  logSolved(day);
  updateHintButton();
  showHintDirect();
}

function updateHintButton() {
  const btn = $("#hint-button");
  if (!btn) return;
  const day = dayFromURL();
  btn.innerHTML = hints.has(day)
    ? "<span>Hinweis</span><b>gekauft</b>"
    : "<span>Hinweis</span><b>5 ⭐</b>";
  btn.onclick = hints.has(day) ? showHintDirect : showCheckDialog;
}

async function loadDayContent() {
  const slot = $("#daySlot");
  if (!slot) return;
  const day = dayFromURL();
  $(".page-title").textContent = `Tag ${day}`;
  try {
    slot.innerHTML = await (await fetch(`./content/${day}.html`, { cache: "no-store" })).text();
  } catch {
    slot.innerHTML = `<section class="question">Dieser Tag ist noch leer.</section>`;
  }
  updateAttemptInfo();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    HINTS = await (await fetch(`${location.pathname.includes("/tage/") ? "../" : ""}hints.json`)).json();
  } catch {}
  renderShell();
  renderProfile();
  setupSlide();
  await loadDayContent();
  window.initDayGame?.(dayFromURL());
  updateHintButton();
});
