(function(root){
  'use strict';
  const eye=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function mul(a,b){const c=Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)c[4*i+j]+=a[4*i+k]*b[4*k+j];return c;}
  function inv(a){const c=eye();for(let i=0;i<3;i++){for(let j=0;j<3;j++)c[4*i+j]=a[4*j+i];c[4*i+3]=-[0,1,2].reduce((s,j)=>s+c[4*i+j]*a[4*j+3],0);}return c;}
  const pos=t=>[t[3],t[7],t[11]];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const norm=a=>Math.hypot(...a);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const rotate=(t,v)=>[0,1,2].map(i=>[0,1,2].reduce((s,j)=>s+t[i*4+j]*v[j],0));
  function rotation(axis,q){const n=norm(axis),[x,y,z]=axis.map(v=>v/n),c=Math.cos(q),s=Math.sin(q),d=1-c;return [c+x*x*d,x*y*d-z*s,x*z*d+y*s,0,y*x*d+z*s,c+y*y*d,y*z*d-x*s,0,z*x*d-y*s,z*y*d+x*s,c+z*z*d,0,0,0,0,1];}
  function fk(model,q,base=[0,0,0]){
    const t=rotation([0,0,1],base[2]);t[3]=base[0];t[7]=base[1];
    const links={[model.root]:mul(t,model.rootTransform)},frames={};let pending=model.joints.slice();
    while(pending.length){const next=[];for(const j of pending){if(!links[j.parent]){next.push(j);continue;}const f=mul(links[j.parent],j.t0);frames[j.name]={p:pos(f),axis:rotate(f,j.axis)};const motion=j.type==='fixed'?eye():rotation(j.axis,q[j.name]??0);links[j.child]=mul(mul(f,motion),inv(j.t1));}if(next.length===pending.length)throw Error('Disconnected or cyclic joint tree');pending=next;}
    return {links,frames};
  }
  function jacobian(model,q,names,tool,base=[0,0,0]){const f=fk(model,q,base),p=pos(f.links[tool]),ancestors=new Set();let link=tool;while(link!==model.root){const j=model.joints.find(j=>j.child===link);if(!j)throw Error('Unknown tool');if(j.type!=='fixed')ancestors.add(j.name);link=j.parent;}return Array.from({length:6},(_,row)=>names.map(n=>{if(!ancestors.has(n))return 0;const a=f.frames[n];return row<3?cross(a.axis,sub(p,a.p))[row]:a.axis[row-3];}));}
  function swerve(modules,cmd,previous){return modules.map((m,i)=>{const x=cmd[0]-cmd[2]*m.y,y=cmd[1]+cmd[2]*m.x,speed=Math.hypot(x,y)/.07;if(speed<1e-10)return {angle:previous[i],speed:0};const a=Math.atan2(y,x),candidates=[];for(let k=-2;k<=2;k++){const angle=a+k*Math.PI;if(Math.abs(angle)<=2.97)candidates.push({angle,speed:speed*(k%2===0?1:-1)});}return candidates.sort((a,b)=>Math.abs(a.angle-previous[i])-Math.abs(b.angle-previous[i]))[0];});}
  function baseStep(p,cmd,dt){const [vx,vy,w]=cmd,yaw=p[2],a=w*dt;let x=vx*dt,y=vy*dt;if(Math.abs(w)>1e-10){x=(vx*Math.sin(a)+vy*(Math.cos(a)-1))/w;y=(vx*(1-Math.cos(a))+vy*Math.sin(a))/w;}return [p[0]+Math.cos(yaw)*x-Math.sin(yaw)*y,p[1]+Math.sin(yaw)*x+Math.cos(yaw)*y,yaw+a];}
  function solve(a,b){const n=b.length,m=a.map((r,i)=>r.concat(b[i]));for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(m[k][i])>Math.abs(m[p][i]))p=k;[m[i],m[p]]=[m[p],m[i]];const d=m[i][i];if(Math.abs(d)<1e-15)throw Error('Singular linear system');for(let k=i;k<=n;k++)m[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){const v=m[j][i];for(let k=i;k<=n;k++)m[j][k]-=v*m[i][k];}}return m.map(r=>r[n]);}
  function dls(J,v,lambda){if(!v.every(Number.isFinite)||!J.flat().every(Number.isFinite)||!(lambda>0))throw Error('Invalid input');const m=J.length,n=J[0].length;const a=Array.from({length:m},(_,i)=>Array.from({length:m},(_,j)=>J[i].reduce((s,x,k)=>s+x*J[j][k],0)+(i===j?lambda*lambda:0)));const u=solve(a,v);return Array.from({length:n},(_,j)=>J.reduce((s,r,i)=>s+r[j]*u[i],0));}
  function integrate(q,dq,bounds,dt,maxSpeed){return q.map((x,i)=>Math.max(bounds[i][0],Math.min(bounds[i][1],x+Math.max(-maxSpeed,Math.min(maxSpeed,dq[i]))*dt)));}
  const api={eye,mul,inv,pos,sub,norm,cross,rotate,rotation,fk,jacobian,dls,integrate,swerve,baseStep};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.G2K=api;
})(globalThis);
