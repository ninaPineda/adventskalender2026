const LS_OPEN = "advent_opened";
const LS_HINTS = "hints_opened";
const LS_POINTS = "advent_points";
const LS_NAME = "advent_user_name";
const LS_RESET = "advent_reset_version";
const LS_ATTEMPTS = "advent_wrong_attempts";
const LS_CHAT = "advent_chat_log";
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

function setupSantaChat() {
  const chat = $(".santa-chat");
  const scroll = $("#daySlot");
  const composer = $("#chatComposer");
  const input = $("#chatInput");
  const locationButton = $("#sendLocationButton");
  const script = $(".santa-chat-script");
  if (!chat || !scroll || !composer || !input || !locationButton) return;
  if (chat.dataset.ready) return;
  chat.dataset.ready = "true";
  const day = dayFromURL();
  const storageKey = `${LS_CHAT}_${day}`;

  const fallbackReplies = [
    "Aaargh, mein Kopf... 🥴",
    "Ich bin mir gerade wirklich keine große Hilfe. 🎄",
    "Kannst du das nochmal anders versuchen? ✨",
    "Ho ho... oh nein. 🎅",
  ];
  let replies = fallbackReplies;
  try {
    replies = JSON.parse(script?.dataset.replies || "[]");
    if (!Array.isArray(replies) || !replies.length) replies = fallbackReplies;
  } catch {
    replies = fallbackReplies;
  }

  if (!$("#geoGuessDialog")) {
    locationButton.hidden = true;
    composer.classList.add("text-only");
  }
  const isTravelQuiz = day === 2 && script?.classList.contains("travel-quiz");

  const loadSavedChat = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{"messages":[],"geoOpen":false,"pendingHint":false}');
      if (script?.dataset.chatVersion && saved.version !== script.dataset.chatVersion) {
        return { messages: [], geoOpen: false, pendingHint: false, version: script.dataset.chatVersion };
      }
      return saved;
    } catch {
      return { messages: [], geoOpen: false, pendingHint: false, version: script?.dataset.chatVersion };
    }
  };
  const chatLog = loadSavedChat();
  const revealExistingImmediately = opened.has(day) || chatLog.introShown || Boolean(chatLog.messages?.length);
  const chatMessageGap = 950;
  let nextSantaMessageAt = Date.now();

  const saveChat = () => {
    localStorage.setItem(storageKey, JSON.stringify(chatLog));
  };

  const scrollToBottom = (behavior = "smooth") => {
    scroll.scrollTo({ top: scroll.scrollHeight, behavior });
  };

  const revealChatElement = (element, immediate = revealExistingImmediately) => {
    if (!element) return;
    element.classList.remove("hidden");
    element.classList.remove("visible");
    element.classList.remove("will-animate");

    if (immediate) {
      element.classList.add("visible");
      scrollToBottom("auto");
      return;
    }

    element.classList.add("will-animate");
    const wait = Math.max(0, nextSantaMessageAt - Date.now());
    nextSantaMessageAt = Date.now() + wait + chatMessageGap;
    setTimeout(() => {
      element.classList.add("visible");
      scrollToBottom();
    }, wait);
  };

  const appendBubble = (text, sender = "user", persist = true, animate = true) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-message ${sender === "user" ? "user-message" : "santa-message"}`;
    const p = document.createElement("p");
    p.textContent = text;
    bubble.appendChild(p);
    scroll.appendChild(bubble);
    if (sender === "santa" && animate) {
      revealChatElement(bubble, false);
    } else if (animate) {
      requestAnimationFrame(() => bubble.classList.add("visible"));
    } else {
      bubble.classList.add("visible");
    }
    if (persist) {
      chatLog.messages.push({ sender, text });
      saveChat();
    }
    scrollToBottom(animate ? "smooth" : "auto");
  };

  scroll.querySelectorAll(".santa-chat-script > .chat-message:not(.hidden)").forEach((bubble) => {
    revealChatElement(bubble);
  });
  if (!chatLog.introShown) {
    chatLog.introShown = true;
    saveChat();
  }

  chatLog.messages.forEach((message) => {
    appendBubble(message.text, message.sender, false, false);
  });

  window.santaChat = {
    appendBubble,
    revealElement: (element, options = {}) => revealChatElement(element, Boolean(options.immediate)),
    historyMode: revealExistingImmediately,
  };

  const openGeoPanel = () => {
    const dialog = $("#geoGuessDialog");
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      document.dispatchEvent(new CustomEvent("geoGuessr:open"));
    });
  };

  const sendHintInChat = () => {
    chatLog.pendingHint = false;
    saveChat();
    const hint = getHintForDay(day);
    if (!hint) {
      appendBubble("Ich hab gerade leider keinen hilfreichen Hinweis parat. 🕯️", "santa");
      return;
    }
    if (!hints.has(day)) {
      if (!updatePoints(-5)) {
        appendBubble("Du hast leider nicht genug Sterne für einen Hinweis. ⭐", "santa");
        return;
      }
      hints.add(day);
      save();
      logSolved(day);
    }
    appendBubble(`${hint.replace(/<[^>]+>/g, "")} ✨`, "santa");
  };

  const normalizeQuizAnswer = (value) => normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const pointsForTravelQuiz = () => Math.max(10 - (Number(wrongAttempts[2]) || 0), 0);

  const travelQuestions = [
    {
      answers: ["eurostar", "euro star"],
      correct: "Genau, der Eurostar! 🚄",
      next: "Und welches Meer unterfahre ich mit dem noch gleich? 🌊",
    },
    {
      answers: ["aermelkanal", "armelkanal", "aermel kanal", "armel kanal", "englischer kanal", "english channel", "kanal", "channel", "la manche"],
      correct: "Jaaa, der Ärmelkanal. Ein Zug unter dem Meer bleibt absurd. 🚇🌊",
      next: "Und von wo aus könnte ich stattdessen mit dem Schiff fahren? ⛴️",
    },
    {
      answers: ["dover", "hafen dover", "hafen von dover", "port dover", "port of dover"],
      correct: "Dover, natürlich! Du hast meinen Reiseplan gerettet. 🎅✨",
      next: "",
    },
  ];

  const answerMatches = (answer, acceptedAnswers) => {
    const normalizedAnswer = normalizeQuizAnswer(answer);
    return acceptedAnswers.some((accepted) => normalizedAnswer.includes(normalizeQuizAnswer(accepted)));
  };

  const handleTravelQuizAnswer = (text) => {
    if (!isTravelQuiz || chatLog.quizDone) return false;
    chatLog.quizIndex = Number(chatLog.quizIndex) || 0;
    const step = travelQuestions[chatLog.quizIndex];
    if (!step) return false;

    if (answerMatches(text, step.answers)) {
      chatLog.quizIndex += 1;
      saveChat();
      setTimeout(() => {
        appendBubble(step.correct, "santa");
        if (step.next) {
          setTimeout(() => appendBubble(step.next, "santa"), 850);
          return;
        }
        chatLog.quizDone = true;
        saveChat();
        launchSuccessConfetti?.();
        setTimeout(() => rightSolution(2, pointsForTravelQuiz()), 1000);
      }, 720);
      return true;
    }

    wrongAttempts[2] = (Number(wrongAttempts[2]) || 0) + 1;
    save();
    setTimeout(() => {
      appendBubble(`Nicht ganz. Versuch es nochmal. Punkte: ${pointsForTravelQuiz()} / 10 🎄`, "santa");
    }, 720);
    return true;
  };

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendBubble(text, "user");
    input.value = "";
    const normalizedText = normalize(text);
    if (chatLog.pendingHint) {
      if (["ja", "jap", "yes", "klar", "okay", "ok"].includes(normalizedText)) {
        setTimeout(sendHintInChat, 720);
        return;
      }
      if (["nein", "nee", "no", "nö", "nope"].includes(normalizedText)) {
        chatLog.pendingHint = false;
        saveChat();
        setTimeout(() => appendBubble("Alles klar, dann behalte ich den Tipp erstmal. 🎁", "santa"), 720);
        return;
      }
      setTimeout(() => appendBubble("Meinst du ja oder nein? Der Tipp kostet 5 Sterne. ⭐", "santa"), 720);
      return;
    }
    if (["hilfe", "hilf", "tipp", "hint", "hinweis"].includes(normalizedText)) {
      if (hints.has(day)) {
        setTimeout(sendHintInChat, 720);
        return;
      }
      chatLog.pendingHint = true;
      saveChat();
      setTimeout(() => {
        appendBubble("Soll ich dir wirklich einen Hinweis schicken? Das kostet 5 Sterne. Antworte mit „Ja“ oder „Nein“. ⭐", "santa");
      }, 720);
      return;
    }
    if (handleTravelQuizAnswer(text)) return;
    if (window.memoryPuzzle?.isAwaitingAnswer?.()) {
      window.memoryPuzzle.submitAnswer(text);
      return;
    }
    setTimeout(() => {
      const answer = replies[Math.floor(Math.random() * replies.length)];
      appendBubble(answer, "santa");
    }, 850);
  });

  locationButton.addEventListener("click", () => {
    openGeoPanel();
  });

  document.addEventListener("geoGuessr:submitted", (event) => {
    const { lat, lng, distance, points } = event.detail;
    appendBubble(`📍 Standort gesendet\n${lat.toFixed(4)}, ${lng.toFixed(4)}`, "user");
    setTimeout(() => {
      appendBubble(`Ich prüfe das... du warst ${distance} km entfernt und bekommst ${points} Punkte. ✨`, "santa");
    }, 620);
  });
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
  setupSantaChat();
  window.initDayGame?.(dayFromURL());
  updateHintButton();
});
