/* 手眼标定 · 两条路径一致性
 * 二维刚体变换演示：A·X 与 X·B 必须落到同一个相机位姿。无外部依赖。 */
(function(){
 const root=document.querySelector('.eye-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'),status=root.querySelector('[data-status]'),
  out=n=>root.querySelector('[data-out="'+n+'"]'),read=n=>root.querySelector('[data-read="'+n+'"]');
 const DEG=Math.PI/180, RAD=180/Math.PI;

 // 真值：标签在基座系中的位姿；相机相对末端的固定位姿（外参 X）
 const T_TAG={x:0.62,y:0.10,th:15*DEG};
 const X_TRUE={x:0.07,y:-0.05,th:-95*DEG};

 const state={ax:0.42,ay:0.05,ath:20*DEG,dth:0,dt:0};

 const compose=(a,b)=>{const c=Math.cos(a.th),s=Math.sin(a.th);
  return{x:a.x+c*b.x-s*b.y, y:a.y+s*b.x+c*b.y, th:a.th+b.th};};
 const inverse=a=>{const c=Math.cos(a.th),s=Math.sin(a.th);
  return{x:-(c*a.x+s*a.y), y:-(-s*a.x+c*a.y), th:-a.th};};
 const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};

 function current(){
  const A={x:state.ax,y:state.ay,th:state.ath};
  const B=compose(compose(inverse(X_TRUE),inverse(A)),T_TAG);   // 相机看到标签
  const Xhat={x:X_TRUE.x+state.dt*0.001*Math.cos(X_TRUE.th),
              y:X_TRUE.y+state.dt*0.001*Math.sin(X_TRUE.th),
              th:X_TRUE.th+state.dth};
  const cam1=compose(A,Xhat);        // 末端 → 相机
  const cam2=compose(T_TAG,inverse(B));  // 基座 ← 标签 ← 相机（B 是相机看标签，方向相反）
  const d=Math.hypot(cam1.x-cam2.x,cam1.y-cam2.y)*1000;
  const da=Math.abs(norm(cam1.th-cam2.th))*RAD;
  return{A,B,Xhat,cam1,cam2,gap:d,gapAngle:da};
 }

 let W=0,H=0,S=0,ctx=null;
 const VIEW={x0:-0.06,x1:0.74,y0:-0.09,y1:0.19};
 function layout(){
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  W=w;H=h;S=Math.min(W/(VIEW.x1-VIEW.x0),H/(VIEW.y1-VIEW.y0));
 }
 const px=x=>W/2+(x-(VIEW.x0+VIEW.x1)/2)*S;
 const py=y=>H/2-(y-(VIEW.y0+VIEW.y1)/2)*S;

 function frame(f,color,label,size=42){
  const o={x:px(f.x),y:py(f.y)},c=Math.cos(f.th),s=Math.sin(f.th);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+c*size,o.y-s*size);ctx.stroke();
  ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x-s*size,o.y-c*size);ctx.stroke();
  ctx.beginPath();ctx.arc(o.x,o.y,3.2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  if(label){ctx.fillStyle=color;ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='center';
   ctx.fillText(label,o.x,o.y+size*0.62+11);}
 }
 function dashed(a,b,color){
  ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle=color;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(px(a.x),py(a.y));ctx.lineTo(px(b.x),py(b.y));ctx.stroke();ctx.restore();
 }
 function solid(a,b,color,width){
  ctx.strokeStyle=color;ctx.lineWidth=width||2.6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(px(a.x),py(a.y));ctx.lineTo(px(b.x),py(b.y));ctx.stroke();
 }

 function draw(){
  if(!ctx)return;
  const r=current();
  ctx.clearRect(0,0,W,H);

  // 基座
  frame({x:0,y:0,th:0},'#41586e','基座',34);
  // 标签
  const tg=T_TAG,cx=px(tg.x),cy=py(tg.y),sz=0.045*S;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-tg.th);
  ctx.fillStyle='#1c2f42';ctx.fillRect(-sz/2,-sz/2,sz,sz);
  ctx.fillStyle='#fff';ctx.fillRect(-sz*0.22,-sz*0.22,sz*0.44,sz*0.44);
  ctx.restore();
  ctx.fillStyle='#41586e';ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('标签',cx,cy+sz+14);

  // 两条路径的「骨架」
  dashed({x:0,y:0},r.A,'#b9cad8');
  dashed({x:0,y:0},T_TAG,'#b9cad8');
  frame(r.A,'#64798d','末端',34);

  // 末端 → 相机（蓝）；标签 → 相机（橙）
  solid(r.A,r.cam1,'#176dae');
  solid(T_TAG,r.cam2,'#dc7b21');

  // 相机位姿（两条路径各自的终点）
  frame(r.cam1,'#176dae','相机',30);
  frame(r.cam2,'#dc7b21','',30);

  // 残差
  if(r.gap>0.4){
   const x1=px(r.cam1.x),y1=py(r.cam1.y),x2=px(r.cam2.x),y2=py(r.cam2.y);
   ctx.strokeStyle='#a13d2d';ctx.lineWidth=2.4;ctx.setLineDash([]);
   ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
   if(r.gap>2){
    ctx.fillStyle='#a13d2d';ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='left';
    ctx.fillText('残差 '+r.gap.toFixed(1)+' mm',(x1+x2)/2+8,(y1+y2)/2-6);
   }
  }

  read('gap').textContent=r.gap.toFixed(1)+' mm / '+r.gapAngle.toFixed(1)+'°';
  read('gap').dataset.warn=String(r.gap>1||r.gapAngle>0.3);
  read('b').textContent='x '+(r.B.x*100).toFixed(1)+' · y '+(r.B.y*100).toFixed(1)+' cm · '+(r.B.th*RAD).toFixed(0)+'°';
  const ok=r.gap<=1&&r.gapAngle<=0.3;
  const mild=r.gap<=8&&r.gapAngle<=1.5;
  read('verdict').textContent=ok?'一致':(mild?'轻微偏差':'明显分叉');
  read('verdict').dataset.warn=String(!ok);
  status.dataset.warn=String(!ok);
  status.textContent=ok
   ?'两条路径终点重合，说明这组姿态下外参自洽。'
   :'两条路径分叉 '+r.gap.toFixed(1)+' mm / '+r.gapAngle.toFixed(1)+'°：这个差值就是该姿态下的残差，多个姿态的残差合起来才是标定的总误差。';

  out('ax').textContent=state.ax.toFixed(2);
  out('ay').textContent=state.ay.toFixed(2);
  out('ath').textContent=(state.ath*RAD).toFixed(0)+'°';
  out('dth').textContent=(state.dth*RAD).toFixed(1)+'°';
  out('dt').textContent=Math.round(state.dt)+' mm';
 }

 root.querySelectorAll('[data-in]').forEach(input=>{
  input.addEventListener('input',()=>{
   const k=input.dataset.in;
   state[k]=k==='ath'||k==='dth'?Number(input.value)*DEG:Number(input.value);
   draw();
  });
 });

 let frameId=null;
 const resize=()=>{if(frameId)cancelAnimationFrame(frameId);frameId=requestAnimationFrame(()=>{frameId=null;layout();draw();});};
 if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
 else window.addEventListener('resize',resize);
 layout();draw();root.dataset.ready='true';
})();
