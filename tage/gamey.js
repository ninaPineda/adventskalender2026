const LS_CHAT = "advent_chat_log";
let HINTS = {};
let SOLUTIONS = {};

function chatCharacter() {
  const contact = new URLSearchParams(location.search).get("contact");
  return ["rudolf", "nikolaus"].includes(contact) ? contact : "santa";
}

function dayFromURL() {
  return typeof currentChatDay === "function" ? currentChatDay(chatCharacter()) : Number(new URLSearchParams(location.search).get("tag")) || 1;
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
  if (typeof currentChatDay === "function") {
    if (currentChatDay(chatCharacter()) > day) location.reload();
    else {
      $("#sendLocationButton").hidden = true;
      $("#chatComposer").classList.add("text-only");
      $(".new-messages")?.remove();
    }
  }
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
  const script = $(".santa-chat-script[data-active]") || $(".santa-chat-script");
  if (!chat || !scroll || !composer || !input || !locationButton || !script) return;
  if (chat.dataset.ready) return;
  chat.dataset.ready = "true";
  composer.hidden = false;
  const pending = script.dataset.pending === "true";
  const day = dayFromURL();
  const character = chatCharacter();
  const storageKey = typeof chatStorageKey === "function" ? chatStorageKey(day, character) : `${LS_CHAT}_${day}${day === 6 && character === "santa" ? "_santa" : ""}`;
  const characterReplies = {
    santa: [
      "Ho ho ho! Ich wollte nur kurz Kekse zählen. Jetzt fehlen drei. 🍪",
      "Mein Navi sagt: Bitte wenden. Mein Bauch sagt: Bitte Waffeln. 🧇",
      "Ich schicke dir eine Portion Weihnachtsstimmung rüber! 🎄✨",
      "Mein Bart hat heute mehr Empfang als mein Handy. 🎅📱",
      "Kurze Kakaopause. Die gehört zur Reiseplanung. ☕",
      "Ich habe dem Schlitten Winterreifen bestellt. Die Rentiere fanden das komisch. 🛷",
    ],
    rudolf: [
      "Meine Nase leuchtet heute im Energiesparmodus. 🦌💡",
      "Die Elfen sagen, ich soll den Überblick behalten. Ich sehe vor allem Geschenkpapier. 🎁",
      "Ich würde dir einen Keks schicken, aber der passt nicht durchs WLAN. 🍪",
      "Immer der roten Nase nach! Außer ich habe mich verlaufen. 🧭",
      "Kleine Pause für die Hufe. Gleich wird wieder Weihnachten gerettet. 🦌",
      "Hab einen schönen Tag! Und lass dir den Kakao nicht kalt werden. ☕",
    ],
    nikolaus: [
      "Ich bin heute gut zu Fuß. Zum Glück sind die Stiefel schon eingelaufen! 👢",
      "Ein freundliches Moin passt zum Glück in jeden Stiefel. 🎁",
      "Mein Sack ist schwer, aber die Stimmung ist leicht. ✨",
      "Ich habe noch eine Mandarine übrig. Gedanklich ist sie schon bei dir! 🍊",
      "Kurze Verschnaufpause. Auch ein Nikolaus braucht mal einen Schluck Tee. ☕",
      "Bleib schön fröhlich. Das ist wärmer als die dicksten Socken! 🧦",
    ],
  };
  const replies = characterReplies[character];
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

  const appendImage = (src, alt, persist = true, animate = true) => {
    if (!/^\.\.\/assets\//.test(src)) return;
    const bubble = document.createElement("div");
    bubble.className = "chat-message santa-message media-message";
    const link = document.createElement("a");
    link.href = src;
    link.setAttribute("aria-label", "Foto groß öffnen");
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    link.appendChild(image);
    bubble.appendChild(link);
    scroll.appendChild(bubble);
    if (animate) revealChatElement(bubble, false);
    else bubble.classList.add("visible");
    if (persist) { chatLog.messages.push({kind:"image", sender:"santa", src, alt}); saveChat(); }
    scrollToBottom(animate ? "smooth" : "auto");
  };

  (script.hasAttribute?.("data-active") ? script : scroll).querySelectorAll(".santa-chat-script > .chat-message:not(.hidden), :scope > .chat-message:not(.hidden)").forEach((bubble) => {
    revealChatElement(bubble);
  });
  if (!chatLog.introShown) {
    chatLog.introShown = true;
    saveChat();
  }

  chatLog.messages.forEach((message) => {
    if (message.kind === "image") appendImage(message.src, message.alt, false, false);
    else appendBubble(message.text, message.sender, false, false);
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
  const dayGame = (!pending && (!opened.has(day) || day === 6) ? setupDay : null)?.({
    day,
    character,
    chatLog,
    saveChat,
    appendImage,
    readQuest: () => readNikolausQuest(),
    saveQuest: state => localStorage.setItem("advent_nikolaus_search", JSON.stringify(state)),
    completeNow: points => rightSolution(day, points),
    appendBubble,
    normalize,
    solutions,
    answerMatches,
    locationButton,
    complete: completeAfterMessages,
    celebrate: launchSuccessConfetti,
  }) || {};
  if (opened.has(day)) locationButton.hidden = true;
  composer.classList.toggle("text-only", locationButton.hidden);
  const smallTalk = () => {
    setTimeout(() => appendBubble(replies[Math.floor(Math.random() * replies.length)], "santa"), 720);
  };

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendBubble(text, "user");
    input.value = "";
    const normalizedText = normalize(text);
    if (opened.has(day) || pending) { smallTalk(); return; }
    if (!chatLog.pendingHint && /^(hallo|hey|hi|moin|guten (morgen|tag|abend)|danke|dankeschön|wie geht.?s|wie geht es dir|erzähl.*witz|erzaehl.*witz|frohe weihnachten|tschüss|tschuess)[ !?.]*$/i.test(text.trim())) {
      smallTalk(); return;
    }
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
    if (script.dataset.placeholder === "true" || script.dataset.answerMode === "text") {
      if (!solutions.length) {
        appendBubble("Meine Lösungsliste fehlt gerade. Lade die Seite bitte neu. 🎅", "santa");
        return;
      }
      const index = Number(chatLog.solutionIndex) || 0;
      if (index >= solutions.length) {
        smallTalk();
        return;
      }
      if (answerMatches(text, solutions[index])) {
        chatLog.solutionIndex = index + 1;
        saveChat();
        if (chatLog.solutionIndex === solutions.length) {
          appendBubble(script.dataset.successReply || "Richtig! Wieder ein Weihnachtsproblem weniger. Deine Sterne kommen sofort. 🎅⭐", "santa");
          launchSuccessConfetti();
          completeAfterMessages();
        } else {
          appendBubble("Richtig! Jetzt fehlt noch die nächste Antwort. 🎁", "santa");
        }
      } else {
        smallTalk();
      }
      return;
    }
    smallTalk();
  });
}

function setupChatGallery() {
  let links = [];
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
  $("#daySlot").addEventListener("click", event => {
    const link = event.target.closest(".media-message a");
    if (!link?.querySelector("img")) return;
    links = [...document.querySelectorAll("#daySlot .media-message a")].filter(item => item.querySelector("img"));
    const position = links.indexOf(link);
    if (position < 0) return;
    event.preventDefault();
    opener = link;
    show(position);
    dialog.showModal();
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
  const day = dayFromURL();
  const contacts = {
    santa: {name:"Weihnachtsmann 🎅", status: day >= 6 ? "auf dem Weg nach Norden" : "zuletzt am Glühweinstand", avatar:"ProfilePic.jpeg"},
    rudolf: {name:"Rudolf 🦌", status:"in der Weihnachtswerkstatt", avatar:"../assets/avatars/rudolf.png"},
    nikolaus: {name:"Nikolaus 🎁", status:"heute ordentlich unterwegs", avatar:"../assets/avatars/nikolaus.png"},
  };
  const contact = contacts[chatCharacter()];
  document.querySelector(".page-title").textContent = contact.name;
  document.querySelector(".chat-contact-info b").textContent = contact.name;
  document.querySelector(".chat-contact-info small").textContent = contact.status;
  document.querySelector(".chat-avatar").src = contact.avatar;
  document.querySelector(".santa-chat").setAttribute("aria-label", `Chat mit ${contact.name}`);
  if (!day) { location.replace("../index.html"); return; }
  try {
    const dayNumbers = daysForChat(chatCharacter()).filter(number => number <= day);
    const contents = await Promise.all(dayNumbers.map(async number => {
      const response = await fetch(`./content/${number}${number === 6 && chatCharacter() === "santa" ? "-santa" : ""}.html`, {cache:"no-store"});
      if (!response.ok) throw new Error("Chat fehlt");
      return response.text();
    }));
    slot.innerHTML = "";
    contents.forEach((html, i) => {
      const number = dayNumbers[i];
      const date = document.createElement("div");
      date.className = "chat-date";
      date.textContent = `${number}. Dezember`;
      slot.appendChild(date);
      if (number === day && hasUnreadDay(chatCharacter(), day)) {
        const marker = document.createElement("div");
        marker.className = "new-messages";
        marker.id = "newMessages";
        marker.textContent = "↓ Neue Nachrichten";
        slot.appendChild(marker);
      }
      const container = document.createElement("div");
      container.innerHTML = html;
      const script = container.querySelector(".santa-chat-script");
      if (number === day) script.setAttribute("data-active", "");
      else {
        container.querySelectorAll(".chat-message:not(.hidden)").forEach(b => b.classList.add("visible"));
        container.querySelectorAll("button, input").forEach(control => control.disabled = true);
      }
      while (container.firstChild) slot.appendChild(container.firstChild);
      if (number < day) {
        let saved;
        try { saved = JSON.parse(localStorage.getItem(chatStorageKey(number, chatCharacter())) || "{}"); } catch {}
        if (!script.dataset.chatVersion || saved?.version === script.dataset.chatVersion) {
          (saved?.messages || []).forEach(message => {
            const bubble = document.createElement("div");
            bubble.className = `chat-message visible ${message.sender === "user" ? "user-message" : "santa-message"}`;
            if (message.kind === "image" && /^\.\.\/assets\//.test(message.src)) {
              bubble.classList.add("media-message");
              const link = document.createElement("a");
              link.href = message.src;
              link.setAttribute("aria-label", "Foto groß öffnen");
              const image = document.createElement("img");
              image.src = message.src;
              image.alt = message.alt;
              link.appendChild(image);
              bubble.appendChild(link);
            } else {
              const text = document.createElement("p");
              text.textContent = message.text;
              bubble.appendChild(text);
            }
            slot.appendChild(bubble);
          });
        }
      }
    });
  } catch {
    slot.innerHTML = '<section class="santa-chat-script" data-active data-pending="true"><div class="chat-message santa-message visible"><p>Der Chat konnte gerade nicht geladen werden. Bitte lade die Seite neu. 🎄</p></div></section>';
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
  const script = document.querySelector(".santa-chat-script[data-active]");
  let setupDay;
  if (script?.hasAttribute("data-day-script") && script.dataset.pending !== "true") {
    try {
      ({ setupDay } = await import(`./scripts/${dayFromURL()}.js?v=nikolaus6-1`));
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
  const marker = document.getElementById("newMessages");
  marker?.scrollIntoView({block:"start"});
});
