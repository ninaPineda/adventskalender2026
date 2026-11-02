const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const configuredSource = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
// Test the production calendar logic even while manual preview is enabled.
const source = configuredSource.replace(/  return 4;[^\n]*\n/, '').replace(/^  \/\/const /gm, '  const ').replace(/^  \/\/if /gm, '  if ').replace(/^  \/\/return /gm, '  return ');
function state(now, solved=[]) {
  const context = vm.createContext({Intl, Date:class extends Date { constructor(){super(now)} }, opened:new Set(solved)});
  vm.runInContext(source.slice(source.indexOf('function releasedChatDay()'), source.indexOf('function renderChatInbox()')), context);
  return vm.runInContext('[releasedChatDay(), currentChatDay(), currentChatDay("rudolf")]', context);
}
assert.equal(String(state('2026-11-30T22:59:00Z')), '0,0,0');
assert.equal(String(state('2026-11-30T23:00:00Z')), '1,1,0');
assert.equal(String(state('2026-12-02T12:00:00Z', [1])), '2,2,0');
assert.equal(String(state('2026-12-03T12:00:00Z', [1])), '3,2,0');
assert.equal(String(state('2026-12-04T12:00:00Z', [1,2,3])), '4,3,4');
console.log('OK: Berlin midnight release, hidden future days, catch-up order, separate Santa and Rudolf conversations.');

const list = {innerHTML:""};
const context = vm.createContext({Intl, Date, opened:new Set([1,2,3]), document:{getElementById(){return list},addEventListener(){}}});
vm.runInContext(configuredSource.slice(configuredSource.indexOf('function releasedChatDay()')), context);
vm.runInContext('renderChatInbox()', context);
assert.ok(list.innerHTML.includes('contact=santa'));
assert.ok(list.innerHTML.includes('contact=rudolf'));
assert.equal((list.innerHTML.match(/unread-badge/g)||[]).length,1);
assert.equal((list.innerHTML.match(/class="inbox-avatar"/g)||[]).length, 2);
assert.ok(list.innerHTML.includes('assets/avatars/rudolf.png'));
assert.ok(list.innerHTML.includes('tage/ProfilePic.jpeg'));
console.log('OK: preview lists both contacts; only Rudolf is unread; both character avatars restored.');
