const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {notes, featured, categories, topics, routes} = require('../content/notes.json');
const bySlug = new Map(notes.map(note => [note.slug, note]));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function render(file, block, html) {
  const target = path.join(root, file);
  const source = fs.readFileSync(target, 'utf8');
  const start = '<!-- ' + block + ':start -->';
  const end = '<!-- ' + block + ':end -->';
  const from = source.indexOf(start), to = source.indexOf(end);
  if (from < 0 || to < from) throw Error('Missing ' + block + ' in ' + file);
  fs.writeFileSync(target, source.slice(0, from) + start + '\n' + html + '\n' + source.slice(to));
}

function card(note, prefix, heading) {
  return `<a class="article-card" href="${prefix}/notes/${note.slug}.html"><div data-topics="${note.topics.join(' ')}"><p class="eyebrow">${note.topics.join(' · ')}</p><${heading}>${escape(note.title)}</${heading}><p class="summary">${escape(note.summary)}</p><small><time datetime="${note.date}">${note.date}</time> · 约 ${note.minutes} 分钟</small></div></a>`;
}

render('site/index.html', 'inventory', '<div class="featured-grid">' +
  featured.map(slug => card(bySlug.get(slug), '.', 'h3')).join('\n') +
  `</div><p class="browse-all"><a href="./series/">查看全部 ${notes.length} 篇笔记 →</a></p>`);

function select(id, label, choices) {
  return `<label>${label}<select id="${id}"><option value="">全部</option>${choices.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
}

const routeLists = Object.entries(routes).map(([id, route]) =>
  `<div><h3>${route.label} · ${route.steps.length} 篇</h3><nav id="${id}-route" aria-label="${route.label}阅读路线">${route.steps.map(slug =>
    `<a href="../notes/${slug}.html?route=${id}">${escape(bySlug.get(slug).title)}</a>`).join(' → ')}</nav></div>`);
const sections = Object.entries(categories).map(([id, label]) => {
  const group = notes.filter(note => note.category === id);
  return `<section class="note-category" data-category="${id}" id="${id}"><h2>${label} · ${group.length} 篇</h2>\n${group.map(note => card(note, '..', 'h3')).join('\n')}\n</section>`;
});
const collectionCopy = {
  basics: ['FOUNDATIONS', '理解机器人如何运动与感知'],
  models: ['MODELS', '探索学习、推理与行动'],
  applications: ['IN PRACTICE', '把方法带到真实场景']
};
const collections = Object.entries(categories).map(([id, label]) => {
  const count = notes.filter(note => note.category === id).length;
  const [name, description] = collectionCopy[id];
  return `<div class="collection" data-collection="${id}"><span class="collection-label">${name}</span><button type="button" class="collection-orb" data-open-category="${id}" aria-expanded="false" aria-controls="${id}"><strong>${label}</strong><span>${count} 篇笔记</span></button><p>${description}</p></div>`;
}).join('');
render('site/series/index.html', 'inventory', `<div class="collections" aria-label="探索笔记分类" hidden>${collections}</div>
<p class="collection-help" hidden>悬停探索 · 点击固定展开 · 再次点击取消固定</p>
<div class="library-controls" hidden><label>搜索笔记<input id="query" type="search" placeholder="标题、关键词，如 AprilTag"></label>${select('topic','主题',topics.map(t=>[t,t]))}${select('category','类别',Object.entries(categories))}<output aria-live="polite"></output></div>
<details id="chain" class="routes"><summary>按路线读 · 工程入门与模型进阶</summary>${routeLists.join('\n')}</details>
<div class="library-heading"><h2 id="all">全部笔记</h2><button type="button" class="show-all" hidden>查看全部</button></div>${sections.join('\n')}`);

for (const note of notes) {
  const files = ['site/notes/' + note.slug + '.html'];
  if (note.slug === 'sam-visp-visual-servo') files.push('templates/sam-visp-note.html');
  const related = notes.filter(n => n !== note && n.topics.some(t => note.topics.includes(t)))
    .sort((a,b) => Number(b.category === note.category) - Number(a.category === note.category)).slice(0, 2);
  const general = `<nav class="note-nav" aria-label="笔记导航"><a href="../series/" data-library>返回笔记库</a>${related.map(n => `<a href="./${n.slug}.html"><small>相关阅读</small>${escape(n.title)}</a>`).join('')}</nav>`;
  const contextual = [];
  for (const [id, route] of Object.entries(routes)) {
    const i = route.steps.indexOf(note.slug);
    if (i < 0) continue;
    const links = [[i-1,'上一篇'],[i+1,'下一篇']].filter(([index]) => route.steps[index]).map(([index,label])=>{
      const next = bySlug.get(route.steps[index]);
      return `<a href="./${next.slug}.html?route=${id}"><small>${label}</small>${escape(next.title)}</a>`;
    });
    contextual.push(`<nav class="note-nav" hidden data-route="${id}" aria-label="${route.label}"><a href="../series/#${id}-route">${route.label} · 第 ${i+1}/${route.steps.length} 篇</a>${links.join('')}</nav>`);
  }
  for (const file of files) {
    render(file,'breadcrumb',`<nav class="crumb" aria-label="当前位置"><a href="../series/" data-library>笔记库</a> › <a href="../series/?topic=${encodeURIComponent(note.topics[0])}">${note.topics[0]}</a></nav>`);
    render(file,'navigation',[general,...contextual].join('\n'));
  }
}
