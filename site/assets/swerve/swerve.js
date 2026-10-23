/* 全向底盘 · 四舵轮俯视示意
 * 复刻 site/assets/g2/kinematics.cjs 的 swerve()：等价角 + 就近 + 限位。
 * 纯 Canvas 2D，无外部依赖。 */
(function(){
 const root=document.querySelector('.swerve-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'),status=root.querySelector('[data-status]'),
  tbody=root.querySelector('[data-body]'),
  out=n=>root.querySelector('[data-out="'+n+'"]');
 const R=0.07,LIMIT=2.97,DEG=Math.PI/180;
 const MODULES=[
  {x:0.23,y:0.218,name:'前左'},
  {x:0.23,y:-0.218,name:'前右'},
  {x:-0.23,y:0.218,name:'后左'},
  {x:-0.23,y:-0.218,name:'后右'}];
 const state={vx:0.2,vy:0,w:0,allowFlip:true};
 let previous=[0,0,0,0],result=[];

 function solve(){
  return MODULES.map((m,i)=>{
   const x=state.vx-state.w*m.y,y=state.vy+state.w*m.x,mag=Math.hypot(x,y);
   if(mag<1e-6)return{angle:previous[i],speed:0,ok:true,idle:true,mag:0};
   const a=Math.atan2(y,x),cand=[];
   for(let k=-2;k<=2;k++){
    if(!state.allowFlip&&k%2!==0)continue;
    const angle=a+k*Math.PI;
    if(Math.abs(angle)<=LIMIT)cand.push({angle:angle,speed:mag/R*(k%2===0?1:-1)});
   }
   if(!cand.length)return{angle:(a>0?1:-1)*LIMIT,speed:0,ok:false,idle:false,mag:mag};
   cand.sort((p,q)=>Math.abs(p.angle-previous[i])-Math.abs(q.angle-previous[i]));
   return{angle:cand[0].angle,speed:cand[0].speed,ok:true,idle:false,mag:mag};
  });
 }

 let W=0,H=0,S=520,ctx=null;
 function layout(){
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  W=w;H=h;S=Math.min(w/0.72,h/0.62);
 }
 const px=p=>W/2+p[0]*S, py=p=>H/2-p[1]*S;
 function arrow(x0,y0,x1,y1,color,width,head){
  const a=Math.atan2(y1-y0,x1-x0),h=head||7;
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width||2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-Math.cos(a)*h*.8,y1-Math.sin(a)*h*.8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x1,y1);
  ctx.lineTo(x1-Math.cos(a-.4)*h,y1-Math.sin(a-.4)*h);
  ctx.lineTo(x1-Math.cos(a+.4)*h,y1-Math.sin(a+.4)*h);
  ctx.closePath();ctx.fill();
 }

 function draw(){
  if(!ctx)return;
  result=solve();
  ctx.clearRect(0,0,W,H);

  // 底盘轮廓
  ctx.strokeStyle='#9fb6c9';ctx.lineWidth=2;
  const x0=px([-0.26,0]),x1=px([0.26,0]),y0=py([0,-0.25]),y1=py([0,0.25]);
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,y1,x1-x0,y0-y1,10):ctx.rect(x0,y1,x1-x0,y0-y1);
  ctx.stroke();
  ctx.fillStyle='rgba(23,109,174,.05)';ctx.fill();

  // 车体坐标轴（画在角落，避免和中心指令重叠）
  const ax=46,ay=H-34;
  [['X',24,0],['Y',0,-24]].forEach(([n,dx,dy])=>{
   arrow(ax,ay,ax+dx,ay+dy,'#b9cad8',1.4,6);
   ctx.fillStyle='#93a9bb';ctx.font='10px system-ui,sans-serif';ctx.textAlign='center';
   ctx.fillText(n,ax+dx*1.35,ay+dy*1.35+3);
  });

  // 中心指令
  const cv=Math.hypot(state.vx,state.vy);
  if(cv>1e-6){
   const L=Math.min(cv*0.55,0.18);
   arrow(W/2,H/2,W/2+state.vx*0.55*S,H/2-state.vy*0.55*S,'#176dae',3,9);
   ctx.fillStyle='#176dae';ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='left';
   ctx.fillText('v',W/2+state.vx*0.55*S+8,H/2-state.vy*0.55*S+4);
  }
  if(Math.abs(state.w)>1e-6){
   const r=34,ccw=state.w>0;
   ctx.strokeStyle='#7a55be';ctx.lineWidth=2.4;ctx.lineCap='round';
   ctx.beginPath();
   ctx.arc(W/2,H/2,r,ccw?0.45:-2.4,ccw?2.4:-0.45,false);
   ctx.stroke();
   const a=ccw?0.45:-0.45,tx=W/2+Math.cos(a)*r,ty=H/2+Math.sin(a)*r;
   const ta=a+(ccw?1.2:-1.2);
   ctx.beginPath();ctx.moveTo(tx,ty);
   ctx.lineTo(tx-Math.cos(ta-.35)*8,ty-Math.sin(ta-.35)*8);
   ctx.lineTo(tx-Math.cos(ta+.35)*8,ty-Math.sin(ta+.35)*8);
   ctx.closePath();ctx.fillStyle='#7a55be';ctx.fill();
   ctx.fillStyle='#7a55be';ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='left';
   ctx.fillText('ω',W/2+r+6,H/2+4);
  }

  // 四个模块
  MODULES.forEach((m,i)=>{
   const cx=px([m.x,m.y]),cy=py([m.x,m.y]),r=Math.max(9,0.032*S);
   const res=result[i],prev=previous[i];

   // 上一次朝向（灰虚线）
   ctx.save();ctx.setLineDash([3,4]);ctx.strokeStyle='#c3d3df';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.moveTo(cx-Math.cos(prev)*r*1.6,cy+Math.sin(prev)*r*1.6);
   ctx.lineTo(cx+Math.cos(prev)*r*1.6,cy-Math.sin(prev)*r*1.6);ctx.stroke();ctx.restore();

   // 模块底座
   ctx.fillStyle=res.ok?'#e7f0f8':'#fdeeea';ctx.strokeStyle=res.ok?'#9fb6c9':'#c98a7f';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();

   // 轮子：沿转向角
   const ux=Math.cos(res.angle),uy=Math.sin(res.angle);
   ctx.strokeStyle=res.ok?'#1c2f42':'#8d3529';ctx.lineWidth=4;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(cx-ux*r*.8,cy+uy*r*.8);ctx.lineTo(cx+ux*r*.8,cy-uy*r*.8);ctx.stroke();

   // 模块速度矢量
   if(res.mag>1e-6){
    const L=Math.min(res.mag*0.45,0.16)*S;
    arrow(cx,cy,cx+ux*L,cy-uy*L,'#176dae',2,6);
   }

   ctx.fillStyle='#41586e';ctx.font='11px system-ui,sans-serif';ctx.textAlign='center';
   ctx.fillText(m.name,cx,cy+r+14);
  });

  // 表格
  MODULES.forEach((m,i)=>{
   const res=result[i],row=tbody.children[i];
   if(!row)return;
   row.children[1].textContent=(res.angle/DEG).toFixed(1)+'°';
   row.children[2].textContent=res.speed.toFixed(3);
   const st=row.children[3];
   st.dataset.warn=String(!res.ok);
   st.textContent=!res.ok?'超出 ±170° 限位':(res.idle?'保持朝向':'正常');
  });

  out('vx').textContent=state.vx.toFixed(2);
  out('vy').textContent=state.vy.toFixed(2);
  out('w').textContent=state.w.toFixed(2);

  const bad=result.filter(r=>!r.ok).length;
  status.dataset.warn=String(bad>0);
  status.textContent=bad
   ?'有 '+bad+' 个模块在「不许反转」下找不到落在 ±170° 内的解——这正是反转必须存在的原因。'
   :(state.allowFlip
     ?'允许反转：每个模块在等价角里选了离上一次最近的那个，底盘速度不受影响。'
     :'不许反转：只用正转候选，转角可能被限位挡住。');

  previous=result.map(r=>r.angle);
 }

 root.querySelectorAll('[data-in]').forEach(input=>{
  input.addEventListener('input',()=>{
   const key=input.dataset.in==='w'?'w':input.dataset.in;
   state[key]=Number(input.value);draw();
  });
 });
 root.querySelectorAll('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>{
   state.allowFlip=button.dataset.mode==='flip';
   root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   draw();
  });
 });
 const reset=root.querySelector('[data-reset]');
 if(reset)reset.addEventListener('click',()=>{
  previous=[0,0,0,0];draw();
 });

 // 表格骨架
 MODULES.forEach(m=>{
  const tr=document.createElement('tr');
  tr.innerHTML='<td>'+m.name+'</td><td>—</td><td>—</td><td>—</td>';
  tbody.appendChild(tr);
 });

 let drag=null;
 canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=(e.clientX-drag[0])/S,dy=(e.clientY-drag[1])/S;
  state.vx=Math.max(-0.3,Math.min(0.3,state.vx+dx*0.9));
  state.vy=Math.max(-0.3,Math.min(0.3,state.vy+dy*0.9));
  root.querySelector('[data-in=vx]').value=state.vx.toFixed(2);
  root.querySelector('[data-in=vy]').value=state.vy.toFixed(2);
  drag=[e.clientX,e.clientY];draw();
 });
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>
  canvas.addEventListener(ev,()=>{drag=null;canvas.style.cursor='grab';}));

 let frame=null;
 const resize=()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;layout();draw();});};
 if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
 else window.addEventListener('resize',resize);
 layout();draw();root.dataset.ready='true';
})();
