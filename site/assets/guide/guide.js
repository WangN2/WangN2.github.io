/* 选型指南 · 权重实验与参数主表
 * 数据来自页面内嵌 JSON（由 WangN2/robot_guide 的 CSV 生成）。无外部请求。 */
(function(){
 const host=document.querySelector('.guide-lab');
 const dataEl=document.getElementById('guide-data');
 if(!host||!dataEl)return;
 const DATA=JSON.parse(dataEl.textContent);
 const ROBOTS=DATA.robots, WEIGHTS=DATA.weights;

 const state={w:{},sort:'total',dir:'desc',query:'',filter:'all'};
 WEIGHTS.forEach(x=>{state.w[x.id]=Math.round(x.w*100);});

 const fmt=(v,suffix='')=>(v===null||v===undefined||v==='')?'—':String(v)+suffix;
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const gateClass=g=>g==='通过'?'chip-ok':(g==='不通过'?'chip-no':'chip-wait');

 function sumW(){return Object.values(state.w).reduce((a,b)=>a+b,0)||1;}
 function score(r){
  const s=sumW();
  return Object.keys(state.w).reduce((a,k)=>a+state.w[k]*(r.scores[k]||0),0)/s;
 }
 function ranked(){
  return ROBOTS.filter(r=>r.eligible).sort((a,b)=>score(b)-score(a));
 }

 // 权重表（正文里那张）
 const wtbody=document.querySelector('[data-weights-table] tbody');
 WEIGHTS.forEach(x=>{
  const tr=document.createElement('tr');
  tr.innerHTML='<td>'+esc(x.name)+'</td><td>'+Math.round(x.w*100)+'%</td><td>'+esc(x.def||'')+'</td>';
  wtbody.appendChild(tr);
 });

 // 滑块
 const sliders=document.querySelector('[data-sliders]');
 WEIGHTS.forEach(x=>{
  const el=document.createElement('label');
  el.className='guide-slider';
  el.innerHTML='<span>'+esc(x.name)+'</span><output></output>'+
   '<input type="range" min="0" max="40" step="1" value="'+state.w[x.id]+'" data-w="'+x.id+'" aria-label="'+esc(x.name)+' 权重">';
  sliders.appendChild(el);
  const input=el.querySelector('input'),out=el.querySelector('output');
  const sync=()=>{out.textContent=Math.round(state.w[x.id]/sumW()*100)+'%';};
  input.addEventListener('input',()=>{state.w[x.id]=Number(input.value);sync();render();});
  el._sync=sync;sync();
 });

 // 排名
 const rankEl=document.querySelector('[data-rank]');
 function renderRank(){
  const top=ranked().slice(0,8);
  rankEl.innerHTML='';
  top.forEach((r,i)=>{
   const s=score(r);
   const li=document.createElement('li');
   li.innerHTML='<span class="no">'+(i+1)+'</span>'+
    '<span class="nm">'+esc(r.model)+'<small>'+esc(r.vendor)+'</small></span>'+
    '<span class="sc">'+s.toFixed(2)+'</span>'+
    '<span class="bar"><i style="width:'+Math.max(2,Math.min(100,s/5*100))+'%"></i></span>';
   rankEl.appendChild(li);
  });
  const note=document.querySelector('[data-note]');
  const lead=top.slice(0,3).map(r=>score(r).toFixed(2)).join(' / ');
  note.textContent='当前权重下前三名：'+lead+'。综合分 = Σ(归一化权重 × 分项得分)，满分 5。';
 }

 // 主表
 const tbody=document.querySelector('[data-tbody]');
 const countEl=document.querySelector('[data-count]');
 function visible(){
  const q=state.query.trim().toLowerCase();
  let rows=ROBOTS.filter(r=>{
   if(q&&!(r.model.toLowerCase().includes(q)||r.vendor.toLowerCase().includes(q)))return false;
   if(state.filter==='pass')return r.gate==='通过';
   if(state.filter==='pending')return r.gate!=='通过';
   return true;
  });
  const key=state.sort,dir=state.dir==='asc'?1:-1;
  rows.sort((a,b)=>{
   let x=key==='total'?score(a):a[key],y=key==='total'?score(b):b[key];
   if(x===null||x===undefined||x==='')return 1;
   if(y===null||y===undefined||y==='')return -1;
   if(typeof x==='number'&&typeof y==='number')return (x-y)*dir;
   return String(x).localeCompare(String(y),'zh')*dir;
  });
  return rows;
 }
 function renderTable(){
  const rows=visible();
  tbody.innerHTML='';
  if(!rows.length){
   const tr=document.createElement('tr');
   tr.innerHTML='<td colspan="11" class="guide-empty">没有匹配的型号。换个关键词试试。</td>';
   tbody.appendChild(tr);
  }
  rows.forEach(r=>{
   const tr=document.createElement('tr');
   const img=r.img
    ? '<img src="../assets/guide/models/'+esc(r.img).replace(/\.(png|jpg|jpeg)$/i,'.webp')+'" alt="'+esc(r.model)+'" loading="lazy" width="40" height="40">'
    : '<span class="ph">无图</span>';
   tr.innerHTML=
    '<td class="col-img">'+img+'</td>'+
    '<td><span class="mdl">'+esc(r.model)+'</span></td>'+
    '<td><span class="vnd">'+esc(r.vendor)+'</span></td>'+
    '<td class="col-opt">'+esc(r.category)+'</td>'+
    '<td class="num col-opt">'+fmt(r.dof)+'</td>'+
    '<td class="col-base"><span class="'+(r.base.includes('舵轮')?'':'dim')+'">'+esc(r.base)+'</span></td>'+
    '<td><span class="chip '+gateClass(r.gate)+'">'+esc(r.gate)+'</span></td>'+
    '<td class="num">'+fmt(r.payload,' kg')+'</td>'+
    '<td class="num col-opt">'+fmt(r.reach,' mm')+'</td>'+
    '<td class="num col-opt">'+fmt(r.repeat,' mm')+'</td>'+
    '<td class="num total'+(r.eligible?'':' dim')+'"'+(r.eligible?'':' title="未参与排名"')+'>'+score(r).toFixed(2)+'</td>';
   tbody.appendChild(tr);
  });
  countEl.textContent=String(rows.length);
  document.querySelectorAll('[data-sort]').forEach(th=>{
   th.setAttribute('aria-sort',th.dataset.sort===state.sort?(state.dir==='asc'?'ascending':'descending'):'none');
  });
 }

 function render(){renderRank();renderTable();WEIGHTS.forEach(x=>{
  const el=document.querySelector('[data-w="'+x.id+'"]');
  if(el){const out=el.parentElement.querySelector('output');out.textContent=Math.round(state.w[x.id]/sumW()*100)+'%';}
 });}

 document.querySelectorAll('[data-sort]').forEach(th=>{
  th.addEventListener('click',()=>{
   const key=th.dataset.sort;
   if(state.sort===key)state.dir=state.dir==='asc'?'desc':'asc';
   else{state.sort=key;state.dir=(key==='total'||key==='dof'||key==='payload'||key==='reach'||key==='repeat')?'desc':'asc';}
   renderTable();
  });
 });
 const search=document.querySelector('[data-search]');
 search.addEventListener('input',()=>{state.query=search.value;renderTable();});
 document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>{
   state.filter=btn.dataset.filter;
   document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
   renderTable();
  });
 });
 document.querySelector('[data-reset]').addEventListener('click',()=>{
  WEIGHTS.forEach(x=>{state.w[x.id]=Math.round(x.w*100);
   const el=document.querySelector('[data-w="'+x.id+'"]');if(el)el.value=state.w[x.id];});
  render();
 });
 // 「已通过门槛 / 待确认」两个筛选按钮上的计数
 const passCount=ROBOTS.filter(r=>r.gate==='通过').length;
 document.querySelectorAll('[data-filter]').forEach(btn=>{
  if(btn.dataset.filter==='all')btn.textContent='全部 '+ROBOTS.length;
  if(btn.dataset.filter==='pass')btn.textContent='已通过门槛 '+passCount;
  if(btn.dataset.filter==='pending')btn.textContent='待确认 '+(ROBOTS.length-passCount);
 });

 render();host.dataset.ready='true';
})();
