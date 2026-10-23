/* 料盘抓取 · 在线重算示意
 * 纯 Canvas 2D，无外部依赖。演示刚体搬运与滚转锁定，不代表真机精度。 */
(function(){
 const root=document.querySelector('.tray-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'),status=root.querySelector('[data-status]'),
  out=name=>root.querySelector('[data-out="'+name+'"]'),read=name=>root.querySelector('[data-read="'+name+'"]');
 const DEG=Math.PI/180;
 const PIVOT=[0.800,0.100,1.020],Y0=0.0106,Z0=-0.0587,GHOST=[0.800,0.100,1.100];
 const STATIONS=[['standoff',-0.070],['mouth',-0.050],['short_insert',0.015],['groove',0.060]];
 const BADGE=['①','②','③','④'];
 const state={dx:0,dy:0,yaw:12*DEG,tilt:3.5*DEG,roll:0,mode:'min'};

 const mul=(A,B)=>{const C=new Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++)
  C[r*3+c]=A[r*3]*B[c]+A[r*3+1]*B[3+c]+A[r*3+2]*B[6+c];return C;};
 const rotZ=t=>{const c=Math.cos(t),s=Math.sin(t);return[c,-s,0,s,c,0,0,0,1];};
 const rotY=t=>{const c=Math.cos(t),s=Math.sin(t);return[c,0,s,0,1,0,-s,0,c];};
 const apply=(R,v)=>[R[0]*v[0]+R[1]*v[1]+R[2]*v[2],R[3]*v[0]+R[4]*v[1]+R[5]*v[2],R[6]*v[0]+R[7]*v[1]+R[8]*v[2]];
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const rodrigues=(v,axis,ang)=>{
  const c=Math.cos(ang),s=Math.sin(ang),d=axis[0]*v[0]+axis[1]*v[1]+axis[2]*v[2],
   cr=[axis[1]*v[2]-axis[2]*v[1],axis[2]*v[0]-axis[0]*v[2],axis[0]*v[1]-axis[1]*v[0]];
  return[v[0]*c+cr[0]*s+axis[0]*d*(1-c),v[1]*c+cr[1]*s+axis[1]*d*(1-c),v[2]*c+cr[2]*s+axis[2]*d*(1-c)];};

 let W=0,H=0,S=720,ctx=null;
 function layout(){
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  W=w;H=h;S=Math.min(W*1.6,H*3.2);
 }
 function proj(p){
  const x=p[0]-PIVOT[0],y=p[1]-PIVOT[1],z=p[2]-PIVOT[2];
  return[W/2+(x-y)*0.9*S,H/2+((x+y)*0.5-z*0.62)*S];
 }
 function pose(){
  const R=mul(rotZ(state.yaw),rotY(state.tilt));
  return{center:[PIVOT[0]+state.dx,PIVOT[1]+state.dy,GHOST[2]],R:R,axis:apply(R,[1,0,0])};
 }
 const PLATE=[[0,-0.105,Z0-0.105],[0,0.105,Z0-0.105],[0,0.105,Z0+0.105],[0,-0.105,Z0+0.105]];
 function path(pts,fill,stroke,width,dash){
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.save();ctx.setLineDash(dash||[]);ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke();ctx.restore();}
 }
 function line(a,b,stroke,width,dash){
  ctx.save();ctx.setLineDash(dash||[]);ctx.strokeStyle=stroke;ctx.lineWidth=width||1;
  const p=proj(a),q=proj(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.restore();
 }

 function draw(){
  if(!ctx)return;
  const {center,R,axis}=pose();
  ctx.clearRect(0,0,W,H);

  // 示教参考姿态（虚线灰）
  path(PLATE.map(q=>proj(add(GHOST,q))),null,'#a9bccd',1.4,[5,6]);
  line(add(GHOST,[-0.070,Y0,Z0]),add(GHOST,[0.060,Y0,Z0]),'#a9bccd',1.4,[4,6]);

  // 当前盘面与孔轴
  path(PLATE.map(q=>proj(add(center,apply(R,q)))),'rgba(23,109,174,.09)','#176dae',1.8);

  const c=proj(center);
  ctx.strokeStyle='#176dae';ctx.lineWidth=1;ctx.beginPath();
  ctx.moveTo(c[0]-5,c[1]);ctx.lineTo(c[0]+5,c[1]);ctx.moveTo(c[0],c[1]-5);ctx.lineTo(c[0],c[1]+5);ctx.stroke();

  // 孔口：盘面上的一个圆，投影成多边形
  const bore=[];
  for(let t=0;t<Math.PI*2+0.01;t+=Math.PI/16)
   bore.push(proj(add(center,apply(R,[0,0.026*Math.cos(t),Z0+0.026*Math.sin(t)]))));
  ctx.fillStyle='#eef5fb';ctx.strokeStyle='#176dae';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(bore[0][0],bore[0][1]);
  for(let i=1;i<bore.length;i++)ctx.lineTo(bore[i][0],bore[i][1]);
  ctx.closePath();ctx.fill();ctx.stroke();

  // 孔轴中心线（画在孔口之上，表示它穿过通孔）
  line(add(center,apply(R,[-0.128,Y0,Z0])),add(center,apply(R,[0.112,Y0,Z0])),'#176dae',2);
  // 四个站位
  STATIONS.forEach(([,x],i)=>{
   const p=proj(add(center,apply(R,[x,Y0,Z0])));
   ctx.fillStyle=i===3?'#176dae':'#7a55be';
   ctx.beginPath();ctx.arc(p[0],p[1],4.4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#2b4257';ctx.font='600 12px system-ui,sans-serif';ctx.textAlign='center';
   ctx.fillText(BADGE[i],p[0],p[1]-10);
  });

  // 工具：沿 -孔轴 伸入，爪指方向由滚转决定
  const groove=add(center,apply(R,[0.060,Y0,Z0]));
  line(add(groove,apply(R,[-0.10,0,0])),groove,'#1c2f42',4);
  const roll=state.mode==='copy'?state.roll:0;
  const u=rodrigues(apply(R,[0,1,0]),axis,roll),open=0.026;
  ctx.strokeStyle=state.mode==='copy'?'#a13d2d':'#176dae';ctx.lineWidth=3;ctx.lineCap='round';
  const fa=proj(add(groove,u.map(v=>v*open))),fb=proj(add(groove,u.map(v=>-v*open)));
  ctx.beginPath();ctx.moveTo(fa[0],fa[1]);ctx.lineTo(fb[0],fb[1]);ctx.stroke();
  [-1,1].forEach(s=>{
   const b=add(groove,u.map(v=>v*open*s)),p0=proj(b),p1=proj(add(b,apply(R,[0.026,0,0])));
   ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
  });

  // 基座系三轴（屏幕角落）
  const ox=44,oy=H-30;
  [['X',[22,0]],['Y',[0,-22]],['Z',[0,22]]].forEach(([n,[dx,dy]])=>{
   ctx.strokeStyle='#b9cad8';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+dx,oy+dy);ctx.stroke();
   ctx.fillStyle='#93a9bb';ctx.font='10px system-ui,sans-serif';ctx.textAlign='center';
   ctx.fillText(n,ox+dx*1.35,oy+dy*1.35+3);
  });

  read('center').textContent=center.map(v=>v.toFixed(3)).join(' / ')+' m';
  read('axis').textContent=axis.map(v=>v.toFixed(3)).join(' / ');
  read('groove').textContent='['+groove.map(v=>v.toFixed(3)).join(', ')+'] m';
  read('rollout').textContent=state.mode==='copy'
   ?'跟随观测 · '+(state.roll/DEG).toFixed(0)+'°'
   :'锁定 · 0°';
  status.dataset.copy=String(state.mode==='copy');
  status.textContent=state.mode==='copy'
   ?'照抄观测：孔轴方向是对的，但绕轴的滚转被检测噪声带走，爪指已经转过 '+(state.roll/DEG).toFixed(0)+'°。'
   :'最小旋转：孔轴跟随观测，滚转保持在验证过的示教值，四个站位随盘刚性搬运。';
  out('yaw').textContent=(state.yaw/DEG).toFixed(0)+'°';
  out('tilt').textContent=(state.tilt/DEG).toFixed(1)+'°';
  out('roll').textContent=(state.roll/DEG).toFixed(0)+'°';
 }

 root.querySelectorAll('[data-in]').forEach(input=>{
  input.addEventListener('input',()=>{state[input.dataset.in]=Number(input.value)*DEG;draw();});
 });
 root.querySelectorAll('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>{
   state.mode=button.dataset.mode;
   root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   draw();
  });
 });
 const reset=root.querySelector('[data-reset]');
 if(reset)reset.addEventListener('click',()=>{
  state.dx=0;state.dy=0;state.yaw=12*DEG;state.tilt=3.5*DEG;
  root.querySelector('[data-in=yaw]').value=12;root.querySelector('[data-in=tilt]').value=3.5;
  draw();
 });

 let drag=null;
 canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dsx=(e.clientX-drag[0])/S,dsy=(e.clientY-drag[1])/S;
  state.dx=Math.max(-0.09,Math.min(0.09,state.dx+(dsx/0.9+dsy/0.5)/2));
  state.dy=Math.max(-0.09,Math.min(0.09,state.dy+(dsy/0.5-dsx/0.9)/2));
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
