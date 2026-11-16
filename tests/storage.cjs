const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('storage.js', 'utf8');
function session(data, failWrite = false) {
  const ctx = vm.createContext({localStorage: {
    getItem: key => data[key] ?? null,
    setItem(key, value) { if (failWrite) throw new Error('Speicher voll'); data[key] = value; },
    removeItem: key => delete data[key],
  }});
  vm.runInContext(source, ctx);
  return code => vm.runInContext(code, ctx);
}
const old = {
  advent_user_name: 'Nina', advent_points: '0', advent_opened: '[1,3]',
  hints_opened: '[1,3]', advent_hint_counts: '{"3":2}',
  advent_wrong_attempts: '{"2":3}', advent_nikolaus_search: '{"photoSent":true}',
  advent_chat_log_1: '{"version":"v1","messages":[{"text":"Hallo"}]}',
  advent_chat_log_6_santa: '{"messages":[],"pendingHint":true}',
  advent_reset_version: 'old', unrelated: 'keep',
};
const run = session(old);
assert.deepEqual(Object.keys(old).sort(), ['advent_state', 'unrelated']);
const state = JSON.parse(old.advent_state);
assert.equal(state.name, 'Nina');
assert.equal(state.points, 0);
assert.deepEqual(state.opened, [1,3]);
assert.deepEqual(state.hintCounts, {1:1,3:2});
assert.deepEqual(state.wrongAttempts, {2:3});
assert.equal(state.quest.photoSent, true);
assert.equal(state.chats[1].version, 'v1');
assert.equal(state.chats['6_santa'].pendingHint, true);
const secondTab = session(old);
secondTab('store.saveChat("2", {messages: [{text: "Neu"}]})');
run('store.update({points: 5}); store.saveChat("1", {messages: []})');
assert.equal(JSON.parse(old.advent_state).chats[2].messages[0].text, 'Neu');
assert.equal(JSON.parse(old.advent_state).points, 5);
assert.equal(JSON.parse(old.advent_state).quest.photoSent, true);
const full = {advent_points:'25', advent_opened:'[1]'};
assert.throws(() => session(full, true), /Speicher voll/);
assert.deepEqual(full, {advent_points:'25', advent_opened:'[1]'});
console.log('OK: complete migration, zero balance, legacy hints, both chats, idempotence, other-tab updates, unrelated keys, failed-write protection.');
