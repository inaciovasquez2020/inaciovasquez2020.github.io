import test from 'node:test';
import assert from 'node:assert/strict';
import {CLAIM_AUDIT_PROFILE,auditTorusLineBundle} from './claim-audit-torus.mjs';

const req=(n_x,n_y,operator,expected)=>({profile:CLAIM_AUDIT_PROFILE,n_x,n_y,operator,expected});
test('4D product invariant exact positive and counterexample controls',()=>{
 const good=auditTorusLineBundle(req('1','1','ch2_integral','1'));
 assert.equal(good.status,'EXACT_MODEL_MATCH');
 assert.equal(good.certificate.computed,'1');
 const falseClaim=auditTorusLineBundle(req('1','1','ch2_integral','0'));
 assert.equal(falseClaim.status,'EXACT_MODEL_COUNTEREXAMPLE');
 assert.equal(falseClaim.certificate.computed,'1');
 assert.equal(falseClaim.comparison,'NOT_EQUAL');
 assert.equal(auditTorusLineBundle(req('1','1','c2_integral','0')).status,'EXACT_MODEL_MATCH');
 assert.equal(auditTorusLineBundle(req('1','1','c2_integral','1')).status,'EXACT_MODEL_COUNTEREXAMPLE');
 assert.equal(auditTorusLineBundle(req('1','1','c1_square_integral','2')).status,'EXACT_MODEL_MATCH');
});
test('exact signs, zeros, boundaries and independent coefficient oracle',()=>{
 for(let nx=-4;nx<=4;nx++)for(let ny=-4;ny<=4;ny++){
  const n=BigInt(nx),m=BigInt(ny);
  for(const [operator,expected] of [
   ['c2_integral',0n],['ch2_integral',n*m],['c1_square_integral',2n*n*m]]){
   const r=auditTorusLineBundle(req(String(nx),String(ny),operator,String(expected)));
   assert.equal(r.status,'EXACT_MODEL_MATCH');
   assert.equal(r.certificate.computed,String(expected));
   assert.equal(r.formal_kernel_verified,false);
   assert.equal(r.experimental_claim_verified,false);
   assert.equal(r.original_publication_audited,false);
  }
 }
 for(const [nx,ny] of [['1000000000','1000000000'],['-1000000000','1000000000']]){
  const n=BigInt(nx),m=BigInt(ny);
  // expected is deliberately inside the input cap; this tests exact computed values.
  const r=auditTorusLineBundle(req(nx,ny,'ch2_integral','0'));
  assert.equal(r.status,'EXACT_MODEL_COUNTEREXAMPLE');
  assert.equal(r.certificate.computed,String(n*m));
 }
});
test('untrusted sources and unsupported claims fail closed without promotion',()=>{
 const good=req('1','1','ch2_integral','1');
 for(const bad of [null,[],{}, {...good,additional:'yes'}, {...good,operator:'poincare'},
  {...good,profile:'invented'}, {...good,n_x:1}, {...good,n_x:'1.0'},
  {...good,n_x:'1e9'}, {...good,n_x:'+1'}, {...good,n_x:'-0'},
  {...good,n_y:'1000000001'}, {...good,expected:'1000000001'},
  {...good,n_x:'1;evil()'}]){
  assert.throws(()=>auditTorusLineBundle(bad));
 }
 const before=JSON.stringify(good),a=auditTorusLineBundle(good),b=auditTorusLineBundle(good);
 assert.equal(JSON.stringify(good),before);
 assert.deepEqual(a,b);
 assert.equal(a.proof_scope,'EXACT_MODEL_ONLY');
 assert.equal(a.source_uploaded,false);
});
