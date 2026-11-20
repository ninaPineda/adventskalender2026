const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {grid,START,EXIT,solid,route,landmarks}=await import('../tage/scripts/maze-world.js');
 const queue=[{...START,path:[]}],seen=new Set();let solution;
 while(queue.length){
  const p=queue.shift(),key=[p.x,p.y,Math.round(p.angle/(Math.PI/2))%4].join(',');
  if(seen.has(key))continue;seen.add(key);
  if(Math.floor(p.x)===EXIT.x&&Math.floor(p.y)===EXIT.y){solution=p.path;break;}
  for(const t of [-1,0,1,2]){
   const next=t===2?{...p,angle:p.angle+Math.PI}:route(p,t);if(!next)continue;
   assert(!solid(next.x,next.y));
   if(t!==2){const n=Math.round(Math.hypot(next.x-p.x,next.y-p.y));for(let i=0;i<=n;i++)assert(!solid(p.x+(next.x-p.x)*i/n,p.y+(next.y-p.y)*i/n));}
   queue.push({...next,path:[...p.path,t]});
  }
 }
 assert(solution,'The exit must be reachable');
 assert(solution.length>=18,'No short route should bypass the maze');
 for(const item of landmarks.filter(i=>i.wall)) {
  const w=item.wall;assert(solid(w.x,w.y),'Attachments must be on solid walls');
  assert(!solid(w.x-(w.side===0?w.step:0),w.y-(w.side===1?w.step:0)),'Decorated wall face must face an open cell');
 }
 assert.equal(route({x:EXIT.x+.5,y:EXIT.y+.5,angle:0},0),null,'Stop in front of the exit door');
 assert.equal(route(START,-1),null);assert.equal(route(START,1),null);
 // All walkable cells belong to one connected component; loops and dead ends exist.
 const cells=[[Math.floor(START.x),Math.floor(START.y)]],connected=new Set();let deadends=0,junctions=0;
 while(cells.length){const [x,y]=cells.pop(),key=`${x},${y}`;if(connected.has(key))continue;connected.add(key);const ns=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>!solid(a,b));if(ns.length===1)deadends++;if(ns.length>=3)junctions++;cells.push(...ns.filter(([a,b])=>!connected.has(`${a},${b}`)));}
 assert.equal(connected.size,grid.flat().filter(c=>c===0).length);assert(deadends>=3);assert(junctions>=4);
 const hints=JSON.parse(fs.readFileSync('hints.json'));hints['7'][2]='Vom Klo aus: '+solution.map(t=>({'-1':'links',0:'geradeaus',1:'rechts',2:'umdrehen'}[t])).join(', ')+'.';
 // Verify the published route rather than changing it in tests.
 assert.equal(JSON.parse(fs.readFileSync('hints.json'))['7'][2],hints['7'][2]);
 console.log('OK: fixed connected maze, exit reachable, collision-free travel, dead ends, junctions and hint route.',solution);
})().catch(e=>{console.error(e);process.exit(1)});
