(()=>{
 'use strict';
 const C=globalThis.AprilTagCore,root=document.getElementById('apriltag-lab');
 const $=id=>document.getElementById(id);
 const decodeState={id:0,rotation:0,clean:C.gridForId(0),observed:C.gridForId(0),seed:1};
 const bitGrid=$('bit-grid'),bitButtons=[];
 for(let index=0;index<36;index++){
  const button=document.createElement('button');button.type='button';button.className='bit-cell black';button.dataset.index=index;
  button.addEventListener('click',()=>{decodeState.observed=C.flipCells(decodeState.observed,[index]);renderDecode();});
  bitGrid.appendChild(button);bitButtons.push(button);
 }
 function polygon(ctx,points,fill){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 }
 function drawTag(){
  const canvas=$('tag-canvas'),ctx=canvas.getContext('2d'),start=40,side=440,cell=side/10;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
   let white=r===0||r===9||c===0||c===9;
   const border=r===1||r===8||c===1||c===8;
   if(!white&&!border)white=decodeState.observed[r-2][c-2];
   polygon(ctx,[[start+c*cell,start+r*cell],[start+(c+1)*cell,start+r*cell],[start+(c+1)*cell,start+(r+1)*cell],[start+c*cell,start+(r+1)*cell]],white?'#ffffff':'#101419');
   if(r>=2&&r<8&&c>=2&&c<8&&decodeState.observed[r-2][c-2]!==decodeState.clean[r-2][c-2]){ctx.strokeStyle='#dc7b21';ctx.lineWidth=3;ctx.strokeRect(start+c*cell+2,start+r*cell+2,cell-4,cell-4);}
  }
 }
 function renderDecode(){
  const limit=Number($('hamming-limit').value),result=C.decodeGrid(decodeState.observed,limit);
  bitButtons.forEach((button,index)=>{
   const r=Math.floor(index/6),c=index%6,white=decodeState.observed[r][c],changed=white!==decodeState.clean[r][c];
   button.className=`bit-cell ${white?'white':'black'}${changed?' changed':''}`;
   button.setAttribute('aria-pressed',String(white));button.setAttribute('aria-label',`第 ${r+1} 行第 ${c+1} 列，${white?'白格（1）':'黑格（0）'}${changed?'，已翻转':''}，点击翻转`);
  });
  drawTag();
  $('hamming-limit-value').textContent=limit;
  $('decode-id').textContent=result.id>=0?`ID ${result.id}`:'无候选';
  $('decode-hamming').textContent=`${result.hamming} 位`;
  $('decode-rotation').textContent=`顺时针 ${result.rotation*90}°`;
  const status=$('decode-status');status.textContent=result.accepted?'接受':'拒绝';status.className=result.accepted?'status-good':'status-bad';
  let note;
  if(result.ties>1)note='多个编码具有相同最近距离，无法唯一判定；真实系统应拒绝这次解码。';
  else if(result.hamming===0)note=`观察图与 ID ${result.id} 的标准编码一致；匹配朝向已同时确定。`;
  else if(result.accepted)note=`最近编码有 ${result.hamming} 位不同，仍在当前 ${limit} 位阈值内，因此恢复为 ID ${result.id}。`;
  else note=`最近编码仍有 ${result.hamming} 位不同，超过当前 ${limit} 位阈值。纠错能力有边界，不能把它当成遮挡容忍保证。`;
  $('decode-note').textContent=note;
  root.dataset.decodeId=result.id;root.dataset.hamming=result.hamming;root.dataset.decodeAccepted=result.accepted;
  renderPose();
 }
 $('tag-id').addEventListener('input',event=>{
  const id=event.target.valueAsNumber;if(!Number.isInteger(id)||id<0||id>586)return;
  decodeState.id=id;decodeState.rotation=0;decodeState.clean=C.gridForId(id);decodeState.observed=C.gridForId(id);renderDecode();
 });
 $('tag-rotate').addEventListener('click',()=>{
  decodeState.rotation=(decodeState.rotation+1)%4;decodeState.clean=C.rotateGrid(decodeState.clean,1);decodeState.observed=C.rotateGrid(decodeState.observed,1);renderDecode();
 });
 $('tag-reset').addEventListener('click',()=>{decodeState.observed=C.flipCells(decodeState.clean,[]);renderDecode();});
 $('tag-corrupt').addEventListener('click',()=>{
  const count=Number($('error-count').value);decodeState.observed=C.injectErrors(decodeState.clean,count,decodeState.seed++).grid;renderDecode();
 });
 $('hamming-limit').addEventListener('input',renderDecode);

 const defaults={x:.08,y:-.04,z:.9,rx:12,ry:-18,rz:8,size:.16,focal:700,noise:0},poseState={...defaults};
 const poseSpec={
  x:{fromInput:v=>v/100,toInput:v=>Math.round(v*100),format:v=>`${v*100} cm`},
  y:{fromInput:v=>v/100,toInput:v=>Math.round(v*100),format:v=>`${v*100} cm`},
  z:{fromInput:v=>v/100,toInput:v=>Math.round(v*100),format:v=>`${v.toFixed(2)} m`},
  rx:{fromInput:v=>v,toInput:v=>Math.round(v),format:v=>`${v.toFixed(0)}°`},
  ry:{fromInput:v=>v,toInput:v=>Math.round(v),format:v=>`${v.toFixed(0)}°`},
  rz:{fromInput:v=>v,toInput:v=>Math.round(v),format:v=>`${v.toFixed(0)}°`},
  size:{fromInput:v=>v/100,toInput:v=>Math.round(v*100),format:v=>`${v*100} cm`},
  focal:{fromInput:v=>v,toInput:v=>Math.round(v),format:v=>`${v.toFixed(0)} px`},
  noise:{fromInput:v=>v/10,toInput:v=>Math.round(v*10),format:v=>`±${v.toFixed(1)} px`}
 };
 const poseInputs=Array.from(document.querySelectorAll('[data-pose]'));
 const pretty=text=>String(text).replace(/-/g,'−');
 function syncPoseInput(key){const spec=poseSpec[key],input=$(`pose-${key}`);input.value=spec.toInput(poseState[key]);$(`pose-${key}-value`).textContent=pretty(spec.format(poseState[key]));}
 function syncPoseInputs(){Object.keys(poseSpec).forEach(syncPoseInput);}
 let playing=false,animationFrame=0,lastTime=0,phase=0,noiseSeed=1;
 function stopAnimation(){playing=false;cancelAnimationFrame(animationFrame);const button=$('pose-play');button.textContent='播放姿态动画';button.dataset.running='false';}
 poseInputs.forEach(input=>input.addEventListener('input',()=>{
  stopAnimation();const key=input.dataset.pose;poseState[key]=poseSpec[key].fromInput(Number(input.value));$(`pose-${key}-value`).textContent=pretty(poseSpec[key].format(poseState[key]));renderPose();
 }));
 function noiseOffset(seed,index){const x=Math.sin((seed+1)*12.9898+(index+1)*78.233)*43758.5453;return (x-Math.floor(x))*2-1;}
 function calculatePose(){
  const R=C.rotationFromDegrees([poseState.rx,poseState.ry,poseState.rz]),t=[poseState.x,poseState.y,poseState.z],K={fx:poseState.focal,fy:poseState.focal,cx:480,cy:270};
  const object=C.tagCorners(poseState.size),truthPixels=C.projectCorners(R,t,poseState.size,K);
  const measured=truthPixels.map((p,i)=>[p[0]+poseState.noise*noiseOffset(noiseSeed,i*2),p[1]+poseState.noise*noiseOffset(noiseSeed,i*2+1)]);
  const estimate=C.estimatePose(object,measured,K);
  return {truth:{R,t},estimate,K,object,truthPixels,measured};
 }
 function drawLine(ctx,a,b,color,width=2,dash=[]){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
 function renderPose(){
  const canvas=$('pose-canvas'),ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#dfe8ef';ctx.lineWidth=1;for(let x=0;x<canvas.width;x+=60)drawLine(ctx,[x,0],[x,canvas.height],'#dfe8ef',1);for(let y=0;y<canvas.height;y+=60)drawLine(ctx,[0,y],[canvas.width,y],'#dfe8ef',1);
  let model;
  try{model=calculatePose();}catch(error){
   $('estimated-position').textContent='无法解算';$('estimated-rotation').textContent=error.message;return;
  }
  const {truth,estimate,K,object,truthPixels,measured}=model,{R,t}=truth,size=poseState.size,h=size/2,cell=size/8,grid=C.gridForId(decodeState.id);
  const projectedRect=(x0,y0,x1,y1,fill,Rm= R,tm=t)=>{
   const points=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p=>C.projectPoint(C.transformPoint(Rm,tm,p),K));polygon(ctx,points,fill);return points;
  };
  projectedRect(-h-cell,-h-cell,h+cell,h+cell,'#ffffff');
  projectedRect(-h,-h,h,h,'#101419');
  projectedRect(-h+cell,-h+cell,h-cell,h-cell,'#ffffff');
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(!grid[r][c]){const x=-h+cell+c*cell,y=-h+cell+r*cell;projectedRect(x,y,x+cell,y+cell,'#101419');}
  const trueOutline=C.projectCorners(R,t,size,K);ctx.beginPath();trueOutline.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.strokeStyle='#176dae';ctx.lineWidth=2.5;ctx.stroke();
  const estimatedOutline=C.projectCorners(estimate.R,estimate.t,size,K);ctx.beginPath();estimatedOutline.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.strokeStyle='#dc7b21';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);
  measured.forEach((p,i)=>{ctx.beginPath();ctx.arc(p[0],p[1],5,0,Math.PI*2);ctx.fillStyle='#dc7b21';ctx.fill();ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText(String(i+1),p[0]+7,p[1]-7);});
  const center=C.projectPoint(C.transformPoint(R,t,[0,0,0]),K),axes=[[[size*.4,0,0],'#dc7b21','X'],[[0,size*.4,0],'#7a55be','Y'],[[0,0,size*.4],'#176dae','Z']];
  ctx.font='bold 13px system-ui';for(const [point,color,label] of axes){const end=C.projectPoint(C.transformPoint(R,t,point),K);drawLine(ctx,center,end,color,3);ctx.fillStyle=color;ctx.fillText(label,end[0]+5,end[1]-5);}
  drawLine(ctx,[K.cx-8,K.cy],[K.cx+8,K.cy],'#65798b',1);drawLine(ctx,[K.cx,K.cy-8],[K.cx,K.cy+8],'#65798b',1);
  const truthAngles=[poseState.rx,poseState.ry,poseState.rz],estimatedAngles=C.rotationToDegrees(estimate.R),formatVector=(v,n)=>v.map(x=>x.toFixed(n)).join(', ');
  $('truth-position').textContent=formatVector(t,3);$('estimated-position').textContent=formatVector(estimate.t,3);
  $('truth-rotation').textContent=formatVector(truthAngles,1);$('estimated-rotation').textContent=formatVector(estimatedAngles,1);
  const positionError=Math.hypot(...estimate.t.map((v,i)=>v-t[i]))*1000,rotationError=C.rotationErrorDegrees(estimate.R,R),reprojection=C.reprojectionError(object,measured,estimate,K);
  $('position-error').textContent=`${positionError.toFixed(2)} mm`;$('rotation-error').textContent=`${rotationError.toFixed(2)}°`;$('reprojection-error').textContent=`${reprojection.toFixed(2)} px`;
  root.dataset.positionError=positionError;root.dataset.rotationError=rotationError;root.dataset.reprojectionError=reprojection;root.dataset.poseZ=poseState.z;
 }
 $('pose-play').addEventListener('click',()=>{
  if(playing){stopAnimation();return;}playing=true;lastTime=performance.now();const button=$('pose-play');button.textContent='暂停姿态动画';button.dataset.running='true';
  const tick=now=>{if(!playing)return;const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;phase+=dt;poseState.ry=30*Math.sin(phase*.8);poseState.rx=15*Math.sin(phase*.55);poseState.rz=(poseState.rz+24*dt+180)%360-180;['rx','ry','rz'].forEach(syncPoseInput);renderPose();animationFrame=requestAnimationFrame(tick);};animationFrame=requestAnimationFrame(tick);
 });
 $('pose-reseed').addEventListener('click',()=>{noiseSeed++;renderPose();});
 $('pose-reset').addEventListener('click',()=>{stopAnimation();Object.assign(poseState,defaults);noiseSeed=1;syncPoseInputs();renderPose();});
 syncPoseInputs();renderDecode();root.dataset.ready='true';
})();
