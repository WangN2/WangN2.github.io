(()=>{
 const frame=document.getElementById('g2-demo');
 window.addEventListener('message',event=>{
  const height=G2Embed.validatedHeight(event,location.origin,frame.contentWindow);
  if(height!==null&&frame.style.height!==height+'px')frame.style.height=height+'px';
 });
})();
