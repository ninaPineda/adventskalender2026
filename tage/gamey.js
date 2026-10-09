let audio = null;

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // mehrfach-spaces killen
    .replace(/[.!?,]/g, ""); // bisschen tolerant
}

function loadGeoGuessrAsset(type, url) {
  return new Promise((resolve, reject) => {
    if (type === "css") {
      if ([...document.styleSheets].some((sheet) => sheet.href === url)) return resolve();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
      return;
    }

    if ([...document.scripts].some((script) => script.src === url)) return resolve();
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function distanceKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRad(b.lat - a.lat);
  const lngDelta = toRad(b.lng - a.lng);
  const startLat = toRad(a.lat);
  const endLat = toRad(b.lat);
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function scoreGeoGuess(distance) {
  if (distance < 1) return 10;
  if (distance >= 1000) return 0;
  return Math.max(0, Math.round(10 * (1 - (distance - 1) / 999) * 2) / 2);
}

async function initGeoGuessr() {
  if (initGeoGuessr.ready) return;
  const game = document.querySelector(".geoguessr");
  const mapEl = document.getElementById("guessMap");
  const submit = document.getElementById("submitGeoGuess");
  const result = document.getElementById("geoGuessResult");
  if (!game || !mapEl || !submit || !result) return;
  const dialog = document.getElementById("geoGuessDialog");
  if (dialog && !dialog.open) {
    document.addEventListener("geoGuessr:open", initGeoGuessr, { once: true });
    return;
  }
  initGeoGuessr.ready = true;

  const target = {
    lat: Number(game.dataset.targetLat),
    lng: Number(game.dataset.targetLng),
  };
  let marker = null;
  let guess = null;

  try {
    await loadGeoGuessrAsset("css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    await loadGeoGuessrAsset("js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  } catch {
    result.textContent = "Die Karte konnte nicht geladen werden. Bitte versuche es gleich nochmal.";
    return;
  }

  const map = L.map(mapEl, { zoomControl: true }).setView([54.7937, 9.4469], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 18,
  }).addTo(map);

  map.on("click", (event) => {
    guess = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (marker) {
      marker.setLatLng(event.latlng);
    } else {
      marker = L.marker(event.latlng).addTo(map);
    }
    result.textContent = "Pin gesetzt. Du kannst ihn noch umsetzen oder abgeben.";
    submit.disabled = false;
  });

  submit.addEventListener("click", () => {
    if (!guess) return;
    const distance = distanceKm(guess, target);
    const points = scoreGeoGuess(distance);
    const readableDistance = distance < 10 ? distance.toFixed(1) : Math.round(distance);
    result.textContent = `Du warst ${readableDistance} km entfernt und bekommst ${points} Punkte.`;
    submit.disabled = true;
    document.dispatchEvent(new CustomEvent("geoGuessr:submitted", {
      detail: {
        lat: guess.lat,
        lng: guess.lng,
        distance: readableDistance,
        points,
      },
    }));
    L.marker([target.lat, target.lng]).addTo(map).bindPopup("Richtiger Ort").openPopup();
    L.polyline([[guess.lat, guess.lng], [target.lat, target.lng]], { color: "#b3261e" }).addTo(map);
    setTimeout(() => dialog?.close(), 700);
    setTimeout(() => rightSolution(1, points), 2400);
  });
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


function initDayGame(day) {
  if (day === 1) initGeoGuessr();
}

  const exampleAnswer = document.querySelector("[data-answer]")?.dataset.answer;
  if (exampleAnswer) correctAnswers = [exampleAnswer];

  if (correctAnswers.map((answer) => normalize(String(answer))).includes(normalize(userAnswer))) {
    // Zwischensteps
    if ([31, 32, 33, 34, 51, 52, 53, 54, 151, 152, 221, 222, 223, 224].includes(day)) {
      // Nächsten Step berechnen
      const nextStep = day + 1;

      // Konfetti-Effekt
      confetti({
        particleCount: 1000,
        spread: 110,
        startVelocity: 50,
        scalar: 1.5,
        gravity: 0.6,
        origin: { y: 1.3 },
        colors: [
          getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
          getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(),
          getComputedStyle(document.documentElement).getPropertyValue("--surface").trim(),
        ],
        zIndex: 9999,
      });

      setTimeout(() => {
        window.location.href = `template.html?tag=${nextStep}`;
      }, 600);
    } else {
      // Finale Lösung
      rightSolution(day);
    }
  } else {
    wrongSolution(day);
  }
