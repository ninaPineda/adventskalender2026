const LS_KEY = "advent_opened";
const LS_KEY_COINS = "advent_coins";
const LOG_URL =
  "https://script.google.com/macros/s/AKfycbxE2viBiew4764LuIA6OevSyb2h5YNvIHkQEa3ym1BiEn_UftktZenu9XF8P5CVMz-btw/exec";

const opened = new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
let coins = Number(localStorage.getItem(LS_KEY_COINS) ?? "1");

function saveOpened() {
  localStorage.setItem(LS_KEY, JSON.stringify([...opened]));
}

function getDayFromFilename() {
  const file = window.location.pathname.split("/").pop() || "";
  const match = file.match(/^(\d+)\.html$/);
  return match ? Number(match[1]) : 1;
}

function getUserName() {
  let name = localStorage.getItem("advent_user_name");

  if (!name) {
    name = prompt("Wie heißt du?")?.trim() || "Unbekannt";
    localStorage.setItem("advent_user_name", name);
  }

  return name;
}

function logSolved(day) {
  const name = getUserName();

  fetch(LOG_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      name,
      solved: "Tag " + day,
    }),
  }).catch(() => {});
}

function markSolved(day) {
  if (!opened.has(day)) {
    opened.add(day);
    saveOpened();
    logSolved(day);
  }
}

function showMessage(text, isSuccess = false) {
  const box = document.querySelector(".result");
  if (!box) return;

  box.textContent = text;
  box.hidden = false;
  box.classList.toggle("success", isSuccess);
  box.classList.toggle("error", !isSuccess);
}

function normalize(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "");
}

function isCorrect(userAnswer, correctAnswers) {
  return correctAnswers.some(ans => normalize(ans) === normalize(userAnswer));
}

function checkAnswer() {
  const input = document.querySelector("#answer");
  const solutionEl = document.querySelector("#solution");

  if (!input || !solutionEl) return;

  const userAnswer = input.value;

  const answers = (solutionEl.dataset.answer || "")
    .split("|")
    .map(a => a.trim());

  if (!userAnswer) {
    showMessage("Digga schreib halt was 😭");
    return;
  }

  if (isCorrect(userAnswer, answers)) {
    const day = getDayFromFilename();
    markSolved(day);
    showMessage("Richtig 🎉", true);

    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1200);
  } else {
    showMessage("Nope 😌");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#check-answer");
  const dayLabel = document.querySelector(".day-number");
  const day = getDayFromFilename();

  if (dayLabel) {
    dayLabel.textContent = day;
  }

  if (btn) {
    btn.addEventListener("click", checkAnswer);
  }
});