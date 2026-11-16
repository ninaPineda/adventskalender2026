// Ein Local-Storage-Eintrag für das ganze Spiel. Fehlende Punkte/Tage bedeuten:
// Der Spielstand darf noch aus der Bestenliste wiederhergestellt werden.
const store = {
  key: "advent_state",
  read() {
    return JSON.parse(localStorage.getItem(this.key) || "{}");
  },
  update(changes) {
    // Immer frisch lesen, damit andere Chats ihre Daten behalten.
    localStorage.setItem(this.key, JSON.stringify({ ...this.read(), ...changes }));
  },
  saveChat(id, chat) {
    this.update({ chats: { ...this.read().chats, [id]: chat } });
  },
};

// Einmalige Übernahme der alten Einträge. Erst nach erfolgreichem Speichern
// entfernen; fremde Local-Storage-Einträge bleiben unberührt.
if (localStorage.getItem(store.key) === null) {
  const state = {};
  const oldKeys = [];
  const fields = {
    advent_user_name: "name", advent_points: "points", advent_opened: "opened",
    advent_hint_counts: "hintCounts", advent_wrong_attempts: "wrongAttempts",
    advent_nikolaus_search: "quest",
  };
  const readOld = key => {
    const value = localStorage.getItem(key);
    if (value === null) return undefined;
    oldKeys.push(key);
    return JSON.parse(value);
  };
  for (const [key, field] of Object.entries(fields)) {
    if (key === "advent_user_name") {
      const name = localStorage.getItem(key);
      if (name !== null) { state.name = name; oldKeys.push(key); }
    } else {
      const value = readOld(key);
      if (value !== undefined) state[field] = value;
    }
  }
  for (const day of readOld("hints_opened") || []) {
    state.hintCounts ||= {};
    state.hintCounts[day] ||= 1;
  }
  for (const id of [...Array.from({ length: 24 }, (_, i) => String(i + 1)), "6_santa"]) {
    const chat = readOld(`advent_chat_log_${id}`);
    if (chat) { state.chats ||= {}; state.chats[id] = chat; }
  }
  localStorage.setItem(store.key, JSON.stringify(state));
  oldKeys.push("advent_reset_version");
  oldKeys.forEach(key => localStorage.removeItem(key));
}
