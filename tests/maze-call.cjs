const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const world=await import('../tage/scripts/maze-world.js');let state={points:20,opened:[1,2],chats:{'7':{version:'santa-maze-1',messages:[]}}};
 function session(){
  const paint=new Proxy({}, {get:()=>()=>{}}),nodes={};
  const make=()=>({disabled:false,hidden:true,dataset:{},addEventListener(){},focus(){},getContext:()=>paint});
  const buttons=[-1,0,1].map(t=>Object.assign(make(),{dataset:{turn:String(t)}}));
  const context={...world,console,Math,Date,Float32Array,Map,Number,Promise,innerWidth:320,innerHeight:600,
   document:{querySelector:s=>nodes[s]||=(make()),querySelectorAll:()=>buttons,createElement:make},
   matchMedia:()=>({matches:true}),addEventListener(){},setInterval(){},performance:{now:()=>0},requestAnimationFrame:cb=>cb(100000),
   store:{read:()=>structuredClone(state),update:changes=>Object.assign(state,changes),saveChat:(id,chat)=>state.chats[id]=structuredClone(chat)},
   opened:new Set(state.opened),allPoints:state.points,wrongAttempts:{},loadInitialProgress:async()=>{},savedPlayerName:()=>null,
   logScore(){throw Error('Anonymous play must not prompt for a name');},
  };
  context.updatePoints=n=>{context.allPoints+=n;state.points=context.allPoints;state.opened=[...context.opened];};
  vm.createContext(context);vm.runInContext(fs.readFileSync('tage/scripts/santa-maze.js','utf8').replace(/^import .*\n/,''),context);
  return {context,nodes};
 }
 state.santaMaze={version:1,x:2.5,y:17.5,angle:0,steps:99,won:true};
 let s=session();assert.equal(s.nodes['#steps'].textContent,'0 Schritte','Old layouts must restart safely');await s.context.move(0);assert.equal(state.santaMaze.steps,1);
 s=session();assert.equal(s.nodes['#steps'].textContent,'1 Schritt');
 const turns={'geradeaus':0,'rechts':1,'links':-1,'umdrehen':2};
 const routeText=JSON.parse(fs.readFileSync('hints.json'))['7'][2].replace('Vom Klo aus: ','').replace(/\.$/,'');
 for(const word of routeText.split(', ').slice(1))await s.context.move(turns[word]);
 assert.equal(s.context.document.querySelector('#success').hidden,true,'Reaching the door must leave it visible');
 assert.equal(s.nodes['#open-exit'].hidden,false);
 await s.context.finish();
 assert.equal(s.nodes['#success'].hidden,false);assert.equal(state.points,30);assert(state.opened.includes(7));assert(state.santaMaze.won);
 assert.equal(state.chats['7'].messages.length,1);
 await s.context.finish();assert.equal(state.points,30);assert.equal(state.chats['7'].messages.length,1);
 s=session();await new Promise(resolve=>setImmediate(resolve));assert.equal(s.nodes['#success'].hidden,false);assert.equal(state.points,30);
 console.log('OK: resumed call, complete exit route, anonymous completion, saved chat, reload and no duplicate stars.');
})().catch(e=>{console.error(e);process.exit(1)});
