/* 编码一次，看看丢了什么：真实调用浏览器的 JPEG 编解码，比较大小与块效应。 */
(function(){
 const root=document.querySelector('.jpeg-lab');
 if(!root)return;
 const S=256;
 const src=root.querySelector('[data-src]'), out=root.querySelector('[data-out]'), zoom=root.querySelector('[data-zoom]');
 const slider=root.querySelector('[data-in=q]'), qout=root.querySelector('[data-qout]');
 const qLabel=root.querySelector('[data-q]');
 const read=n=>root.querySelector('[data-read="'+n+'"]'), status=root.querySelector('[data-status]');

 function setup(c){c.width=S;c.height=S;return c.getContext('2d');}

 /* 一张刻意难压的图：锐利斜边、细格子、饱和色块、小字、渐变 */
 function drawScene(ctx){
  const g=ctx.createLinearGradient(0,0,S,S);
  g.addColorStop(0,'#f7f9fc');g.addColorStop(1,'#cfe0ee');
  ctx.fillStyle=g;ctx.fillRect(0,0,S,S);

  ctx.save();ctx.translate(S/2,S/2);ctx.rotate(-0.38);
  ctx.fillStyle='#19334d';ctx.fillRect(-140,-13,280,26);
  ctx.restore();

  const blobs=[['#e0574a',64,72,40],['#176dae',196,86,46],['#3f9d6a',88,196,38],['#e9ab48',190,190,34]];
  for(const [c,x,y,r] of blobs){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}

  /* 高频细节：细小斜条纹，质量一降最先糊 */
  ctx.save();ctx.beginPath();ctx.rect(16,212,64,28);ctx.clip();
  ctx.fillStyle='#ffffff';ctx.fillRect(16,212,64,28);
  ctx.strokeStyle='#19334d';ctx.lineWidth=1.6;
  for(let x=0;x<90;x+=4){ctx.beginPath();ctx.moveTo(16+x,240);ctx.lineTo(16+x+28,212);ctx.stroke();}
  ctx.restore();
  ctx.strokeStyle='#9fb3c4';ctx.lineWidth=1;ctx.strokeRect(16,212,64,28);

  ctx.fillStyle='#19334d';ctx.font='600 11px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('WangN2 · 256×256 · JPEG',16,200);
  ctx.strokeStyle='#19334d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(150,214);ctx.lineTo(240,240);ctx.stroke();
 }
 const sctx=setup(src); drawScene(sctx);
 const octx=setup(out), zctx=setup(zoom);

 let timer=null;
 function render(){
  const q=Number(slider.value)/100;
  qout.textContent=q.toFixed(2);
  qLabel.textContent=q.toFixed(2);
  const url=src.toDataURL('image/jpeg',q);
  const img=new Image();
  img.onload=()=>{
   octx.imageSmoothingEnabled=false;
   octx.clearRect(0,0,S,S);octx.drawImage(img,0,0);

   /* 放大 64×64 区域，叠 8×8 网格 */
   const crop=64;
   zctx.imageSmoothingEnabled=false;
   zctx.clearRect(0,0,S,S);
   zctx.drawImage(out,96,96,crop,crop,0,0,S,S);
   zctx.strokeStyle='rgba(233,171,72,.85)';zctx.lineWidth=1;
   const step=S/crop*8;
   for(let i=0;i<=S;i+=step){zctx.beginPath();zctx.moveTo(i,0);zctx.lineTo(i,S);zctx.stroke();
    zctx.beginPath();zctx.moveTo(0,i);zctx.lineTo(S,i);zctx.stroke();}

   const bytes=Math.round((url.length-url.indexOf(',')-1)*3/4);
   const raw=S*S*3;
   read('size').textContent=(bytes/1024).toFixed(1)+' KB';
   read('ratio').textContent=(raw/bytes).toFixed(1)+' : 1';
   read('bpp').textContent=(bytes*8/(S*S)).toFixed(2)+' bit';
   status.textContent=q>=0.85
    ?'质量很高，肉眼几乎看不出差别，但文件也不小。'
    :(q>=0.5
      ?'开始出现 8×8 块的边界，细条纹和斜边最先糊掉——那是高频被量化归零的地方。'
      :'低频还留得住，高频基本没了：色块边缘发毛，小字糊成一团，方块感明显。');
  };
  img.src=url;
 }
 slider.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,60);});
 render();root.dataset.ready='true';
})();
