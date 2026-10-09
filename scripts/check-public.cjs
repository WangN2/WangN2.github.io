const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib');
function privateRules(text){
 const rules={
  'absolute-private-path': /\/(?:Users|home)\/[\w.-]+\//i,
  'internal-host': /(?:nio_4090|nio_vln|nioint\.com|office_xianshu)/i,
  'webhook-or-secret': /(?:open-apis\/bot\/v2\/hook\/|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/,
  'private-network': /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/
 };
 return Object.entries(rules).filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
}
// Exported model identifiers have no path separators. Attribution is an explicit
// exception, not a generic exemption for arbitrary nested metadata or URLs.
function modelPathRules(model){
 const attribution=new Set([
  'AgiBot GenieSimAssets CC-BY-NC-SA-4.0',
  'AgiBot / AgiBot World · CC BY-NC-SA 4.0',
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
 ]);
 const separator=s=>s.includes('/')||s.includes('\\');
 function visit(value,isLicense=false){
  if(typeof value==='string')return separator(value)&&!(isLicense&&attribution.has(value));
  if(Array.isArray(value))return value.some(v=>visit(v));
  if(value&&typeof value==='object')return Object.entries(value).some(([key,v])=>separator(key)||visit(v,key==='license'));
  return false;
 }
 return visit(model)?['model-path']:[];
}
function scanPublic(root){
 const issues=[];
 function inspect(file){
  const rel=path.relative(root,file)||path.basename(file),stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()){issues.push(rel+':symlink');return;}
  if(stat.isDirectory()){for(const name of fs.readdirSync(file))if(!['.git','.worktrees','.superpowers','node_modules','artifacts','__pycache__'].includes(name))inspect(path.join(file,name));return;}
  if(!/\.(?:html|css|js|cjs|json|md|txt|b64|py|yml|yaml)$/.test(file))return;
  const text=fs.readFileSync(file,'utf8');
  for(const rule of privateRules(text))issues.push(rel+':'+rule);
  const models=file.endsWith('.b64')?[text]:Array.from(text.matchAll(/<script\b[^>]*\bid=["']g2-model["'][^>]*>([\s\S]*?)<\/script>/g),m=>m[1]);
  for(const b64 of models)try{
   const decoded=z.gunzipSync(Buffer.from(b64.trim(),'base64'),{maxOutputLength:8*1024*1024}).toString('utf8');
   const model=JSON.parse(decoded);
   for(const rule of privateRules(decoded))issues.push(rel+':decoded-'+rule);
   for(const rule of modelPathRules(model))issues.push(rel+':decoded-'+rule);
  }catch{issues.push(rel+':invalid-model');}
 }
 inspect(path.resolve(root));return issues;
}
module.exports={privateRules,modelPathRules,scanPublic};
if(require.main===module){const issues=scanPublic(process.argv[2]||'site');console.log(issues.length?issues.join('\n'):'Public-content scan passed');process.exitCode=issues.length?1:0;}
