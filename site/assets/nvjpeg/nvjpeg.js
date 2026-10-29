/* 三条流水线的时间线：同样的总工作量，串行与重叠的差别。
 * 模型：每张图必须依次经过 CPU 熵解码 H、PCIe 拷贝 T、GPU 反变换 D，
 * 每个资源一次只能服务一张图。这是 nvJPEG 分阶段 API 存在的全部理由。 */
(function(){
 const root=document.querySelector('.pipe-lab');
 if(!root)return;
 const canvas=root.querySelector('[data-canvas]'), status=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const N=6, H=1.0, T=0.5;
 const st={mode:'pipe',gpu:1.5};

 function schedule(overlap){
  let freeCPU=0,freeT=0,freeD=0,rows=[];
  for(let i=0;i<N;i++){
   let sH,eH,sT,eT,sD,eD;
   if(overlap){
    sH=freeCPU; eH=sH+H;
    sT=Math.max(eH,freeT); eT=sT+T;
    sD=Math.max(eT,freeD); eD=sD+st.gpu;
   }else{
    sH=(i===0?0:rows[i-1].eD); eH=sH+H;
    sT=eH; eT=sT+T;
    sD=eT; eD=sD+st.gpu;
   }
   freeCPU=eH; freeT=eT; freeD=eD;
   rows.push({sH,eH,sT,eT,sD,eD,eD_max:eD});
  }
  const total=rows[rows.length-1].eD;
  const busy={cpu:rows.reduce((a,r)=>a+(r.eH-r.sH),0),
              t:rows.reduce((a,r)=>a+(r.eT-r.sT),0),
              d:rows.reduce((a,r)=>a+(r.eD-r.sD),0)};
  return {rows,total,busy};
 }
 const serialTotal=N*(H+T+st.gpu), pipeTotal=H+T+st.gpu+ (N-1)*Math.max(H,T,st.gpu);

 function draw(){
  const r=schedule(st.mode==='pipe');
  const dpr=Math.min(devicePixelRatio||1,2), w=canvas.clientWidth, h=canvas.clientHeight;
  canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const padL=46,padR=12,padT=14,padB=24;
  const plotW=w-padL-padR, laneH=(h-padT-padB)/3;
  const tMax=Math.max(r.total, serialTotal)*1.02;
  const X=t=>padL+(t/tMax)*plotW;

  const lanes=[['CPU','#176dae',r.rows.map(x=>[x.sH,x.eH])],
               ['PCIe','#9db6cb',r.rows.map(x=>[x.sT,x.eT])],
               ['GPU','#19334d',r.rows.map(x=>[x.sD,x.eD])]];

  ctx.font='11px ui-sans-serif,system-ui,sans-serif';
  lanes.forEach((lane,li)=>{
   const y=padT+li*laneH;
   ctx.fillStyle='#5d7083';ctx.textAlign='right';ctx.textBaseline='middle';
   ctx.fillText(lane[0],padL-10,y+laneH/2);
   ctx.strokeStyle='#eef2f6';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(padL,y+laneH-1);ctx.lineTo(w-padR,y+laneH-1);ctx.stroke();
   lane[2].forEach(([a,b],k)=>{
    const x=X(a),ww=Math.max(1.5,X(b)-X(a));
    ctx.fillStyle=lane[1];
    ctx.globalAlpha=k%2===0?1:.78;
    ctx.fillRect(x,y+laneH*0.22,ww,laneH*0.56);
   });
   ctx.globalAlpha=1;
  });

  ctx.fillStyle='#8aa0b3';ctx.textAlign='center';ctx.textBaseline='top';
  for(let t=0;t<=tMax;t+=Math.max(1,Math.round(tMax/8))){
   ctx.fillText(t.toFixed(0),X(t),h-padB+6);
  }

  const speedup=(serialTotal/r.total);
  read('total').textContent=r.total.toFixed(1)+' 单位';
  read('serial').textContent=serialTotal.toFixed(1)+' 单位';
  read('speed').textContent=speedup.toFixed(2)+'×';
  out('gpu').textContent=st.gpu.toFixed(1);

  const bottleneck = st.gpu>H?'GPU 反变换':(H>st.gpu?'CPU 熵解码':'两者持平');
  status.textContent = st.mode==='pipe'
   ? '重叠之后，总时间由最慢的那一段决定（现在是「'+bottleneck+'」）。把 GPU 时间拉长，看瓶颈怎么转移。'
   : '串行：每张图都要等前三段都做完，下一张才开始。三段里再快，也没有任何重叠。';
 }

 root.querySelectorAll('[data-mode]').forEach(b=>{
  b.addEventListener('click',()=>{
   st.mode=b.dataset.mode;
   root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
   draw();
  });
 });
 root.querySelector('[data-in=gpu]').addEventListener('input',e=>{st.gpu=Number(e.target.value);draw();});
 let raf=null;
 const resize=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=null;draw();});};
 if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize',resize);
 draw();root.dataset.ready='true';
})();
