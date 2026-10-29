/* 条件数怎么拖慢收敛：陡方向一步归零，平方向按 (1-1/κ²) 慢慢衰减。
 * 曲线只画前 14 步；需要多少步到 1% 用解析式子算，不截断。 */
(function(){
 const root=document.querySelector('.svd-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'), status=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const st={kappa:12}, STEPS=14, X0=0.9;

 function series(k){
  const a2=1/(k*k), keep=1-a2;      // 平方向的每步保留比例
  const s1=[], s2=[];
  let x1=X0, x2=X0;
  for(let i=0;i<=STEPS;i++){
   s1.push(x1); s2.push(x2);
   x1=x1*(1-1);                     // 陡方向：lr = 1/a1，一步归零
   x2=x2*keep;
  }
  const target=0.01;
  const need=Math.ceil(Math.log(target/X0)/Math.log(keep));
  return {s1,s2,need,keep};
 }

 function draw(){
  const r=series(st.kappa);
  const dpr=Math.min(devicePixelRatio||1,2), w=canvas.clientWidth, h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const padL=54,padR=34,padT=16,padB=30;
  const pw=w-padL-padR, ph=h-padT-padB;
  const X=i=>padL+(i/STEPS)*pw, Y=v=>padT+ph-(v/X0)*ph;

  // 网格与坐标
  ctx.strokeStyle='#eef2f6';ctx.lineWidth=1;ctx.font='11px ui-sans-serif,system-ui,sans-serif';
  ctx.fillStyle='#8aa0b3';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let g=0;g<=1.0001;g+=0.25){
   ctx.beginPath();ctx.moveTo(padL,Y(g*X0));ctx.lineTo(w-padR,Y(g*X0));ctx.stroke();
   ctx.fillText((g*X0).toFixed(2),padL-8,Y(g*X0));
  }
  ctx.textAlign='center';ctx.textBaseline='top';
  for(let i=0;i<=STEPS;i+=2) ctx.fillText(String(i),X(i),h-padB+8);

  const line=(arr,color,width,dash)=>{
   ctx.save(); if(dash)ctx.setLineDash(dash);
   ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';
   ctx.beginPath();
   arr.forEach((v,i)=>i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)));
   ctx.stroke();ctx.restore();
  };
  line(r.s2,'#b0592f',2.2);
  line(r.s1,'#176dae',2.2);

  ctx.fillStyle='#b0592f';ctx.beginPath();ctx.arc(X(STEPS),Y(r.s2[STEPS]),3.2,0,7);ctx.fill();
  ctx.fillStyle='#176dae';ctx.beginPath();ctx.arc(X(1),Y(0),3.2,0,7);ctx.fill();

  out('kappa').textContent='κ = '+st.kappa;
  read('cond').textContent=(st.kappa*st.kappa).toFixed(0)+' : 1';
  read('steps').textContent=r.need.toLocaleString('en-US')+' 步';
  read('muon').textContent='1 步';
  status.textContent='曲率比 '+(st.kappa*st.kappa).toFixed(0)+' 比 1：陡方向第 1 步就到零（蓝），平方向每步只缩 '+
   ((1-r.keep)*100).toFixed(2)+'%，要 '+(r.need).toLocaleString('en-US')+' 步才降到 1%（橙）。图里只画了前 14 步。';
 }

 root.querySelector('[data-in=kappa]').addEventListener('input',e=>{st.kappa=Number(e.target.value);draw();});
 let raf=null;
 const resize=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=null;draw();});};
 if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize',resize);
 draw();root.dataset.ready='true';
})();
