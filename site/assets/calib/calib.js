/* 旋转向量配准的局部信息：不代替完整手眼可观性与精度验收。 */
(function(){
 const root=document.querySelector('.handeye-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={n:12,spread:40,angle:30};

 // 确定性伪随机：同样的参数永远得到同样的姿态集合
 function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

 function poses(){
  const r=rng(20261101), list=[];
  const base=[0.35,0.9,0.15]; // 平均轴方向
  const bl=Math.hypot(...base); const b=base.map(v=>v/bl);
  // 构造与 b 垂直的两个基
  const tmp=Math.abs(b[0])<0.9?[1,0,0]:[0,1,0];
  let u=[b[1]*tmp[2]-b[2]*tmp[1], b[2]*tmp[0]-b[0]*tmp[2], b[0]*tmp[1]-b[1]*tmp[0]];
  const ul=Math.hypot(...u); u=u.map(v=>v/ul);
  let v=[b[1]*u[2]-b[2]*u[1], b[2]*u[0]-b[0]*u[2], b[0]*u[1]-b[1]*u[0]];
  for(let i=0;i<S.n;i++){
   const phi=r()*Math.PI*2;
   const half=S.spread*Math.PI/180;
   const tilt=Math.acos(1-(1-Math.cos(half))*r());   // 均匀落在锥内
   const ct=Math.cos(tilt), stl=Math.sin(tilt);
   const ax=[0,1,2].map(k=>ct*b[k]+stl*(Math.cos(phi)*u[k]+Math.sin(phi)*v[k]));
   const ang=S.angle*(0.75+0.5*r())*Math.PI/180;
   list.push(ax.map(x=>x*ang));   // ω = 轴 × 角
  }
  return list;
 }

 // 3×3 对称矩阵的 Jacobi 特征值
 function eig3(A){
  let a=A.map(r=>r.slice());
  for(let sweep=0;sweep<24;sweep++){
   for(const [p,q] of [[0,1],[0,2],[1,2]]){
    if(Math.abs(a[p][q])<1e-12) continue;
    const th=(a[q][q]-a[p][p])/(2*a[p][q]);
    const t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1));
    const c=1/Math.sqrt(t*t+1), s=t*c;
    for(let k=0;k<3;k++){
     const akp=a[k][p], akq=a[k][q];
     a[k][p]=c*akp-s*akq; a[k][q]=s*akp+c*akq;
    }
    for(let k=0;k<3;k++){
     const apk=a[p][k], aqk=a[q][k];
     a[p][k]=c*apk-s*aqk; a[q][k]=s*apk+c*aqk;
    }
   }
  }
  return [a[0][0],a[1][1],a[2][2]].sort((x,y)=>y-x);
 }

 function project(p,scale){
  const [x,y,z]=p;
  return [x*scale-0.55*z*scale, -(y*scale-0.34*z*scale)];
 }

 function draw(){
  const W=340,H=340,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  const cx=W/2, cy=H/2, s=112;

  // 参考轴
  const axes=[[1,0,0,'X'],[0,1,0,'Y'],[0,0,1,'Z']];
  g.strokeStyle='#e2eaf2'; g.lineWidth=1; g.font='11px ui-sans-serif,system-ui,sans-serif';
  g.fillStyle='#8aa0b3';
  for(const [x,y,z,lab] of axes){
   const [px,py]=project([x,y,z],s);
   g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+px,cy+py); g.stroke();
   g.fillText(lab, cx+px*1.08-4, cy+py*1.08+4);
  }

  const list=poses();
  // 归一化画出方向（长度按角度比例）
  const maxAng=Math.max(...list.map(w=>Math.hypot(...w)));
  g.lineWidth=2;
  for(const w of list){
   const L=Math.hypot(...w), dir=w.map(v=>v/(L||1)), len=0.28+0.55*(L/maxAng);
   const [px,py]=project(dir.map(v=>v*len),s);
   g.strokeStyle='rgba(176,89,47,.75)';
   g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+px,cy+py); g.stroke();
   g.fillStyle='#b0592f'; g.beginPath(); g.arc(cx+px,cy+py,2.6,0,7); g.fill();
  }

  // 条件数
  const M=CalibrationMath.rotationInformation(list);
  const [l1,l2,l3]=eig3(M);
  const cond=l3>1e-12?l1/l3:Infinity;
  const ratio=l1>0?l3/l1:0;
  read('lmin').textContent=Math.max(0,ratio).toFixed(4);
  read('info').textContent=Math.max(0,l3).toFixed(4);
  read('cond').textContent=isFinite(cond)?(cond>999?cond.toExponential(1):cond.toFixed(1)):'∞';
  const bad=ratio<0.01, warn=ratio<0.15;
  read('lmin').dataset.warn=String(bad);
  read('cond').dataset.warn=String(bad);

  out('n').textContent=S.n;
  out('spread').textContent=S.spread+'°';
  out('angle').textContent=S.angle+'°';
  st.dataset.warn=String(bad);
  st.textContent = bad
   ? '轴方向过于集中，局部旋转约束存在很弱的方向。完全共轴时，该方向不可观。'
   : (warn
     ? '主轴方向占优，最弱的方向只有最强方向的 '+ratio.toFixed(3)+'，结果对噪声敏感。'
     : '在这个简化模型中，最弱方向与最强方向之比 '+ratio.toFixed(3)+'；仍需结合信息量、测量噪声及完整手眼残差评估。');
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{ S[el.dataset.in]=Number(el.value); draw(); });
 });
 draw();root.dataset.ready='true';
})();

/* 时间偏移：一个做圆周运动的目标，戳差 Δt 造成的定位误差。 */
(function(){
 const root=document.querySelector('.timeoff-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={r:0.4,w:180,dt:10};

 function err(dtms){
  return CalibrationMath.circularErrorMm(S.r,S.w,dtms);
 }

 function draw(){
  const W=520,H=300,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  const padL=54,padR=16,padT=16,padB=34;
  const pw=W-padL-padR, ph=H-padT-padB;
  const maxT=50, maxE=Math.max(1,err(maxT));
  const X=t=>padL+(t+maxT)/(2*maxT)*pw;
  const Y=e=>padT+ph-Math.min(e,maxE)/maxE*ph;

  g.strokeStyle='#eef2f6'; g.lineWidth=1; g.font='11px ui-sans-serif,system-ui,sans-serif';
  g.fillStyle='#8aa0b3'; g.textAlign='right'; g.textBaseline='middle';
  for(let i=0;i<=4;i++){
   const e=maxE*i/4;
   g.beginPath(); g.moveTo(padL,Y(e)); g.lineTo(W-padR,Y(e)); g.stroke();
   g.fillText(e.toFixed(0),padL-8,Y(e));
  }
  g.textAlign='center'; g.textBaseline='top';
  for(const t of [-50,0,50]) g.fillText(t+' ms',X(t),H-padB+8);

  g.save(); g.beginPath(); g.rect(padL,padT,pw,ph); g.clip();
  g.strokeStyle='#176dae'; g.lineWidth=2.4; g.beginPath();
  for(let t=-maxT;t<=maxT;t+=0.5){
   const e=err(t);
   if(t===-maxT) g.moveTo(X(t),Y(e)); else g.lineTo(X(t),Y(e));
  }
  g.stroke();
  // 当前点
  const e0=err(S.dt);
  g.strokeStyle='rgba(176,89,47,.5)'; g.lineWidth=1.5; g.setLineDash([4,4]);
  g.beginPath(); g.moveTo(X(S.dt),padT); g.lineTo(X(S.dt),padT+ph); g.stroke();
  g.setLineDash([]);
  g.fillStyle='#b0592f'; g.beginPath(); g.arc(X(S.dt),Y(e0),4.5,0,7); g.fill();
  g.restore();

  out('r').textContent=S.r.toFixed(2)+' m';
  out('w').textContent=S.w+' °/s';
  out('dt').textContent=S.dt+' ms';
  read('err').textContent=e0.toFixed(1)+' mm';
  read('deg').textContent=(S.w*S.dt/1000).toFixed(1)+'°';
  // No universal accuracy threshold is implied by this geometric example.
  st.textContent='目标以 '+S.w+'°/s 绕半径 '+S.r.toFixed(2)+' m 转，'+Math.abs(S.dt)+' ms 的时间戳偏差对应 '
   +e0.toFixed(1)+' mm 的定位误差；对应圆周运动的转角为 '+(S.w*S.dt/1000).toFixed(1)+'°。';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{ S[el.dataset.in]=Number(el.value); draw(); });
 });
 draw();root.dataset.ready='true';
})();
