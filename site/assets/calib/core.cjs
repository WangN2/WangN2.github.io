/* Local rotation-vector alignment information, with unit isotropic residual weights.
 * This is a teaching proxy, not the full SE(3) hand-eye Hessian or a covariance. */
(function(root){
 function rotationInformation(vectors){
  const H=[[0,0,0],[0,0,0],[0,0,0]];
  for(const a of vectors){
   const n2=a.reduce((s,v)=>s+v*v,0);
   for(let i=0;i<3;i++)for(let j=0;j<3;j++)H[i][j]+=(i===j?n2:0)-a[i]*a[j];
  }
  return H;
 }
 function circularErrorMm(radiusM,angularSpeedDegS,offsetMs){
  return 2000*radiusM*Math.abs(Math.sin(angularSpeedDegS*Math.PI/180*offsetMs/2000));
 }
 const api={rotationInformation,circularErrorMm};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.CalibrationMath=api;
})(typeof globalThis!=='undefined'?globalThis:this);
