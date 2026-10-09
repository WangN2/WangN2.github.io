const test=require('node:test'),assert=require('node:assert/strict'),K=require('../site/assets/g2/kinematics.cjs'),m=require('./load-model.cjs');
test('full model has 5 torso, 3 head and 8 wheel axes',()=>{
 for(const [match,count] of [['_body_',5],['_head_joint',3],['_chassis_',8]])assert.equal(m.joints.filter(j=>j.type==='revolute'&&j.name.includes(match)).length,count);
 assert.equal(new Set(m.joints.map(j=>j.child)).size,m.joints.length);
});
test('both tool Jacobians agree with numerical differences including torso',()=>{
 const names=m.joints.filter(j=>j.type==='revolute'&&!j.name.includes('gripper')).map(j=>j.name);
 for(const tool of ['gripper_l_center_link','gripper_r_center_link'])for(let sample=0;sample<8;sample++){
  const q={...m.home};names.forEach((n,i)=>{q[n]=.15*Math.sin(sample+i);});
  const J=K.jacobian(m,q,names,tool,[.1,-.2,.4]);
  names.forEach((n,k)=>{const h=1e-6,a={...q,[n]:q[n]+h},b={...q,[n]:q[n]-h};const d=K.sub(K.pos(K.fk(m,a,[.1,-.2,.4]).links[tool]),K.pos(K.fk(m,b,[.1,-.2,.4]).links[tool])).map(x=>x/(2*h));assert.ok(K.norm(d.map((x,i)=>x-J[i][k]))<1e-7,n);});
 }
});
test('gripper samples obey limits, mimic and loop closure',()=>{
 assert.ok(m.grippers?.length===2,'missing coupled gripper model');
 for(const g of m.grippers){assert.ok(g.samples.length>=10);for(const sample of g.samples){const q={...m.home,...sample.q},f=K.fk(m,q);for(const [n,v] of Object.entries(sample.q)){const j=m.joints.find(j=>j.name===n);assert.ok(v>=j.lower-1e-6&&v<=j.upper+1e-6,n);}assert.ok(Math.abs(q[g.master]+q[g.mimic])<1e-7);for(const loop of m.loops.filter(l=>l.parent===g.base)){const a=K.pos(K.mul(f.links[loop.parent],loop.t0)),b=K.pos(K.mul(f.links[loop.child],loop.t1));assert.ok(K.norm(K.sub(a,b))<.0002,'loop gap');}}}
});
test('right arm XYZ targets converge after nonzero torso and base rotations',()=>{
 const names=m.joints.filter(j=>j.name.includes('_arm_r_')&&j.type==='revolute').map(j=>j.name).sort();
 const bounds=names.map(n=>{const j=m.joints.find(j=>j.name===n);return[j.lower,j.upper];});
 for(let axis=0;axis<3;axis++){
  const q={...m.home,[names[0]]:-.25,[names[1]]:.1,[names[3]]:-.9,idx05_body_joint5:.2},base=[.2,.1,.3],tool='gripper_r_center_link';
  const target=K.pos(K.fk(m,q,base).links[tool]);target[axis]+=.05;
  for(let step=0;step<600;step++){
   const p=K.pos(K.fk(m,q,base).links[tool]),J=K.jacobian(m,q,names,tool,base).slice(0,3),v=K.sub(target,p).map(x=>4*x);
   const next=K.integrate(names.map(n=>q[n]),K.dls(J,v,.025),bounds,1/60,.35);names.forEach((n,i)=>q[n]=next[i]);
  }
  assert.ok(K.norm(K.sub(target,K.pos(K.fk(m,q,base).links[tool])))<.0005);
 }
});
