import test from 'node:test';
import assert from 'node:assert/strict';
/**
 * Explicit finite mathematical countermodels to particular manuscript statements.
 * These are regression fixtures, not general proof checking capabilities.
 */
test('initial local frame cannot reconstruct an unscanned input bit',()=>{
 const inputs=['00','01'];
 const initialFrame=x=>({state:'q0',head:0,scanned:x[0]});
 const completeConfiguration=x=>({state:'q0',head:0,tape:x});
 assert.deepEqual(initialFrame(inputs[0]),initialFrame(inputs[1]));
 assert.notDeepEqual(completeConfiguration(inputs[0]),completeConfiguration(inputs[1]));
 // No function D of Y_0 alone can output two distinct configurations.
});

test('entropy chain starting at Y1 omits information in Y0',()=>{
 const inputs=['00','01','10','11']; // uniform independent bits
 const Y0=x=>x[0];
 const Y1=x=>x; // pair of old and new scanned bits, after reading the second bit
 // Exact entropies in bits for this uniform 4-point ensemble.
 const entropy=groups=>{
  const sizes=[...groups.values()];
  const N=sizes.reduce((a,b)=>a+b,0);
  return sizes.reduce((acc,n)=>acc-(n/N)*Math.log2(n/N),0);
 };
 const H_X=Math.log2(inputs.length);
 const H_Y0=entropy(new Map([['0',2],['1',2]]));
 const H_Y0Y1=entropy(new Map(inputs.map(x=>[`${Y0(x)}:${Y1(x)}`,1])));
 const initialInfo=H_Y0;                     // deterministic functions of X
 const incrementalInfo=H_Y0Y1-H_Y0;         // conditional mutual information
 const residual=H_X-H_Y0Y1;
 assert.equal(H_X,2);
 assert.equal(initialInfo,1);
 assert.equal(incrementalInfo,1);
 assert.equal(residual,0);
 assert.notEqual(H_X,incrementalInfo+residual); // stated incomplete identity
 assert.equal(H_X,initialInfo+incrementalInfo+residual); // corrected identity
});
