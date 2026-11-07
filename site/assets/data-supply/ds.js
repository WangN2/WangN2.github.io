/* 三条采集路线的成本账：单位按公开报道取中值。 */
(function(){
 const root=document.querySelector('.ds-lab');
 if(!root)return;
 const cv=root.querySelector('[data-canvas]'), st=root.querySelector('[data-status]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), out=n=>root.querySelector('[data-out="'+n+'"]');
 const S={H:10000};

 const ROUTES=[
  {k:'real',  name:'全真机遥操作', price:700, col:'#176dae'},
  {k:'human', name:'全无本体采集', price:90,  col:'#b0592f'},
  {k:'sim',   name:'全仿真合成',   price:8,   col:'#8899a8'},
  {k:'mix',   name:'混合配比',     price:0.02*700+0.18*90+0.80*8, col:'#2f7d6a'}
 ];

 function money(v){
  if(v>=1e8) return (v/1e8).toFixed(2)+' 亿元';
  if(v>=1e4) return (v/1e4).toFixed(1)+' 万元';
  return v.toFixed(0)+' 元';
 }

 function draw(){
  const costs=ROUTES.map(r=>({...r, cost:r.price*S.H}));
  const max=Math.max(...costs.map(c=>c.cost));
  const W=500,H=270,dpr=Math.min(devicePixelRatio||1,2);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);

  const padL=126,padR=118,padT=18,rowH=56,bw=W-padL-padR;
  g.font='13px ui-sans-serif,system-ui,sans-serif'; g.textBaseline='middle';
  costs.forEach((c,i)=>{
   const y=padT+i*rowH;
   g.fillStyle='#5d7083'; g.textAlign='right'; g.fillText(c.name,padL-12,y+13);
   g.fillStyle='#eef2f6'; g.fillRect(padL,y,bw,26);
   const w=bw*Math.max(c.cost/max,0.004);
   g.fillStyle=c.col; g.fillRect(padL,y,Math.max(3,w),26);
   g.font='13px ui-sans-serif,system-ui,sans-serif'; g.textAlign='left';
   const lbl=money(c.cost);
   const lx=padL+w+10;
   if(lx+g.measureText(lbl).width>W-6){ g.fillStyle='#fff'; g.textAlign='right'; g.fillText(lbl,W-8,y+13); }
   else { g.fillStyle='#19334d'; g.fillText(lbl,lx,y+13); }
  });

  const real=costs[0].cost, mix=costs[3].cost;
  read('real').textContent=money(real);
  read('mix').textContent=money(mix);
  read('unit').textContent=costs[3].price.toFixed(1)+' 元/h';
  read('save').textContent=Math.round((1-mix/real)*100)+'%';
  out('H').textContent=S.H>=10000? (S.H/10000)+' 万 h' : S.H+' h';

  st.textContent='同样 '+S.H.toLocaleString('en-US')+' 小时数据：全真机约 '+money(real)+
   '，全仿真约 '+money(costs[2].cost)+'，混合配比（2% 真机 + 18% 无本体 + 80% 仿真）约 '+
   money(mix)+'，单位成本降到 '+costs[3].price.toFixed(1)+' 元/小时。'+
   ' 这就是为什么没人用单一路线。';
 }

 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{S[el.dataset.in]=Number(el.value);draw();});
 });
 draw();root.dataset.ready='true';
})();
