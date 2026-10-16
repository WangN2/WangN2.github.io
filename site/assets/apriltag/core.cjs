(function(root,factory){
 if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./tag36h11.cjs'));
 else root.AprilTagCore=factory(root.AprilTag36h11);
})(globalThis,function(family){
 'use strict';
 const {codes,bits}=family;
 const cloneGrid=grid=>grid.map(row=>row.slice());
 function gridForId(id){
  if(!Number.isInteger(id)||id<0||id>=codes.length)throw Error('tag36h11 ID 必须在 0–586 之间');
  const grid=Array.from({length:6},()=>Array(6).fill(false)),code=codes[id];
  bits.forEach(([x,y],i)=>{grid[y-1][x-1]=Boolean((code>>BigInt(35-i))&1n);});
  return grid;
 }
 function codeFromGrid(grid){
  if(!Array.isArray(grid)||grid.length!==6||grid.some(row=>!Array.isArray(row)||row.length!==6))throw Error('需要 6×6 数据网格');
  let code=0n;
  for(const [x,y] of bits)code=(code<<1n)|BigInt(grid[y-1][x-1]?1:0);
  return code;
 }
 function rotateGrid(grid,turns){
  let out=cloneGrid(grid),k=((turns%4)+4)%4;
  while(k--){const next=Array.from({length:6},()=>Array(6));for(let r=0;r<6;r++)for(let c=0;c<6;c++)next[r][c]=out[5-c][r];out=next;}
  return out;
 }
 function hamming(a,b){let x=a^b,n=0;while(x){x&=x-1n;n++;}return n;}
 function decodeGrid(observed,maxHamming=5){
  let best={id:-1,hamming:37,rotation:0,ties:0};
  for(let rotation=0;rotation<4;rotation++){
   const code=codeFromGrid(rotateGrid(observed,rotation));
   for(let id=0;id<codes.length;id++){
    const distance=hamming(code,codes[id]);
    if(distance<best.hamming)best={id,hamming:distance,rotation,ties:1};
    else if(distance===best.hamming)best.ties++;
   }
  }
  return {...best,accepted:best.hamming<=maxHamming&&best.ties===1};
 }
 function flipCells(grid,indices){
  const out=cloneGrid(grid);
  for(const index of indices){if(!Number.isInteger(index)||index<0||index>=36)throw Error('数据格索引无效');out[Math.floor(index/6)][index%6]=!out[Math.floor(index/6)][index%6];}
  return out;
 }
 function injectErrors(grid,count,seed=1){
  if(!Number.isInteger(count)||count<0||count>36)throw Error('错误位数必须在 0–36 之间');
  let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const indices=Array.from({length:36},(_,i)=>i);
  for(let i=35;i>0;i--){const j=Math.floor(random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  const selected=indices.slice(0,count).sort((a,b)=>a-b);
  return {grid:flipCells(grid,selected),indices:selected};
 }
 function solve(a,b){
  const n=b.length,m=a.map((row,i)=>row.concat(b[i]));
  for(let col=0;col<n;col++){
   let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(m[row][col])>Math.abs(m[pivot][col]))pivot=row;
   [m[col],m[pivot]]=[m[pivot],m[col]];
   const d=m[col][col];if(Math.abs(d)<1e-12)throw Error('角点构成退化单应矩阵');
   for(let j=col;j<=n;j++)m[col][j]/=d;
   for(let row=0;row<n;row++)if(row!==col){const v=m[row][col];for(let j=col;j<=n;j++)m[row][j]-=v*m[col][j];}
  }
  return m.map(row=>row[n]);
 }
 const add=(a,b)=>a.map((v,i)=>v+b[i]);
 const scale=(a,s)=>a.map(v=>v*s);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const norm=a=>Math.hypot(...a);
 const normalize=a=>scale(a,1/norm(a));
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function rotationFromDegrees(angles){
  const [rx,ry,rz]=angles.map(v=>v*Math.PI/180),cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  return [
   cz*cy,cz*sy*sx-sz*cx,cz*sy*cx+sz*sx,
   sz*cy,sz*sy*sx+cz*cx,sz*sy*cx-cz*sx,
   -sy,cy*sx,cy*cx
  ];
 }
 function rotationToDegrees(R){
  const ry=Math.asin(Math.max(-1,Math.min(1,-R[6]))),cy=Math.cos(ry);
  const rx=Math.abs(cy)>1e-8?Math.atan2(R[7],R[8]):Math.atan2(-R[5],R[4]);
  const rz=Math.abs(cy)>1e-8?Math.atan2(R[3],R[0]):Math.atan2(-R[1],R[2]);
  return [rx,ry,rz].map(v=>v*180/Math.PI);
 }
 function transformPoint(R,t,p){return [0,1,2].map(i=>R[i*3]*p[0]+R[i*3+1]*p[1]+R[i*3+2]*(p[2]||0)+t[i]);}
 function projectPoint(p,K){
  if(!(p[2]>1e-8))throw Error('点位于相机后方或深度为零');
  return [K.fx*p[0]/p[2]+K.cx,K.fy*p[1]/p[2]+K.cy];
 }
 function tagCorners(size){
  if(!(size>0))throw Error('标签尺寸必须大于零');
  const h=size/2;return [[-h,-h],[h,-h],[h,h],[-h,h]];
 }
 function projectCorners(R,t,size,K){return tagCorners(size).map(p=>projectPoint(transformPoint(R,t,p),K));}
 function homographyFromCorners(objectPoints,pixels,K){
  if(objectPoints.length!==4||pixels.length!==4)throw Error('平面单应估计需要四个对应点');
  const a=[],b=[];
  for(let i=0;i<4;i++){
   const [x,y]=objectPoints[i],u=(pixels[i][0]-K.cx)/K.fx,v=(pixels[i][1]-K.cy)/K.fy;
   a.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
   a.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
  }
  const h=solve(a,b);return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
 }
 function decomposeHomography(H){
  let h1=[H[0],H[3],H[6]],h2=[H[1],H[4],H[7]],h3=[H[2],H[5],H[8]];
  let lambda=2/(norm(h1)+norm(h2));if(lambda*h3[2]<0)lambda=-lambda;
  const raw1=scale(h1,lambda),raw2=scale(h2,lambda),r1=normalize(raw1),r2=normalize(add(raw2,scale(r1,-dot(raw2,r1)))),r3=cross(r1,r2),t=scale(h3,lambda);
  return {R:[r1[0],r2[0],r3[0],r1[1],r2[1],r3[1],r1[2],r2[2],r3[2]],t};
 }
 function estimatePose(objectPoints,pixels,K){return decomposeHomography(homographyFromCorners(objectPoints,pixels,K));}
 function reprojectionError(objectPoints,pixels,pose,K){
  let sum=0;for(let i=0;i<objectPoints.length;i++){const q=projectPoint(transformPoint(pose.R,pose.t,objectPoints[i]),K),dx=q[0]-pixels[i][0],dy=q[1]-pixels[i][1];sum+=dx*dx+dy*dy;}
  return Math.sqrt(sum/objectPoints.length);
 }
 function rotationErrorDegrees(a,b){
  const delta=Array(9).fill(0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)delta[i*3+j]+=a[i*3+k]*b[j*3+k];
  return Math.acos(Math.max(-1,Math.min(1,(delta[0]+delta[4]+delta[8]-1)/2)))*180/Math.PI;
 }
 const api={gridForId,codeFromGrid,rotateGrid,hamming,decodeGrid,flipCells,injectErrors,rotationFromDegrees,rotationToDegrees,transformPoint,projectPoint,tagCorners,projectCorners,homographyFromCorners,decomposeHomography,estimatePose,reprojectionError,rotationErrorDegrees};
 return api;
});
