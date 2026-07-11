const LS_OPEN = "advent_opened";
const LS_HINTS = "hints_opened";
const LS_COINS = "advent_coins";
const LS_NAME = "advent_user_name";
const LS_RESET = "advent_reset_version";
const RESET = "2026-ui-reset-1";
const LOG_URL = "https://script.google.com/macros/s/AKfycbzBXhZt7SykZXRvw5vUmxIMQixHFJXdD0ufDHI73kA1-qD-fev7YrWl81QFtBTnyNh1kA/exec";

if (localStorage.getItem(LS_RESET) !== RESET) {
  localStorage.removeItem(LS_OPEN);
  localStorage.removeItem(LS_HINTS);
  localStorage.setItem(LS_RESET, RESET);
}

const opened = new Set(JSON.parse(localStorage.getItem(LS_OPEN) || "[]"));
const hints = new Set(JSON.parse(localStorage.getItem(LS_HINTS) || "[]"));
let coins = Number(localStorage.getItem(LS_COINS) || 0);
let HINTS = {};
const SLIDE = "advent_slide";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const save = () => {
  localStorage.setItem(LS_OPEN, JSON.stringify([...opened]));
  localStorage.setItem(LS_HINTS, JSON.stringify([...hints]));
  localStorage.setItem(LS_COINS, coins);
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
  $(".coin-count") && ($(".coin-count").textContent = coins);
  $$(".day-link").forEach((link) => {
    const day = Number(link.dataset.day);
    const open = canOpen(day);
    link.classList.toggle("locked", !open);
    link.classList.toggle("solved", opened.has(day));
    link.querySelector(".day-status").textContent = opened.has(day) ? "gelöst" : open ? "offen" : "gesperrt";
    if (!open) link.removeAttribute("href");
  });
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

function logSolved(day, points) {
  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({ name: getUserName(), solved: `${day}`, points: `${points}` }),
  }).catch(() => {});
}

function addCoin() {
  coins += 1;
  save();
  renderShell();
}

function substractCoin(amount = 1) {
  if (coins < amount) return false;
  coins -= amount;
  save();
  renderShell();
  return true;
}

function wrongSolution() {
  if (!substractCoin()) return $("#noAnswerDialog")?.showModal();
  $("#failOverlay")?.classList.remove("hidden");
  setTimeout(() => $("#failOverlay")?.classList.add("hidden"), 800);
}

function rightSolution(day, points) {
  if (coins <= 0) return $("#noAnswerDialog")?.showModal();
  if (!opened.has(day)) {
    opened.add(day);
    addCoin();
    save();
    logSolved(day, points);
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
  if (!substractCoin(10)) return $("#noCoinsDialog")?.showModal();
  hints.add(day);
  save();
  updateHintButton();
  showHintDirect();
}

function updateHintButton() {
  const btn = $("#hint-button");
  if (!btn) return;
  const day = dayFromURL();
  btn.textContent = hints.has(day) ? "Hinweis anzeigen" : "Hinweis für 10 Coins";
  btn.onclick = hints.has(day) ? showHintDirect : showCheckDialog;
}

async function loadDayContent() {
  const slot = $("#daySlot");
  if (!slot) return;
  const day = dayFromURL();
  $(".page-title").textContent = `Tag ${day}`;
  try {
    slot.innerHTML = await (await fetch(`./content/${day}.html`)).text();
  } catch {
    slot.innerHTML = `<section class="question">Dieser Tag ist noch leer.</section>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    HINTS = await (await fetch(`${location.pathname.includes("/tage/") ? "../" : ""}hints.json`)).json();
  } catch {}
  renderShell();
  renderProfile();
  setupSlide();
  loadDayContent();
  updateHintButton();
});
