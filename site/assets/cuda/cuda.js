/* 分块 GEMM 的全局访存计数：naive O(N³) vs tiled O(N³/T)。 */
(function(){
 const root=document.querySelector('.cuda-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'), status=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]');
 const st={N:16,T:4,cur:0,timer:null};

 function counts(){
  const N=st.N,T=st.T;
  const naive=2*N*N*N;                 // 每个输出元素读 A 的一行、B 的一列
  const tiled=2*N*N*(N/T);             // 每个块面板被读 N/T 次
  return {naive,tiled,speedup:naive/tiled,tiles:(N/T)*(N/T)};
 }

 function draw(){
  const n=st.N/st.T;                    // 每边的 tile 数
  const dpr=Math.min(devicePixelRatio||1,2), w=canvas.clientWidth, h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const pad=22, size=Math.min(w,h)-pad*2, cell=size/n;
  const ox=(w-size)/2, oy=(h-size)/2;
  const ci=Math.floor(st.cur/n), cj=st.cur%n;

  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   const active=(i===ci&&j===cj);
   ctx.fillStyle=active?'#b0592f':'#ffffff';
   ctx.fillRect(ox+j*cell,oy+i*cell,cell,cell);
   ctx.strokeStyle=active?'#b0592f':'#dbe5ee';
   ctx.lineWidth=1; ctx.strokeRect(ox+j*cell+0.5,oy+i*cell+0.5,cell-1,cell-1);
  }
  ctx.strokeStyle='#19334d'; ctx.lineWidth=2; ctx.strokeRect(ox,oy,size,size);

  const c=counts();
  read('naive').textContent=c.naive.toLocaleString('en-US');
  read('tiled').textContent=c.tiled.toLocaleString('en-US');
  read('speed').textContent=c.speedup.toFixed(1)+'×';
  read('tile').textContent=c.tiles+' 个';
  root.querySelector('[data-bar=naive]').style.width='100%';
  root.querySelector('[data-bar=tiled]').style.width=Math.max(1.5,100/c.speedup)+'%';
  root.querySelector('[data-num=naive]').textContent=c.naive.toLocaleString('en-US');
  root.querySelector('[data-num=tiled]').textContent=c.tiled.toLocaleString('en-US');
  status.textContent='矩阵 '+st.N+'×'+st.N+'、块边长 '+st.T+'：全局读从 '+
   c.naive.toLocaleString('en-US')+' 次降到 '+c.tiled.toLocaleString('en-US')+' 次，'+
   c.speedup.toFixed(1)+' 倍。计算量一点没变，省下来的是重复读。';
 }

 function step(){
  const c=counts();
  st.cur=(st.cur+1)%c.tiles; draw();
 }
 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('change',()=>{
   const k=el.dataset.in;
   st[k]=Number(el.value); st.cur=0;
   if(st.T>st.N){ st.T=8; root.querySelector('[data-in=T]').value='8'; }
   draw();
  });
 });
 const btn=root.querySelector('[data-play]');
 btn.addEventListener('click',()=>{
  if(st.timer){ clearInterval(st.timer); st.timer=null; btn.textContent='播放'; }
  else { st.timer=setInterval(step,380); btn.textContent='暂停'; }
 });
 draw();root.dataset.ready='true';
})();

/* 在线 softmax：一次遍历同时维护 running max 与 running sum。 */
(function(){
 const root=document.querySelector('.softmax-lab');
 if(!root)return;
 const X=[0.5,1.2,2.0,-0.4,1.1,0.2];
 const body=root.querySelector('[data-rows]'), out=root.querySelector('[data-out]');
 const btnStep=root.querySelector('[data-step]'), btnPlay=root.querySelector('[data-play]'),
       btnReset=root.querySelector('[data-reset]'), status=root.querySelector('[data-status]');
 let i=0, m=-Infinity, l=0, timer=null;

 function reset(){
  i=0; m=-Infinity; l=0; body.innerHTML=''; out.textContent='—';
  status.textContent='点「单步」或「播放」，看 running max 与 running sum 怎么变化。';
  btnStep.disabled=false; btnPlay.textContent='播放';
  if(timer){clearInterval(timer);timer=null;}
 }

 function step(){
  if(i>=X.length) return;
  const x=X[i], mOld=m, first=(m===-Infinity);
  m=Math.max(m,x);
  const rescale=first?1:Math.exp(mOld-m);
  l=l*rescale+Math.exp(x-m);
  const note = first ? '初始化' : (rescale<1 ? '重标定 ×'+rescale.toFixed(3) : '无需重标定');
  const cells=[String(i+1), x.toFixed(1), m.toFixed(1), l.toFixed(4), note];
  const tr=document.createElement('tr');
  cells.forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.appendChild(td);});
  if(i===X.length-1) tr.classList.add('last');
  body.appendChild(tr);
  i++;
  if(i===X.length) finish();
 }

 function finish(){
  out.textContent=X.map(x=>(Math.exp(x-m)/l).toFixed(3)).join('  ');
  status.textContent='得到 m = '+m.toFixed(1)+'、l = '+l.toFixed(4)+'，第二趟用 exp(x−m)/l 写出结果。'
   +'结果与两趟算法逐位一致，但搬运次数从 5 次降到 3 次。';
  btnStep.disabled=true;
  if(timer){clearInterval(timer);timer=null;btnPlay.textContent='播放';}
 }

 btnStep.addEventListener('click',step);
 btnPlay.addEventListener('click',()=>{
  if(timer){clearInterval(timer);timer=null;btnPlay.textContent='播放';return;}
  if(i>=X.length) reset();
  btnPlay.textContent='暂停';
  timer=setInterval(()=>{ if(i>=X.length){clearInterval(timer);timer=null;btnPlay.textContent='播放';return;} step(); },900);
 });
 btnReset.addEventListener('click',reset);
 reset();
 root.dataset.ready='true';
})();
