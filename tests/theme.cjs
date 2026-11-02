const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../theme.js'), 'utf8');
let now = '2026-12-01T18:59:59Z';
const root = {dataset:{}};
const callbacks = {};
vm.runInNewContext(source, {
  Intl, Date: class extends Date { constructor(){super(now);} },
  document:{documentElement:root,addEventListener(name,fn){callbacks[name]=fn;}},
  window:{addEventListener(name,fn){callbacks[name]=fn;}},
  setInterval(fn){callbacks.tick=fn;},
});
assert.equal(root.dataset.theme,'light');
for (const [date, expected] of [
  ['2026-12-01T19:00:00Z','dark'], // 20:00 Berlin
  ['2026-12-01T23:00:00Z','dark'], // midnight
  ['2026-12-02T04:59:59Z','dark'],
  ['2026-12-02T05:00:00Z','light'], // 06:00 Berlin
  ['2026-07-01T18:00:00Z','dark'], // summer time
  ['2026-07-02T04:00:00Z','light'],
]) {
  now=date;callbacks.tick();assert.equal(root.dataset.theme,expected,date);
}
now='2026-12-01T19:30:00Z';callbacks.visibilitychange();assert.equal(root.dataset.theme,'dark');
now='2026-12-02T06:00:00Z';callbacks.focus();assert.equal(root.dataset.theme,'light');
console.log('OK: night boundaries, midnight, daylight saving time and tab resume.');
