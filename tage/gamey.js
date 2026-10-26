const LS_CHAT = "advent_chat_log";
let HINTS = {};
let SOLUTIONS = {};

function dayFromURL() {
  return Number(new URLSearchParams(location.search).get("tag")) || 1;
}

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // mehrfach-spaces killen
    .replace(/[.!?,]/g, ""); // bisschen tolerant
}

function launchSuccessConfetti() {
  if (typeof confetti !== "function") return;
  const style = getComputedStyle(document.documentElement);
  confetti({
    particleCount: 180,
    spread: 85,
    startVelocity: 45,
    scalar: 1.2,
    origin: { y: 0.78 },
    colors: [
      style.getPropertyValue("--accent").trim(),
      style.getPropertyValue("--holly").trim(),
      style.getPropertyValue("--evergreen").trim(),
      style.getPropertyValue("--line").trim(),
    ],
    zIndex: 9999,
  });
}


function pointsForDay(day) {
  return Math.max(10 - (Number(wrongAttempts[day]) || 0) * 2, 0);
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

// Die äußere Liste enthält die Schritte, die innere Liste akzeptierte Varianten.
function answerMatches(answer, acceptedAnswers = []) {
  const normalizeAnswer = (value) => normalize(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
  const normalized = normalizeAnswer(answer);
  return acceptedAnswers.some((accepted) => normalized === normalizeAnswer(accepted));
}

function hintsForDay(day) {
  return HINTS[String(day)] || [];
}

function hintsUsed(day) {
  // Bereits gekaufte Hinweise aus der bisherigen Version zählen als erster Hinweis.
  return Number(hintCounts[day]) || (hints.has(day) ? 1 : 0);
}

function setupSantaChat(setupDay) {
  const chat = $(".santa-chat");
  const scroll = $("#daySlot");
  const composer = $("#chatComposer");
  const input = $("#chatInput");
  const locationButton = $("#sendLocationButton");
  const script = $(".santa-chat-script");
  if (!chat || !scroll || !composer || !input || !locationButton || !script) return;
  if (chat.dataset.ready) return;
  chat.dataset.ready = "true";
  if (script.dataset.pending === "true") {
    composer.hidden = true;
    scroll.querySelectorAll(".chat-message").forEach((bubble) => bubble.classList.add("visible"));
    return;
  }
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

  locationButton.hidden = true;
  composer.classList.add("text-only");

  const loadSavedChat = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{"messages":[],"pendingHint":false}');
      if (script?.dataset.chatVersion && saved.version !== script.dataset.chatVersion) {
        return { messages: [], pendingHint: false, version: script.dataset.chatVersion };
      }
      return saved;
    } catch {
      return { messages: [], pendingHint: false, version: script?.dataset.chatVersion };
    }
  };
  const chatLog = loadSavedChat();
  const revealExistingImmediately = opened.has(day) || Boolean(chatLog.messages?.length);
  const chatMessageGap = 700;
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

    element.hidden = true;
    element.classList.add("will-animate");
    const typing = document.createElement("div");
    typing.className = "chat-message santa-message typing-indicator";
    typing.hidden = true;
    typing.setAttribute("role", "status");
    typing.setAttribute("aria-label", "Santa schreibt …");
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      typing.appendChild(dot);
    }
    element.before(typing);
    const wait = Math.max(0, nextSantaMessageAt - Date.now());
    const typingDuration = Math.min(4200, Math.max(1600, (element.textContent || "").length * 16));
    nextSantaMessageAt = Date.now() + wait + typingDuration + chatMessageGap;
    setTimeout(() => {
      typing.hidden = false;
      scrollToBottom();
    }, wait);
    setTimeout(() => {
      typing.remove();
      element.hidden = false;
      requestAnimationFrame(() => element.classList.add("visible"));
      scrollToBottom();
    }, wait + typingDuration);
  };

  // Leave enough time to read the last queued reply before leaving the chat.
  const completeAfterMessages = (points) => {
    setTimeout(() => rightSolution(day, points), Math.max(0, nextSantaMessageAt - Date.now()) + 1400);
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

  const sendHintInChat = () => {
    chatLog.pendingHint = false;
    saveChat();
    const index = hintsUsed(day);
    const hint = hintsForDay(day)[index];
    if (!hint) {
      appendBubble("Mehr Hinweise habe ich heute nicht. Mein Weisheitsvorrat ist leer. 🎅", "santa");
      return;
    }
    if (!updatePoints(-5)) {
      appendBubble("Du hast leider nicht genug Sterne für einen Hinweis. ⭐", "santa");
      return;
    }
    hintCounts[day] = index + 1;
    hints.add(day);
    save();
    logSolved(day);
    appendBubble(`Hinweis ${index + 1}/3: ${hint} ✨`, "santa");
  };

  const solutions = SOLUTIONS[String(day)] || [];

  // Tagesmodule verwenden den gemeinsamen Chat, ohne seine Abläufe zu duplizieren.
  const dayGame = setupDay?.({
    day,
    chatLog,
    saveChat,
    appendBubble,
    normalize,
    solutions,
    answerMatches,
    locationButton,
    complete: completeAfterMessages,
    celebrate: launchSuccessConfetti,
  }) || {};
  composer.classList.toggle("text-only", locationButton.hidden);

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendBubble(text, "user");
    input.value = "";
    const normalizedText = normalize(text);
    if (chatLog.pendingHint) {
      if (["ja", "jap", "yes", "klar", "okay", "ok"].includes(normalizedText)) {
        sendHintInChat();
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
      if (hintsUsed(day) >= hintsForDay(day).length) {
        sendHintInChat();
        return;
      }
      chatLog.pendingHint = true;
      saveChat();
      setTimeout(() => {
        appendBubble("Soll ich dir wirklich einen Hinweis schicken? Das kostet 5 Sterne. Antworte mit „Ja“ oder „Nein“. ⭐", "santa");
      }, 720);
      return;
    }
    if (dayGame.handleAnswer?.(text)) return;
    if (script.dataset.placeholder === "true") {
      if (!solutions.length) {
        appendBubble("Meine Lösungsliste fehlt gerade. Lade die Seite bitte neu. 🎅", "santa");
        return;
      }
      const index = Number(chatLog.solutionIndex) || 0;
      if (index >= solutions.length) {
        rightSolution(day);
        return;
      }
      if (answerMatches(text, solutions[index])) {
        chatLog.solutionIndex = index + 1;
        saveChat();
        if (chatLog.solutionIndex === solutions.length) {
          appendBubble("Richtig! Wieder ein Weihnachtsproblem weniger. Deine Sterne kommen sofort. 🎅⭐", "santa");
          launchSuccessConfetti();
          completeAfterMessages();
        } else {
          appendBubble("Richtig! Jetzt fehlt noch die nächste Antwort. 🎁", "santa");
        }
      } else {
        appendBubble("Mein Bart sagt: Versuch es mit „Lösung“. Der ist heute ausnahmsweise hilfreich. 🎅", "santa");
      }
      return;
    }
    setTimeout(() => {
      const answer = replies[Math.floor(Math.random() * replies.length)];
      appendBubble(answer, "santa");
    }, 850);
  });
}

function setupChatGallery() {
  const links = [...document.querySelectorAll(".santa-chat-script .media-message a")]
    .filter(link => link.querySelector("img"));
  if (!links.length) return;
  const dialog = document.createElement("dialog");
  dialog.className = "chat-gallery";
  dialog.setAttribute("aria-label", "Bilder aus dem Chat");
  dialog.innerHTML = `
    <div class="gallery-toolbar">
      <span class="gallery-counter" aria-live="polite"></span>
      <button type="button" class="gallery-close" aria-label="Bildvorschau schließen" autofocus>×</button>
    </div>
    <div class="gallery-stage">
      <button type="button" class="gallery-prev" aria-label="Vorheriges Bild">‹</button>
      <img class="gallery-image" alt="" draggable="false">
      <button type="button" class="gallery-next" aria-label="Nächstes Bild">›</button>
    </div>
    <p class="gallery-caption"></p>`;
  document.body.appendChild(dialog);
  const image = dialog.querySelector(".gallery-image");
  const counter = dialog.querySelector(".gallery-counter");
  const caption = dialog.querySelector(".gallery-caption");
  let index = 0;
  let opener;
  const show = next => {
    index = (next + links.length) % links.length;
    const source = links[index].querySelector("img");
    image.src = links[index].href;
    image.alt = source.alt;
    caption.textContent = source.alt;
    counter.textContent = `${index + 1} / ${links.length}`;
  };
  links.forEach((link, position) => {
    link.addEventListener("click", event => {
      event.preventDefault();
      opener = link;
      show(position);
      dialog.showModal();
    });
  });
  dialog.querySelector(".gallery-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".gallery-prev").addEventListener("click", () => show(index - 1));
  dialog.querySelector(".gallery-next").addEventListener("click", () => show(index + 1));
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(index + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));
  let touchStart;
  dialog.addEventListener("touchstart", event => {
    touchStart = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  dialog.addEventListener("touchend", event => {
    if (!touchStart || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  dialog.addEventListener("touchcancel", () => { touchStart = null; });
}

async function loadDayContent() {
  const slot = document.getElementById("daySlot");
  if (!slot) return;
  const day = dayFromURL();
  document.querySelector(".page-title").textContent = `Tag ${day}`;
  try {
    const response = await fetch(`./content/${day}.html`, { cache: "no-store" });
    if (!response.ok) throw new Error("Day content unavailable");
    slot.innerHTML = await response.text();
  } catch {
    slot.innerHTML = '<section class="santa-chat-script" data-pending="true"><div class="chat-message santa-message"><p>Dieser Tag konnte gerade nicht geladen werden. Versuch es später nochmal. 🎄</p></div></section>';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("daySlot")) return;
  try {
    const [hintsResponse, solutionsResponse] = await Promise.all([
      fetch("../hints.json", { cache: "no-store" }),
      fetch("../solutions.json", { cache: "no-store" }),
    ]);
    if (!hintsResponse.ok || !solutionsResponse.ok) throw new Error("Rätseldaten fehlen");
    HINTS = await hintsResponse.json();
    SOLUTIONS = await solutionsResponse.json();
  } catch {}
  await loadDayContent();
  // Nur fertige Tage mit eigenem Verhalten laden ein Modul.
  const script = document.querySelector(".santa-chat-script");
  let setupDay;
  if (script?.hasAttribute("data-day-script") && script.dataset.pending !== "true") {
    try {
      ({ setupDay } = await import(`./scripts/${dayFromURL()}.js?v=shuffled-selection1`));
    } catch (error) {
      console.error("Tages-Skript konnte nicht geladen werden", error);
      script.dataset.pending = "true";
      const message = document.createElement("p");
      message.textContent = "Das Rätsel konnte gerade nicht geladen werden. Bitte lade die Seite neu. 🎄";
      script.appendChild(message);
    }
  }
  setupChatGallery();
  setupSantaChat(setupDay);
});
