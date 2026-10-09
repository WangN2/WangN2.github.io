(async function(){
 const root=document.getElementById('g2-whole-learning'),$=id=>root.querySelector('#'+id),K=globalThis.G2K,rad=Math.PI/180;
 try{
  if(!globalThis.THREE)throw Error('本地 3D 库未能加载，请刷新页面');
  if(!globalThis.DecompressionStream)throw Error('浏览器不支持模型解压，请使用新版 Chrome、Edge 或 Firefox');
  const bytes=Uint8Array.from(atob($('g2-model').textContent.trim()),c=>c.charCodeAt(0));
  const model=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  const groups={left:'_arm_l_',right:'_arm_r_',body:'_body_',head:'_head_joint'};
  const byName=Object.fromEntries(model.joints.map(j=>[j.name,j]));
  const members=g=>model.joints.filter(j=>j.type==='revolute'&&j.name.includes(groups[g]??'NO_GROUP')).map(j=>j.name).sort();
  let group='left',names=members(group),tool='gripper_l_center_link',selected=3,q={...model.home},base=[0,0,0],sliders=[],job=null,frame=null,last=null,trace=[],prediction=null;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.02,40);camera.up.set(0,0,1);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=THREE.sRGBEncoding;$('g2-scene').prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.1));const light=new THREE.DirectionalLight(0xffffff,.9);light.position.set(3,-3,5);scene.add(light);
  const links={},materials=[];
  for(const mesh of model.meshes){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices.flat(),3));geometry.setIndex(mesh.faces.flat());geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...mesh.color),roughness:.6,metalness:.12,side:THREE.DoubleSide});materials.push(material);const o=new THREE.Mesh(geometry,material);o.matrixAutoUpdate=false;scene.add(o);(links[mesh.link]??=[]).push(o);}
  const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial()),predLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({dashSize:.01,gapSize:.006}));scene.add(line,predLine);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.014,16,12),new THREE.MeshBasicMaterial()),otherTip=new THREE.Mesh(new THREE.SphereGeometry(.01,12,8),new THREE.MeshBasicMaterial({wireframe:true})),goal=new THREE.Mesh(new THREE.SphereGeometry(.018,16,12),new THREE.MeshBasicMaterial({wireframe:true}));scene.add(tip,otherTip,goal);goal.visible=false;
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.15,0xffffff,.03,.015),axisArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),.22,0xffffff,.025,.012);scene.add(arrow,axisArrow);
  const grid=new THREE.GridHelper(5,25);grid.rotation.x=Math.PI/2;grid.position.z=.002;scene.add(grid);
  const color=token=>{const e=document.createElement('span');e.style.color='var('+token+')';root.appendChild(e);const c=new THREE.Color(getComputedStyle(e).color);e.remove();return c;};
  function theme(){const a=color('--viz-series-1'),b=color('--viz-series-2'),c=color('--viz-series-3');tip.material.color.copy(a);otherTip.material.color.copy(a);line.material.color.copy(a);predLine.material.color.copy(b);arrow.setColor(b);axisArrow.setColor(c);goal.material.color.copy(c);grid.material.color.copy(color('--border'));draw();}
  let azimuth=.85,elevation=.25,radius=4.2,center=new THREE.Vector3(0,0,1),drag=null;
  function view(){camera.position.set(center.x+radius*Math.cos(elevation)*Math.cos(azimuth),center.y+radius*Math.cos(elevation)*Math.sin(azimuth),center.z+radius*Math.sin(elevation));camera.lookAt(center);}
  function focus(close){const f=K.fk(model,q,base);if(!close){center.set(base[0],base[1],1);radius=4.2;}else if(group.startsWith('gripper')){center.set(...K.pos(f.links['gripper_'+group.at(-1)+'_center_link']));radius=.6;}else if(group==='base'){center.set(base[0],base[1],.25);radius=1.8;}else if(group==='head'){center.set(...K.pos(f.links.head_link3));radius=1.1;}else if(group==='body'){center.set(...K.pos(f.links.body_link3));radius=2.5;}else{center.set(...K.pos(f.links[group==='left'?'arm_l_link4':'arm_r_link4']));radius=2;}view();draw();}
  renderer.domElement.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;azimuth-=(e.clientX-drag[0])*.008;elevation=Math.max(-.3,Math.min(1.35,elevation+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];view();renderer.render(scene,camera);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>drag=null);
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(.25,Math.min(9,radius*Math.exp(e.deltaY*.001)));view();renderer.render(scene,camera);},{passive:false});
  function setLine(o,points){o.geometry.dispose();o.geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));if(o===predLine)o.computeLineDistances();}
  const limits=ns=>ns.map(n=>[byName[n].lower,byName[n].upper]);
  const position=()=>K.pos(K.fk(model,q,base).links[tool]);
  function halt(){job=null;if(frame!==null)cancelAnimationFrame(frame);frame=null;last=null;root.dataset.running='false';}
  function clear(){halt();trace=[];prediction=null;goal.visible=false;$('g2-error').textContent='';}
  let storage=null;try{storage=window.localStorage;}catch{}
  function save(){G2State.writeState(storage,{version:2,q:{...q},base:[...base],group,tool,selected,preset:$('g2-preset').value});}
  function grip(){return model.grippers.find(g=>g.side===group.at(-1));}
  function buildControls(){
   names=members(group);selected=Math.min(selected,Math.max(0,names.length-1));sliders=[];$('g2-joints').replaceChildren();$('g2-selected').replaceChildren();
   $('g2-joint-actions').hidden=!names.length;$('g2-actions').hidden=!(group==='left'||group==='right');$('g2-grip-controls').hidden=!group.startsWith('gripper');$('g2-base-actions').hidden=group!=='base';
   names.forEach((n,i)=>{const j=byName[n],label=document.createElement('label');label.className='form-label';label.innerHTML='<span class="joint-head"><span>J'+(i+1)+' · '+j.axis.map((v,k)=>v?'XYZ'[k]:'').join('')+' 轴</span><output class="tabular-nums"></output></span><input class="form-range" type="range" step="0.1" min="'+j.lower/rad+'" max="'+j.upper/rad+'" aria-label="J'+(i+1)+' 关节角">';$('g2-joints').appendChild(label);const input=label.querySelector('input');sliders.push([input,label.querySelector('output')]);const option=document.createElement('option');option.value=i;option.textContent='J'+(i+1);$('g2-selected').appendChild(option);input.addEventListener('input',()=>{clear();q[n]=Number(input.value)*rad;selected=i;$('g2-selected').value=i;$('g2-status').textContent='手动关节角 · 已限制单轴角度，但未检查自碰撞';draw();});input.addEventListener('change',save);});
   $('g2-selected').value=selected;
   if(grip()){$('g2-grip').max=grip().samples.length-1;$('g2-grip').value=Math.round(q[grip().master]/rad*2);}
  }
  function draw(){
   const f=K.fk(model,q,base),p=K.pos(f.links[tool]);for(const [n,objects] of Object.entries(links))for(const o of objects)o.matrix.set(...f.links[n]);
   tip.position.set(...p);otherTip.position.set(...K.pos(f.links[tool.includes('_l_')?'gripper_r_center_link':'gripper_l_center_link']));
   arrow.visible=false;axisArrow.visible=names.length>0;
   if(names.length){const J=K.jacobian(model,q,names,tool,base),v=J.slice(0,3).map(r=>r[selected]),m=K.norm(v),a=f.frames[names[selected]];arrow.position.set(...p);arrow.visible=m>1e-7;if(arrow.visible){arrow.setDirection(new THREE.Vector3(...v).normalize());arrow.setLength(Math.min(.32,Math.max(.06,m*.3)),.028,.014);}axisArrow.position.set(...a.p);axisArrow.setDirection(new THREE.Vector3(...a.axis).normalize());$('g2-column').textContent=names[selected]+' · Jv [m/rad]：'+v.map(x=>x.toFixed(3)).join(' / ')+' · Jω：'+J.slice(3).map(r=>r[selected].toFixed(2)).join(' / ');}
   else $('g2-column').textContent=group==='base'?'底盘指令使用机器人自身坐标系；舵轮先转向，再滚动。':'夹爪：单主轴 + 镜像联动 + 球铰闭环；被动关节采用最小变形数值解。';
   names.forEach((n,i)=>{sliders[i][0].value=q[n]/rad;sliders[i][1].textContent=(q[n]/rad).toFixed(1)+'°';});
   $('g2-position').textContent=(tool.includes('_l_')?'左':'右')+'夹爪世界 XYZ：'+p.map(x=>x.toFixed(3)).join(' / ')+' m';
   if(grip())$('g2-grip-value').textContent=(q[grip().master]/rad).toFixed(1)+'°';
   $('g2-wheel-values').textContent='底盘 XY / yaw：'+base.slice(0,2).map(x=>x.toFixed(2)).join(' / ')+' m / '+(base[2]/rad).toFixed(1)+'° · 转向角：'+model.wheels.map(w=>(q[w.steer]/rad).toFixed(0)+'°').join(' / ');
   setLine(line,trace);setLine(predLine,prediction?[prediction.start,prediction.end]:[]);renderer.render(scene,camera);
  }
  function preset(name){clear();q={...model.home};base=[0,0,0];for(const side of ['left','right']){const ns=members(side);if(name==='bent'){q[ns[0]]=side==='left'?.25:-.25;q[ns[1]]=.1;q[ns[3]]=-.9;}if(name==='down'){q[ns[0]]=side==='left'?1.5708:-1.5708;q[ns[1]]=-1.0472;q[ns[3]]=-.6981;}}for(const g of model.grippers)Object.assign(q,g.samples[0].q);buildControls();$('g2-status').textContent='运动学教学 · 无重力、接触或避障 · 末端位置控制，朝向自由';focus(false);}
  function start(task){halt();job=task;last=null;root.dataset.running='true';frame=requestAnimationFrame(tick);}
  function nudge(sign){clear();const n=names[selected],p=position(),J=K.jacobian(model,q,names,tool,base),to=Math.max(byName[n].lower,Math.min(byName[n].upper,q[n]+sign*3*rad));prediction={start:p,end:p.map((v,i)=>v+J[i][selected]*(to-q[n]))};trace=[p];$('g2-status').textContent='单关节运动 · 虚线为起始雅可比的一阶预测';start({type:'nudge',n,from:q[n],to,t:0});}
  $('g2-nudge').onclick=()=>nudge(1);$('g2-nudge-minus').onclick=()=>nudge(-1);
  root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{clear();const [axis,d]=b.dataset.move.split(',').map(Number),p=position(),target=p.slice();target[axis]+=d;trace=[p];prediction={start:p,end:target};goal.position.set(...target);goal.visible=true;const ns=members(tool.includes('_l_')?'left':'right');$('g2-status').textContent='仅所选末端对应的 7 轴手臂参与求解 · 位置目标，朝向自由';start({type:'ik',start:p,target,ns,t:0});});
  root.querySelectorAll('[data-base]').forEach(b=>b.onclick=()=>{clear();const cmd=b.dataset.base.split(',').map(Number),wheels=K.swerve(model.wheels,cmd,model.wheels.map(w=>q[w.steer]));trace=[position()];$('g2-status').textContent='舵轮转向 → 底盘移动 · 理想无滑移运动学';start({type:'base',cmd,wheels,t:0});});
  function tick(now){frame=null;if(!job)return;const a=job,dt=last===null?0:Math.min(.04,(now-last)/1000);last=now;
   if(a.type==='base'){
    let aligned=true;model.wheels.forEach((w,i)=>{const d=a.wheels[i].angle-q[w.steer];q[w.steer]+=Math.max(-4.08*dt,Math.min(4.08*dt,d));if(Math.abs(a.wheels[i].angle-q[w.steer])>1e-5)aligned=false;});
    if(aligned){const step=Math.min(dt,1-a.t);base=K.baseStep(base,a.cmd,step);model.wheels.forEach((w,i)=>q[w.roll]+=a.wheels[i].speed*step);a.t+=step;if(a.t>=1-1e-9){job=null;$('g2-status').textContent='底盘动作完成 · 轮组采用理想无滑移映射，非牵引力仿真';}}
   }else if(a.type==='nudge'){a.t+=dt;const s=Math.min(1,a.t/1.2),h=s*s*(3-2*s);q[a.n]=a.from+h*(a.to-a.from);if(s===1){job=null;$('g2-error').textContent='一阶预测误差 '+(K.norm(K.sub(position(),prediction.end))*1000).toFixed(3)+' mm';}}
   else{a.t+=dt;const blend=Math.min(1,a.t/2.5),p=position(),ref=a.start.map((x,i)=>x+(a.target[i]-x)*blend),v=K.sub(ref,p).map((x,i)=>4*x+(blend<1?(a.target[i]-a.start[i])/2.5:0)),J=K.jacobian(model,q,a.ns,tool,base).slice(0,3),next=K.integrate(a.ns.map(n=>q[n]),K.dls(J,v,.025),limits(a.ns),dt,.35);a.ns.forEach((n,i)=>q[n]=next[i]);const error=K.norm(K.sub(a.target,position()));$('g2-error').textContent='目标误差 '+(error*1000).toFixed(2)+' mm';if(blend===1&&error<.0005){job=null;$('g2-status').textContent='到达 · 位置误差 <0.5 mm（运动学结果）';}else if(a.t>12){job=null;$('g2-status').textContent='未到达：受关节限位或局部奇异性限制；可切换屈肘姿态重试';}}
   trace.push(position());if(trace.length>1000)trace.shift();draw();if(job)frame=requestAnimationFrame(tick);else{root.dataset.running='false';last=null;save();}
  }
  $('g2-group').onchange=e=>{clear();group=e.target.value;selected=group==='left'||group==='right'?3:0;if(group==='left'||group==='right'||group.startsWith('gripper')){const side=group==='left'?'l':group==='right'?'r':group.at(-1);tool='gripper_'+side+'_center_link';$('g2-tool').value=side;}buildControls();$('g2-status').textContent=group==='head'?'头部不在夹爪运动链上：改变头部，夹爪雅可比列为零。':'单轴限位已载入 · 无自碰撞检查';draw();save();};
  $('g2-tool').onchange=e=>{clear();tool='gripper_'+e.target.value+'_center_link';draw();save();};
  $('g2-selected').onchange=e=>{clear();selected=Number(e.target.value);draw();save();};
  $('g2-grip').oninput=e=>{clear();Object.assign(q,grip().samples[Number(e.target.value)].q);$('g2-status').textContent='主驱动角带动整组连杆 · 闭链位置约束；不模拟夹持力';draw();};$('g2-grip').onchange=save;
  $('g2-preset').onchange=e=>{preset(e.target.value);save();};$('g2-wide').onclick=()=>focus(false);$('g2-close').onclick=()=>focus(true);
  $('g2-stop').onclick=()=>{halt();$('g2-status').textContent='已停止，保持当前姿态';save();};
  $('g2-transparent').onchange=e=>{for(const m of materials){m.transparent=e.target.checked;m.opacity=e.target.checked?.3:1;m.depthWrite=!e.target.checked;}draw();};
  new ResizeObserver(()=>{const w=$('g2-scene').clientWidth,h=$('g2-scene').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();view();draw();}).observe($('g2-scene'));
  new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
  function restore(s){
   const a=s;if(a?.version!==2||!a.q)return;clear();
   for(const [n,v] of Object.entries(a.q)){const j=byName[n];if(j&&j.type==='revolute'&&Number.isFinite(v))q[n]=Math.max(j.lower??-Infinity,Math.min(j.upper??Infinity,v));}
   if(Array.isArray(a.base)&&a.base.length===3&&a.base.every(Number.isFinite))base=[...a.base];
   if([...Object.keys(groups),'gripper_l','gripper_r','base'].includes(a.group))group=a.group;
   if(['gripper_l_center_link','gripper_r_center_link'].includes(a.tool))tool=a.tool;
   if(['down','bent','zero'].includes(a.preset))$('g2-preset').value=a.preset;
   selected=Number.isInteger(a.selected)&&a.selected>=0?a.selected:0;
   for(const g of model.grippers){const i=Math.max(0,Math.min(g.samples.length-1,Math.round(q[g.master]/rad*2)));Object.assign(q,g.samples[i].q);}
   $('g2-group').value=group;$('g2-tool').value=tool.includes('_l_')?'l':'r';buildControls();focus(false);
  }
  preset('down');theme();restore(G2State.readState(storage));root.dataset.ready='true';
 }catch(e){$('g2-status').setAttribute('role','alert');$('g2-status').textContent='加载失败：'+e.message;console.error(e);}
 function reportHeight(){
  if(window.parent===window)return;
  const height=Math.ceil(document.body.getBoundingClientRect().height);
  if(height!==reportHeight.last){reportHeight.last=height;window.parent.postMessage({type:'wangn2:g2:resize',height},location.origin);}
 }
 new ResizeObserver(reportHeight).observe(document.body);reportHeight();
 })();
