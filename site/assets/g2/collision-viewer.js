(async () => {
    const root=document.getElementById('collision-explorer');
    if(!root)return;
    const status=root.querySelector('[data-status]');
    try {
    const response=await fetch(root.dataset.src);
    if(!response.ok)throw Error('Snapshot unavailable');
    const data=G2Collision.validateSnapshot(await response.json());
    const canvas=root.querySelector('[data-scene]'),ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas unavailable');
    const inflation=root.querySelector('[data-inflation]'),selector=root.querySelector('[data-sphere]');
    const detail=root.querySelector('[data-detail]'),legend=root.querySelector('[data-legend]');
    const groups=[{key:'base',name:'底盘',token:'--viz-series-1'},{key:'left',name:'左臂',token:'--viz-series-2'},
      {key:'right',name:'右臂',token:'--viz-series-3'},{key:'body',name:'头身',token:'--viz-series-4'}];
    for(const g of groups)g.count=data.spheres.filter(s=>s.group===g.key).length;
    const group=s=>groups.findIndex(g=>g.key===s.group);
    let yaw=.65,elev=.22,selected=15,width=736,height=530,scale=1,hit=[],pointer=null,dragged=false;
    const original=new Map(data.spheres.map(s=>[s.id,s]));
    selector.replaceChildren(...data.spheres.map(s=>{
      const o=document.createElement('option');o.value=String(s.id);o.textContent=`#${s.id} · ${groups[group(s)].name}`;return o;
    }));selector.value='15';
    const probe=document.createElement('span');probe.hidden=true;root.append(probe);
    const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1;
    const colorContext=colorCanvas.getContext('2d',{willReadFrequently:true});
    const rgb=color=>{colorContext.clearRect(0,0,1,1);colorContext.fillStyle=color;colorContext.fillRect(0,0,1,1);return Array.from(colorContext.getImageData(0,0,1,1).data).slice(0,3)};
    const alpha=(c,a)=>{const v=rgb(c);return `rgba(${v[0]},${v[1]},${v[2]},${a})`};
    function colors(){const resolve=token=>{probe.style.color=`var(${token})`;return getComputedStyle(probe).color};return {fg:resolve('--foreground'),muted:resolve('--muted-foreground'),border:resolve('--border'),series:groups.map(g=>resolve(g.token))};}
    function projected(p){return G2Collision.project(p,yaw,elev);}
    function model(){return data.spheres.map(s=>({...s,r:G2Collision.radiusFor(s,Number(inflation.value),data.originalBaseInflation)}));}
    function draw(){
      const c=colors(),balls=model();width=canvas.clientWidth;height=canvas.clientHeight;
      root.querySelectorAll('[data-view]').forEach(b=>{const v=({oblique:[.65,.22],front:[Math.PI/2,0],side:[0,0],top:[0,Math.PI/2]})[b.dataset.view];b.setAttribute('aria-pressed',String(Math.abs(yaw-v[0])<1e-6&&Math.abs(elev-v[1])<1e-6));});
      if(width<80||height<80)return;
      const ratio=window.devicePixelRatio||1;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
      const bounds=balls.map(s=>{const p=projected(s.c);return {s,p}});
      const framing=data.spheres.map(s=>({s,p:projected(s.c)}));
      const minU=Math.min(...framing.map(b=>b.p[0]-b.s.r),-.67),maxU=Math.max(...framing.map(b=>b.p[0]+b.s.r),.67),minV=Math.min(...framing.map(b=>b.p[1]-b.s.r)),maxV=Math.max(...framing.map(b=>b.p[1]+b.s.r));
      scale=Math.min((width-70)/(maxU-minU),(height-65)/(maxV-minV));
      const uc=(minU+maxU)/2,vc=(minV+maxV)/2;
      const screen=p=>{const a=projected(p);return [width/2+(a[0]-uc)*scale,height/2-(a[1]-vc)*scale,a[2]]};
      function line(points,color,lineWidth=1,dash=[]){ctx.beginPath();points.forEach((p,i)=>{const a=screen(p);i?ctx.lineTo(a[0],a[1]):ctx.moveTo(a[0],a[1]);});ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
      for(let t=-.6;t<=.6001;t+=.2){line([[-.6,t,0],[.6,t,0]],alpha(c.border,.7));line([[t,-.6,0],[t,.6,0]],alpha(c.border,.7));}
      const axes=[[[0,0,0],[.75,0,0],'x 前'],[[0,0,0],[0,.7,0],'y 左'],[[0,0,0],[0,0,1.65],'z 高']];
      ctx.font='12px sans-serif';ctx.fillStyle=c.muted;for(const a of axes){line(a.slice(0,2),c.border);const p=screen(a[1]);ctx.fillText(a[2],Math.min(width-38,Math.max(6,p[0]+5)),Math.max(16,Math.min(height-8,p[1]-4)));}
      const footprint=[[.39,.2],[.25,.32],[-.25,.32],[-.38,.2],[-.38,-.2],[-.25,-.32],[.25,-.32],[.39,-.2],[.39,.2]].map(p=>[p[0]*1.05,p[1]*1.05,0]);line(footprint,c.series[0],1.7);
      hit=[];for(const {s,p} of bounds.sort((a,b)=>a.p[2]-b.p[2])){
        const at=screen(s.c),r=s.r*scale,col=c.series[group(s)];
        const grad=ctx.createRadialGradient(at[0]-r*.28,at[1]-r*.3,r*.02,at[0],at[1],r);
        grad.addColorStop(0,alpha(col,.12));grad.addColorStop(.8,alpha(col,.20));grad.addColorStop(1,alpha(col,.35));
        ctx.beginPath();ctx.arc(at[0],at[1],r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle=alpha(col,.85);ctx.lineWidth=s.id===selected?2.6:1;ctx.stroke();
        for(let axis=0;axis<3;axis++){const ring=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;let v=[...s.c];v[(axis+1)%3]+=s.r*Math.cos(t);v[(axis+2)%3]+=s.r*Math.sin(t);ring.push(v);}line(ring,alpha(col,.25),.65);}
        ctx.beginPath();ctx.arc(at[0],at[1],2.2,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();hit.push({id:s.id,x:at[0],y:at[1],r,depth:p[2]});
      }
      const ball=balls.find(s=>s.id===selected),at=screen(ball.c);ctx.font='500 14px sans-serif';ctx.fillStyle=c.fg;ctx.fillText(`#${ball.id}`,Math.max(5,Math.min(width-38,at[0]+6)),Math.max(17,at[1]-8));
      detail.textContent=`#${ball.id} ${groups[group(ball)].name} ｜ 半径 ${(ball.r*100).toFixed(1)} cm ｜ 球心 x=${ball.c[0].toFixed(3)}, y=${ball.c[1].toFixed(3)}, z=${ball.c[2].toFixed(3)} m`;
      legend.replaceChildren(...groups.map((g,i)=>{const span=document.createElement('span'),dot=document.createElement('span');dot.className='collision-dot';dot.style.background=c.series[i];span.append(dot,`${g.name} ${g.count}`);return span;}));
    }
    const storageKey='wangn2:g2-collision:v1';
    function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:1,selectedSphere:selected,baseInflationCm:Number(inflation.value)*100,yaw,elev}));}catch{}}
    function apply(state){
      if(!state||state.version!==1)return;
      if(original.has(state.selectedSphere)){selected=state.selectedSphere;selector.value=String(selected);}
      if([5,16].includes(state.baseInflationCm))inflation.value=String(state.baseInflationCm/100);
      if(Number.isFinite(state.yaw))yaw=state.yaw%(2*Math.PI);
      if(Number.isFinite(state.elev))elev=Math.max(-.1,Math.min(Math.PI/2,state.elev));
    }
    root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{[yaw,elev]=({oblique:[.65,.22],front:[Math.PI/2,0],side:[0,0],top:[0,Math.PI/2]})[b.dataset.view];draw();save();}));
    inflation.addEventListener('change',()=>{draw();save();});selector.addEventListener('change',()=>{selected=Number(selector.value);draw();save();});
    canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>4)dragged=true;yaw=(yaw+dx*.009)%(2*Math.PI);elev=Math.max(-.1,Math.min(Math.PI/2,elev+dy*.007));pointer.x=e.clientX;pointer.y=e.clientY;draw();});
    canvas.addEventListener('pointerup',e=>{if(!dragged){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const near=hit.filter(h=>Math.hypot(h.x-x,h.y-y)<Math.max(h.r,15)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));if(near.length){selected=near[0].id;selector.value=String(selected);}}pointer=null;draw();save();});
    canvas.addEventListener('pointercancel',()=>{pointer=null;});
    try{apply(JSON.parse(localStorage.getItem(storageKey)));}catch{}
    new ResizeObserver(draw).observe(canvas);draw();
    root.dataset.ready='true';status.hidden=true;
    } catch(error) {root.dataset.ready='false';status.hidden=false;status.setAttribute('role','alert');status.textContent='碰撞球加载失败，请刷新页面重试。';}
  })();
