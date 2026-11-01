/* 集成的不确定性：每个成员用自助采样拟合一个三次多项式，真算。 */
(function(){
 const root=document.querySelector('.ens-fit-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');

 const S={N:5,noise:0.14,x1:2.0};      // 成员数 / 噪声 / 数据右边界
 const X0=-1.2, NPT=12, DEG=3;
 let seed=12345;
 function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 function gauss(){let u=0,v=0;while(u===0)u=rnd();while(v===0)v=rnd();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
 function truth(x){return Math.sin(1.5*x)+0.3*x;}

 function makeData(){
  const pts=[];
  for(let i=0;i<NPT;i++){
   const x=X0+(S.x1-X0)*i/(NPT-1);
   pts.push([x, truth(x)+S.noise*gauss()]);
  }
  return pts;
}
 function fit(xs,ys){
  const n=DEG+1;
  const A=Array.from({length:n},()=>new Array(n).fill(0)), b=new Array(n).fill(0);
  for(let k=0;k<xs.length;k++){
   const p=[]; let v=1; for(let i=0;i<n;i++){p.push(v); v*=xs[k];}
   for(let i=0;i<n;i++){b[i]+=p[i]*ys[k]; for(let j=0;j<n;j++)A[i][j]+=p[i]*p[j];}
  }
  const M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){
   let p=c; for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
   const t=M[c]; M[c]=M[p]; M[p]=t;
   const d=M[c][c]||1e-9;
   for(let r=0;r<n;r++){ if(r===c)continue; const f=M[r][c]/d; if(!f)continue;
    for(let k=c;k<=n;k++) M[r][k]-=f*M[c][k]; }
  }
  return M.map((r,i)=>r[n]/(r[i]||1e-9));
}
 function evalp(c,x){let v=0;for(let i=c.length-1;i>=0;i--)v=v*x+c[i];return v;}

 const W=560,H=380,dpr=Math.min(devicePixelRatio||1,2);
 let data=null;

 function draw(){
  seed=987654;                    // 每次重画用同一份数据，滑杆变化时曲线不跳
  data=makeData();
  const members=[];
  for(let m=0;m<S.N;m++){
   const xs=[],ys=[];
   for(let k=0;k<NPT;k++){const i=Math.floor(rnd()*NPT); xs.push(data[i][0]); ys.push(data[i][1]);}
   members.push(fit(xs,ys));
  }

  const XA=-3.2, XB=4.2, YA=-2.6, YB=3.4;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const padL=40,padR=14,padT=14,padB=28;
  const pw=W-padL-padR, ph=H-padT-padB;
  const X=x=>padL+(x-XA)/(XB-XA)*pw, Y=y=>padT+ph-(y-YA)/(YB-YA)*ph;

  // 数据覆盖区间
  g.fillStyle='#f2f7fc'; g.fillRect(X(X0),padT,X(S.x1)-X(X0),ph);
  g.strokeStyle='#eef2f6'; g.lineWidth=1;
  for(let y=Math.ceil(YA);y<=YB;y++){g.beginPath();g.moveTo(padL,Y(y));g.lineTo(W-padR,Y(y));g.stroke();}
  g.fillStyle='#8aa0b3'; g.font='11px ui-sans-serif,system-ui,sans-serif'; g.textAlign='right'; g.textBaseline='middle';
  for(let y=Math.ceil(YA);y<=YB;y+=1) g.fillText(String(y),padL-6,Y(y));

  // 认知不确定性带 ±2σ（成员间）
  const grid=[]; for(let i=0;i<=200;i++) grid.push(XA+(XB-XA)*i/200);
  const mean=[],epl=[];
  for(const x of grid){
   const vs=members.map(c=>evalp(c,x));
   const mu=vs.reduce((a,b)=>a+b,0)/vs.length;
   const sd=Math.sqrt(vs.reduce((a,b)=>a+(b-mu)**2,0)/vs.length);
   mean.push(mu); epl.push(sd);
  }
  g.save(); g.beginPath(); g.rect(padL,padT,pw,ph); g.clip();
  g.fillStyle='rgba(176,89,47,.15)';
  g.beginPath();
  grid.forEach((x,i)=>i?g.lineTo(X(x),Y(mean[i]+2*epl[i])):g.moveTo(X(x),Y(mean[i]+2*epl[i])));
  for(let i=grid.length-1;i>=0;i--) g.lineTo(X(grid[i]),Y(mean[i]-2*epl[i]));
  g.closePath(); g.fill();

  // 成员曲线
  g.strokeStyle='rgba(23,109,174,.45)'; g.lineWidth=1.2;
  for(const c of members){
   g.beginPath();
   grid.forEach((x,i)=>i?g.lineTo(X(x),Y(evalp(c,x))):g.moveTo(X(x),Y(evalp(c,x))));
   g.stroke();
  }
  // 均值
  g.strokeStyle='#176dae'; g.lineWidth=2.6; g.beginPath();
  grid.forEach((x,i)=>i?g.lineTo(X(x),Y(mean[i])):g.moveTo(X(x),Y(mean[i])));
  g.stroke();
  // 真值
  g.strokeStyle='#2f7d6a'; g.lineWidth=2; g.setLineDash([5,4]); g.beginPath();
  grid.forEach((x,i)=>i?g.lineTo(X(x),Y(truth(x))):g.moveTo(X(x),Y(truth(x))));
  g.stroke(); g.setLineDash([]);
  g.restore();
  // 样本点
  g.fillStyle='#19334d';
  for(const [x,y] of data){g.beginPath();g.arc(X(x),Y(y),3,0,7);g.fill();}

  // 读数：区间内 / 外的平均分歧
  const inside=epl.filter((_,i)=>grid[i]>=X0&&grid[i]<=S.x1);
  const outside=epl.filter((_,i)=>grid[i]>S.x1+0.3||grid[i]<X0-0.3);
  const mi=inside.reduce((a,b)=>a+b,0)/inside.length;
  const mo=outside.reduce((a,b)=>a+b,0)/outside.length;
  read('in').textContent=mi.toFixed(3);
  read('out').textContent=mo.toFixed(3);
  read('ratio').textContent=(mo/Math.max(mi,1e-6)).toFixed(1)+'×';
  read('ratio').dataset.warn=String(mo/Math.max(mi,1e-6)>4);
  out('N').textContent=S.N;
  out('noise').textContent=S.noise.toFixed(2);
  out('x1').textContent=S.x1.toFixed(1);
  st.textContent='浅蓝区域是数据覆盖范围。区间内成员几乎重合（分歧 '+mi.toFixed(3)+
   '），区间外按各自的外推斜率散开（分歧 '+mo.toFixed(3)+'）。这就是规划器该避开的地方。';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{S[el.dataset.in]=Number(el.value);draw();});
 });
 draw();root.dataset.ready='true';
})();

/* MoE 路由：门控权重与 top-k 激活。 */
(function(){
 const root=document.querySelector('.moe-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const EX=[[0.22,0.24],[0.52,0.16],[0.80,0.30],[0.18,0.58],[0.50,0.50],[0.82,0.62],[0.32,0.82],[0.70,0.86]];
 const S={k:2,T:0.06,q:[0.5,0.5]};

 const W=440,H=470,dpr=Math.min(devicePixelRatio||1,2);
 function draw(){
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const FIELD=300, pad=16, s=FIELD-2*pad;
  const ox=(W-s)/2, PX=p=>ox+p[0]*s, PY=p=>pad+p[1]*s;

  g.strokeStyle='#eef2f6'; g.lineWidth=1;
  for(let i=0;i<=4;i++){const tx=ox+s*i/4, ty=pad+s*i/4;
   g.beginPath();g.moveTo(tx,pad);g.lineTo(tx,pad+s);g.moveTo(ox,ty);g.lineTo(ox+s,ty);g.stroke();}

  const d2=EX.map(e=>(S.q[0]-e[0])**2+(S.q[1]-e[1])**2);
  const raw=d2.map(v=>Math.exp(-v/S.T));
  const Z=raw.reduce((a,b)=>a+b,0);
  const w=raw.map(v=>v/Z);
  const order=[...w.keys()].sort((a,b)=>w[b]-w[a]);
  const on=new Set(order.slice(0,S.k));
  // top-k 重新归一化
  const zk=order.slice(0,S.k).reduce((a,i)=>a+w[i],0)||1;
  const wn=w.map((v,i)=>on.has(i)?v/zk:0);

  order.slice(0,S.k).forEach(i=>{
   g.strokeStyle='rgba(47,125,106,.5)'; g.lineWidth=3;
   g.beginPath(); g.moveTo(PX(S.q),PY(S.q)); g.lineTo(PX(EX[i]),PY(EX[i])); g.stroke();
  });
  EX.forEach((e,i)=>{
   const active=on.has(i);
   g.fillStyle=active?'#2f7d6a':'#c9d3dc';
   g.beginPath(); g.arc(PX(e),PY(e),active?11:8,0,7); g.fill();
   if(active){g.strokeStyle='rgba(47,125,106,.35)';g.lineWidth=6;
    g.beginPath();g.arc(PX(e),PY(e),11,0,7);g.stroke();}
   g.fillStyle='#5d7083'; g.font='11px ui-sans-serif,system-ui,sans-serif'; g.textAlign='center';
   g.fillText('E'+(i+1),PX(e),PY(e)-16);
  });
  g.fillStyle='#19334d'; g.beginPath(); g.arc(PX(S.q),PY(S.q),6,0,7); g.fill();
  g.strokeStyle='#19334d'; g.lineWidth=2; g.beginPath(); g.arc(PX(S.q),PY(S.q),12,0,7); g.stroke();

  // 门控条形（放在场地下方，整宽）
  const bx=pad, bw=W-2*pad-46, top=FIELD+18;
  g.font='11px ui-sans-serif,system-ui,sans-serif'; g.textAlign='left'; g.textBaseline='middle';
  EX.forEach((e,i)=>{
   const y=top+i*15;
   g.fillStyle='#eef2f6'; g.fillRect(bx+26,y,bw,9);
   g.fillStyle=on.has(i)?'#2f7d6a':'#c6d2dc';
   g.fillRect(bx+26,y,Math.max(1,bw*w[i]),9);
   g.fillStyle=on.has(i)?'#19334d':'#8aa0b3'; g.fillText('E'+(i+1),bx,y+5);
   g.fillStyle='#8aa0b3'; g.textAlign='right';
   g.fillText((w[i]*100).toFixed(0)+'%',bx+26+bw+40,y+5); g.textAlign='left';
  });

  read('k').textContent=S.k+' / '+EX.length;
  read('cost').textContent=Math.round(S.k/EX.length*100)+'%';
  out('k').textContent=S.k;
  out('T').textContent=S.T.toFixed(2);
  const parts=order.slice(0,S.k).map(i=>'E'+(i+1)+' '+wn[i].toFixed(2));
  st.textContent='条形是门控的原始概率（和为 100%）；被选中的 '+S.k+' 个再归一化成 '+parts.join('、')+
   '，其余 '+(EX.length-S.k)+' 个专家完全不参与计算。温度越低越接近硬路由，越高越接近平均。';
 }

 let drag=false;
 function pick(ev){
  const r=cv.getBoundingClientRect();
  const FIELD=300, pad=16, s=FIELD-2*pad;
  S.q=[Math.min(1,Math.max(0,(ev.clientX-r.left-pad)/s)), Math.min(1,Math.max(0,(ev.clientY-r.top-pad)/s))];
  draw();
 }
 cv.addEventListener('pointerdown',e=>{drag=true;cv.setPointerCapture(e.pointerId);pick(e);});
 cv.addEventListener('pointermove',e=>{if(drag)pick(e);});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>cv.addEventListener(t,()=>drag=false));
 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{S[el.dataset.in]=Number(el.value);draw();});
 });
 draw();root.dataset.ready='true';
})();
