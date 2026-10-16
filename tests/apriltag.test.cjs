const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const family=require('../site/assets/apriltag/tag36h11.cjs'),core=require('../site/assets/apriltag/core.cjs');

test('tag36h11 contains the official codebook and bit coordinates',()=>{
 assert.equal(family.codes.length,587);assert.equal(new Set(family.codes).size,587);
 assert.equal(family.codes[0],0xd7e00984bn);assert.equal(family.codes[586],0xe8b772fe0n);
 for(const code of family.codes)assert.ok(code>=0n&&code<(1n<<36n));
 assert.equal(family.bits.length,36);assert.equal(new Set(family.bits.map(p=>p.join(','))).size,36);
 for(const [x,y] of family.bits)assert.ok(x>=1&&x<=6&&y>=1&&y<=6);
 let minimum=36;
 for(let i=0;i<family.codes.length;i++)for(let j=i+1;j<family.codes.length;j++)minimum=Math.min(minimum,core.hamming(family.codes[i],family.codes[j]));
 assert.equal(minimum,11);
});

test('decoder recovers ID and orientation and corrects at most five bit errors',()=>{
 for(const id of [0,1,42,586])for(let turns=0;turns<4;turns++){
  const observed=core.rotateGrid(core.gridForId(id),turns),clean=core.decodeGrid(observed);
  assert.equal(clean.id,id);assert.equal(clean.hamming,0);assert.equal(clean.rotation,(4-turns)%4);assert.ok(clean.accepted);
  for(let errors=1;errors<=5;errors++){
   const corrupted=core.injectErrors(observed,errors,errors+turns*11),result=core.decodeGrid(corrupted.grid);
   assert.equal(corrupted.indices.length,errors);assert.equal(result.id,id);assert.equal(result.hamming,errors);assert.ok(result.accepted);
  }
 }
 const oneError=core.injectErrors(core.gridForId(7),1,3).grid,strict=core.decodeGrid(oneError,0);
 assert.equal(strict.id,7);assert.equal(strict.hamming,1);assert.equal(strict.accepted,false);
});

test('planar homography decomposition recovers noise-free 6DoF poses',()=>{
 const K={fx:700,fy:700,cx:480,cy:270},size=.16,object=core.tagCorners(size);
 for(const sample of [
  {angles:[0,0,0],t:[0,0,1]},
  {angles:[15,-25,30],t:[.08,-.04,1.2]},
  {angles:[-35,20,-40],t:[-.12,.06,.8]},
  {angles:[40,35,150],t:[.1,.03,1.6]}
 ]){
  const truth={R:core.rotationFromDegrees(sample.angles),t:sample.t},pixels=core.projectCorners(truth.R,truth.t,size,K),estimate=core.estimatePose(object,pixels,K);
  for(let i=0;i<3;i++)assert.ok(Math.abs(estimate.t[i]-truth.t[i])<1e-8,`translation ${i}`);
  assert.ok(core.rotationErrorDegrees(estimate.R,truth.R)<1e-6,'rotation error');
  assert.ok(core.reprojectionError(object,pixels,estimate,K)<1e-8,'reprojection error');
 }
});

test('AprilTag note, lab and homepage navigation are present',()=>{
 const root=path.join(__dirname,'../site'),home=fs.readFileSync(path.join(root,'index.html'),'utf8'),note=fs.readFileSync(path.join(root,'notes/apriltag.html'),'utf8'),lab=fs.readFileSync(path.join(root,'demos/apriltag/index.html'),'utf8');
 assert.ok(home.includes('href="./notes/apriltag.html"'));assert.ok(home.includes('AprilTag 视觉定位详解'));
 for(const text of ['tag36h11','pupil_apriltags','estimate_tag_pose=True','camera_params','tag_size','T_base_cam'])assert.ok(note.includes(text),text);
 for(const text of ['id="decode-lab"','id="pose-lab"','id="tag-canvas"','id="pose-canvas"','core.cjs','tag36h11.cjs'])assert.ok(lab.includes(text),text);
 assert.ok(fs.existsSync(path.join(root,'licenses/apriltag.txt')));
});
