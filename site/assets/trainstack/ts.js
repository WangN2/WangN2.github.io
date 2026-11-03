/* 训练显存账：按「每参数字节数」拆成四份，再乘参数量。 */
(function(){
 const root=document.querySelector('.ts-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={P:6,prec:'bf16',opt:'adamw'};

 // 每参数字节数：权重 / 梯度 / 主权重副本 / 优化器状态
 function perParam(){
  const half = S.prec!=='fp32';
  const w = half?2:4, g = half?2:4, master = half?4:0;
  let opt = 0;
  if(S.opt==='adamw') opt = half?8:8;      // m + v，各 4 字节（或 fp32）
  else if(S.opt==='sgd') opt = half?4:4;   // 只有 momentum
  else opt = half?4:4;                     // Muon：只有动量
  return {w,g,master,opt,total:w+g+master+opt};
 }
 const COLOR={w:'#176dae',g:'#5a9bcc',master:'#9db6cb',opt:'#b0592f'};

 function draw(){
  const pp=perParam(), P=S.P*1e9;
  const gb=(pp.w+pp.g+pp.master+pp.opt)*P/1e9;
  const parts=[
   ['权重', pp.w, COLOR.w],
   ['梯度', pp.g, COLOR.g],
   ['fp32 主副本', pp.master, COLOR.master],
   ['优化器状态', pp.opt, COLOR.opt]
  ];

  const W=470,H=300,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);

  const padL=112,padR=20,padT=20,rowH=44;
  const maxB=pp.total||16;
  g.font='13px ui-sans-serif,system-ui,sans-serif'; g.textBaseline='middle';
  parts.forEach((p,i)=>{
   const y=padT+i*rowH, label=p[0], bytes=p[1];
   g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText(label,padL-10,y+10);
   g.fillStyle='#eef2f6'; g.fillRect(padL,y,(W-padL-padR),20);
   if(bytes>0){
    const w=(W-padL-padR)*bytes/maxB;
    g.fillStyle=p[2]; g.fillRect(padL,y,Math.max(2,w),20);
   }
   g.fillStyle='#19334d'; g.textAlign='left';
   g.fillText(bytes+' B/参数',padL+ (bytes>0? (W-padL-padR)*bytes/maxB+10 : 6),y+10);
  });
  // 合计条
  const y=padT+parts.length*rowH+10;
  g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText('合计',padL-10,y+12);
  g.fillStyle='#19334d'; g.textAlign='left';
  g.font='16px ui-sans-serif,system-ui,sans-serif';
  g.fillText(gb.toFixed(1)+' GB  ·  '+pp.total+' B/参数',padL,y+12);

  read('total').textContent=gb.toFixed(1)+' GB';
  read('per').textContent=pp.total+' B';
  read('fit').textContent=gb<=76?'放得下（80G）':'放不下 → 需要切分';
  read('fit').dataset.warn=String(gb>76);
  read('maxP').textContent=(76/pp.total).toFixed(1)+' B';
  out('P').textContent=S.P+' B';
  st.dataset.warn=String(gb>76);
  st.textContent='参数 '+S.P+'B、'+S.prec+'、'+S.opt+'：模型状态约 '+gb.toFixed(1)+
   ' GB。这还没算激活（随 batch 与序列长度线性增长），实际占用会更高。'+
   (gb>76?' 单卡装不下，要靠 ZeRO 或并行切分。':'');
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{
   const k=el.dataset.in;
   S[k]= (k==='P') ? Number(el.value) : el.value;
   draw();
  });
 });
 draw();root.dataset.ready='true';
})();
