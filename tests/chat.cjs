const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const solutions = JSON.parse(read('solutions.json'));
const hintsData = JSON.parse(read('hints.json'));
for (let day = 1; day <= 24; day++) {
  assert.equal(hintsData[day].length, 3);
  if (day !== 1 && day !== 3) {
    assert.deepEqual(solutions[day], [['Lösung']]);
    assert.ok(read(`tage/content/${day}.html`).includes('data-placeholder="true"'));
  }
}
assert.equal(new Set([2, ...Array.from({length:21},(_,i)=>i+4)].map(day=>read(`tage/content/${day}.html`))).size,22);
function element() {
  return {dataset:{},children:[],listeners:{},classList:{add(){},remove(){},toggle(){}},
    addEventListener(n,f){this.listeners[n]=f},appendChild(e){this.children.push(e)},scrollTo(){},querySelectorAll(){return []}};
}
function session(day, balance=30, storage={}) {
  const nodes=Object.fromEntries(['.santa-chat','#daySlot','#chatComposer','#chatInput','#sendLocationButton','.santa-chat-script'].map(key=>[key,element()]));
  nodes['.santa-chat-script'].dataset.placeholder=day===3?'false':'true';
  const timers=[];
  const globals={console,URLSearchParams,location:{search:`?tag=${day}`},document:{addEventListener(){},createElement:element},
    $:key=>nodes[key],localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},
    opened:new Set(),hints:new Set(),hintCounts:{},wrongAttempts:{},save(){},logSolved(){},
    updatePoints(n){if(balance+n<0)return false;balance+=n;return true},setTimeout:fn=>timers.push(fn),requestAnimationFrame:fn=>fn()};
  const ctx=vm.createContext(globals);
  vm.runInContext(read('tage/gamey.js'),ctx);
  ctx.hintsData=hintsData;ctx.solutionsData=solutions;
  vm.runInContext('HINTS=hintsData; SOLUTIONS=solutionsData;',ctx);
  let setupDay;
  if(day===3){vm.runInContext(read('tage/scripts/3.js').replace('export function','function'),ctx);setupDay=ctx.setupDay;}
  ctx.setupSantaChat(setupDay);
  return {ctx,storage,balance:()=>balance,send(text){nodes['#chatInput'].value=text;nodes['#chatComposer'].listeners.submit({preventDefault(){}});},flush(){while(timers.length)timers.shift()();},messages:()=>JSON.parse(storage[`advent_chat_log_${day}`]).messages};
}
const s=session(2);
s.send('Hilfe');s.flush();s.send('Nein');s.flush();assert.equal(s.balance(),30);
for(let i=1;i<=3;i++){
 s.send('Hilfe');s.flush();s.send('Ja');s.flush();
 assert.equal(s.balance(),30-i*5);assert.equal(s.ctx.hintCounts[2],i);
 assert.ok(s.messages().some(m=>m.text.startsWith(`Hinweis ${i}/3:`)));
}
s.send('Hilfe');s.flush();assert.equal(s.balance(),15);
s.send('Lösung');s.flush();assert.equal(s.balance(),25);assert.ok(s.ctx.opened.has(2));
s.send('Lösung');s.flush();assert.equal(s.balance(),25);
const poor=session(4,4);poor.send('Hilfe');poor.flush();poor.send('Ja');poor.flush();
assert.equal(poor.balance(),4);assert.equal(poor.ctx.hintCounts[4],undefined);
poor.send('LÖSUNG!');poor.flush();assert.equal(poor.balance(),14);
const rapid=session(5);rapid.send('Hilfe');rapid.send('Ja');rapid.send('Ja');rapid.flush();assert.equal(rapid.balance(),25);
const quiz=session(3);quiz.send('Dover');quiz.flush();assert.equal(quiz.ctx.wrongAttempts[3],1);
for(const answer of ['Eurostar','Ärmelkanal','Dover']){quiz.send(answer);quiz.flush();}
assert.ok(quiz.ctx.opened.has(3));assert.ok(!quiz.ctx.opened.has(2));assert.equal(quiz.balance(),39);
// A restored conversation and separately persisted hint count continue at hint two.
const restored=session(2,25,s.storage);restored.ctx.hintCounts[2]=1;restored.ctx.hints.add(2);
restored.send('Hilfe');restored.flush();restored.send('Ja');restored.flush();
assert.equal(restored.ctx.hintCounts[2],2);assert.equal(restored.balance(),20);
console.log('OK: 24 hint/solution records; placeholders; ordered paid hints; cancellation; insufficient stars; repeat submissions; reload; ordered day-3 quiz and rewards.');
