const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=path.resolve(__dirname,'../site/assets/g2/collision-model.cjs');
const model=fs.existsSync(source)?require(source):{};

test('five centimetres is added to nominal base radius, without shrinking arms',()=>{
 assert.equal(typeof model.radiusFor,'function');
 const base=Object.freeze({id:15,group:'base',r:.52,c:[.1,0,.18]});
 const arm=Object.freeze({id:8,group:'right',r:.16,c:[.45,-.22,.69]});
 assert.ok(Math.abs(model.radiusFor(base,.05,.16)-.41)<1e-12);
 assert.equal(model.radiusFor(base,.16,.16),.52);
 assert.equal(model.radiusFor(arm,.05,.16),.16);
 assert.equal(base.r,.52);
});

test('invalid sphere geometry is rejected before it reaches the canvas',()=>{
 assert.equal(typeof model.validateSnapshot,'function');
 const fixture=()=>({version:1,originalBaseInflation:.16,spheres:[{id:0,group:'base',r:.4,c:[0,0,.2]}]});
 assert.doesNotThrow(()=>model.validateSnapshot(fixture()));
 for(const mutate of [x=>x.spheres[0].c[1]=NaN,x=>x.spheres[0].r=-1,
  x=>x.spheres.push({...x.spheres[0]}),x=>x.spheres[0].group='unknown',x=>x.originalBaseInflation=-1]){
  const bad=fixture();mutate(bad);assert.throws(()=>model.validateSnapshot(bad));
 }
});

test('orthographic front and side views preserve the labelled base axes',()=>{
 assert.equal(typeof model.project,'function');
 assert.deepEqual(model.project([1,0,.65],0,0),[1,0,0]);
 const front=model.project([0,1,.65],Math.PI/2,0);
 assert.ok(Math.abs(front[0]+1)<1e-12);
 const up=model.project([0,0,1.65],0,0);
 assert.ok(Math.abs(up[1]-1)<1e-12);
});
