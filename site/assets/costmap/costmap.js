/* 代价地图 · 膨胀与代价场
 * 二维占用栅格 + 内切/膨胀半径，演示「碰撞」如何变成「代价」。无外部依赖。 */
(function(){
 const root=document.querySelector('.cost-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'),status=root.querySelector('[data-status]'),
  out=n=>root.querySelector('[data-out="'+n+'"]'),read=n=>root.querySelector('[data-read="'+n+'"]');

 const WORLD={w:6.0,h:4.0}, CELL=0.10;              // 米 / 栅格边长
 const COLS=Math.round(WORLD.w/CELL), ROWS=Math.round(WORLD.h/CELL);
 const OBST=[
  {x0:1.10,y0:0.60,x1:1.90,y1:1.30},
  {x0:3.30,y0:2.40,x1:4.40,y1:3.00},
  {x0:4.60,y0:0.50,x1:5.00,y1:1.60},
  {x0:2.20,y0:3.20,x1:3.10,y1:3.60}
 ];
 const state={inscribed:0.28,inflation:0.75,decay:1.0,x:3.10,y:1.90};

 /* 点到障碍矩形的距离；矩形内部返回 0 */
 function distToObstacles(x,y){
  let best=Infinity;
  for(const o of OBST){
   const dx=Math.max(o.x0-x,0,x-o.x1), dy=Math.max(o.y0-y,0,y-o.y1);
   const d=Math.hypot(dx,dy);
   if(d<best)best=d;
  }
  return best;
 }
 function costAt(x,y){
  const d=distToObstacles(x,y);
  if(d<=0)return 254;
  if(d<=state.inscribed)return 253;
  if(d<=state.inflation)return Math.max(1,Math.round(253*Math.exp(-state.decay*(d-state.inscribed))));
  return 0;
 }
 const costColor=c=>{
  if(c>=254)return '#1c2f42';
  if(c>=253)return '#c2694f';
  if(c===0)return '#ffffff';
  const t=Math.min(1,c/253), r=Math.round(232-116*t), g=Math.round(240-84*t), b=Math.round(248-22*t);
  return 'rgb('+r+','+g+','+b+')';
 };

 let W=0,H=0,cw=0,ch=0,OX=0,OY=0,ctx=null;
 function layout(){
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  W=w;H=h;
  const k=Math.min(W/WORLD.w,H/WORLD.h);cw=k*CELL;ch=k*CELL;
  OX=(W-COLS*cw)/2;OY=(H-ROWS*ch)/2;          // 世界居中，避免右侧留白
 }
 const sx=x=>OX+x*(cw/CELL), sy=y=>OY+y*(ch/CELL);

 function draw(){
  if(!ctx)return;
  ctx.clearRect(0,0,W,H);
  // 栅格
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
   const x=(c+0.5)*CELL,y=(r+0.5)*CELL;
   ctx.fillStyle=costColor(costAt(x,y));
   ctx.fillRect(Math.floor(OX+c*cw),Math.floor(OY+r*ch),Math.ceil(cw)+1,Math.ceil(ch)+1);
  }
  // 障碍轮廓
  ctx.strokeStyle='#0f1b27';ctx.lineWidth=1;
  for(const o of OBST)ctx.strokeRect(sx(o.x0),sy(o.y0),(o.x1-o.x0)*cw/CELL,(o.y1-o.y0)*ch/CELL);

  // 机器人（内切圆）
  const cx=sx(state.x),cy=sy(state.y),rr=state.inscribed*cw/CELL;
  ctx.fillStyle='rgba(23,109,174,.16)';ctx.strokeStyle='#176dae';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-6,cy);ctx.lineTo(cx+6,cy);ctx.moveTo(cx,cy-6);ctx.lineTo(cx,cy+6);
  ctx.strokeStyle='#176dae';ctx.lineWidth=1.6;ctx.stroke();

  // 读数
  const d=distToObstacles(state.x,state.y), cost=costAt(state.x,state.y);
  read('dist').textContent=d<=0?'0.00 m（在障碍内）':d.toFixed(2)+' m';
  read('cost').textContent=String(cost);
  const verdict=cost>=254?'碰撞':(cost>=253?'内切区·不可达':(cost>0?'高代价·可行':'自由空间'));
  read('verdict').textContent=verdict;
  const bad=cost>=253;
  read('verdict').dataset.warn=String(bad);
  read('dist').dataset.warn=String(bad);

  status.dataset.warn=String(bad);
  status.textContent=bad
   ?(cost>=254?'机器人中心落在障碍上，这一格是 lethal。':'机器人中心进了内切区：外轮廓已经压到障碍，规划器不该选这里。')
   :(cost>0
     ?'落在膨胀区，代价 '+cost+'：这条路能走，但规划器会尽量绕开。'
     :'自由空间，代价为 0。');

  out('inscribed').textContent=state.inscribed.toFixed(2)+' m';
  out('inflation').textContent=state.inflation.toFixed(2)+' m';
  out('decay').textContent=state.decay.toFixed(1);
 }

 function clampPos(){state.x=Math.max(0.05,Math.min(WORLD.w-0.05,state.x));state.y=Math.max(0.05,Math.min(WORLD.h-0.05,state.y));}

 root.querySelectorAll('[data-in]').forEach(input=>{
  input.addEventListener('input',()=>{
   const k=input.dataset.in;
   state[k]=Number(input.value);
   // 膨胀半径不得小于内切半径，否则中间会留出「无代价但会撞」的缝
   const inf=root.querySelector('[data-in=inflation]');
   if(state.inflation<state.inscribed){
    state.inflation=state.inscribed;
    if(inf)inf.value=state.inflation;
   }
   draw();
  });
 });

 let drag=false;
 const pick=e=>{
  const r=canvas.getBoundingClientRect();
  state.x=((e.clientX-r.left)-OX)/(cw/CELL);
  state.y=((e.clientY-r.top)-OY)/(ch/CELL);
  clampPos();draw();
 };
 canvas.addEventListener('pointerdown',e=>{drag=true;canvas.setPointerCapture(e.pointerId);pick(e);});
 canvas.addEventListener('pointermove',e=>{if(drag)pick(e);});
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>canvas.addEventListener(ev,()=>drag=false));

 let frameId=null;
 const resize=()=>{if(frameId)cancelAnimationFrame(frameId);frameId=requestAnimationFrame(()=>{frameId=null;layout();draw();});};
 if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
 else window.addEventListener('resize',resize);
 layout();draw();root.dataset.ready='true';
})();
