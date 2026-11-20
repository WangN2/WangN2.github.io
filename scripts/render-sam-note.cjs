// Regenerate the article with npm run render:sam (requires npm ci).
const fs=require('node:fs'),path=require('node:path'),katex=require('katex');
const root=path.join(__dirname,'..');
let source=fs.readFileSync(path.join(root,'templates/sam-visp-note.html'),'utf8');
source=source.replace(/\\\[([\s\S]*?)\\\]/g,(_,tex)=>katex.renderToString(tex,{displayMode:true,throwOnError:true,strict:'error',output:'htmlAndMathml'}));
source=source.replace(/\\\(([\s\S]*?)\\\)/g,(_,tex)=>'<span class="math-inline">'+katex.renderToString(tex,{throwOnError:true,strict:'error',output:'htmlAndMathml'})+'</span>');
fs.writeFileSync(path.join(root,'site/notes/sam-visp-visual-servo.html'),source);
const target=path.join(root,'site/assets/katex');fs.mkdirSync(path.join(target,'fonts'),{recursive:true});
let css=fs.readFileSync(path.join(root,'node_modules/katex/dist/katex.min.css'),'utf8');
// Keep WOFF2 locally; avoid runtime scripts, CDNs and unused font formats.
css=css.replace(/,url\([^)]*\.(?:woff|ttf)\) format\([^)]*\)/g,'');
fs.writeFileSync(path.join(target,'katex.min.css'),css);
for(const f of fs.readdirSync(path.join(root,'node_modules/katex/dist/fonts')).filter(f=>f.endsWith('.woff2')))fs.copyFileSync(path.join(root,'node_modules/katex/dist/fonts',f),path.join(target,'fonts',f));
fs.copyFileSync(path.join(root,'node_modules/katex/LICENSE'),path.join(root,'site/licenses/katex.txt'));
console.log('Rendered 8 display equations and inline math with KaTeX '+katex.version);
