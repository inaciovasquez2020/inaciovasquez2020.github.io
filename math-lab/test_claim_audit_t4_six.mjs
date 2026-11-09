import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneralT4LineBundle, GENERAL_T4_PROFILE} from './claim-audit-t4-six.mjs';
const NAMES=['n12','n13','n14','n23','n24','n34'];
const PAIRS=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const req=(a,operator,expected)=>({
  profile:GENERAL_T4_PROFILE,
  coefficients:Object.fromEntries(NAMES.map((k,i)=>[k,String(a[i])])),
  operator,expected:String(expected)
});
// Deliberately independent exterior algebra oracle: enumerate every ordered
// pair of 2-form basis monomials and count reordering inversions.
function wedgeOracle(a){
  let top=0n;
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
    const word=[...PAIRS[i],...PAIRS[j]];
    if(new Set(word).size!==4)continue; // repeated exterior generator => 0
    let inversions=0;
    for(let p=0;p<4;p++)for(let q=p+1;q<4;q++)
      if(word[p]>word[q])inversions++;
    top+=(inversions%2?-1n:1n)*BigInt(a[i])*BigInt(a[j]);
  }
  assert.equal(top%2n,0n);
  return {c2_integral:0n,ch2_integral:top/2n,c1_square_integral:top};
}
test('single planes, crossed pairs, orientation signs, and rank-one c2',()=>{
  const cases=[
    [[1,0,0,0,0,1],1n],
    [[0,1,0,0,1,0],-1n],
    [[0,0,1,1,0,0],1n],
    [[1,1,0,0,1,1],0n],
    [[0,1,0,0,1,0],-1n],
  ];
  for(const [a,pf] of cases){
    assert.equal(auditGeneralT4LineBundle(req(a,'ch2_integral',pf)).status,'EXACT_MODEL_MATCH');
    assert.equal(auditGeneralT4LineBundle(req(a,'c1_square_integral',2n*pf)).status,'EXACT_MODEL_MATCH');
    assert.equal(auditGeneralT4LineBundle(req(a,'c2_integral',0)).status,'EXACT_MODEL_MATCH');
    assert.equal(auditGeneralT4LineBundle(req(a,'c2_integral',1)).status,'EXACT_MODEL_COUNTEREXAMPLE');
  }
});
test('exhaustive 3^6 integer cases versus independent exterior multiplication',()=>{
  let checked=0;
  for(let code=0;code<729;code++){
    let j=code;
    const a=Array.from({length:6},()=>{const d=j%3-1;j=Math.floor(j/3);return d;});
    const oracle=wedgeOracle(a);
    for(const [op,value] of Object.entries(oracle)){
      const result=auditGeneralT4LineBundle(req(a,op,value));
      assert.equal(result.status,'EXACT_MODEL_MATCH',JSON.stringify(a)+' '+op);
      assert.equal(result.certificate.computed,String(value));
      assert.equal(result.proof_scope,'EXACT_MODEL_ONLY');
      assert.equal(result.formal_kernel_verified,false);
      assert.equal(result.scientific_claim_verified,false);
      assert.equal(result.source_binding_verified,false);
      checked++;
    }
  }
  assert.equal(checked,2187);
});
test('independent bounded deterministic pseudorandom sweep',()=>{
  let seed=0x193ab47c>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  let checked=0;
  for(let i=0;i<1024;i++){
    const a=Array.from({length:6},()=>Number(rand()%2000001)-1000000);
    const oracle=wedgeOracle(a);
    for(const [op,value] of Object.entries(oracle)){
      const r=auditGeneralT4LineBundle(req(a,op,value));
      assert.equal(r.status,'EXACT_MODEL_MATCH');assert.equal(r.certificate.computed,String(value));
      checked++;
    }
  }
  assert.equal(checked,3072);
});
test('all-sign extreme value, counterexample and bounded expected magnitude',()=>{
  const a=['1000000000','-1000000000','1000000000','1000000000','1000000000','1000000000'];
  const oracle=wedgeOracle(a);
  assert.equal(oracle.ch2_integral,3000000000000000000n);
  assert.equal(oracle.c1_square_integral,6000000000000000000n);
  for(const [op,value] of Object.entries(oracle)){
    assert.equal(auditGeneralT4LineBundle(req(a,op,value)).status,'EXACT_MODEL_MATCH');
  }
  const counter=auditGeneralT4LineBundle(req(a,'ch2_integral','0'));
  assert.equal(counter.status,'EXACT_MODEL_COUNTEREXAMPLE');
  assert.equal(counter.certificate.computed,'3000000000000000000');
  assert.equal(counter.original_publication_audited,false);
});
test('fail closed on unknown fields, prototypes, accessors, malformed numbers',()=>{
  const good=req([1,0,0,0,0,1],'ch2_integral',1);
  const weird=[
    null,[],{}, {...good,extra:1},{...good,operator:'paper_proved'},
    {...good,profile:'vasquez.math-lab.claim-audit.torus-line-bundle.v0.1'},
    {...good,coefficients:[1,0,0,0,0,1]},
    {...good,coefficients:{...good.coefficients,n13:'1.0'}},
    {...good,coefficients:{...good.coefficients,n13:'1e5'}},
    {...good,coefficients:{...good.coefficients,n13:'-0'}},
    {...good,coefficients:{...good.coefficients,n13:1}},
    {...good,coefficients:{...good.coefficients,n13:'1000000001'}},
    {...good,coefficients:{...good.coefficients,extra:'2'}},
    {...good,expected:'6000000000000000001'},
    {...good,expected:'9007199254740993.0'},
    Object.assign(Object.create({untrusted:true}),good),
    Object.defineProperty({...good},'expected',{get(){throw Error('getter executed');}})
  ];
  for(const bad of weird)assert.throws(()=>auditGeneralT4LineBundle(bad));
  const before=JSON.stringify(good),r=auditGeneralT4LineBundle(good);
  assert.equal(JSON.stringify(good),before);
  assert.equal(r.status,'EXACT_MODEL_MATCH');
  assert.equal(r.source_uploaded,false);
});
