/* 训练量计算器：把「数据够不够」变成可拨的数。无外部依赖。 */
(function(){
 const root=document.querySelector('.vla-lab');
 if(!root)return;
 const state={eps:198,steps:1380,chunk:50,batch:4,upd:1000};
 const out=n=>root.querySelector('[data-out="'+n+'"]'),read=n=>root.querySelector('[data-read="'+n+'"]');
 const fmt=n=>n.toLocaleString('en-US');

 function calc(){
  const windows=state.eps*Math.max(1,state.steps-state.chunk+1);
  const samples=state.batch*state.upd;
  const cov=samples/windows;                      // 单位：epoch
  const need=Math.ceil(windows/state.batch);      // 到 1 epoch 所需更新步
  return {windows,samples,cov,need};
 }
 function draw(){
  const r=calc();
  out('eps').textContent=state.eps;
  out('steps').textContent=fmt(state.steps);
  out('chunk').textContent=state.chunk;
  out('batch').textContent=state.batch;
  out('upd').textContent=fmt(state.upd);

  read('win').textContent=fmt(r.windows);
  read('samp').textContent=fmt(r.samples);
  const pct=r.cov*100;
  read('cov').textContent=pct>=10?pct.toFixed(0)+'%':(pct>=1?pct.toFixed(1)+'%':pct.toFixed(2)+'%');
  read('cov').dataset.warn=String(r.cov<1);
  read('need').textContent=r.need>state.upd?fmt(r.need)+' 步':'已超过 1 epoch';

  root.querySelector('[data-bar]').style.width=Math.min(100,pct)+'%';
  const st=root.querySelector('[data-status]');
  st.dataset.warn=String(r.cov<1);
  st.textContent=r.cov>=1
   ?'覆盖率 '+pct.toFixed(1)+'%，相当于把这批数据看了 '+(pct/100).toFixed(1)+' 遍。'
   :'覆盖率只有 '+pct.toFixed(2)+'%：模型还没把数据看完一遍。这个量级下，分数的涨落更多反映「学了没学」，而不是「学得好不好」。';
 }
 root.querySelectorAll('[data-in]').forEach(input=>{
  input.addEventListener('input',()=>{state[input.dataset.in]=Number(input.value);draw();});
 });
 draw();root.dataset.ready='true';
})();
