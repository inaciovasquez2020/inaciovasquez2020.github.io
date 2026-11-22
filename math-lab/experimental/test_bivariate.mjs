import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBivariate,UnsupportedBivariate} from './bivariate.mjs';
function check(s,status){const r=verifyBivariate(s);assert.equal(r.status,status,s);return r;}
test('two-variable binomial identity',()=>{
 const r=check('(x+y)^2=x^2+2*x*y+y^2','EXACT_CERTIFICATE_PASS');
 assert.deepEqual(r.degree_upper_bounds,{x:2,y:2});assert.equal(r.grid_checks,9);
});
test('exact refutation',()=>{
 const r=check('(x+y)^2=x^2+y^2','REFUTED');
 assert.deepEqual(r.counterexample,{x:1,y:1,lhs:'4',rhs:'2'});
});
test('boundary nonzero after early grid roots',()=>{
 const r=check('x*(x-1)*(x-2)*y*(y-1)=0','REFUTED');
 assert.deepEqual([r.counterexample.x,r.counterexample.y],[3,2]);
});
test('zero polynomial and zero powers',()=>{
 check('(x-x)*(y+1)=0','EXACT_CERTIFICATE_PASS');
 check('0^0=1','EXACT_CERTIFICATE_PASS');
});
test('commutativity and distributivity',()=>{
 for(const eq of ['x*y=y*x','(x-y)*(x+y)=x^2-y^2','(x+y)^3=x^3+3*x^2*y+3*x*y^2+y^3'])check(eq,'EXACT_CERTIFICATE_PASS');
});
test('syntactic bounds fail closed',()=>{
 for(const q of ['x^9=x^9','x^8*x=x^9','y^9=y^9','1/2=0','sin(x)=x','x y=x*y','x=x=x','x^(-1)=0','x^2.0=x^2', 'x^2**y=x^2*y','1000001=1000001','x'.repeat(513)+'=x']){
  assert.throws(()=>verifyBivariate(q),UnsupportedBivariate,q);
 }
});
test('deterministic parameter sweep with mutations',()=>{
 let state=20261112;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 for(let k=0;k<250;k++){
  const a=1+rand()%13,b=1+rand()%13,c=1+rand()%13;
  const l='('+a+'*x+'+b+'*y+'+c+')^2';
  const r=(a*a)+'*x^2+'+(2*a*b)+'*x*y+'+(b*b)+'*y^2+'+(2*a*c)+'*x+'+(2*b*c)+'*y+'+(c*c);
  check(l+'='+r,'EXACT_CERTIFICATE_PASS');check(l+'=('+r+')+1','REFUTED');
 }
});
