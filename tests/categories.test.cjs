const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../site',f),'utf8');
const groups={basics:['kinematics','swerve-base','apriltag','hand-eye','collision-envelope','costmap','nvjpeg','optimizer-muon','cuda'],models:['lingbot-vla2','vla-g2-deploy','genie4-vs-astra'],applications:['tray-grasp','grasp-timeline','train-5k']};
for(const file of ['index.html','series/index.html']){
 test(file+' lists all ten notes once in approved nine/three/three categories',()=>{
  const html=read(file), all=[];
  for(const [id,expected] of Object.entries(groups)){
   const section=html.match(new RegExp('<section[^>]+data-category="'+id+'"[^>]*>([\\s\\S]*?)</section>'));
   assert.ok(section,'missing '+id+' category');
   const listed=[...section[1].matchAll(/class="article-card" href="[^\"]*\/notes\/([^\"]+)\.html"/g)].map(m=>m[1]);
   assert.deepEqual(listed,expected);all.push(...listed);
   assert.ok(section[1].includes(expected.length+' 篇'),'visible count');
  }
  assert.equal(new Set(all).size,15);
  assert.doesNotMatch(html, /八篇基础|基础八篇|中间不要跳|前八篇串起/);
 });
 test(file+' exposes separate optional engineering and model routes',()=>{
  const html=read(file);assert.match(html,/工程入门/);assert.match(html,/模型进阶/);
  assert.match(html,/料盘抓取不依赖 LingBot-VLA/);
  assert.match(html,/学习型具身/);
 });
}
test('series engineering route follows perception-to-grasp and model route remains separate',()=>{
 const s=read('series/index.html');
 const route=s.match(/<nav[^>]*id="engineering-route"[^>]*>([\s\S]*?)<\/nav>/);assert.ok(route);
 assert.deepEqual([...route[1].matchAll(/href="\.\.\/notes\/([^\"]+)\.html"/g)].map(m=>m[1]),['kinematics','apriltag','hand-eye','tray-grasp','grasp-timeline']);
 for(const id of ['chain','all','by-question','howto','whats-not'])assert.ok(s.includes('id="'+id+'"'));
 const title=s.match(/<h1>(.*?)<\/h1>/)[1];
 const data=JSON.parse(s.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(data.name,title);
 for(const field of ['og:title','twitter:title'])assert.ok(s.includes('content="'+title+' · WangN2 机器人技术笔记"'));
});
