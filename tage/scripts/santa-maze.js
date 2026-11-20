import { START, EXIT, solid, route, landmarks } from './maze-world.js?v=maze-2';
const canvas=document.querySelector('#camera'),ctx=canvas.getContext('2d',{alpha:false});
const speech=document.querySelector('#speech'),buttons=[...document.querySelectorAll('[data-turn]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved=store.read().santaMaze;
let pos=saved?.version===2 && Number.isFinite(saved.angle) && !solid(saved.x,saved.y) ? {x:saved.x,y:saved.y,angle:saved.angle} : {...START};
let steps=saved?.version===2 ? saved.steps||0 : 0, busy=false, won=false;
function persist(){store.update({santaMaze:{version:2,...pos,steps,won}});}
function texture(draw){const c=document.createElement('canvas');c.width=c.height=128;draw(c.getContext('2d'));return c;}
const wall=texture(c=>{
 c.fillStyle='#c4d0c5';c.fillRect(0,0,128,128);
 c.fillStyle='#668e87';c.fillRect(0,64,128,64);
 c.strokeStyle='#889d91';c.lineWidth=1;
 for(let y=0;y<=128;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();for(let x=(y%32?16:0);x<128;x+=32)c.strokeRect(x,y,32,16);}
 c.fillStyle='#3c6862';c.fillRect(0,61,128,4);c.fillStyle='#34534e';c.fillRect(0,122,128,6);
});
const sprites=new Map();
for(const item of landmarks){
 const key=item.kind+(item.blue?'blue':'');if(sprites.has(key))continue;
 sprites.set(key,texture(c=>{
  if(item.kind==='plant'){
   c.fillStyle=item.blue?'#477dac':'#a95341';c.beginPath();c.moveTo(43,90);c.lineTo(86,90);c.lineTo(78,126);c.lineTo(50,126);c.fill();
   c.strokeStyle='#315741';c.lineWidth=4;c.beginPath();c.moveTo(64,100);c.lineTo(64,25);c.stroke();
   for(let i=0;i<7;i++){c.fillStyle=i%2?'#638657':'#345e49';c.beginPath();c.ellipse(64+(i%2?14:-14),24+i*9,23,9,i%2?-.6:.6,0,Math.PI*2);c.fill();}
  } else if(item.kind==='art'){
   c.fillStyle='#74533d';c.fillRect(15,25,98,70);c.fillStyle='#e5d9bb';c.fillRect(21,31,86,58);c.fillStyle='#86aeb7';c.fillRect(26,36,76,48);
   for(let i=0;i<3;i++){c.strokeStyle=['#f0eee1','#416c86','#d4e5de'][i];c.lineWidth=5;c.beginPath();for(let x=27;x<102;x++)c.lineTo(x,52+i*9+Math.sin(x/12+i)*5);c.stroke();}
  } else if(item.kind==='cart'){
   c.fillStyle='#e9ba48';c.fillRect(25,68,72,47);c.fillStyle='#615d50';c.fillRect(32,57,58,12);c.fillRect(87,28,5,70);c.fillStyle='#c6c8b0';c.fillRect(43,49,14,18);c.fillStyle='#303b3a';c.beginPath();c.arc(39,120,7,0,7);c.arc(86,120,7,0,7);c.fill();
  } else {
   c.fillStyle=item.kind==='exit'?'#275e4a':'#425e66';c.fillRect(14,5,100,123);c.strokeStyle='#b2c6b5';c.lineWidth=4;c.strokeRect(14,5,100,123);
   c.fillStyle='#d6f3cc';c.fillRect(23,14,82,25);c.fillStyle='#244b3a';c.font='bold 19px sans-serif';c.textAlign='center';c.fillText(item.kind==='exit'?'EXIT →':'WC',64,34);c.fillStyle='#cad3ba';c.fillRect(85,75,16,4);
  }
 }));
}
// Bake decorations into the wall surface. They follow its perspective exactly
// and can neither rotate toward the camera nor float in the corridor.
const decoratedWalls = landmarks.filter(item=>item.wall).map(item=>({
 ...item.wall,
 image:texture(c=>{c.drawImage(wall,0,0);if(item.kind==='art') c.drawImage(sprites.get(item.kind),40,38,48,48); else c.drawImage(sprites.get(item.kind),0,0);}),
}));
let W,H,zbuffer;
function resize(){W=Math.min(800,Math.round(innerWidth*.75));H=Math.min(650,Math.round(W*innerHeight/innerWidth));canvas.width=W;canvas.height=H;zbuffer=new Float32Array(W);render();}
function render(){
 const horizon=H*.48,plane=W*.72;
 // Perspective floor and ceiling, with repeating tile seams and ceiling lights.
 ctx.fillStyle='#8e9b94';ctx.fillRect(0,0,W,horizon);ctx.fillStyle='#6b7c76';ctx.fillRect(0,horizon,W,H);
 for(let sy=Math.floor(horizon)+1;sy<H;sy+=2){
  const depth=plane*.5/(sy-horizon), shade=Math.max(28,105-depth*7);
  ctx.fillStyle=`rgb(${shade},${shade+13},${shade+9})`;ctx.fillRect(0,sy,W,2);
  for(let sx=0;sx<W;sx+=3){
   const side=(sx-W/2)/plane,wx=pos.x+depth*(Math.cos(pos.angle)-Math.sin(pos.angle)*side),wy=pos.y+depth*(Math.sin(pos.angle)+Math.cos(pos.angle)*side);
   if(wx%0.5<.016||wy%0.5<.016){ctx.fillStyle='#425953';ctx.fillRect(sx,sy,3,2);}
   const cy=2*horizon-sy;
   if(cy>=0 && Math.abs(wx%1-.5)<.12 && Math.abs(wy%1-.5)<.28){ctx.fillStyle=`rgba(239,246,218,${Math.max(0,.85-depth*.035)})`;ctx.fillRect(sx,cy,3,2);}
  }
 }
 for(let sx=0;sx<W;sx++){
  const offset=(sx-W/2)/plane,rx=Math.cos(pos.angle)-Math.sin(pos.angle)*offset,ry=Math.sin(pos.angle)+Math.cos(pos.angle)*offset;
  let mx=Math.floor(pos.x),my=Math.floor(pos.y),dx=Math.abs(1/rx),dy=Math.abs(1/ry),stepX=rx<0?-1:1,stepY=ry<0?-1:1;
  let sideX=(rx<0?pos.x-mx:mx+1-pos.x)*dx,sideY=(ry<0?pos.y-my:my+1-pos.y)*dy,side=0;
  for(let n=0;n<60;n++){if(sideX<sideY){sideX+=dx;mx+=stepX;side=0;}else{sideY+=dy;my+=stepY;side=1;}if(solid(mx,my))break;}
  const distance=Math.max(.01,side?sideY-dy:sideX-dx);zbuffer[sx]=distance;
  const height=plane/distance,top=horizon-height/2,hit=side?pos.x+distance*rx:pos.y+distance*ry;
  const attached=decoratedWalls.find(w=>w.x===mx&&w.y===my&&w.side===side&&w.step===(side?stepY:stepX));
  ctx.drawImage(attached?.image||wall,Math.floor((hit-Math.floor(hit))*128),0,1,128,sx,top,1,height);
  ctx.fillStyle=`rgba(8,30,29,${Math.min(.85,distance*.065+(side?.1:0))})`;ctx.fillRect(sx,top,1,height);
 }
 for(const item of landmarks.filter(item=>!item.wall).sort((a,b)=>Math.hypot(b.x-pos.x,b.y-pos.y)-Math.hypot(a.x-pos.x,a.y-pos.y))){
  const dx=item.x-pos.x,dy=item.y-pos.y,depth=dx*Math.cos(pos.angle)+dy*Math.sin(pos.angle),lateral=-dx*Math.sin(pos.angle)+dy*Math.cos(pos.angle);
  if(depth<.15)continue;
  const size=plane/depth*.8,cx=W/2+lateral/depth*plane,top=horizon+plane/depth*.5-size;
  const sprite=sprites.get(item.kind+(item.blue?'blue':''));
  for(let x=Math.max(0,Math.floor(cx-size/2));x<Math.min(W,cx+size/2);x++)if(depth<zbuffer[x])ctx.drawImage(sprite,Math.min(127,Math.max(0,Math.floor((x-cx+size/2)/size*128))),0,1,128,x,top,1,size);
 }
}
function controls(){
 buttons.forEach(b=>{b.disabled=busy||won||!route(pos,Number(b.dataset.turn));});
 document.querySelector('#turn-around').disabled=busy||won;
 document.querySelector('#open-exit').hidden=won||busy||Math.floor(pos.x)!==EXIT.x||Math.floor(pos.y)!==EXIT.y;
 document.querySelector('#steps').textContent=`${steps} ${steps===1?'Schritt':'Schritte'}`;
}
function describe(){
 const landmark=landmarks.find(i=>Math.hypot(i.x-pos.x,i.y-pos.y)<.8);
 const choices=buttons.filter(b=>!b.disabled).map(b=>Number(b.dataset.turn)===-1?'links':Number(b.dataset.turn)===1?'rechts':'geradeaus');
 speech.textContent=landmark?.name || (choices.length?`Hier geht’s ${choices.join(' oder ')}. Was meinst du?`:'Sackgasse. Na toll. Sag mir, dass ich umdrehen soll.');
}
function animate(from,to,duration){return new Promise(resolve=>{
 const begin=performance.now();function frame(now){const t=reduced?1:Math.min(1,(now-begin)/duration),e=t*t*(3-2*t);pos={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,angle:from.angle+(to.angle-from.angle)*e};render();if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);
});}
async function move(turn){
 if(busy||won)return;const destination=turn===2?{...pos,angle:pos.angle+Math.PI}:route(pos,turn);if(!destination)return;
 busy=true;controls();speech.textContent=turn===2?'Okay, ich drehe mich um.':turn===0?'Ich gehe weiter. Bleib dran …':turn<0?'Alles klar. Nach links …':'Okay, nach rechts …';
 const rotated={...pos,angle:destination.angle};if(turn)await animate({...pos},rotated,420);
 const distance=Math.hypot(destination.x-pos.x,destination.y-pos.y);if(distance)await animate({...pos},destination,Math.max(480,distance*310));
 steps++;busy=false;persist();controls();describe();

}
async function finish(){
 won=true;controls();persist();await loadInitialProgress();
 // Re-read before granting the reward, including progress changed in another tab.
 const state=store.read();(state.opened||[]).forEach(d=>opened.add(d));allPoints=state.points??allPoints;
 const earned=!opened.has(7);
 if(earned){opened.add(7);delete wrongAttempts[7];updatePoints(10);if(savedPlayerName())logScore(7);}
 const chat=store.read().chats?.['7'];
 if(chat?.version==='santa-maze-1'&&!chat.mazeFinished){chat.messages.push({sender:'santa',text:'EXIT! Endlich draußen. Danke fürs Navigieren! Ich muss jetzt erst mal frische Luft schnappen. 🎅✨'});chat.mazeFinished=true;store.saveChat('7',chat);}
 document.querySelector('#reward').textContent=earned?'+10 Sterne fürs Herauslotsen.':'Tag 7 ist bereits gelöst. Gut navigiert!';
 document.querySelector('#success').hidden=false;document.querySelector('#success a').focus();
}
document.querySelector('#open-exit').addEventListener('click',()=>finish());
buttons.forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.turn))));
document.querySelector('#turn-around').addEventListener('click',()=>move(2));
document.querySelector('#replay').addEventListener('click',()=>{pos={...START};steps=0;won=false;persist();document.querySelector('#success').hidden=true;controls();describe();render();buttons.find(b=>!b.disabled)?.focus();});
addEventListener('keydown',e=>{if(e.target.closest('button,a') || !['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key))return;e.preventDefault();move({ArrowLeft:-1,ArrowUp:0,ArrowRight:1,ArrowDown:2}[e.key]);});
const started=Date.now();setInterval(()=>{const s=Math.floor((Date.now()-started)/1000);document.querySelector('#timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;},1000);
addEventListener('resize',resize);resize();controls();describe();if(saved?.version===2&&saved.won&&Math.floor(pos.x)===EXIT.x&&Math.floor(pos.y)===EXIT.y)finish();
