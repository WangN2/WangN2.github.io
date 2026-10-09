const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('standalone demo exposes all groups and uses bundled resources',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../site/demos/g2/index.html'),'utf8');
 for(const id of ['g2-group','g2-tool','g2-grip','g2-base-actions','g2-model'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(!html.includes('https://cdn.'));
 assert.ok(html.includes('three-r128.min.js'));
});
