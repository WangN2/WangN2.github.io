const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../site',f),'utf8');
const groups={basics:['kinematics','swerve-base','apriltag','hand-eye','collision-envelope','costmap','nvjpeg','optimizer-muon','cuda','calibration','cem','data-formats','cam-calibration'],models:['lingbot-vla2','vla-g2-deploy','genie4-vs-astra','ensemble','training-stack','harnessvln'],applications:['tray-grasp','grasp-timeline','train-5k','astra-robot-admission','embodied-data','astra-g2-autonomous-navigation']};
for(const file of ['index.html','series/index.html']){
 test(file+' lists all twenty-five notes once in approved thirteen/six/six categories',()=>{
  const html=read(file), all=[];
  for(const [id,expected] of Object.entries(groups)){
   const section=html.match(new RegExp('<section[^>]+data-category="'+id+'"[^>]*>([\\s\\S]*?)</section>'));
   assert.ok(section,'missing '+id+' category');
   const listed=[...section[1].matchAll(/class="article-card" href="[^\"]*\/notes\/([^\"]+)\.html"/g)].map(m=>m[1]);
   assert.deepEqual(listed,expected);all.push(...listed);
   assert.ok(section[1].includes(expected.length+' 篇'),'visible count');
  }
  assert.equal(new Set(all).size,25);
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

test('hero line and category chips agree with the real card counts on every index page',()=>{
 // 这句话和这排胶囊里的数字是写死的，不随卡片自动更新——每次加笔记都要人改，
 // 而且首页和系列页各有一份。用测试同时盯住两处：一旦和实际卡片数对不上就报错。
 for(const file of ['index.html','series/index.html']){
  const s=read(file), actual={};
  for(const id of Object.keys(groups)){
   const section=s.match(new RegExp('<section[^>]+data-category="'+id+'"[^>]*>([\\s\\S]*?)</section>'));
   assert.ok(section,file+' missing '+id);
   actual[id]=[...section[1].matchAll(/class="article-card" href="[^\"]*\/notes\/([^\"]+)\.html"/g)].length;
  }
  const line=s.match(/(\d+) 篇基础、(\d+) 篇模型、(\d+) 篇应用/);
  assert.ok(line,file+': hero line should state the three counts');
  assert.deepEqual([+line[1],+line[2],+line[3]],[actual.basics,actual.models,actual.applications],file+' hero line drifted');
  const chips=s.match(/<nav class="category-nav"[\s\S]*?<\/nav>/)[0];
  for(const [id,label] of [['basics','基础篇'],['models','模型篇'],['applications','应用篇']]){
   const m=chips.match(new RegExp(label+' · (\\d+)'));
   assert.ok(m,file+' '+label+' chip missing');
   assert.equal(+m[1],actual[id],file+' '+label+' chip count');
  }
 }
});
