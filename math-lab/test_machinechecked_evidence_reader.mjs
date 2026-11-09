import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReport,fromPublishedClaim} from './machinechecked-evidence-reader.mjs';
const base={schema:'prooflens/manifest@1',release:'fixture-v1',id:'P:thm:decided',
 status_code:'link.checked',status:'linked: Lean proof checked',
 source_evidence:{state:'none'},source_sha256:'aa',anchor:{source_sha256:'aa'},
 statement_tex:'For every n ...', reviews:[],
 links:[{name:'Shape.decided',status_code:'link.checked',sorry:false,
 axioms:['propext','Classical.choice','Quot.sound'],
 statement:{exact:{text:'∀ (n : Nat), (if n = 0 then 0 else n) ≤ n'}}}]};
const clone=x=>structuredClone(x);
test('verified link is never a verified Lab verdict',()=>{
 const x=fromPublishedClaim(base).claims[0];
 assert.equal(x.reported_status_code,'link.checked');
 assert.equal(x.verification_verdict,'NOT_VERIFIED_BY_ADAPTER');
 assert.equal(x.local_integrity.correspondence,'NOT_ESTABLISHED_BY_ADAPTER');
 assert.equal(x.local_integrity.state,'BLOCKED');
 assert(x.issues.some(z=>z.code==='SOURCE_NOT_VERIFIED'));
 assert(x.issues.some(z=>z.code==='CORRESPONDENCE_NOT_REVIEWED'));
});
for(const [name,change,issue] of [
 ['unknown status',x=>x.status_code='formal.magic','UNKNOWN_SOURCE_STATUS'],
 ['changed link',x=>x.links[0].status_code='link.incomplete','DECLARATION_MAPPING_NOT_UNIQUE'],
 ['missing link',x=>x.links=[],'DECLARATION_MAPPING_NOT_UNIQUE'],
 ['unapproved axiom',x=>x.links[0].axioms=['unsafeAxiom'],'LEAN_CHECK_NOT_CONFIRMED'],
 ['sorry',x=>x.links[0].sorry=true,'LEAN_CHECK_NOT_CONFIRMED'],
 ['missing proof evidence',x=>delete x.links[0].axioms,'LEAN_CHECK_NOT_CONFIRMED'],
 ['source mismatch',x=>x.source_sha256='bb','SOURCE_PIN_CONFLICT'],
 ['missing statement',x=>delete x.links[0].statement,'LEAN_STATEMENT_UNAVAILABLE'],
 ['unknown link code',x=>x.links[0].status_code='link.future','UNKNOWN_SOURCE_STATUS'],
]){
 test('fail closed: '+name,()=>{const x=clone(base);change(x);const r=normalizeReport(x).claims[0];
   assert.equal(r.verification_verdict,'NOT_VERIFIED_BY_ADAPTER');
   assert(r.issues.some(z=>z.code===issue),JSON.stringify(r.issues));
 });
}
test('stale correspondence is not accepted',()=>{
 const x=clone(base);x.reviews=[{current:false,reviewer:'Example'}];
 assert(normalizeReport(x).claims[0].issues.some(z=>z.code==='CORRESPONDENCE_NOT_REVIEWED'));
});
test('even current external review is not authenticated by Lab',()=>{
 const x=clone(base);x.reviews=[{current:true,reviewer:'Example'}];
 assert(normalizeReport(x).claims[0].issues.some(z=>z.code==='REVIEW_NOT_AUTHENTICATED'));
});
test('source and Lean texts copied as inert data',()=>{
 const x=clone(base);x.statement_tex='<img src=x onerror=alert(1)>';
 assert.equal(normalizeReport(x).claims[0].manuscript_text,x.statement_tex);
});
test('reject missing release',()=>assert.throws(()=>normalizeReport({...base,release:''}),/release/));
test('reject unsupported schema',()=>assert.throws(()=>normalizeReport({...base,schema:'untrusted'}),/schema/i));
test('reject successful-looking foreign adapter claims',()=>{
 const c={schema:'vasquez.math-lab.machinechecked-evidence@1',mode:'READ_ONLY_UNTRUSTED_EXTERNAL_REPORT',
  claims:[{claim_id:'A',reported_status_code:'link.checked',
  verification_verdict:'PROVED',issues:[],local_integrity:{correspondence:'NOT_ESTABLISHED_BY_ADAPTER'}}]};
 assert.throws(()=>normalizeReport(c),/verdict/);
});
test('reported checked link is not enough even for nonexistent reviewer metadata',()=>{
 const x=clone(base);x.reviews=[];
 assert(normalizeReport(x).claims[0].issues.length>0);
});

test('real upstream pinned audit: Shape.decided reports Lean-checked but correspondence remains open',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const {join,dirname}=await import('node:path');
 const file=join(dirname(fileURLToPath(import.meta.url)),'fixtures/machinechecked-shape-decided.json');
 const audit=JSON.parse(readFileSync(file,'utf8'));
 assert.equal(audit.schema,'prooflens/manifest@1');
 assert.equal(audit.id,'P:thm:decided');
 assert.equal(audit.links[0].name,'Shape.decided');
 assert.equal(audit.links[0].status_code,'link.checked');
 const result=normalizeReport(audit).claims[0];
 assert.equal(result.reported_status_code,'link.checked');
 assert.equal(result.lean_declaration,'Shape.decided');
 assert.equal(result.local_integrity.correspondence,'NOT_ESTABLISHED_BY_ADAPTER');
 assert.equal(result.verification_verdict,'NOT_VERIFIED_BY_ADAPTER');
 assert(result.issues.some(x=>x.code==='SOURCE_NOT_VERIFIED'));
 assert(result.issues.some(x=>x.code==='CORRESPONDENCE_NOT_REVIEWED'));
});
