/* decision_margin 沙盘：白黑码元的亮度分布决定判别余量。 */
(function(){
 const root=document.querySelector('.loc-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={white:220, black:40, symbol:135};

 function draw(){
  const lo=S.black, hi=S.white, thr=(lo+hi)/2;
  const margin=Math.min(Math.abs(S.symbol-thr), thr-lo, hi-thr);
  const isWhite=S.symbol>thr;

  const W=520,H=260,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);

  const padL=54,padR=22,padT=30,y=150;
  const X=v=>padL+(v/255)*(W-padL-padR);

  // 轴
  g.strokeStyle='#e2eaf2'; g.lineWidth=1;
  g.beginPath(); g.moveTo(padL,y); g.lineTo(W-padR,y); g.stroke();
  g.fillStyle='#8aa0b3'; g.font='12px ui-sans-serif,system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='top';
  for(let v=0;v<=255;v+=51) g.fillText(String(v),X(v),y+8);

  // 黑/白电平带
  g.fillStyle='#f1f5f9'; g.fillRect(X(lo)-10,y-46,20,92);
  g.fillStyle='#fdf6f1'; g.fillRect(X(hi)-10,y-46,20,92);
  g.font='12px ui-sans-serif,system-ui,sans-serif'; g.textBaseline='bottom';
  g.fillStyle='#5d7083'; g.textAlign='center';
  g.fillText('黑',X(lo),y-50); g.fillText('白',X(hi),y-50);

  // 阈值
  g.strokeStyle='#176dae'; g.lineWidth=2; g.setLineDash([6,5]);
  g.beginPath(); g.moveTo(X(thr),y-70); g.lineTo(X(thr),y+18); g.stroke(); g.setLineDash([]);
  g.fillStyle='#176dae'; g.textAlign='center'; g.textBaseline='bottom';
  g.fillText('阈值 '+(thr<10?thr.toFixed(1):thr.toFixed(0)), X(thr), y-74);

  // 码元
  const sx=X(S.symbol);
  g.fillStyle=isWhite?'#ffffff':'#19334d';
  g.strokeStyle=isWhite?'#176dae':'#19334d'; g.lineWidth=2.5;
  g.beginPath(); g.arc(sx,y-6,10,0,7); g.fill(); g.stroke();

  // margin 区间
  const toward=isWhite?X(thr):X(thr);
  g.strokeStyle='#2f7d6a'; g.lineWidth=3;
  const my=y+44;
  g.beginPath(); g.moveTo(sx,my); g.lineTo(toward,my); g.stroke();
  g.fillStyle='#2f7d6a'; g.textAlign='left'; g.textBaseline='middle';
  g.fillText('margin '+margin.toFixed(1), Math.min(sx,toward)+14, my+16);

  read('margin').textContent=margin.toFixed(1);
  read('margin').dataset.warn=String(margin<10);
  read('judge').textContent=isWhite?'判为白':'判为黑';
  out('white').textContent=S.white;
  out('black').textContent=S.black;
  out('symbol').textContent=S.symbol;

  st.dataset.warn=String(margin<10);
  st.textContent = margin<10
   ? '码元亮度只差阈值 '+margin.toFixed(1)+'，任何噪声都可能把它翻到另一边——但它的 ID 仍然可能被正确读出。这就是 margin 和「读对了没有」不是同一件事。'
   : '码元离阈值 '+margin.toFixed(1)+'，判别有余量。margin 衡量的是「离边界多远」，不是「概率多大」，更不是毫米精度。';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{ S[el.dataset.in]=Number(el.value); draw(); });
 });
 draw(); root.dataset.ready='true';
})();
