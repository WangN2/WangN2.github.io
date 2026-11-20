/* 注意力预算：人每天能审多少 PR，决定了「减少阻塞门」是不是正确选择。 */
(function(){
 const root=document.querySelector('.he-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={N:24,m:12,P:5,H:120};   // 日 PR 数 / 每 PR 审查分钟 / 人数 / 每人每日可审查分钟

 function draw(){
  const need=S.N*S.m;          // 日需审查分钟
  const have=S.P*S.H;          // 日可用分钟
  const gap=need-have;
  const people=Math.ceil(need/S.H);

  const W=500,H=250,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);

  const padL=112,padR=96,padT=30,rowH=62;
  const max=Math.max(need,have,1);
  const rows=[['需要的审查工时',need,'#b0592f'],['可用的审查工时',have,'#2f7d6a']];
  g.font='13px ui-sans-serif,system-ui,sans-serif'; g.textBaseline='middle';
  rows.forEach((r,i)=>{
   const y=padT+i*rowH, bw=W-padL-padR;
   g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText(r[0],padL-12,y+12);
   g.fillStyle='#eef2f6'; g.fillRect(padL,y,bw,24);
   const w=bw*Math.max(r[1]/max,0.004);
   g.fillStyle=r[2]; g.fillRect(padL,y,Math.max(3,w),24);
   g.fillStyle='#19334d'; g.textAlign='left';
   const lbl=(r[1]/60).toFixed(1)+' h';
   g.fillText(lbl, padL+Math.max(3,w)+8, y+12);
  });

  // 缺口提示
  const y=padT+2*rowH+14;
  g.textAlign='center'; g.font='14px ui-sans-serif,system-ui,sans-serif';
  g.fillStyle=gap>0?'#b0592f':'#2f7d6a';
  g.fillText(gap>0?('缺口 '+ (gap/60).toFixed(1) +' 小时/天'):('富余 '+(-gap/60).toFixed(1)+' 小时/天'), W/2, y+8);

  read('need').textContent=(need/60).toFixed(1)+' h';
  read('have').textContent=(have/60).toFixed(1)+' h';
  read('gap').textContent=gap>0?('-'+(gap/60).toFixed(1)+' h'):('+'+(0-gap/60).toFixed(1)+' h');
  read('gap').dataset.warn=String(gap>0);
  read('people').textContent=people+' 人';
  read('people').dataset.warn=String(people>S.P);
  out('N').textContent=S.N;
  out('m').textContent=S.m+' 分钟';
  out('P').textContent=S.P+' 人';
  out('H').textContent=S.H+' 分钟';

  st.dataset.warn=String(gap>0);
  st.textContent = gap>0
   ? '每天 '+S.N+' 个 PR × 每个 '+S.m+' 分钟 = '+(need/60).toFixed(1)+' 小时审查，但 '+S.P+' 人只有 '+(have/60).toFixed(1)+' 小时。缺口意味着 PR 会积压——这时「减少阻塞门、让智能体先合」不是偷懒，是唯一能跑下去的选择。'
   : '审查工时够用（富余 '+(-gap/60).toFixed(1)+' 小时）。在这个吞吐量下，你完全有底气坚持严格的人工门禁——这也是为什么同一套做法在小团队有效、在大团队失效。';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{ S[el.dataset.in]=Number(el.value); draw(); });
 });
 draw(); root.dataset.ready='true';
})();
