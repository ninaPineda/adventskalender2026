let audio = null;

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // mehrfach-spaces killen
    .replace(/[.!?,]/g, ""); // bisschen tolerant
}

function playSound(track, cost, day) {
  if (coins < cost) {
    openNoCoinsDialog();
    return;
  }

  //nächsten Freischalten
  if (track == "schlagzeug") {
    document.getElementById("bass").disabled = false;
  } else if (track == "bass") {
    document.getElementById("glocken").disabled = false;
  } else if (track == "glocken") {
    document.getElementById("synth").disabled = false;
  } else if (track == "synth") {
    document.getElementById("melodie").disabled = false;
  }

  // Münzen abziehen
  substractCoin(cost);
}

function wirePlayer(a, track) {
  const player = document.getElementById("miniPlayer");
  const title = document.getElementById("nowPlaying");
  const bar = document.getElementById("playerProgress");
  const toggleBtn = document.querySelector(".mini-player__toggle");

  title.textContent = trackLabel(track);
  player.hidden = false;
  toggleBtn.textContent = "Pause";

  a.addEventListener("timeupdate", () => {
    const p = (a.currentTime / a.duration) * 100 || 0;
    bar.style.width = p + "%";
  });

  a.addEventListener("ended", () => {
    bar.style.width = "0%";
    toggleBtn.textContent = "Play";
  });
}

function togglePlay() {
  if (!audio) return;
  const btn = document.querySelector(".mini-player__toggle");
  if (audio.paused) {
    audio.play();
    btn.textContent = "Pause";
  } else {
    audio.pause();
    btn.textContent = "Play";
  }
}

function trackLabel(track) {
  return (
    {
      schlagzeug: "Schlagzeug",
      bass: "Bass",
      glocken: "Glocken",
      synth: "Synthesizer",
      melodie: "Melodie",
    }[track] || track
  );
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
  return Math.max(0, Math.round((10 * (1 - (distance - 1) / 999)) * 10) / 10);
}

async function initGeoGuessr() {
  const game = document.querySelector(".geoguessr");
  const mapEl = document.getElementById("guessMap");
  const submit = document.getElementById("submitGeoGuess");
  const result = document.getElementById("geoGuessResult");
  if (!game || !mapEl || !submit || !result) return;

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
    L.marker([target.lat, target.lng]).addTo(map).bindPopup("Richtiger Ort").openPopup();
    L.polyline([[guess.lat, guess.lng], [target.lat, target.lng]], { color: "#b3261e" }).addTo(map);
    setTimeout(() => rightSolution(1, points), 1800);
  });
}

function initDayGame(day) {
  if (day === 1) initGeoGuessr();
}

function checkAnswer(day) {
  const userAnswer = document
  .getElementById("answerInput")
  .value
  .trim();
  let correctAnswers = [];

  if (day == 2) {
    correctAnswers = [
      "last christmas",
      "lastchristmas",
      "last christmas wham",
      "last christmas von wham",
    ];
  } else if (day == 31) {
    correctAnswers = [
      "martin luther",
      "luther",
      "martin",
      "martin luter",
      "martin luthe",
      "martin lutter",
      "martinn luther",
      "marin luther",
      "martin luter",
      "maatin luther",
      "m luther",
      "m.luther",
      "martin-luther",
    ];
  } else if (day == 32) {
    correctAnswers = [
      "pippi langstrumpf",
      "pipi langstrumpf",
      "pippi",
      "langstrumpf",
      "pippi langstrump",
      "pipi langstrump",
      "pippy langstrumpf",
      "pipi langstrupf",
      "pippi langstrupf",
      "pipi langstrump",
      "pippi langstrimpf",
      "pipi langstrimpf",
      "pippi lang",
      "p langstrumpf",
      "langstrumpf pippi",
      "pippi-langtstrumpf",
    ];
  } else if (day == 33) {
    correctAnswers = [
      "loriot",
      "vio lorenz",
      "bernhard victor",
      "vicco von bülow",
      "vicco von bulow",
      "vicco",
      "von bülow",
      "von bulow",
      "loriott",
      "loriot.",
      "loriot!",
      "lorio",
      "lori o t",
    ];
  } else if (day == 34) {
    correctAnswers = [
      "mariah carey",
      "mariah",
      "carey",
      "maraya carey",
      "maria carey",
      "mariah cary",
      "mariah carry",
      "mareah carey",
      "mariah-cdgarey", // falls jemand tippselt
      "m carey",
      "m. carey",
      "queen of christmas",
    ];
  } else if (day == 3) {
    correctAnswers = [
      "die ärzte",
      "die arzte",
      "ärzte",
      "arzte",
      "ärtzte",
      "die ärtze",
      "die äreste",
      "diearzt",
      "die aerzte",
      "die-aerzte",
      "die ärzTe",
      "die aerzte",
      "arztE",
      "die ärzte!",
      "die ärzte.",
    ];
  } else if (day == 4) {
    correctAnswers = ["3", 3, "drei", "03"];
  } else if (day == 51) {
    correctAnswers = [
      "dänemark",
      "Dänemark",
      "daenemark",
      "Daenemark",
      "denmark",
      "Denmark",
      "danmark",
      "Danmark",
    ];
  } else if (day == 52) {
    correctAnswers = [
      "zypern",
      "Zypern",
      "cypern",
      "Cypern",
      "cyprus",
      "Cyprus",
      "kipros", // griechisch eingedeutscht
      "Kipros",
    ];
  } else if (day == 53) {
    correctAnswers = [
      "vietnam",
      "Vietnam",
      "viet nam", // manche schreiben getrennt
      "Viet Nam",
    ];
  } else if (day == 54) {
    correctAnswers = [
      "chile",
      "Chile",
      "tschile", // sehr selten, aber manche schreiben’s so
      "Tschile",
    ];
  } else if (day == 5) {
    correctAnswers = [
      "monaco",
      "Monaco",
      "monaco-ville", // wird manchmal so eingetippt
      "Monaco-Ville",
    ];
  } else if (day == 8) {
    correctAnswers = [
      "55",
      55,
      "fünfundfünfzig"
    ];
  } else if (day == 13) {
    correctAnswers = [
      "23",
      23
    ];
  } else if (day == 151) {
  correctAnswers = [
    "leise rieselt der schnee",
    "leise rieselt schnee",
    "leise rieselt der sne",
    "leise rieselt der shnee",
    "leise rieselt der schneee",
    "leise rieselt",
    "rieselt der schnee",
    "leise rieselt der schnee lied"
  ];
} else if (day == 152) {
  correctAnswers = [
    "fröhliche weihnacht",
    "fröhliche weihnachten",
    "fröhliche weihnacht überall",
    "fröhliche weihnachten überall",
    "fröliche weihnacht",
    "froehliche weihnacht",
    "fröhliche weihnacht ueberall",
    "fröhliche weihnacht lied",
    "froehliche weihnachten"
  ];
} else if (day == 15) {
  correctAnswers = [
    "stille nacht",
    "stille nacht heilige nacht",
    "stille nacht heilige nacht lied",
    "stille nacht heilge nacht",
    "stille nacht heillige nacht",
    "stille nacht heilige nach",
    "stille nacht heilige nacht deutsch",
    "stille nacht song"
  ];
} else if (day == 20) {
    correctAnswers = [
      "805",
      805
    ];
} else if (day == 221) {
  correctAnswers = [
    "last christmas",
    "lastchristmas",
    "last cristmas",
    "last chrismas",
    "last xmas",
    "last christmas wham",
    "wham last christmas",
    "last christmas song",
    "last christmas lied",
    // gedankenfehler
    "christmas last",
    "the last christmas",
    "last xmas wham",
    "whams last christmas",
  ];
} else if (day == 222) {
  correctAnswers = [
    "rocking around the christmas tree",
    "rockin around the christmas tree",
    "rocking around christmas tree",
    "rocking around the xmas tree",
    "rocking arround the christmas tree",
    "rocking around the christmass tree",
    "rocking around the tree",
    // gedankenfehler
    "rock around the christmas tree",
    "rocking around the tree song",
    "rock around the tree",
  ];
} else if (day == 223) {
  correctAnswers = [
    "do they know its christmas time",
    "do they know it's christmas time",
    "do they know its christmas",
     "do they know it's christmas",
    "do they know christmas time",
    "do they know its xmas",
    "band aid do they know its christmas",
    // gedankenfehler
    "do they know its christmas song",
    "its christmas time band aid",
    "christmas time band aid",
  ];
} else if (day == 224) {
  correctAnswers = [
    "its beginning to look a lot like christmas",
    "it's beginning to look a lot like christmas",
    "its beginning to look like christmas",
    "beginning to look a lot like christmas",
    "its beginning to look alot like christmas",
    "its beginnig to look a lot like christmas",
    // gedankenfehler
    "beginning to look like christmas",
    "it begins to look a lot like christmas",
    "it is beginning to look like christmas",
  ];
} else if (day == 22) {
  correctAnswers = [
    "its the most wonderful time of the year",
    "it's the most wonderful time of the year",
    "most wonderful time of the year",
    "the most wonderful time of the year",
    "its the most wunderful time of the year",
    "its the most wonderful time of year",
    // gedankenfehler
    "the most wonderful time",
    "most wonderful time",
    "wonderful time of the year",
  ];
} else if (day == 23) {
    correctAnswers = [
      "27",
      27
    ];
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
}
