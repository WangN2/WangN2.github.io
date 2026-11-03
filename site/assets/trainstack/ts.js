/* 四本账：算力、显存、通信、可靠性。数值按公开算力与常见口径估算。 */
(function(){
 const root=document.querySelector('.ts-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={P:70,T:4,N:128,BW:'ib'};   // 参数量(B) / 每步 token(M) / 卡数 / 互连

 const PEAK=312e12;      // A100 bf16 dense = 312 TFLOPS
 const MFU=0.40;         // 训练良好时的典型值
 const BW={'nvlink':300e9,'ib':50e9};

 function calc(){
  const P=S.P*1e9, T=S.T*1e6, N=S.N;
  const flops=6*P*T;                        // 前向 2 + 反向 4
  const tCompute=flops/(N*PEAK*MFU);
  const bytesPerParam=16;                   // 权重2+梯度2+主副本4+AdamW 8
  const statePerGpu=bytesPerParam*P/N/1e9;   // GB
  // 环形 all-reduce：每张卡搬运 2(N-1)/N 倍梯度，走自己的链路带宽。
  // 所以通信时间几乎不随卡数下降——这正是大规模训练通信占比上升的原因。
  const comm=2*(N-1)/N*(2*P);               // bf16 梯度，2 字节
  const tComm=comm/BW[S.BW];
  return {flops,tCompute,statePerGpu,comm,tComm,ratio:tComm/tCompute};
 }

 function draw(){
  const r=calc();
  const W=470,H=250,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);

  const padL=118,padR=24,padT=30,rowH=52;
  const maxT=Math.max(r.tCompute,r.tComm);
  const rows=[['计算 6·P·T',r.tCompute,'#176dae'],['通信 all-reduce',r.tComm,'#b0592f']];
  g.font='13px ui-sans-serif,system-ui,sans-serif'; g.textBaseline='middle';
  rows.forEach((row,i)=>{
   const y=padT+i*rowH, label=row[0], v=row[1], col=row[2];
   g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText(label,padL-10,y+11);
   g.fillStyle='#eef2f6'; g.fillRect(padL,y,W-padL-padR,22);
   const w=(W-padL-padR)*Math.min(1,v/maxT);
   g.fillStyle=col; g.fillRect(padL,y,Math.max(2,w),22);
   const lbl=v>=1?v.toFixed(1)+' s':(v*1000).toFixed(0)+' ms';
   const lx=padL+Math.max(2,w)+10;
   g.font='13px ui-sans-serif,system-ui,sans-serif';
   if(lx+g.measureText(lbl).width>W-padR-4){
    g.fillStyle='#fff'; g.textAlign='right'; g.fillText(lbl, W-padR-8, y+11);
   }else{
    g.fillStyle='#19334d'; g.textAlign='left'; g.fillText(lbl, lx, y+11);
   }
  });

  // 显存条：以 80G 为满格
  const y=padT+2*rowH+14;
  g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText('显存 / 卡',padL-10,y+11);
  g.fillStyle='#eef2f6'; g.fillRect(padL,y,W-padL-padR,22);
  const fw=(W-padL-padR)*Math.min(1,r.statePerGpu/80);
  g.fillStyle=r.statePerGpu>80?'#b0592f':'#2f7d6a'; g.fillRect(padL,y,Math.max(2,fw),22);
  const lb2=r.statePerGpu.toFixed(1)+' GB / 80 GB', lx2=padL+Math.max(2,fw)+10;
  g.font='13px ui-sans-serif,system-ui,sans-serif';
  if(lx2+g.measureText(lb2).width>W-padR-4){ g.fillStyle='#fff'; g.textAlign='right'; g.fillText(lb2,W-padR-8,y+11); }
  else { g.fillStyle='#19334d'; g.textAlign='left'; g.fillText(lb2,lx2,y+11); }

  read('compute').textContent=r.tCompute>=1?r.tCompute.toFixed(1)+' s':(r.tCompute*1000).toFixed(0)+' ms';
  read('comm').textContent=r.tComm>=1?r.tComm.toFixed(1)+' s':(r.tComm*1000).toFixed(0)+' ms';
  read('state').textContent=r.statePerGpu.toFixed(1)+' GB';
  read('state').dataset.warn=String(r.statePerGpu>80);
  read('ratio').textContent=(r.ratio*100).toFixed(0)+'%';
  read('ratio').dataset.warn=String(r.ratio>0.3);

  out('P').textContent=S.P+' B';
  out('T').textContent=S.T+' M';
  out('N').textContent=S.N;

  const bottleneck = r.statePerGpu>80 ? '显存'
   : r.ratio>0.3 ? '通信'
   : '计算';
  st.dataset.warn = bottleneck!=='计算';
  st.textContent='这一步的瓶颈在'+bottleneck+'。计算 '+r.tCompute.toFixed(2)+' s，通信 '+
   r.tComm.toFixed(2)+' s（占计算 '+(r.ratio*100).toFixed(0)+'%），每卡模型状态 '+
   r.statePerGpu.toFixed(1)+' GB。'+
   (r.ratio>0.3?' 通信占比超过三成，说明切分方式或互连跟不上——先换并行策略，别再调算子。':'');
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{
   const k=el.dataset.in;
   S[k]=(k==='P'||k==='T'||k==='N')?Number(el.value):el.value;
   draw();
  });
 });
 draw();root.dataset.ready='true';
})();
