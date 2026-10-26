const PEOPLE = ['Weihnachtsmann', 'Robert', 'David', 'Roger', 'Sean'];
const GROUPS = {
  coat: { label: 'Mantel', icon: '🧥', file: 'maentel', items: [
    ['Mantel 1 · ganz links', [135, 290, 330, 650]],
    ['Mantel 2 · zweiter von links', [410, 240, 290, 650]],
    ['Mantel 3 · in der Mitte', [655, 260, 300, 660]],
    ['Mantel 4 · Jackett', [905, 280, 300, 450]],
    ['Mantel 5 · ganz rechts', [1180, 220, 268, 650]],
  ] },
  bag: { label: 'Gepäck', icon: '🧳', file: 'gepaeck', items: [
    ['Sack', [115, 450, 390, 425]], ['Trolley', [370, 190, 320, 670]],
    ['Rucksack', [670, 390, 290, 370]], ['Aktenkoffer', [550, 645, 335, 340]],
    ['Duffle Bag', [860, 625, 440, 370]],
  ] },
  ticket: { label: 'Ticket', icon: '🎟️', file: 'zugtickets', items: [
    ['Paris', [160, 65, 640, 355]], ['Edinburgh', [775, 105, 560, 375]],
    ['Aachen', [380, 680, 735, 400]], ['Lille', [710, 380, 690, 425]],
    ['Heathrow', [160, 390, 580, 335]],
  ] },
};
// Indices follow the pictured items, in the order displayed in each picker.
const EXPECTED = [
  { coat: 0, bag: 0, ticket: 0 }, { coat: 1, bag: 1, ticket: 1 },
  { coat: 2, bag: 2, ticket: 2 }, { coat: 3, bag: 3, ticket: 3 },
  { coat: 4, bag: 4, ticket: 4 },
];
export function shuffledItems(random = Math.random) {
  const items = [0, 1, 2, 3, 4];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
export function validOrder(order) {
  return Array.isArray(order) && order.length === 5 && new Set(order).size === 5
    && order.every(item => Number.isInteger(item) && item >= 0 && item < 5);
}
export function assignItem(rows, person, group, item) {
  rows.forEach(row => { if (row[group] === item) delete row[group]; });
  rows[person][group] = item;
}
export function isComplete(rows) {
  return rows.length === 5 && Object.keys(GROUPS).every(group =>
    rows.every(row => Number.isInteger(row[group]) && row[group] >= 0 && row[group] < 5)
    && new Set(rows.map(row => row[group])).size === 5);
}
export function isCorrect(rows) {
  return isComplete(rows) && rows.every((row, i) => Object.keys(GROUPS).every(group => row[group] === EXPECTED[i][group]));
}
function thumbnail(group, item) {
  const data = GROUPS[group];
  const [x, y, width, height] = data.items[item][1];
  return `<svg viewBox="${x} ${y} ${width} ${height}" aria-hidden="true" focusable="false"><svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" overflow="hidden"><image href="../assets/day-2/${data.file}.png" width="1448" height="1086" /></svg></svg>`;
}
export function setupDay({ chatLog, saveChat, appendBubble, complete, celebrate }) {
  const rows = PEOPLE.map(() => ({}));
  if (Array.isArray(chatLog.assignments)) chatLog.assignments.slice(0, 5).forEach((row, i) => {
    for (const group of Object.keys(GROUPS)) if (Number.isInteger(row?.[group]) && row[group] >= 0 && row[group] < 5) assignItem(rows, i, group, row[group]);
  });
  const orders = {};
  for (const group of Object.keys(GROUPS)) {
    const saved = chatLog.assignmentOrders?.[group];
    orders[group] = validOrder(saved) ? saved : shuffledItems();
  }
  chatLog.assignmentOrders = orders;
  saveChat();
  const trigger = document.getElementById('openAssignment');
  const dialog = document.createElement('dialog');
  dialog.className = 'assignment-dialog';
  dialog.setAttribute('aria-label', 'Sachen zuordnen');
  dialog.innerHTML = `<header class="assignment-header"><div><small>TAG 2 · DAS HOSTEL-CHAOS</small><h2>Was gehört wem?</h2></div><button type="button" class="assignment-close" aria-label="Zurück zum Chat">×</button></header><div class="assignment-body"></div><footer class="assignment-footer"><span class="assignment-progress" aria-live="polite"></span><button type="button" class="assignment-check">Zuordnung prüfen</button></footer>`;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('.assignment-body');
  const check = dialog.querySelector('.assignment-check');
  const progress = dialog.querySelector('.assignment-progress');
  let picking = null;
  const persist = () => { chatLog.assignments = rows; saveChat(); };
  const render = () => {
    picking = null;
    body.innerHTML = `<p class="assignment-intro">Wähle für jeden einen Mantel, ein Gepäckstück und ein Ticket. Deine Auswahl wird gespeichert – du kannst jederzeit zurück zu den Hinweisen.</p><div class="assignment-people">${PEOPLE.map((name, person) => `<section class="assignment-person"><h3>${person === 0 ? '🎅 ' : ''}${name}</h3><div class="assignment-fields">${Object.entries(GROUPS).map(([group, data]) => {
      const item = rows[person][group];
      return `<button type="button" class="assignment-field" data-person="${person}" data-group="${group}" aria-label="${name}: ${data.label} wählen${item === undefined ? '' : ', aktuell ' + data.items[item][0]}">${item === undefined ? `<span class="assignment-empty">${data.icon}<b>＋</b></span>` : thumbnail(group, item)}<small>${data.label}</small><strong>${item === undefined ? 'Wählen' : data.items[item][0]}</strong></button>`;
    }).join('')}</div></section>`).join('')}</div>`;
    const count = rows.reduce((sum, row) => sum + Object.keys(row).length, 0);
    progress.textContent = `${count} von 15 zugeordnet`;
    check.disabled = !isComplete(rows) || Boolean(chatLog.assignmentDone);
    check.textContent = chatLog.assignmentDone ? 'Bereits gelöst ✓' : 'Zuordnung prüfen';
    dialog.querySelector('.assignment-footer').hidden = false;
  };
  const choose = (person, group) => {
    picking = { person, group };
    const data = GROUPS[group];
    body.innerHTML = `<button type="button" class="assignment-back">← Zur Übersicht</button><h3>${data.label} für ${PEOPLE[person]}</h3><p class="assignment-intro">Ein Gegenstand gehört immer nur einer Person. Wählst du etwas bereits Vergebenes, wird die bisherige Zuordnung frei.</p><div class="assignment-options">${orders[group].map(item => {
      const [name] = data.items[item];
      const owner = rows.findIndex(row => row[group] === item);
      return `<button type="button" class="assignment-option" data-item="${item}" aria-pressed="${rows[person][group] === item}">${thumbnail(group, item)}<strong>${name}</strong><small>${owner < 0 ? 'Noch frei' : 'Bei ' + PEOPLE[owner]}</small></button>`;
    }).join('')}</div><button type="button" class="assignment-clear">Auswahl für ${PEOPLE[person]} entfernen</button>`;
    dialog.querySelector('.assignment-footer').hidden = true;
    body.scrollTop = 0;
    body.querySelector('.assignment-back').focus();
  };
  const restore = (person, group) => {
    render();
    body.querySelector(`[data-person="${person}"][data-group="${group}"]`).focus();
  };
  body.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.group) choose(Number(button.dataset.person), button.dataset.group);
    else if (picking) {
      const { person, group } = picking;
      if (button.dataset.item !== undefined) { assignItem(rows, person, group, Number(button.dataset.item)); persist(); restore(person, group); }
      else if (button.classList.contains('assignment-clear')) { delete rows[person][group]; persist(); restore(person, group); }
      else if (button.classList.contains('assignment-back')) restore(person, group);
    }
  });
  trigger.addEventListener('click', () => { render(); dialog.showModal(); });
  dialog.querySelector('.assignment-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));
  check.addEventListener('click', () => {
    if (!isComplete(rows) || chatLog.assignmentDone) return;
    dialog.close();
    appendBubble('Hier ist meine Zuordnung:\n' + PEOPLE.map((name, i) => `${name}: ${Object.entries(GROUPS).map(([group, data]) => data.items[rows[i][group]][0]).join(' · ')}`).join('\n'), 'user');
    if (isCorrect(rows)) {
      chatLog.assignmentDone = true;
      persist();
      appendBubble('Jaaa! Alles wieder beim richtigen Besitzer. Mein Mantel, mein Sack und das Ticket nach Paris – du hast uns gerettet! 🎅🚄', 'santa');
      celebrate();
      complete();
    } else {
      appendBubble('Da ist noch etwas durcheinander. 🥴 Schau dir die Hinweise und Bilder noch mal an. Deine Zuordnung bleibt gespeichert, du musst nur ändern, was noch nicht passt.', 'santa');
    }
  });
  return { handleAnswer(text) {
    if (['lösung', 'loesung', 'zuordnen'].includes(text.trim().toLowerCase())) { render(); dialog.showModal(); return true; }
    return false;
  } };
}
