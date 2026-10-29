/* nvJPEG 后端选型：按文档里的硬性限制给出建议，不猜性能数字。 */
(function(){
 const root=document.querySelector('.bk-lab');
 if(!root)return;
 const st={batch:16,enc:'baseline',ch:3,chroma:'420'};
 const read=n=>root.querySelector('[data-read="'+n+'"]');
 const out=n=>root.querySelector('[data-out="'+n+'"]');

 function pick(){
  const ch=Number(st.ch);                       // select 给的是字符串，先归一化
  const hwOk = st.enc==='baseline' && (ch===1||ch===3) && st.chroma!=='411' && st.chroma!=='410';
  if(st.enc==='progressive')
   return {name:'NVJPEG_BACKEND_HYBRID',warn:false,
    why:'硬件解码器只吃 baseline。progressive 只能走 CPU 熵解码 + GPU 反变换的混合路径，这是它能解 progressive 的唯一办法。',
    note:'如果流是你能控制的，优先让相机输出 baseline——只改这一个参数，就能拿回硬件解码。'};
  if(ch===4)
   return {name:'NVJPEG_BACKEND_HYBRID',warn:false,
    why:'硬件后端只支持 1 或 3 通道。四通道（常带 alpha）只能走混合路径，必要时用 nvjpegDecodeParamsSetAllowCMYK 打开。',
    note:'四通道图在机器人视觉里很少见，遇到它通常意味着上游存了 RGBA 而不是 RGB。'};
  if(st.chroma==='411'||st.chroma==='410')
   return {name:'NVJPEG_BACKEND_HYBRID',warn:false,
    why:'硬件后端明确不支持 4:1:1 与 4:1:0 色度采样。这两种在老式采集卡输出里偶尔还能见到。',
    note:'这两个采样格式本身也很少见了，多数编码器默认 4:2:0。'};
  if(hwOk&&st.batch>=50)
   return {name:'NVJPEG_BACKEND_HARDWARE',warn:false,
    why:'baseline、单 scan、1 或 3 通道、采样格式受支持——硬件解码器全都能吃。批量 ≥ 50 时它的吞吐优势最大。',
    note:'记得确认卡型号：A100 / H100 / L4 / Thor 这一代之后才有 NVJPG 单元，更早的卡会回落到 CPU 路径。'};
  if(st.batch>=8)
   return {name:'NVJPEG_BACKEND_GPU_HYBRID',warn:false,
    why:'批量到了几十张的量级，可以让 GPU 接管熵解码；但仍低于硬件后端的启用门槛和收益区间。',
    note:'文档里 GPU 熵解码的切换点是批量大于 50——批量在 8 到 50 之间时，实际效果取决于版本实现，建议实测。'};
  return {name:'NVJPEG_BACKEND_HYBRID（或者干脆用 CPU）',warn:true,
    why:'批量太小，GPU 的固定开销（kernel 启动、缓冲管理、可能的同步）会把并行收益吃干净。',
    note:'这个量级下 libjpeg-turbo 往往更快。先用它，别为了统一技术栈硬上 GPU。'};
 }

 function draw(){
  const r=pick();
  out('batch').textContent=st.batch;
  read('backend').textContent=r.name;
  read('why').textContent=r.why;
  read('note').textContent=r.note;
  root.querySelector('.bk-result').dataset.warn=String(r.warn);
 }
 root.querySelectorAll('[data-in]').forEach(el=>{
  el.addEventListener('input',()=>{
   const k=el.dataset.in;
   st[k]=k==='batch'?Number(el.value):el.value;
   draw();
  });
 });
 draw();root.dataset.ready='true';
})();
