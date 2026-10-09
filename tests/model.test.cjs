const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const K=require('../site/assets/g2/kinematics.cjs');
const model=require('./load-model.cjs');
const names=model.joints.filter(j=>j.type==='revolute'&&j.name.includes('_arm_l_')).map(j=>j.name).sort();
const tool='gripper_l_center_link';
test('exported model reconstructs USD authored rest transforms',()=>{
  const f=K.fk(model,model.home);let error=0;
  for(const [n,t] of Object.entries(model.rest))for(let k=0;k<16;k++)error=Math.max(error,Math.abs(t[k]-f.links[n][k]));
  console.log('USD rest maximum transform entry error:',error);
  assert.ok(error<1e-5);
});
test('G2 analytic position Jacobian matches central differences at 25 poses',()=>{
  let worst=0;
  for(let s=0;s<25;s++){
    const q={...model.home};names.forEach((n,i)=>q[n]=0.3*Math.sin(s*1.9+i));
    const J=K.jacobian(model,q,names,tool),h=1e-6;
    names.forEach((n,i)=>{const a={...q,[n]:q[n]+h},b={...q,[n]:q[n]-h},pa=K.pos(K.fk(model,a).links[tool]),pb=K.pos(K.fk(model,b).links[tool]);for(let r=0;r<3;r++)worst=Math.max(worst,Math.abs((pa[r]-pb[r])/(2*h)-J[r][i]));});
  }
  console.log('Jacobian maximum finite-difference error:',worst);
  assert.ok(worst<1e-7);
});
test('G2 5cm XYZ moves converge within bounds from bent pose',()=>{
  for(let axis=0;axis<3;axis++){
    const q={...model.home};q[names[0]]=0.25;q[names[1]]=0.1;q[names[3]]=-0.9;
    const limits=names.map(n=>{const j=model.joints.find(j=>j.name===n);return [j.lower,j.upper];});
    names.forEach((n,i)=>q[n]=Math.max(limits[i][0],Math.min(limits[i][1],q[n])));
    const start=K.pos(K.fk(model,q).links[tool]),target=start.slice();target[axis]+=0.05;
    for(let i=0;i<600;i++){
      const p=K.pos(K.fk(model,q).links[tool]),dq=K.dls(K.jacobian(model,q,names,tool).slice(0,3),K.sub(target,p).map(v=>v*4),0.025),next=K.integrate(names.map(n=>q[n]),dq,limits,1/60,0.35);
      names.forEach((n,j)=>q[n]=next[j]);
    }
    const error=K.norm(K.sub(target,K.pos(K.fk(model,q).links[tool])));
    console.log('Target axis',axis,'error metres',error);
    assert.ok(error<0.0005);
    names.forEach((n,i)=>assert.ok(q[n]>=limits[i][0]&&q[n]<=limits[i][1]));
  }
});
