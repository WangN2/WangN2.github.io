const {test}=require('node:test'),assert=require('node:assert/strict');
const {rotationInformation,circularErrorMm}=require('../site/assets/calib/core.cjs');
test('one axis leaves its axial rotation unconstrained',()=>{
 assert.deepEqual(rotationInformation([[1,0,0],[2,0,0]]),[[0,0,0],[0,5,0],[0,0,5]]);
});
test('two nonparallel axes constrain all rotational perturbations',()=>{
 assert.deepEqual(rotationInformation([[1,0,0],[0,1,0]]),[[1,0,0],[0,1,0],[0,0,2]]);
});
test('information scales quadratically with angle, not just condition number',()=>{
 assert.deepEqual(rotationInformation([[2,0,0],[0,2,0]]),[[4,0,0],[0,4,0],[0,0,8]]);
 assert.deepEqual(rotationInformation([]),[[0,0,0],[0,0,0],[0,0,0]]);
});
test('time displacement has correct units, zero and sign symmetry',()=>{
 assert.equal(circularErrorMm(.4,180,0),0);
 assert.ok(Math.abs(circularErrorMm(.4,180,10)-12.565853849)<1e-8);
 assert.equal(circularErrorMm(.4,180,-10),circularErrorMm(.4,180,10));
});
