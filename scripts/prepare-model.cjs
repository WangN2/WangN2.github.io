const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),{privateRules,modelPathRules}=require('./check-public.cjs');
function prepareModel(source){
 const keys=['root','rootTransform','joints','loops','grippers','wheels','home','meshes','rest','license'];
 const out=Object.fromEntries(keys.filter(k=>Object.hasOwn(source,k)).map(k=>[k,source[k]]));
 if(privateRules(JSON.stringify(out)).length||modelPathRules(out).length)throw Error('Private data remains in model');
 return out;
}
module.exports={prepareModel};
if(require.main===module){
 if(!process.argv[2])throw Error('Usage: node scripts/prepare-model.cjs <model.json>');
 const model=prepareModel(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 const target=path.resolve(__dirname,'../site/assets/g2/model.b64');fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,z.gzipSync(JSON.stringify(model)).toString('base64'));
 console.log('Public model prepared; '+model.joints.length+' tree joints');
}
