import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEquation} from './engine.mjs';
import {validateManifest,buildExactCase,buildManuscriptCase,buildUnsupportedCase,SessionCasebook,MAX_SESSION_CASES} from './improvement.mjs';
import {auditManuscript} from './manuscript.mjs';
const manifest={claim_id:'VR-T001',source_reference:'Manual entry',field:'algebra',subcategory:'polynomial-identities',assumptions:[]};
function exact(e){return buildExactCase(verifyEquation(e,{id:manifest.claim_id}),manifest);}
test('required manifest rejects unbound, malformed and overlong claims',()=>{
  assert.throws(()=>validateManifest({claim_id:'T',assumptions:[]}),TypeError);
  for(const claim_id of ['bad id', '', '<script>', 'a'.repeat(101)])
    assert.throws(()=>validateManifest({...manifest,claim_id}),TypeError);
  assert.throws(()=>validateManifest({...manifest,source_reference:'line\nbreak'}),TypeError);
  assert.throws(()=>validateManifest({...manifest,assumptions:['a'.repeat(181)]}),TypeError);
  assert.throws(()=>validateManifest({...manifest,promotion:'approved'}),TypeError);
  assert.equal(validateManifest(manifest).source_reference,'Manual entry');
  assert.throws(()=>validateManifest({...manifest,field:'topology'}),TypeError);
  assert.throws(()=>validateManifest({...manifest,subcategory:'rational-expressions',field:'topology'}),TypeError);
});
test('valid identity generates four invariance probes and one negative control',()=>{
  const entry=exact('(x+1)^2=x^2+2x+1');
  assert.equal(entry.status,'REGRESSION_CANDIDATE');
  assert.equal(entry.probes.length,5);
  assert.equal(entry.probes_passed,5);
  assert.equal(entry.probes_skipped,0);
  assert.equal(entry.probes.at(-1).relation,'negative_control_add_one_to_rhs');
  assert.equal(entry.probes.at(-1).observed_status,'REFUTED');
  assert.equal(entry.promotion,'NOT_APPROVED');
});
test('refuted identity preserves first witness across four transformations',()=>{
  const entry=exact('(x+1)^2=x^2+1');
  assert.equal(entry.expected_status,'REFUTED');
  assert.equal(entry.initial_witness_x,1);
  assert.equal(entry.probes.length,4);
  assert.equal(entry.probes_passed,4);
  assert.ok(entry.probes.every(x=>x.witness_x===1));
});
test('high-degree inputs lead to explicit SKIPPED rather than false PASS',()=>{
  const a=exact('x^16*x^16=x^16*x^16');
  assert.equal(a.expected_status,'EXACT_CERTIFICATE_PASS');
  assert.equal(a.status,'REGRESSION_CANDIDATE');
  assert.equal(a.probes_passed+a.probes_skipped,a.probes.length);
});
test('invalid result and mismatched claim id rejected',()=>{
  assert.throws(()=>buildExactCase({status:'EXACT_CERTIFICATE_PASS'},manifest),TypeError);
  assert.throws(()=>buildExactCase(verifyEquation('x=x',{id:'other'}),manifest),TypeError);
});
test('manuscript and unsupported cases never become verified claims',()=>{
  const doc=auditManuscript('\\begin{theorem} A \\end{theorem}');
  const a=buildManuscriptCase(doc,manifest);
  assert.equal(a.status,'INCOMPLETE_SOURCE_REQUIRED');
  assert.equal(a.mathematical_truth_assessed,false);
  assert.ok(!('source' in a));
  const b=buildUnsupportedCase('Unsupported LaTeX',manifest,{rawInput:'\\frac{x}{1}=x'});
  assert.equal(b.status,'REVIEW_REQUIRED');
});
test('casebook in-memory, opt-in export and no silent eviction',()=>{
  const book=new SessionCasebook();const a=exact('x^2=x*x');
  book.add(a);const bundle=book.export();assert.equal(bundle.cases.length,1);
  bundle.cases[0].status='MUTATED';assert.equal(book.export().cases[0].status,'REGRESSION_CANDIDATE');
  for(let i=1;i<MAX_SESSION_CASES;i++)book.add(a);
  assert.throws(()=>book.add(a),RangeError);
  assert.equal(book.summary().cases,MAX_SESSION_CASES);
  book.clear();assert.equal(book.summary().cases,0);
});
test('deterministic seeded stress of metamorphic properties',()=>{
  let seed=20261108;const rand=()=>{seed=(1103515245*seed+12345)>>>0;return seed;};
  for(let i=0;i<200;i++){
    const a=(rand()%17)-8,b=(rand()%17)-8,c=(rand()%17)-8;
    const lhs=`(${a}*x+${b})^2+${c}`;
    const rhs=`${a*a}*x^2+${2*a*b}*x+${b*b+c}`;
    const good=exact(`${lhs}=${rhs}`),bad=exact(`${lhs}=(${rhs})+1`);
    for(const r of [good,bad]){
      assert.equal(r.status,'REGRESSION_CANDIDATE');
      assert.ok(r.probes_passed >= 4);
      assert.equal(r.probes_skipped,0);
    }
  }
});

test('exact verifier refuses a self-declared but unsupported mathematical field',()=>{
  const r=verifyEquation('x=x',{id:manifest.claim_id});
  const falseMethod={...manifest,field:'topology',subcategory:'manifold-topology'};
  assert.throws(()=>buildExactCase(r,falseMethod),/no exact verification engine/);
});
test('casebook contains classification and it cannot promote itself',()=>{
  const e=exact('x=x');
  assert.deepEqual([e.classification.field,e.classification.subcategory,e.classification.coverage],['algebra','polynomial-identities','EXACT_SUPPORTED']);
  assert.equal(e.promotion,'NOT_APPROVED');
});
