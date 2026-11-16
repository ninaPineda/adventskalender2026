const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function session(rows, storage = {}) {
  const posts = [];
  const window = {addEventListener() {}};
  const context = vm.createContext({
    window, setTimeout, clearTimeout, URLSearchParams,
    localStorage: {
      getItem: key => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: key => { delete storage[key]; },
    },
    document: {
      addEventListener() {},
      createElement: () => ({remove() {}}),
      body: {
        appendChild(script) {
          const callback = new URL(script.src).searchParams.get('callback');
          queueMicrotask(() => rows ? window[callback](rows) : script.onerror());
        },
      },
    },
    fetch: async (url, options) => { posts.push(options.body); },
    solutions: JSON.parse(read('solutions.json')),
  });
  vm.runInContext(read('storage.js'), context);
  vm.runInContext(read('app.js'), context);
  vm.runInContext(read('tage/gamey.js'), context);
  vm.runInContext('SOLUTIONS = solutions;', context);
  return {storage, state: () => JSON.parse(storage.advent_state), posts, run: code => vm.runInContext(code, context)};
}

function row(solved, points, hour, name = 'Katrin') {
  return {solved, points, name, timestamp: `2026-12-06T${hour}:00:00Z`};
}

async function main() {
  const history = [
    row(1, '18,5', '08'), row(2, 28.5, '09'), row(3, 38.5, '10'),
    row(4, 33.5, '11'), // A legacy hint purchase used the day's number.
    row('Tag 5', 43.5, '12'), row(0, 38.5, '13'),
    row(6, 90, '14', 'Andere Spielerin'),
  ];
  const automatic = session([...history].reverse(), {advent_user_name: '  KATRIN  '});
  await automatic.run('loadInitialProgress()');
  assert.deepEqual(automatic.state().opened, [1, 2, 3, 5]);
  assert.equal(automatic.state().points, 38.5);
  assert.equal(automatic.run('currentChatDay("santa")'), 6);
  assert.equal(automatic.run('hasUnreadDay("rudolf", 4)'), true);
  assert.equal(automatic.run('hasUnreadDay("nikolaus", 6)'), true);
  await automatic.run('restoreChatLog(3, "santa", {dataset: {chatVersion: "quiz"}})');
  const quiz = automatic.state().chats[3];
  assert.deepEqual(quiz.messages.filter(message => message.sender === 'user').map(message => message.text),
    ['Eurostar', 'Ärmelkanal', 'Dover']);
  automatic.run('store.saveChat("5", {messages: [{sender: "user", text: "Meine Antwort"}]})');
  const original = JSON.stringify(automatic.state().chats[5]);
  await automatic.run('restoreChatLog(5, "santa", {dataset: {}})');
  await automatic.run('restoreChatLog(6, "nikolaus", {dataset: {}})');
  assert.equal(JSON.stringify(automatic.state().chats[5]), original);
  assert.equal(automatic.state().chats[6], undefined);
  assert.equal(automatic.posts.length, 0);

  const manual = session([...history, row(4, 48.5, '15'), row(6, 48.5, '16')]);
  assert.equal(await manual.run('restorePlayerProgress("unbekannt")'), false);
  assert.equal(manual.state().name, undefined);
  assert.equal(await manual.run('restorePlayerProgress("katrin")'), true);
  assert.equal(manual.state().name, 'Katrin');
  assert.equal(manual.run('solvedDays().join(",")'), '1,2,3,4,5,6');
  assert.equal(manual.run('readNikolausQuest().together'), true);
  await manual.run('restoreChatLog(6, "nikolaus", {dataset: {}})');
  const reunion = JSON.stringify(manual.state().chats[6]);
  assert.ok(reunion.includes('Köln'));
  await manual.run('restoreChatLog(6, "nikolaus", {dataset: {}})');
  assert.equal(JSON.stringify(manual.state().chats[6]), reunion);
  manual.run('allPoints += 1; save()');
  await manual.run('restorePlayerProgress("Katrin")');
  assert.equal(manual.state().points, 49.5);
  assert.equal(manual.posts.length, 0);

  manual.run('logScore(); logScore(6)');
  assert.deepEqual(manual.posts.map(post => post.get('solved')), ['0', '6']);

  const offline = session(null, {advent_user_name: 'Katrin'});
  await offline.run('loadInitialProgress()');
  assert.equal(offline.state().opened, undefined);
  assert.equal(offline.state().points, undefined);
  console.log('OK: automatic and named recovery, independent days, legacy hints, default and original chats, repeat recovery, and offline fallback.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
