const fs=require('node:fs'),z=require('node:zlib'),path=require('node:path');
module.exports=JSON.parse(z.gunzipSync(Buffer.from(fs.readFileSync(path.resolve(__dirname,'../site/assets/g2/model.b64'),'utf8'),'base64')));
