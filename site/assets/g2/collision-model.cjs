(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.G2Collision=api;})(globalThis,()=>{
 const groups=['base','left','right','body'];
 function validateSnapshot(data){
  if(!data||data.version!==1||!Number.isFinite(data.originalBaseInflation)||data.originalBaseInflation<0||!Array.isArray(data.spheres)||!data.spheres.length)throw Error('Invalid collision snapshot');
  const ids=new Set();
  for(const s of data.spheres){
   if(!s||!Number.isInteger(s.id)||s.id<0||ids.has(s.id)||!groups.includes(s.group)||!Number.isFinite(s.r)||s.r<=0||!Array.isArray(s.c)||s.c.length!==3||!s.c.every(Number.isFinite)||(s.group==='base'&&s.r<=data.originalBaseInflation))throw Error('Invalid collision sphere');
   ids.add(s.id);
  }
  return data;
 }
 function radiusFor(s,inflation,originalInflation){
  if(!Number.isFinite(inflation)||inflation<0)throw Error('Invalid inflation');
  return s.group==='base'?s.r-originalInflation+inflation:s.r;
 }
 function project(p,yaw,elevation){
  const u=p[0]*Math.cos(yaw)-p[1]*Math.sin(yaw),v=p[0]*Math.sin(yaw)+p[1]*Math.cos(yaw),z=p[2]-.65;
  return [u,z*Math.cos(elevation)-v*Math.sin(elevation),z*Math.sin(elevation)+v*Math.cos(elevation)];
 }
 return {validateSnapshot,radiusFor,project};
});
