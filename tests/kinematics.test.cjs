const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../site/assets/g2/kinematics.cjs');
const K = fs.existsSync(source) ? require(source) : {};
const I = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const T = x => [1,0,0,x,0,1,0,0,0,0,1,0,0,0,0,1];
const robot = {root:'base',rootTransform:I,joints:[
  {name:'a',parent:'base',child:'arm',t0:I,t1:I,axis:[0,0,1],type:'revolute',lower:-3,upper:3},
  {name:'tip',parent:'arm',child:'tool',t0:T(1),t1:I,axis:[0,0,1],type:'fixed'}]};
test('FK rotates a one metre link 90 degrees about Z',()=>{
  assert.equal(typeof K.fk,'function');
  const f=K.fk(robot,{a:Math.PI/2});
  assert.ok(Math.abs(f.links.tool[3])<1e-12);
  assert.ok(Math.abs(f.links.tool[7]-1)<1e-12);
});
test('geometric Jacobian has correct cross product and angular velocity',()=>{
  assert.equal(typeof K.jacobian,'function');
  const J=K.jacobian(robot,{a:0},['a'],'tool');
  assert.deepEqual(J.map(r=>r[0]),[0,1,0,0,0,1]);
});
test('inverse joint child frame is included',()=>{
  assert.equal(typeof K.fk,'function');
  const r=structuredClone(robot); r.joints[0].t1=T(0.2);
  assert.ok(Math.abs(K.fk(r,{a:0}).links.tool[3]-0.8)<1e-12);
});
test('damped least squares requests positive joint motion for positive tip Y',()=>{
  assert.equal(typeof K.dls,'function');
  const dq=K.dls([[0],[1],[0]],[0,0.1,0],0.01);
  assert.ok(dq[0]>0.099 && dq[0]<0.101);
});
test('damping keeps rank deficient inverse finite',()=>{
  assert.equal(typeof K.dls,'function');
  assert.deepEqual(K.dls([[0],[0],[0]],[1,0,0],0.02),[0]);
});
test('integration respects joint bounds and velocity bounds',()=>{
  assert.equal(typeof K.integrate,'function');
  assert.deepEqual(K.integrate([0.99,-0.99],[8,-8],[[-1,1],[-1,1]],0.1,0.2),[1,-1]);
});
test('non-finite target is rejected',()=>{
  assert.equal(typeof K.dls,'function');
  assert.throws(()=>K.dls([[1],[0],[0]],[NaN,0,0],0.02));
});
