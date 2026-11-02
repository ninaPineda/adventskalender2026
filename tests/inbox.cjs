const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const configuredSource = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
// Test the production calendar logic even while manual preview is enabled.
const source = configuredSource.replace(/  return 6;[^\n]*\n/, '').replace(/^  \/\/const /gm, '  const ').replace(/^  \/\/if /gm, '  if ').replace(/^  \/\/return /gm, '  return ');
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
const context = vm.createContext({Intl, Date, opened:new Set([1,2,3,5]), localStorage:{getItem(){return null}},document:{getElementById(){return list},addEventListener(){}}});
vm.runInContext(configuredSource.slice(configuredSource.indexOf('function releasedChatDay()')), context);
vm.runInContext('renderChatInbox()', context);
assert.ok(list.innerHTML.includes('contact=santa'));
assert.ok(list.innerHTML.includes('contact=rudolf'));
assert.equal((list.innerHTML.match(/unread-badge/g)||[]).length,2);
assert.equal((list.innerHTML.match(/class="inbox-avatar"/g)||[]).length, 3);
assert.ok(list.innerHTML.includes('assets/avatars/rudolf.png'));
assert.ok(list.innerHTML.includes('tage/ProfilePic.jpeg'));
console.log('OK: preview lists both contacts; Rudolf and Nikolaus unread; all three avatars present.');

assert.equal(String(state('2026-12-05T12:00:00Z', [1,2,3])), '5,5,4');
assert.equal(String(state('2026-12-05T12:00:00Z', [1,2,3,5])), '5,5,4');
assert.equal(String(state('2026-12-05T12:00:00Z', [1,2])), '5,3,4');
assert.equal(String(vm.runInContext('daysForChat("santa")', context)), '1,2,3,5,6');
console.log('OK: day five appends to Santa; Rudolf day four excluded from Santa history.');

assert.equal(String(state('2026-12-06T12:00:00Z', [1,2,3,5])), '6,6,4');
assert.ok(list.innerHTML.includes('contact=nikolaus'));
const quest={together:true,confirmationRead:false};
context.localStorage.getItem=()=>JSON.stringify(quest);
context.opened.add(6);
vm.runInContext('renderChatInbox()',context);
assert.ok(list.innerHTML.includes('Hey, ich habe gerade den Nikolaus getroffen!'));
assert.equal(vm.runInContext('hasUnreadDay("santa",6)',context),true);
quest.confirmationRead=true;
assert.equal(vm.runInContext('hasUnreadDay("santa",6)',context),false);
console.log('OK: Nikolaus release and Santa reunion unread notification.');
