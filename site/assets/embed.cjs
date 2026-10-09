(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.G2Embed=api;})(globalThis,()=>{
 function validatedHeight(event,origin,child){
  if(!event||!child||event.source!==child||event.origin!==origin)return null;
  const d=event.data;if(!d||d.type!=='wangn2:g2:resize'||!Number.isFinite(d.height)||d.height<200||d.height>12000)return null;
  return Math.ceil(d.height);
 }
 return {validatedHeight};
});
