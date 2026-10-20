(() => {
  const state = {
    step: 0,
    progress: 0
  };

  const steps = [
    {
      name: "Firewall entschärfen",
      need: ["scan", "kill firewall"],
      ok: [
        "scan",
        "scan --ports",
        "scan ports",
        "nmap localhost",          // “theater”
        "kill firewall",
        "disable firewall",
        "iptables -f",             // ebenfalls nur “theater”
        "ufw disable"
      ],
      onEnter: () => printLine(">> Zugriff auf SantaOS v24.12 — Verbindung hergestellt.")
    },
    {
      name: "Key rotieren",
      need: ["rotate key"],
      ok: [
        "rotate key",
        "rotate-key",
        "key rotate",
        "rotate key --northpole",
        "ssh-keygen -r northpole"  // theater
      ]
    },
    {
      name: "System wiederherstellen",
      need: ["restore"],
      ok: [
        "restore",
        "restore --santa",
        "santa --restore",
        "sudo santa --restore"
      ]
    }
  ];

  function $(id){ return document.getElementById(id); }

  function printLine(text, tone="normal") {
    const line = document.createElement("div");
    line.textContent = text;
    if (tone === "dim") line.style.opacity = "0.75";
    if (tone === "warn") line.style.color = "var(--muted)";
    if (tone === "bad")  line.style.color = "var(--text)";
    if (tone === "good") line.style.color = "var(--accent)";
    $("log").appendChild(line);
    $("log").scrollTop = $("log").scrollHeight;
  }

  function setProgress(p) {
    state.progress = Math.max(0, Math.min(100, p));
    $("bar").style.width = state.progress + "%";
    $("badge").textContent = "Status: " + (state.progress >= 100 ? "entsperrt" : "gesperrt");
  }

  function setHint(text) {
    $("hint").innerHTML = text;
  }

  function normalize(s){
    return (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g," ");
  }

  function help() {
    const s = steps[state.step];
    printLine("Verfügbare Befehle:", "dim");
    printLine("  help", "dim");
    printLine("  status", "dim");
    if (!s) return;
    // kleine “Puzzle”-Hilfe ohne alles zu spoilern
    if (state.step === 0) printLine("  scan   |  kill firewall", "dim");
    if (state.step === 1) printLine("  rotate key", "dim");
    if (state.step === 2) printLine("  restore", "dim");
    setHint(`Aktueller Schritt: <b>${s.name}</b>`);
  }

  function status() {
    const s = steps[state.step];
    if (!s) return;
    printLine(`Schritt ${state.step+1}/3: ${s.name} — Fortschritt: ${state.progress}%`, "dim");
  }

  function advanceStep() {
    state.step++;
    if (state.step >= steps.length) {
      completeHack();
      return;
    }
    const s = steps[state.step];
    setHint(`Nächster Schritt: <b>${s.name}</b> (tipp: <code style="background:var(--line); padding:2px 6px; border-radius:8px;">help</code>)`);
    printLine(`--- ${s.name} ---`, "warn");
  }

  function completeHack() {
    setProgress(100);
    printLine("✔ Systeme wiederhergestellt. Hacker ausgesperrt.", "good");
    printLine("✔ SantaPC entsperrt. Produktionsplan wieder online.", "good");
    printLine(">> Tag 24 abgeschlossen. Frohe Weihnachten.", "good");
    setTimeout(() => {
      rightSolution(24);
    }, 300);
  }

  function runCmd() {
    const input = $("cmd");
    const raw = input.value;
    const cmd = normalize(raw);
    if (!cmd) return;

    input.value = "";
    printLine("$ " + raw);

    if (cmd === "help") return help();
    if (cmd === "status") return status();

    const s = steps[state.step];
    if (!s) return;

    // akzeptiere alle ok-Strings exakt (nach normalize)
    const ok = s.ok.map(normalize);
    if (ok.includes(cmd)) {
      // “Erfolg” pro Step
      if (state.step === 0) {
        if (cmd.includes("scan")) {
          printLine("Scan läuft… offene Ports: 443, 1224 (NaughtyTunnel), 8080", "dim");
          setProgress(20);
          setHint("Nice. Jetzt die Firewall plattmachen: <b>kill firewall</b>");
          return;
        }
        if (cmd.includes("kill firewall") || cmd.includes("disable firewall") || cmd.includes("ufw disable") || cmd.includes("iptables")) {
          printLine("Firewall-Regeln entfernt. NaughtyTunnel getrennt.", "good");
          setProgress(40);
          advanceStep();
          return;
        }
      }

      if (state.step === 1) {
        printLine("Key rotiert. Alte Tokens invalidiert. Cookies der Hacker verbrannt.", "good");
        setProgress(70);
        advanceStep();
        return;
      }

      if (state.step === 2) {
        printLine("Restore läuft… Backups validiert… Dienste starten neu…", "dim");
        setProgress(95);
        // bisschen Drama für die Experience
        setTimeout(() => {
          printLine("Letzter Check: Rentier-Boost: OK. Geschenk-Queue: OK.", "good");
          completeHack();
        }, 600);
        return;
      }
    }

    // falscher command
    printLine("Unbekannter Befehl. Tippe 'help' (oder 'status').", "bad");
  }

  function resetHack() {
    state.step = 0;
    setProgress(0);
    $("log").innerHTML = "";
    steps[0].onEnter();
    printLine("--- Firewall entschärfen ---", "warn");
    setHint(`Tipp: <code style="background:var(--line); padding:2px 6px; border-radius:8px;">help</code> zeigt dir die möglichen Befehle.`);
    $("cmd").focus();
  }

  // init
  resetHack();

  document.getElementById("resetBtn").addEventListener("click", resetHack);
  document.getElementById("runBtn").addEventListener("click", runCmd);
  document.getElementById("cmd").addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCmd();
  });
})();
