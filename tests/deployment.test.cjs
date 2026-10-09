const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function workflow(){
 const file=path.join(root,'.github/workflows/pages.yml');
 assert.ok(fs.existsSync(file),'Pages workflow must exist');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
test('Pages artifact is the built website, not repository maintenance files',()=>{
 const w=workflow(),upload=w.jobs.build.steps.find(s=>s.uses?.startsWith('actions/upload-pages-artifact@'));
 const artifact=path.resolve(root,upload.with.path);
 assert.equal(artifact,path.join(root,'site'));
 assert.ok(fs.existsSync(path.join(artifact,'index.html')));
 for(const name of ['.git','tests','scripts','README.md'])assert.ok(!fs.existsSync(path.join(artifact,name)));
});
test('deployment requires a successful validated build and scoped permissions',()=>{
 const w=workflow();assert.equal(w.jobs.deploy.needs,'build');
 assert.deepEqual(w.permissions,{contents:'read'});
 assert.deepEqual(w.jobs.deploy.permissions,{pages:'write','id-token':'write',contents:'read'});
 const commands=w.jobs.build.steps.filter(s=>s.run).map(s=>s.run).join('\n');
 for(const gate of ['npm run build','npm test','npm run check:public'])assert.ok(commands.includes(gate));
 assert.equal(w.jobs.deploy.environment.name,'github-pages');
 assert.deepEqual(w.on.push.branches,['main']);
 assert.ok(Object.hasOwn(w.on,'workflow_dispatch'));
});
