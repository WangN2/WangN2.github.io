/* 投影沙盘：同一组 3D 角点，用真值参数和你的参数各投一次，看偏差怎么长出来。 */
(function(){
 const root=document.querySelector('.cc-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');

 const TRUE={fx:600,fy:600,cx:640,cy:360,k1:-0.28,k2:0.09};
 const S={...TRUE};
 const W=1280, H=720;            // 虚拟传感器分辨率

 // 一块 6x4 的板，倾斜 + 旋转，放在 1.5 m 外
 const BOARD=(()=>{
  const pts=[]; const th=25*Math.PI/180, ph=15*Math.PI/180;
  const cx0=-0.16, cy0=-0.09, Z=0.7;
  for(let r=0;r<4;r++) for(let c=0;c<6;c++){
   const u=(c-2.5)*0.16, v=(r-1.5)*0.16;
   // 绕 y 轴转 th，再绕 x 轴转 ph
   let x=u, y=v, z=0;
   let x1=x*Math.cos(th)+z*Math.sin(th), z1=-x*Math.sin(th)+z*Math.cos(th);
   let y1=y*Math.cos(ph)-z1*Math.sin(ph), z2=y*Math.sin(ph)+z1*Math.cos(ph);
   pts.push([x1+cx0, y1+cy0, z2+Z]);
  }
  return pts;
 })();

 function project(P,K){
  const [X,Y,Z]=P;
  const x=X/Z, y=Y/Z;
  const r2=x*x+y*y, rad=1+K.k1*r2+K.k2*r2*r2;
  const xd=x*rad, yd=y*rad;
  return [K.fx*xd+K.cx, K.fy*yd+K.cy];
 }

 const CW=520, CH=300, dpr=Math.min(devicePixelRatio||1,2);
 const sc=Math.min(CW/W, CH/H);
 const ox=(CW-W*sc)/2, oy=(CH-H*sc)/2;

 function draw(){
  cv.width=CW*dpr; cv.height=CH*dpr; cv.style.width=CW+'px'; cv.style.height=CH+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,CW,CH);

  // 画幅框
  g.fillStyle='#f7f9fc'; g.fillRect(ox,oy,W*sc,H*sc);
  g.strokeStyle='#dbe4ec'; g.lineWidth=1; g.strokeRect(ox,oy,W*sc,H*sc);
  // 十字准线（主点参考）
  const PX=u=>ox+u*sc, PY=v=>oy+v*sc;
  g.strokeStyle='#eef2f6';
  g.beginPath(); g.moveTo(PX(W/2),oy); g.lineTo(PX(W/2),oy+H*sc); g.stroke();
  g.beginPath(); g.moveTo(ox,PY(H/2)); g.lineTo(ox+W*sc,PY(H/2)); g.stroke();

  const truth=BOARD.map(p=>project(p,TRUE));
  const guess=BOARD.map(p=>project(p,S));

  // 真值：连成网格
  g.strokeStyle='rgba(23,109,174,.35)'; g.lineWidth=1.2;
  for(let r=0;r<4;r++){ g.beginPath();
   for(let c=0;c<6;c++){ const i=r*6+c; const q=truth[i];
    c?g.lineTo(PX(q[0]),PY(q[1])):g.moveTo(PX(q[0]),PY(q[1])); } g.stroke(); }
  for(let c=0;c<6;c++){ g.beginPath();
   for(let r=0;r<4;r++){ const i=r*6+c; const q=truth[i];
    r?g.lineTo(PX(q[0]),PY(q[1])):g.moveTo(PX(q[0]),PY(q[1])); } g.stroke(); }

  // 误差连线
  let maxe=0, sum=0;
  for(let i=0;i<truth.length;i++){
   const d=Math.hypot(guess[i][0]-truth[i][0], guess[i][1]-truth[i][1]);
   maxe=Math.max(maxe,d); sum+=d;
   g.strokeStyle='rgba(176,89,47,.55)'; g.lineWidth=1.2;
   g.beginPath(); g.moveTo(PX(truth[i][0]),PY(truth[i][1])); g.lineTo(PX(guess[i][0]),PY(guess[i][1])); g.stroke();
  }
  // 你的模型
  g.fillStyle='#b0592f';
  for(const q of guess){ g.beginPath(); g.arc(PX(q[0]),PY(q[1]),3.2,0,7); g.fill(); }
  // 真值点
  g.fillStyle='#176dae';
  for(const q of truth){ g.beginPath(); g.arc(PX(q[0]),PY(q[1]),2.6,0,7); g.fill(); }

  const mean=sum/truth.length;
  const mmPerPx=700/S.fx;           // 板面在 0.7 m，按当前 fx 算毫米每像素
  read('max').textContent=maxe.toFixed(1)+' px';
  read('mean').textContent=mean.toFixed(1)+' px';
  read('mm').textContent=(maxe*mmPerPx).toFixed(1)+' mm';
  read('mm').dataset.warn=String(maxe*mmPerPx>20);

  const d=[];
  if(Math.abs(S.fx-TRUE.fx)>1) d.push('fx 偏 '+(S.fx-TRUE.fx).toFixed(0));
  if(Math.abs(S.fy-TRUE.fy)>1) d.push('fy 偏 '+(S.fy-TRUE.fy).toFixed(0));
  if(Math.abs(S.cx-TRUE.cx)>1) d.push('cx 偏 '+(S.cx-TRUE.cx).toFixed(0)+' px');
  if(Math.abs(S.cy-TRUE.cy)>1) d.push('cy 偏 '+(S.cy-TRUE.cy).toFixed(0)+' px');
  if(Math.abs(S.k1-TRUE.k1)>0.005) d.push('k1 偏 '+(S.k1-TRUE.k1).toFixed(2));
  if(Math.abs(S.k2-TRUE.k2)>0.005) d.push('k2 偏 '+(S.k2-TRUE.k2).toFixed(2));

  st.dataset.warn=String(maxe>5);
  st.textContent = d.length===0
   ? '参数与真值一致：蓝点与橙点重合，这就是「重投影误差为零」的样子。拖动任一滑块，看差距怎么长出来。'
   : '当前参数下，同一个角点的预测位置比真实检测位置最多偏 '+maxe.toFixed(1)+
     ' px；在 0.7 m 处约等于 '+ (maxe*mmPerPx).toFixed(1) +' mm。（'+d.join('，')+'）';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{ S[el.dataset.in]=Number(el.value); out(el.dataset.in).textContent=Number(el.value).toFixed(el.dataset.in[0]==='k'?2:0); draw(); });
 });
 root.querySelector('[data-reset]').addEventListener('click',()=>{
  Object.assign(S,TRUE);
  root.querySelectorAll('[data-in]').forEach(el=>{ el.value=S[el.dataset.in]; out(el.dataset.in).textContent=Number(el.value).toFixed(el.dataset.in[0]==='k'?2:0); });
  draw();
 });
 root.querySelector('[data-shift]').addEventListener('click',()=>{
  // 一个真实的失败模式：焦距标小了，主点又偏了几像素
  S.fx=TRUE.fx*0.94; S.fy=TRUE.fy*0.94; S.cx=TRUE.cx+6; S.cy=TRUE.cy-4;
  root.querySelectorAll('[data-in]').forEach(el=>{ el.value=S[el.dataset.in]; out(el.dataset.in).textContent=Number(el.value).toFixed(el.dataset.in[0]==='k'?2:0); });
  draw();
 });
 root.querySelectorAll('[data-in]').forEach(el=>out(el.dataset.in).textContent=Number(el.value).toFixed(el.dataset.in[0]==='k'?2:0));
 draw(); root.dataset.ready='true';
})();
