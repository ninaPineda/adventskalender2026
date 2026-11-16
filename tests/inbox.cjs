const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const chat = fs.readFileSync(path.join(__dirname, '../tage/gamey.js'), 'utf8');

async function session(now, storage = {}, contact = 'santa', scores = []) {
  const callbacks = [];
  const list = {innerHTML:''};
  const toggle = {addEventListener(_, listener){this.change = listener}};
  const location = {
    search:'?contact=' + contact,
    reload(){this.reloaded = true},
    replace(url){this.redirect = url},
  };
  const writes = [];
  let scoreRequests = 0;
  const context = vm.createContext({
    window:{addEventListener(){}},
    Intl, URLSearchParams, location,
    Date:class extends Date { constructor(){super(now)} },
    localStorage:{
      getItem(key){return storage[key] ?? null},
      setItem(key, value){storage[key] = String(value)},
      removeItem(key){delete storage[key]},
    },
    sessionStorage:{getItem(){return null},removeItem(){}},
    setTimeout(){},
    clearTimeout(){},
    document:{
      body:{appendChild(script){
        scoreRequests += 1;
        const callback = new URL(script.src).searchParams.get('callback');
        if (scores === null) script.onerror();
        else context.window[callback](scores);
      }},
      createElement(){return {remove(){}}},
      getElementById(id){return id === 'chatList' ? list : null},
      querySelector(selector){return selector === '#testModeToggle' ? toggle : null},
      querySelectorAll(){return []},
      addEventListener(_, callback){callbacks.push(callback)},
    },
    fetch(_, options){
      assert.equal(options?.method, 'POST');
      writes.push(Object.fromEntries(options.body));
      return Promise.resolve();
    },
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  await Promise.all(callbacks.map(callback => callback()));
  const contacts = () => [...list.innerHTML.matchAll(/contact=(\w+)/g)].map(match => match[1]);
  const activeDays = () => ['santa','rudolf','nikolaus'].map(id => context.currentChatDay(id));
  return {context, run, contacts, activeDays, list, toggle, location, callbacks, writes, scoreRequests};
}

const beforeAdvent = '2026-11-30T22:59:00Z';
const afterRelease = '2026-12-06T12:00:00Z';
(async () => {
  for (const [now, solved, contacts, activeDays] of [
    [beforeAdvent, [], [], [0,0,0]],
    ['2026-11-30T23:00:00Z', [1], ['santa'], [1,0,0]],
    ['2026-12-01T23:00:00Z', [1], ['santa'], [2,0,0]],
    ['2026-12-03T22:59:00Z', [1,2,3], ['santa'], [3,0,0]],
    ['2026-12-03T23:00:00Z', [1,2,3], ['santa','rudolf'], [3,4,0]],
    ['2026-12-05T22:59:00Z', [1,2,3,4,5], ['santa','rudolf'], [5,4,0]],
    ['2026-12-05T23:00:00Z', [1,2,3,4,5], ['santa','nikolaus','rudolf'], [6,4,6]],
    [afterRelease, [1,2,3,5,6], ['santa','rudolf'], [3,4,0]],
    [afterRelease, [], ['santa'], [1,0,0]],
  ]) {
    const player = await session(now, {advent_reset_version:'2026-score-reset-2', advent_opened:JSON.stringify(solved)});
    assert.deepEqual(player.contacts(), contacts);
    assert.deepEqual(player.activeDays(), activeDays);
  }
  const previousProgress = {
    advent_reset_version:'2026-score-reset-2',
    advent_opened:'["1","2"]',
    advent_user_name:'  Test Spieler ',
    advent_points:'48',
  };
  const scores = [
    {name:'test   spieler', solved:'Tag 6'},
    {name:'Test Spieler', solved:3},
    {name:'Test Spieler', solved:'Tag 25'},
    {name:'Anderer Spieler', solved:24},
  ];
  const shared = {...previousProgress, advent_test_mode:'true'};
  const synced = await session(beforeAdvent, shared, 'santa', scores);
  assert.deepEqual(synced.contacts(), ['santa','nikolaus','rudolf']);
  assert.deepEqual(synced.activeDays(), [6,4,6]);
  assert.equal(shared.advent_opened, '[1,2,3,4,5,6]');
  assert.equal(synced.run('allPoints'), 48);
  assert.equal(synced.scoreRequests, 1);
  const offline = await session(beforeAdvent, shared, 'santa', null);
  assert.deepEqual(offline.activeDays(), [6,4,6]);

  const ahead = {...previousProgress, advent_opened:'[1,2,3,4,5,6,7]', advent_test_mode:'true'};
  await session(beforeAdvent, ahead, 'santa', scores);
  assert.equal(ahead.advent_opened, '[1,2,3,4,5,6,7]');

  const legacy = {
    ...previousProgress,
    test_advent_reset_version:'2026-score-reset-2',
    test_advent_opened:'[1,2,3,4,5]',
    test_advent_points:'65',
    test_advent_chat_log_5:'{"messages":[]}',
  };
  const migrated = await session(afterRelease, legacy);
  assert.deepEqual(migrated.activeDays(), [6,4,6]);
  assert.equal(legacy.advent_opened, '[1,2,3,4,5]');
  assert.equal(legacy.advent_chat_log_5, '{"messages":[]}');
  assert.equal(migrated.run('allPoints'), 65);

  const storage = {advent_user_name:'Test Spieler'};
  const normal = await session(beforeAdvent, storage);
  assert.equal(normal.toggle.checked, false);
  normal.toggle.checked = true;
  normal.toggle.change();
  assert.equal(normal.location.reloaded, true);
  const sequence = [
    [['santa'], [1,0,0]],
    [['santa'], [2,0,0]],
    [['santa'], [3,0,0]],
    [['santa','rudolf'], [3,4,0]],
    [['santa','rudolf'], [5,4,0]],
    [['santa','nikolaus','rudolf'], [6,4,6]],
  ];
  for (const [index, [contacts, activeDays]] of sequence.entries()) {
    const contact = index === 3 ? 'rudolf' : index === 5 ? 'nikolaus' : 'santa';
    const tester = await session(beforeAdvent, storage, contact);
    assert.equal(tester.toggle.checked, true);
    assert.deepEqual(tester.contacts(), contacts);
    assert.deepEqual(tester.activeDays(), activeDays);
    tester.run(chat);
    tester.context.rightSolution(index + 1, 10, 1400);
    assert.equal(tester.writes[0].solved, String(index + 1));
  }
  const tester = await session(beforeAdvent, storage);
  tester.run('saveNikolausQuest({together:true,confirmationRead:false})');
  tester.context.renderChatInbox();
  assert.match(tester.list.innerHTML, /gerade den Nikolaus getroffen/);
  assert.equal(tester.run('chatStorageKey(6, "santa")'), 'advent_chat_log_6_santa');
  assert.equal(storage.test_advent_opened, undefined);
  assert.equal(tester.run('allPoints'), 70);

  tester.toggle.checked = false;
  tester.toggle.change();
  const restored = await session(afterRelease, storage);
  assert.deepEqual(restored.contacts(), ['santa','nikolaus','rudolf']);
  assert.deepEqual(restored.activeDays(), [6,4,6]);
  assert.equal(restored.run('allPoints'), 70);
  assert.equal(restored.run('readNikolausQuest().together'), true);

  restored.toggle.checked = true;
  restored.toggle.change();
  const resumed = await session(beforeAdvent, storage);
  assert.deepEqual(resumed.contacts(), ['santa','nikolaus','rudolf']);
  assert.equal(resumed.run('allPoints'), 70);

  for (const contact of ['rudolf','nikolaus']) {
    const locked = await session(beforeAdvent, {advent_test_mode:'true'}, contact);
    locked.context.document.getElementById = () => ({});
    locked.run(chat);
    await locked.callbacks.at(-1)();
    assert.equal(locked.location.redirect, '../index.html');
  }
  const hint = await session(beforeAdvent, {...previousProgress, advent_test_mode:'true'});
  hint.context.logSolved();
  assert.equal(hint.writes[0].solved, '2');
  console.log('OK: dated and test releases, shared progress, legacy migration, Highscores recovery, and completion logging.');
})().catch(error => { console.error(error); process.exitCode = 1; });
