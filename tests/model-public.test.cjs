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
test('scanner decodes gzip model in file and embedded HTML and does not echo secrets',()=>{
 assert.equal(typeof scan.scanPublic,'function');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g2-public-test-'));
 try{const leak=['','home','example','internal.usda'].join('/'),b=z.gzipSync(JSON.stringify({source:leak})).toString('base64');
 fs.writeFileSync(path.join(dir,'model.b64'),b);
 fs.writeFileSync(path.join(dir,'index.html'),'<script type="application/octet-stream" id="g2-model">'+b+'</script>');
 const issues=scan.scanPublic(dir);assert.equal(issues.length,2);assert.ok(!issues.join().includes(leak));
 fs.writeFileSync(path.join(dir,'model.b64'),z.gzipSync('{}').toString('base64'));fs.writeFileSync(path.join(dir,'index.html'),'<h1>G2</h1>');assert.deepEqual(scan.scanPublic(dir),[]);
 }finally{fs.rmSync(dir,{recursive:true});}
});
