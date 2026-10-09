const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../site');
test('homepage has approved identity, live demo and real article',()=>{
 const s=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const text of ['WangN2 · 机器人技术笔记','记录机器人运动控制、导航与仿真的学习和实践','id="about"','id="lab"','id="notes"','id="g2-demo"','src="./demos/g2/index.html"','href="./demos/g2/index.html"','href="./notes/kinematics.html"']) assert.ok(s.includes(text),text);
});
test('all HTML local resource and navigation links resolve within site',()=>{
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const file of walk(root).filter(f=>f.endsWith('.html'))){
  for(const [,url] of fs.readFileSync(file,'utf8').matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(https?:|#)/.test(url))continue;
   const target=path.resolve(path.dirname(file),url.split(/[?#]/)[0]);
   assert.ok(target.startsWith(root+path.sep),url);assert.ok(fs.existsSync(target),path.relative(root,file)+' → '+url);
  }
 }
});
