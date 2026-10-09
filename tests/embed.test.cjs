const {test}=require('node:test'),assert=require('node:assert/strict');
const {validatedHeight}=require('../site/assets/embed.cjs');
test('only bounded same-origin child resize messages are accepted',()=>{
 const origin='https://example.org',child={},event={origin,source:child,data:{type:'wangn2:g2:resize',height:1200}};
 assert.equal(validatedHeight(event,origin,child),1200);
 for(const bad of [{...event,source:{}},{...event,origin:'https://other.org'},null,{...event,data:null},
  ...[Infinity,NaN,-1,199,12001,'1200',null].map(height=>({...event,data:{...event.data,height}})),
  {...event,data:{type:'unknown',height:1200}}]) assert.equal(validatedHeight(bad,origin,child),null);
});
