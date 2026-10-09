const {test}=require('node:test'),assert=require('node:assert/strict');
const {readState,writeState}=require('../site/assets/g2/state.cjs');
const valid={version:2,q:{a:0.3},base:[0,0,0],group:'right',tool:'gripper_r_center_link',selected:3,preset:'bent'};
test('state survives local storage without a host',()=>{
 let text;const storage={setItem:(k,v)=>{assert.equal(k,'wangn2:g2:v1');text=v;},getItem:()=>text};
 assert.equal(writeState(storage,valid),true);assert.deepEqual(readState(storage),valid);
});
test('corrupt, incompatible or unavailable state is ignored',()=>{
 for(const value of ['bad','null',JSON.stringify({...valid,group:'unknown'}),JSON.stringify({...valid,base:[0,null,0]})])
  assert.equal(readState({getItem:()=>value}),null);
 assert.equal(readState({getItem:()=>{throw Error('denied');}}),null);
 assert.equal(writeState({setItem:()=>{throw Error('denied');}},valid),false);
 assert.equal(writeState(null,valid),false);
});
