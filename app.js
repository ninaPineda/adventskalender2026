const LS_OPEN = "advent_opened";
const LS_HINTS = "hints_opened";
const LS_POINTS = "advent_points";
const LS_NAME = "advent_user_name";
const LS_RESET = "advent_reset_version";
const LS_ATTEMPTS = "advent_wrong_attempts";
const RESET = "2026-score-reset-2";
const LOG_URL = "https://script.google.com/macros/s/AKfycbzBXhZt7SykZXRvw5vUmxIMQixHFJXdD0ufDHI73kA1-qD-fev7YrWl81QFtBTnyNh1kA/exec";

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
        : "open";
    if (!open) link.removeAttribute("href");
  });

  $$(".day-no").forEach((span) => {
    const day = Number(span.dataset.day);
    const open = canOpen(day);
    span.classList.toggle("locked", !open);});
}

function renderProfile() {
  if (!$("#profileName")) return;
  $("#profileName").textContent = localStorage.getItem(LS_NAME) || "Noch kein Name gespeichert";
  const solved = new Set(solvedDays());
  $("#profileDays").innerHTML = Array.from({ length: 24 }, (_, i) => {
    const day = i + 1;
    return `<span class="${solved.has(day) ? "done" : ""}">${day}</span>`;
  }).join("");
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
  if (!updatePoints(-5)) return $("#noCoinsDialog")?.showModal();
  hints.add(day);
  save();
  updateHintButton();
  showHintDirect();
}

function updateHintButton() {
  const btn = $("#hint-button");
  if (!btn) return;
  const day = dayFromURL();
  btn.textContent = hints.has(day) ? "Hinweis anzeigen" : "Hinweis für 5 Punkte";
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
