const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../site');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const notes=['notes/kinematics.html','notes/collision-envelope.html','notes/apriltag.html','notes/tray-grasp.html','notes/swerve-base.html','notes/hand-eye.html','notes/costmap.html','notes/grasp-timeline.html'];
function body(s){return s.slice(s.indexOf('<article'),s.indexOf('</article>'));}
function plain(html){return html.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<[^>]+>/g,' ');}
function minutes(html){
 const text=plain(body(html)),cjk=(text.match(/[\u4e00-\u9fff]/g)||[]).length,
  latin=(text.match(/[A-Za-z][A-Za-z0-9_.+-]*/g)||[]).length;
 return Math.max(1,Math.ceil(cjk/400+latin/220));
}
test('each note publishes a real date, a reading estimate and a section label',()=>{
 for(const note of notes){
  const s=read(note),meta=s.match(/<div class="article-meta">([\s\S]*?)<\/div>/);
  assert.ok(meta,note+' article meta');
  const date=meta[1].match(/<time datetime="(\d{4}-\d{2}-\d{2})">\1<\/time>/);
  assert.ok(date,note+' time element must use a machine readable date');
  assert.ok(!Number.isNaN(Date.parse(date[1])),note+' unparsable date');
  assert.ok(date[1]<='2026-10-23',note+' date cannot be in the future');
  const shown=Number(meta[1].match(/约 (\d+) 分钟/)[1]);
  const expected=minutes(s.replace(/<div class="article-meta">[\s\S]*?<\/div>/,'').replace(/<nav class="toc"[\s\S]*?<\/nav>/,''));
  assert.ok(Math.abs(shown-expected)<=1,`${note}: stated ${shown} min, text computes ${expected} min`);
  const ld=JSON.parse(s.match(/<script type="application\/ld\+json">(\{[\s\S]*?\})<\/script>/)[1]);
  assert.equal(ld.datePublished,date[1],note+' structured data must agree with the visible date');
  assert.match(ld.dateModified,/^\d{4}-\d{2}-\d{2}$/);
  assert.match(s,new RegExp('<meta property="article:published_time" content="'+date[1]+'">'));
 }
});
test('every table-of-contents entry points at a heading that exists',()=>{
 for(const note of notes){
  const s=read(note),toc=s.match(/<nav class="toc"[\s\S]*?<\/nav>/);
  assert.ok(toc,note+' needs a table of contents');
  // collision-title belongs to the interactive viewer widget, not to the article outline.
  const ids=new Set([...s.matchAll(/<h2 id="([^"]+)"/g)].map(m=>m[1]).filter(id=>id!=='collision-title'));
  const links=[...toc[0].matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length>=4,note+' toc too short');
  assert.equal(new Set(links).size,links.length,note+' duplicate toc entries');
  for(const id of links)assert.ok(ids.has(id),note+' toc → #'+id+' has no target');
  assert.equal(ids.size,links.length,note+' every section heading should be listed once');
  const titles=[...toc[0].matchAll(/<a href="#[^"]+">([^<]+)<\/a>/g)].map(m=>m[1]);
  for(const title of titles)assert.ok(plain(s).includes(plain(title).trim()),note+' toc label drifted from heading: '+title);
 }
});
test('notes form one series with consistent previous and next links',()=>{
 const titles={};
 for(const note of notes){
  const s=read(note),nav=s.match(/<nav class="note-nav" aria-label="笔记导航">([\s\S]*?)<\/nav>/);
  assert.ok(nav,note+' needs series navigation');
  titles[note]=[...nav[1].matchAll(/href="\.\/([^"]+)"/g)].map(m=>m[1]);
 }
 for(const [note,links] of Object.entries(titles))
  for(const target of links)assert.ok(notes.includes('notes/'+target),note+' links outside the series: '+target);
 // Junction notes must be reachable both ways, and nothing may point at itself.
 for(const note of notes){
  const name=path.basename(note);
  for(const target of titles[note]){
   assert.notEqual(target,name,note+' links to itself');
   const back=titles['notes/'+target];
   assert.ok(back.includes(name),`${note} → ${target} is not reciprocated`);
  }
 }
 for(const note of notes)assert.ok(titles[note].length>=1,note+' is orphaned');
});
test('homepage cards advertise the same dates and reading times as the notes',()=>{
 const home=read('index.html');
 const cards=[...home.matchAll(/<a class="article-card" href="\.\/(notes\/[^"]+)">([\s\S]*?)<\/a>/g)];
 assert.equal(cards.length,8);
 for(const [,href,markup] of cards){
  const time=markup.match(/<time datetime="(\d{4}-\d{2}-\d{2})">/);
  assert.ok(time,href+' card needs a date');
  const note=read(href);
  assert.ok(note.includes('<time datetime="'+time[1]+'">'),href+' card date must match the note');
  const shown=markup.match(/约 (\d+) 分钟/);
  assert.ok(shown,href+' card needs a reading time');
  assert.ok(note.includes('约 '+shown[1]+' 分钟'),href+' card reading time must match the note');
 }
});
