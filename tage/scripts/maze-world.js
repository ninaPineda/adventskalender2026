// Fixed floor plan. Each edge joins two intersections; no random generation.
export const SIZE = 23;
export const START = { x: 2.5, y: 20.5, angle: -Math.PI / 2 };
export const EXIT = { x: 19, y: 2 };
// A winding main route, with side loops and misleading branches in each wing.
const mainRoute = [
 [0,6],[0,5],[1,5],[1,4],[2,4],[2,5],[3,5],[3,4],[3,3],
 [2,3],[2,2],[3,2],[4,2],[4,3],[5,3],[5,2],[5,1],[4,1],
 [4,0],[5,0],[6,0],
];
const edges = mainRoute.slice(1).map((p,i)=>[...mainRoute[i],...p]);
edges.push(
 [0,5,0,4],[0,4,0,3],[0,3,1,3],[1,3,1,4],
 [0,3,0,2],
 [2,5,2,6],[2,6,3,6],[3,6,4,6],[4,6,4,5],[4,5,3,5],
 [4,5,5,5],[5,5,5,4],[5,4,6,4],[6,4,6,5],[6,5,6,6],
 [2,2,1,2],[1,2,1,1],[1,1,0,1],[0,1,0,0],[0,0,1,0],
 [1,0,2,0],[2,0,2,1],[2,1,2,2],[2,0,3,0],[3,0,3,1],
 [3,2,3,1],[4,3,4,4],
 [5,2,6,2],[6,2,6,3],[5,1,6,1],
);
export const grid = Array.from({length:SIZE},()=>Array(SIZE).fill(1));
for (const [ax,ay,bx,by] of edges) {
  const x=2+ax*3,y=2+ay*3,dx=Math.sign(bx-ax),dy=Math.sign(by-ay);
  for(let i=0;i<=3;i++) grid[y+dy*i][x+dx*i]=0;
}
export const solid = (x,y) => grid[Math.floor(y)]?.[Math.floor(x)] !== 0;
export const direction = angle => ({x:Math.round(Math.cos(angle)),y:Math.round(Math.sin(angle))});
export function route(position, turn) {
  const angle=position.angle+turn*Math.PI/2, d=direction(angle);
  let x=Math.floor(position.x), y=Math.floor(position.y);
  if(x===EXIT.x && y===EXIT.y && d.x===1) return null; // Leave viewing space in front of the door.
  if(solid(x+d.x,y+d.y)) return null;
  do {
    x+=d.x;y+=d.y;
    if(x===EXIT.x && y===EXIT.y) break;
    if(!solid(x-d.y,y+d.x)||!solid(x+d.y,y-d.x)) break;
  } while(!solid(x+d.x,y+d.y));
  return {x:x+.5,y:y+.5,angle};
}
// Wall attachments identify the exact solid tile and the visible face.
// step is the ray direction entering that wall; floor objects remain sprites.
export const landmarks = [
  {x:2.5,y:20.5,kind:'wc',wall:{x:2,y:21,side:1,step:1},name:'Das Klo. Hier haben wir angefangen.'},
  {x:2.22,y:17.25,kind:'plant',name:'Die Pflanze im roten Topf. Die merke ich mir.'},
  {x:8.5,y:14.5,kind:'art',wall:{x:9,y:14,side:0,step:1},name:'Ein Wellenbild. Immerhin etwas Hamburg hier drin.'},
  {x:11.22,y:17.24,kind:'cart',name:'Der gelbe Putzwagen. Ob der ein Navi hat?'},
  {x:8.22,y:8.24,kind:'plant',name:'Noch eine Pflanze – diesmal im blauen Topf.',blue:true},
  {x:17.5,y:8.5,kind:'art',wall:{x:16,y:8,side:0,step:-1},name:'Noch ein Wellenbild. Die sehen sich hier wirklich ähnlich.'},
  {x:19.5,y:2.5,kind:'exit',wall:{x:21,y:2,side:0,step:1},name:'EXIT! Da ist die Tür!'},
];
