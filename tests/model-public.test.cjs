const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),z=require('node:zlib');
const prepPath=path.resolve(__dirname,'../scripts/prepare-model.cjs'),scanPath=path.resolve(__dirname,'../scripts/check-public.cjs');
const prep=fs.existsSync(prepPath)?require(prepPath):{},scan=fs.existsSync(scanPath)?require(scanPath):{};
test('public export removes unneeded metadata without changing joints',()=>{
 assert.equal(typeof prep.prepareModel,'function');
 const source={root:'base',joints:[{name:'joint',axis:[0,0,1]}],source:'private-model-location',note:'private context'};
 const out=prep.prepareModel(source);assert.equal(out.source,undefined);assert.equal(out.note,undefined);assert.deepEqual(out.joints,source.joints);
});
test('nested private paths are rejected',()=>{
 assert.equal(typeof prep.prepareModel,'function');
 const privatePath=['','Users','example','secret.usda'].join('/');
 assert.throws(()=>prep.prepareModel({joints:[{name:privatePath}]}),/private/i);
});
test('unknown nested Unix, Windows and relative model paths are rejected',()=>{
 const paths=[['','workspace','company','model.usda'].join('/'),['','root','internal','model.usda'].join('/'),
  ['C:','Users','example','model.usda'].join('\\'),['assets','private-model.usda'].join('/')];
 for(const value of paths){
  assert.throws(()=>prep.prepareModel({joints:[{metadata:{source:value}}]}),/private/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g2-nested-path-'));
  try{
   const b=z.gzipSync(JSON.stringify({joints:[{metadata:{source:value}}]})).toString('base64');
   fs.writeFileSync(path.join(dir,'model.b64'),b);
   fs.writeFileSync(path.join(dir,'index.html'),'<script id="g2-model">'+b+'</script>');
   const issues=scan.scanPublic(dir);
   assert.equal(issues.filter(s=>s.includes('decoded-model-path')).length,2);
   assert.ok(!issues.join().includes(value));
  }finally{fs.rmSync(dir,{recursive:true});}
 }
 const publicLicense='AgiBot / AgiBot World · CC BY-NC-SA 4.0';
 assert.equal(prep.prepareModel({license:publicLicense,joints:[]}).license,publicLicense);
 const real=require('./load-model.cjs');assert.deepEqual(prep.prepareModel(real),real);
});
test('scanner decodes gzip model in file and embedded HTML and does not echo secrets',()=>{
 assert.equal(typeof scan.scanPublic,'function');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g2-public-test-'));
 try{const leak=['','home','example','internal.usda'].join('/'),b=z.gzipSync(JSON.stringify({source:leak})).toString('base64');
 fs.writeFileSync(path.join(dir,'model.b64'),b);
 fs.writeFileSync(path.join(dir,'index.html'),'<script type="application/octet-stream" id="g2-model">'+b+'</script>');
 const issues=scan.scanPublic(dir);assert.equal(issues.filter(s=>s.endsWith(':decoded-absolute-private-path')).length,2);assert.equal(issues.filter(s=>s.endsWith(':decoded-model-path')).length,2);assert.ok(!issues.join().includes(leak));
 fs.writeFileSync(path.join(dir,'model.b64'),z.gzipSync('{}').toString('base64'));fs.writeFileSync(path.join(dir,'index.html'),'<h1>G2</h1>');assert.deepEqual(scan.scanPublic(dir),[]);
 }finally{fs.rmSync(dir,{recursive:true});}
});
