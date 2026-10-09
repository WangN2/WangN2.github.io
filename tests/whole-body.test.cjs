const test=require('node:test'),assert=require('node:assert/strict'),K=require('../site/assets/g2/kinematics.cjs');
const joint=(name,parent,child)=>({name,parent,child,type:'revolute',axis:[0,0,1],t0:K.eye(),t1:K.eye()});
test('opposite branch contributes zero Jacobian columns',()=>{
 const m={root:'base',rootTransform:K.eye(),joints:[joint('left','base','l'),joint('right','base','r')]};
 assert.deepEqual(K.jacobian(m,{},['right'],'l'),[[0],[0],[0],[0],[0],[0]]);
});
test('base pose transforms complete body',()=>{
 const m={root:'base',rootTransform:K.eye(),joints:[]};
 assert.deepEqual(K.pos(K.fk(m,{},[1,2,Math.PI/2]).links.base),[1,2,0]);
});
test('swerve lateral command reconstructs requested wheel velocities',()=>{
 assert.equal(typeof K.swerve,'function');
 const modules=[{x:.23,y:.218},{x:-.23,y:-.218}];
 for(const [vx,vy,w] of [[0,.2,0],[-.2,0,0],[0,0,.3]]){
  const r=K.swerve(modules,[vx,vy,w],[0,0]);
  r.forEach((v,i)=>{assert.ok(Math.abs(v.speed*.07*Math.cos(v.angle)-(vx-w*modules[i].y))<1e-10);assert.ok(Math.abs(v.speed*.07*Math.sin(v.angle)-(vy+w*modules[i].x))<1e-10);assert.ok(Math.abs(v.angle)<=2.97);});
 }
});
test('base body-frame velocity follows yaw',()=>{
 assert.equal(typeof K.baseStep,'function');
 const p=K.baseStep([0,0,Math.PI/2],[.2,0,0],1);
 assert.ok(Math.abs(p[0])<1e-10);assert.ok(Math.abs(p[1]-.2)<1e-10);
});
