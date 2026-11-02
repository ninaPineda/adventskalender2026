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
  if (day !== 1 && day !== 3 && day !== 4 && day !== 5 && day !== 6) {
    assert.deepEqual(solutions[day], [['Lösung']]);
    if (day !== 2) assert.ok(read(`tage/content/${day}.html`).includes('data-placeholder="true"'));
  }
}
assert.equal(new Set([2, ...Array.from({length:21},(_,i)=>i+4)].map(day=>read(`tage/content/${day}.html`))).size,22);
function element() {
  return {dataset:{},children:[],listeners:{},classList:{add(){},remove(){},toggle(){}},
    setAttribute(){},before(){},remove(){},addEventListener(n,f){this.listeners[n]=f},appendChild(e){this.children.push(e)},scrollTo(){},querySelectorAll(){return []}};
}
function session(day, balance=30, storage={}, intro=[], character="santa", progress={}) {
  const nodes=Object.fromEntries(['.santa-chat','#daySlot','#chatComposer','#chatInput','#sendLocationButton','.santa-chat-script'].map(key=>[key,element()]));
  nodes['#daySlot'].querySelectorAll=()=>intro;
  nodes['.santa-chat-script'].dataset.placeholder=day===3 || day===4 || day===5 || day===6?'false':'true';
  if(day===4 || day===5) {
    const content=read(`tage/content/${day}.html`);
    for (const [attribute, key] of [['answer-mode','answerMode'], ['chat-version','chatVersion'], ['success-reply','successReply'], ['wrong-reply','wrongReply']]) {
      nodes['.santa-chat-script'].dataset[key]=content.match(new RegExp(`data-${attribute}="([^"]+)"`))[1];
    }
  }
  if(day===6) nodes['.santa-chat-script'].dataset.chatVersion=character==='santa'?'santa-nikolaus-search-1':'nikolaus-search-1';
  const timers=[];
  const delays=[];
  const globals={console,URLSearchParams,location:{search:`?tag=${day}&contact=${character}`},document:{addEventListener(){},createElement:element,querySelector(){return null},getElementById(){return null}},
    $:key=>nodes[key],localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},
    opened:progress.opened || new Set(),hints:progress.hints || new Set(),hintCounts:progress.hintCounts || {},wrongAttempts:{},save(){},logSolved(){},
    readNikolausQuest(){try{return JSON.parse(storage.advent_nikolaus_search || '{}')}catch{return {}}},
    updatePoints(n){if(balance+n<0)return false;balance+=n;return true},setTimeout:(fn,delay)=>{delays.push(delay);timers.push(fn)},requestAnimationFrame:fn=>fn()};
  const ctx=vm.createContext(globals);
  vm.runInContext(read('tage/gamey.js'),ctx);
  ctx.hintsData=hintsData;ctx.solutionsData=solutions;
  vm.runInContext('HINTS=hintsData; SOLUTIONS=solutionsData;',ctx);
  let setupDay;
  if(day===1 || day===3 || day===6){vm.runInContext(read(`tage/scripts/${day}.js`).replace('export function','function'),ctx);setupDay=ctx.setupDay;}
  ctx.setupSantaChat(setupDay);
  return {ctx,storage,delays,nodes,balance:()=>balance,send(text){nodes['#chatInput'].value=text;nodes['#chatComposer'].listeners.submit({preventDefault(){}});},flush(){while(timers.length)timers.shift()();},messages:()=>JSON.parse(storage[`advent_chat_log_${day}${day===6 && character==='santa'?'_santa':''}`]).messages};
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
const poor=session(7,4);poor.send('Hilfe');poor.flush();poor.send('Ja');poor.flush();
assert.equal(poor.balance(),4);assert.equal(poor.ctx.hintCounts[7],undefined);
poor.send('LÖSUNG!');poor.flush();assert.equal(poor.balance(),14);
const rapid=session(7);rapid.send('Hilfe');rapid.send('Ja');rapid.send('Ja');rapid.flush();assert.equal(rapid.balance(),25);
const quiz=session(3);quiz.send('Erzähl mir irgendwas Nettes');quiz.flush();assert.equal(quiz.ctx.wrongAttempts[3],undefined);quiz.send('Dover');quiz.flush();assert.equal(quiz.ctx.wrongAttempts[3],1);
for(const answer of ['Eurostar','Ärmelkanal','Dover']){quiz.send(answer);quiz.flush();}
assert.ok(quiz.ctx.opened.has(3));assert.ok(!quiz.ctx.opened.has(2));assert.equal(quiz.balance(),39);
// A restored conversation and separately persisted hint count continue at hint two.
const restored=session(2,25,s.storage);restored.ctx.hintCounts[2]=1;restored.ctx.hints.add(2);
restored.send('Hilfe');restored.flush();restored.send('Ja');restored.flush();
assert.equal(restored.ctx.hintCounts[2],2);assert.equal(restored.balance(),20);
console.log('OK: 24 hint/solution records; placeholders; ordered paid hints; cancellation; insufficient stars; repeat submissions; reload; ordered day-3 quiz and rewards.');

// Previously opened introductions replay if no conversation has started.
const intro=[element(),element()];
const animated=session(2,30,{advent_chat_log_2:JSON.stringify({introShown:true,messages:[]})},intro);
assert.ok(intro.every(b=>b.hidden));
assert.ok(animated.delays[1]>=1600);
assert.ok(animated.delays[2]>animated.delays[1]);
animated.flush();
assert.ok(intro.every(b=>b.hidden===false));
const historyIntro=[element()];
session(2,30,{advent_chat_log_2:JSON.stringify({introShown:true,messages:[{sender:'user',text:'Hallo'}]})},historyIntro);
assert.notEqual(historyIntro[0].hidden,true);
console.log('OK: typing delay, sequential intro reveal, replay and restored history.');

const geo=session(1);
assert.equal(geo.nodes['#sendLocationButton'].hidden,false);
assert.ok(geo.nodes['#sendLocationButton'].listeners.click);
const textDay=session(2);
assert.equal(textDay.nodes['#sendLocationButton'].hidden,true);
console.log('OK: day one exposes map action; day two uses text composer.');
const rudolf=session(4);
rudolf.send('Lego');rudolf.flush();
assert.ok(!rudolf.ctx.opened.has(4));
rudolf.send('C1');rudolf.flush();
assert.ok(!rudolf.ctx.opened.has(4));
rudolf.send('d1');rudolf.flush();
assert.ok(rudolf.ctx.opened.has(4));
assert.ok(!rudolf.ctx.opened.has(1));
assert.equal(rudolf.balance(),40);
assert.equal(rudolf.nodes['#sendLocationButton'].hidden,true);
assert.ok(rudolf.messages().some(m=>m.text.includes('Weihnachtskarte noch dazu')));
rudolf.send('D1');rudolf.flush();assert.equal(rudolf.balance(),40);
for (const answer of ['D 1','D-1','D1!']) {
  const variant=session(4);variant.send(answer);variant.flush();assert.ok(variant.ctx.opened.has(4));
}
const warehouseHints=session(4);
for (let i=1;i<=3;i++) {
  warehouseHints.send('Hilfe');warehouseHints.flush();warehouseHints.send('Ja');warehouseHints.flush();
  assert.ok(warehouseHints.messages().some(m=>m.text.includes(hintsData[4][i-1])));
  assert.equal(warehouseHints.balance(),30-i*5);
}
console.log('OK: Rudolf coordinates, wrong answers, three ordered hints, separate completion and single reward.');

const ride=session(5);
ride.send('Lösung');ride.flush();assert.ok(!ride.ctx.opened.has(5));
ride.send('Kai');ride.flush();assert.ok(!ride.ctx.opened.has(5));
ride.send('  KAI   PFLAUME!  ');ride.flush();assert.ok(ride.ctx.opened.has(5));
assert.ok(!ride.ctx.opened.has(4));assert.equal(ride.balance(),40);
ride.send('Kai Pflaume');ride.flush();assert.equal(ride.balance(),40);
const rideHints=session(5);
for(let i=0;i<3;i++) {
  rideHints.send('Hilfe');rideHints.flush();rideHints.send('Ja');rideHints.flush();
  assert.ok(rideHints.messages().some(m=>m.text.includes(hintsData[5][i])));
}
assert.equal(rideHints.balance(),15);
console.log('OK: day five full name, wrong answers, ordered hints, single reward and separate Rudolf progress.');

// The photo is sent only on request, and hints are shared across the two contacts.
const questStorage={};
const progress={opened:new Set(),hints:new Set(),hintCounts:{}};
const nicholas=session(6,30,questStorage,[],'nikolaus',progress);
const santa=session(6,30,questStorage,[],'santa',progress);
assert.equal(santa.messages().filter(m=>m.kind==='image').length,0);
santa.send('Hallo');santa.flush();
assert.equal(santa.messages().filter(m=>m.kind==='image').length,0);
santa.send('Hey, wo bist du gerade?');santa.flush();
assert.equal(santa.messages().filter(m=>m.kind==='image').length,1);
assert.ok(JSON.parse(questStorage.advent_nikolaus_search).photoSent);
santa.send('Wo bist du?');santa.flush();
assert.equal(santa.messages().filter(m=>m.kind==='image').length,1);
santa.send('Köln');santa.flush();
assert.ok(!progress.opened.has(6));
assert.ok(santa.messages().some(m=>m.text?.includes('dem Nikolaus Bescheid')));
santa.send('Hilfe');santa.flush();santa.send('Ja');santa.flush();
assert.equal(progress.hintCounts[6],1);assert.equal(santa.balance(),25);
nicholas.send('Hilfe');nicholas.flush();nicholas.send('Ja');nicholas.flush();
assert.equal(progress.hintCounts[6],2);
assert.ok(nicholas.messages().some(m=>m.text?.includes(hintsData[6][1])));
nicholas.send('Berlin');nicholas.flush();assert.ok(!progress.opened.has(6));
nicholas.send('KOELN!');nicholas.flush();
assert.ok(progress.opened.has(6));assert.equal(nicholas.balance(),35);
assert.ok(!JSON.parse(questStorage.advent_nikolaus_search).confirmationRead);
nicholas.send('Köln');nicholas.flush();assert.equal(nicholas.balance(),35);
assert.equal(nicholas.nodes['#chatComposer'].hidden,false);
const reunion=session(6,35,questStorage,[],'santa',progress);reunion.flush();
assert.ok(reunion.messages().some(m=>m.text?.includes('gerade den Nikolaus getroffen')));
assert.ok(JSON.parse(questStorage.advent_nikolaus_search).confirmationRead);
const reunionAgain=session(6,35,questStorage,[],'santa',progress);reunionAgain.flush();
assert.equal(reunionAgain.messages().filter(m=>m.text?.includes('gerade den Nikolaus getroffen')).length,1);
assert.equal(reunionAgain.messages().filter(m=>m.kind==='image').length,1);
for (const who of ['santa','rudolf','nikolaus']) {
  const finished=session(who==='rudolf'?4:6,40,{},[],who,{opened:new Set([4,6])});
  finished.send('Irgendein Quatsch');finished.flush();
  assert.equal(finished.nodes['#chatComposer'].hidden,false);
  assert.ok(finished.messages().some(m=>m.sender==='santa'));
  assert.equal(finished.balance(),40);
  finished.send('Hilfe');finished.flush();assert.equal(finished.balance(),40);
}
console.log('OK: cross-chat photo request, shared hints, only Nikolaus accepts city, single reward, persisted photo/reunion and permanent composers.');
