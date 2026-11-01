/* CEM 在二维目标上的迭代过程：采样 → 择优 → 重估分布。 */
(function(){
 const root=document.querySelector('.cem-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={n:60,elite:0.15,alpha:0.9};
 const START={m:[-1.25,-0.95],v:[0.9,0.9]};
 let mean=START.m.slice(), varr=START.v.slice(), iter=0, path=[], best=null, last=null, timer=null;

 // 两个高斯峰：右下更大，左上较小。用来演示 CEM 是局部搜索
 function f(x,y){
  const d1=((x-1.15)**2+(y-1.05)**2)/1.5;
  const d2=((x+1.55)**2+(y+1.15)**2)/1.1;
  return 1.7*Math.exp(-d1)+0.95*Math.exp(-d2)+0.06*Math.sin(3.1*x)*Math.cos(2.7*y);
 }
 function gauss(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

 const W=440,H=440,dpr=Math.min(devicePixelRatio||1,2);
 let bg=null;
 function buildBG(){
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d'), img=g.createImageData(W,H);
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
   const x=-3+px/W*6, y=3-py/H*6;
   let t=Math.max(0,Math.min(1,(f(x,y)+0.08)/1.8));
   t=Math.pow(t,0.55);                       // 提亮中段，让两个峰都看得出来
   const r=247-(247-25)*t, gg=250-(250-51)*t, b=253-(253-77)*t;
   const i=(py*W+px)*4; img.data[i]=r; img.data[i+1]=gg; img.data[i+2]=b; img.data[i+3]=255;
  }
  g.putImageData(img,0,0); bg=c;
 }
 const X=x=>(x+3)/6*W, Y=y=>(3-y)/6*H;

 function reset(){
  mean=START.m.slice(); varr=START.v.slice(); iter=0; path=[mean.slice()]; best=null; last=null;
  if(timer){clearInterval(timer);timer=null;}
  root.querySelector('[data-next]').disabled=false;
  draw();
 }

 function step(){
  const n=S.n, k=Math.max(1,Math.round(n*S.elite));
  const pts=[];
  for(let i=0;i<n;i++){
   const x=mean[0]+Math.sqrt(varr[0])*gauss();
   const y=mean[1]+Math.sqrt(varr[1])*gauss();
   pts.push({x,y,r:f(x,y)});
  }
  pts.sort((a,b)=>b.r-a.r);
  const elites=pts.slice(0,k);
  if(!best||elites[0].r>best.r) best={...elites[0]};
  const nm=[0,0], nv=[0,0];
  for(const e of elites){nm[0]+=e.x/k; nm[1]+=e.y/k;}
  for(const e of elites){nv[0]+=(e.x-nm[0])**2/k; nv[1]+=(e.y-nm[1])**2/k;}
  mean=[(1-S.alpha)*mean[0]+S.alpha*nm[0], (1-S.alpha)*mean[1]+S.alpha*nm[1]];
  varr=[(1-S.alpha)*varr[0]+S.alpha*Math.max(nv[0],1e-4), (1-S.alpha)*varr[1]+S.alpha*Math.max(nv[1],1e-4)];
  path.push(mean.slice());
  last=pts; iter++;
  draw();
  if(iter>=8){ root.querySelector('[data-next]').disabled=true; if(timer){clearInterval(timer);timer=null;} }
 }

 function draw(){
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  if(bg) g.drawImage(bg,0,0);

  // 当前分布的 1σ / 2σ 椭圆
  const sx=Math.sqrt(varr[0])/6*W, sy=Math.sqrt(varr[1])/6*H;
  g.strokeStyle='rgba(23,109,174,.55)'; g.lineWidth=1.6;
  for(const k of [1,2]){
   g.beginPath(); g.ellipse(X(mean[0]),Y(mean[1]),sx*k,sy*k,0,0,7); g.stroke();
  }

  // 采样点
  if(last){
   const k=Math.max(1,Math.round(S.n*S.elite));
   last.forEach((p,i)=>{
    const elite=i<k;
    g.fillStyle=elite?'#b0592f':'rgba(93,112,131,.45)';
    g.beginPath(); g.arc(X(p.x),Y(p.y),elite?3.4:2.2,0,7); g.fill();
   });
  }

  // 均值轨迹
  if(path.length>1){
   g.strokeStyle='#176dae'; g.lineWidth=2.4; g.beginPath();
   path.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));
   g.stroke();
  }
  // 当前均值
  g.fillStyle='#176dae'; g.beginPath(); g.arc(X(mean[0]),Y(mean[1]),5,0,7); g.fill();
  // 历史最优
  if(best){
   g.strokeStyle='#19334d'; g.lineWidth=2;
   const bx=X(best.x), by=Y(best.y);
   g.beginPath(); g.moveTo(bx-7,by); g.lineTo(bx+7,by); g.moveTo(bx,by-7); g.lineTo(bx,by+7); g.stroke();
  }

  read('iter').textContent=iter;
  read('cur').textContent=best?best.r.toFixed(3):'—';
  read('pos').textContent=mean.map(v=>v.toFixed(2)).join(', ');
  out('n').textContent=S.n;
  out('elite').textContent=Math.round(S.elite*100)+'%';
  out('alpha').textContent=S.alpha.toFixed(2);
  st.textContent = iter===0
   ? '蓝点是均值，椭圆是当前采样分布。每步采样、择优、用精英重估分布。'
   : '第 '+iter+' 轮：分布向高分区域收缩。注意它只会朝当前所在的峰移动——CEM 是局部搜索，不保证找到全局最优。';
 }

 root.querySelector('[data-next]').addEventListener('click',step);
 root.querySelector('[data-reset]').addEventListener('click',reset);
 root.querySelector('[data-play]').addEventListener('click',e=>{
  if(timer){clearInterval(timer);timer=null;e.target.textContent='自动';return;}
  if(iter>=8) reset();
  e.target.textContent='暂停';
  timer=setInterval(()=>{ if(iter>=8){clearInterval(timer);timer=null;e.target.textContent='自动';return;} step(); },700);
 });
 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{S[el.dataset.in]=Number(el.value);draw();});
 });
 buildBG(); reset(); root.dataset.ready='true';
})();
