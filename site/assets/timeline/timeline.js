/* 抓取时序 · 八步逐步查看。纯 DOM，无外部依赖。 */
(function(){
 const root=document.querySelector('.tl-lab');
 if(!root)return;
 const STAGES=[
  {n:1,t:'到位',src:'swerve-base.html',
   i:'工位目标坐标、当前底盘位姿',
   o:'机身朝向不变地停在视野内，相机能看到标签',
   g:'到位误差、姿态角偏差；标签要落在视野中央区域',
   f:'停歪时观测可能失败，或精度下降但仍勉强通过——这种「勉强」最危险'},
  {n:2,t:'观测',src:'apriltag.html',
   i:'相机图像、相机内参、标签尺寸',
   o:'标签在相机坐标系下的六自由度位姿，以及重投影误差、decision margin',
   g:'重投影误差 ≤ 2 px、观测新鲜度 ≤ 30 s、连续几帧稳定',
   f:'重试数次后放弃，不使用可疑位姿去插孔'},
  {n:3,t:'搬进基座系',src:'hand-eye.html',
   i:'标签位姿、外参、当前末端位姿',
   o:'标签在基座系下的位姿 T_base_tag',
   g:'外参的标定日期与当前硬件是否匹配；时间戳是否同一时刻',
   f:'外参过期不报错，只表现为系统性偏移——最难发现的一类'},
  {n:4,t:'重算站位',src:'tray-grasp.html',
   i:'盘位姿、示教文件里的盘系站位数',
   o:'四个基座系目标点（待命 / 孔口 / 浅入 / 吃槽）',
   g:'孔轴方向与示教参考轴不能反向（轴反多半是选错了面的示教文件）',
   f:'轴反向直接拒绝，不尝试最小旋转——那样会翻 180° 而看不出错'},
  {n:5,t:'预检',src:'costmap.html',
   i:'四个目标点、当前关节状态、代价地图',
   o:'可达性结论与路径代价',
   g:'孔轴倾角 ≤ 10°、首段长度 ≤ 0.75 m、逆解有解、路径最大代价不超阈值',
   f:'超限直接失败，不做试探性运动'},
  {n:6,t:'进孔',src:'tray-grasp.html',
   i:'四个目标点与插值策略',
   o:'末端沿示教轴线到位，段末速度归零',
   g:'孔内每段 ≤ 21 mm 细分；到位误差 ≤ 1 mm / 0.5°',
   f:'超差停在当前位置，不回退重试——回退会带着未收敛的误差再走一遍'},
  {n:7,t:'判定',src:'tray-grasp.html',
   i:'撑开过程中的主驱动角序列',
   o:'是否吃上槽的结论',
   g:'主驱动角落在判定区间内（例如 q ∈ [1.52, 1.62]）',
   f:'落区外立即停住：继续撑只会把料盘顶飞'},
  {n:8,t:'记录',src:'grasp-timeline.html',
   i:'全流程日志：时刻、坐标系、参数版本、拒绝理由',
   o:'一次可复盘的证据',
   g:'四样齐全才算合格：时间戳、坐标系名、参数版本、具体失败原因',
   f:'记录不全时这次仍可能成功，但下次同样的故障你无法归因'}
 ];
 const steps=root.querySelector('.tl-steps'),detail=root.querySelector('.tl-detail');
 const el=n=>root.querySelector('[data-detail-'+n+']');
 const prev=root.querySelector('[data-prev]'),next=root.querySelector('[data-next]');
 let cur=0;

 STAGES.forEach((s,i)=>{
  const b=document.createElement('button');
  b.type='button';b.setAttribute('role','tab');
  b.innerHTML='<b>'+s.n+'</b>'+s.t;
  b.addEventListener('click',()=>show(i));
  steps.appendChild(b);
 });
 function show(i){
  cur=Math.max(0,Math.min(STAGES.length-1,i));
  const s=STAGES[cur];
  [...steps.children].forEach((b,k)=>{
   b.setAttribute('aria-selected',String(k===cur));
   b.tabIndex=k===cur?0:-1;
  });
  root.querySelector('.tl-no').textContent=s.n;
  el('title').textContent=s.t;
  el('in').textContent=s.i;
  el('out').textContent=s.o;
  el('gate').textContent=s.g;
  el('fail').textContent=s.f;
  const a=el('src');a.href='./'+s.src;a.textContent='对应笔记：'+srcName(s.src);
  prev.disabled=cur===0;next.disabled=cur===STAGES.length-1;
 }
 function srcName(f){
  return({ 'swerve-base.html':'全向底盘','apriltag.html':'AprilTag','hand-eye.html':'手眼标定',
   'tray-grasp.html':'料盘抓取','costmap.html':'代价地图','grasp-timeline.html':'本篇'})[f]||f;
 }
 prev.addEventListener('click',()=>show(cur-1));
 next.addEventListener('click',()=>show(cur+1));
 steps.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'){show(cur+1);[...steps.children][cur].focus();e.preventDefault();}
  if(e.key==='ArrowLeft'){show(cur-1);[...steps.children][cur].focus();e.preventDefault();}
 });
 show(0);root.dataset.ready='true';
})();
