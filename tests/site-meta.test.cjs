const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../site'),origin='https://wangn2.github.io';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pages=walk(root).filter(f=>f.endsWith('.html')).map(f=>'/'+path.relative(root,f).split(path.sep).join('/'));
const published=pages.filter(p=>p!=='/404.html');
const canonicalFor=p=>p==='/index.html'?'/':p;
test('every published page carries canonical, social and icon metadata',()=>{
 assert.ok(published.length>=6,published.join());
 for(const page of published){
  const s=fs.readFileSync(path.join(root,page.slice(1)),'utf8'),url=origin+canonicalFor(page);
  const has=(pattern,label)=>assert.match(s,pattern,page+' missing '+label);
  has(/<title>[^<]{4,120}<\/title>/,'title');
  has(/<meta name="description" content="[^"]{20,200}">/,'description');
  has(/<meta name="viewport" content="width=device-width,\s*initial-scale=1">/,'viewport');
  has(new RegExp('<link rel="canonical" href="'+url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'">'),'canonical '+url);
  has(/<meta property="og:type" content="(?:website|article)">/,'og:type');
  has(/<meta property="og:title" content="[^"]+">/,'og:title');
  has(/<meta property="og:description" content="[^"]+">/,'og:description');
  has(new RegExp('<meta property="og:url" content="'+url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'">'),'og:url');
  has(/<meta property="og:image" content="https:\/\/wangn2\.github\.io\/assets\/og\.png">/,'og:image');
  has(/<meta property="og:image:width" content="1200">/,'og:image:width');
  has(/<meta property="og:image:height" content="630">/,'og:image:height');
  has(/<meta name="twitter:card" content="summary_large_image">/,'twitter:card');
  has(/<meta name="twitter:image" content="https:\/\/wangn2\.github\.io\/assets\/og\.png">/,'twitter:image');
  has(/<meta name="theme-color" content="#[0-9a-f]{6}">/,'theme-color');
  has(/<link rel="icon" href="[^"]*assets\/favicon\.svg" type="image\/svg\+xml">/,'svg favicon');
  has(/<link rel="apple-touch-icon" href="[^"]*assets\/apple-touch-icon\.png">/,'apple touch icon');
  assert.ok(!s.includes('<!--meta-->')||s.indexOf('<!--meta-->')<s.indexOf('</head>')||!s.includes('</head>'),page+' metadata must stay inside head');
 }
});
test('share image, icons and 404 page are real files',()=>{
 const png=fs.readFileSync(path.join(root,'assets/og.png'));
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 for(const f of ['assets/favicon.svg','assets/favicon.ico','assets/apple-touch-icon.png','assets/hero-g2.webp'])
  assert.ok(fs.statSync(path.join(root,f)).size>0,f);
 const notFound=fs.readFileSync(path.join(root,'404.html'),'utf8');
 assert.match(notFound,/<meta name="robots" content="noindex">/);
 assert.ok(!/<link rel="stylesheet" href="(?!style)/.test(notFound),'404 must not depend on relative stylesheets');
 assert.match(notFound,/<a[^>]+href="\/notes\/apriltag\.html"/);
});
test('sitemap and robots describe exactly the published pages',()=>{
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 assert.match(sitemap,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
 const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.deepEqual(new Set(locs),new Set(published.map(p=>origin+canonicalFor(p))),'sitemap entries must match published pages');
 assert.equal(locs.length,new Set(locs).size,'sitemap must not repeat urls');
 for(const url of locs)assert.match(url,/^https:\/\/wangn2\.github\.io\//);
 const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
 assert.match(robots,/^User-agent: \*$/m);assert.match(robots,/^Sitemap: https:\/\/wangn2\.github\.io\/sitemap\.xml$/m);
});
test('text palette meets WCAG AA contrast in both paper and white contexts',()=>{
 const css=fs.readFileSync(path.join(root,'assets/site.css'),'utf8');
 const token=name=>css.match(new RegExp('--'+name+':(#[0-9a-f]{6})'))[1];
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);};
 for(const bg of [token('paper'),'#ffffff']){
  assert.ok(ratio(token('ink'),bg)>=7,'ink on '+bg);
  assert.ok(ratio(token('muted'),bg)>=4.5,'muted on '+bg);
  assert.ok(ratio(token('blue'),bg)>=4.5,'blue on '+bg);
 }
 assert.ok(ratio('#ffffff',token('blue'))>=4.5,'button label');
 assert.match(css,/\.article p a[^{]*\{text-decoration:underline/,'in-text links need a non-color cue');
});

test('homepage selection summary matches the guide dataset',()=>{
 const guide=fs.readFileSync(path.join(root,'guide/index.html'),'utf8');
 const raw=guide.match(/<script type="application\/json" id="guide-data">([\s\S]*?)<\/script>/);
 assert.ok(raw,'guide must embed its dataset');
 const data=JSON.parse(raw[1]);
 const total=data.weights.reduce((s,w)=>s+w.w,0);
 const score=r=>data.weights.reduce((s,w)=>s+w.w*(r.scores[w.id]||0),0)/total;
 const top=data.robots.filter(r=>r.eligible).sort((a,b)=>score(b)-score(a)).slice(0,3)
  .map(r=>[score(r).toFixed(2),r.model]);
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const block=home.match(/<div class="guide-teaser-top">([\s\S]*?)<\/div>/);
 assert.ok(block,'homepage must show the current top three');
 const shown=[...block[1].matchAll(/<b>([\d.]+)<\/b><span class="nm">([^<]+)<\/span>/g)].map(m=>[m[1],m[2].trim()]);
 assert.deepEqual(shown,top,'homepage picks must track the guide ranking; regenerate them after any data change');
});

test('core layout rules are still present in the stylesheet',()=>{
 const css=fs.readFileSync(path.join(root,'assets/site.css'),'utf8');
 // 用带特征值的片段而不是选择器名：同名规则在移动端媒体查询里也有一份，
 // 只查选择器名的话，桌面版被整段删掉也发现不了（真发生过一次）。
 const desktop=[
  ['首页笔记卡片','.article-card{position:relative;display:grid;grid-template-columns:80px 1fr'],
  ['卡片悬停','.article-card:hover{text-decoration:none;border-color:#9bbbd4'],
  ['卡片序号','.article-index{font:32px Georgia,serif'],
  ['卡片阅读链接','.read-link{font-size:13px;color:var(--blue)}'],
  ['卡片右上箭头','.card-arrow{position:absolute;right:32px;top:32px'],
  ['页脚','.site-footer{border-top:1px solid var(--line);padding:30px 0 40px'],
  ['文章版心','.article{max-width:760px;margin:54px auto 72px}'],
  ['文章标题','.article h1{font-size:38px;margin:20px 0}'],
  ['文章导语','.article .lede{font-size:18px;color:var(--muted);margin-bottom:36px}']
 ];
 for(const [name,fragment] of desktop)assert.ok(css.includes(fragment),'桌面样式丢失：'+name+'（'+fragment.slice(0,32)+'…）');
 for(const sel of ['.toc{','.note-nav{','.guide-teaser{','.guide-teaser-top{','.hero-visual{'])
  assert.ok(css.includes(sel),'stylesheet lost '+sel);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'unbalanced braces in site.css');
});
