const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'templates/demo.html'),'utf8');
const model=fs.readFileSync(path.join(root,'site/assets/g2/model.b64'),'utf8').trim();
const out=path.join(root,'site/demos/g2');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),template.replace('__MODEL__',model));
console.log('Built standalone demo from sanitized model');
