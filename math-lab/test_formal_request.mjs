import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRequest,envelope,canonicalJSON,InvalidRequest,REQUEST_SCHEMA} from './formal-request-core.mjs';
const sample={id:'SYNTHETIC-01',field:'topology',subcategory:'manifold-topology',
 source:'Manual test',repo:'synthetic revision',theorem:'theorem simple : True',
 proof:'theorem simple : True := by trivial',
 toolchain:'Lean 4 v4.30.0',dependency:'synthetic mathlib commit 123456',
 assumptions:'None declared',verifier:'lean4',confirmed:true,privacyAcknowledged:true};
test('request never asserts successful execution, kernel checks or payment',()=>{
 const r=makeRequest(sample);
 assert.equal(r.schema,REQUEST_SCHEMA);
 assert.equal(r.execution_status,'NOT_RUN');
 assert.equal(r.certificate_status,'NOT_ISSUED');
 assert.equal(r.axiom_audit,'NOT_RUN');
 assert.equal(r.payment_status,'DISABLED');
 assert.ok(!canonicalJSON(r).includes('LEAN_VERIFIED'));
});
test('source, toolchain, proof, confirmations are mandatory',()=>{
 for(const bad of [{id:'-no'},{field:'other'},{subcategory:'unclassified'},
 {proof:''},{toolchain:''},{dependency:''},{confirmed:false},{privacyAcknowledged:false},
 {verifier:'exact-polynomial'},{theorem:'x'.repeat(8193)},{proof:'x'.repeat(65537)}]){
  assert.throws(()=>makeRequest({...sample,...bad}),InvalidRequest,JSON.stringify(bad).slice(0,60));
 }
});
test('normalization and integrity envelope are deterministic but not certification',()=>{
 const a=makeRequest({...sample,proof:'a\r\nb'}),b=makeRequest({...sample,proof:'a\nb'});
 assert.equal(canonicalJSON(a),canonicalJSON(b));
 assert.throws(()=>envelope(a,'not_a_digest'),InvalidRequest);
 const e=envelope(a,'0'.repeat(64));
 assert.equal(e.certificate_status,'NOT_ISSUED');
 assert.equal(e.request_sha256,'0'.repeat(64));
 assert.equal(e.request.candidate_lean_source,'a\nb');
});

test('request builder metadata has no runtime verification implication',()=>{
 const r=makeRequest(sample);
 assert.equal(r.environment.requested_verifier,'LEAN4_KERNEL_NOT_CONNECTED');
 assert.equal(r.subject.provenance,'USER_DECLARED_AND_CONFIRMED_NOT_VERIFIED');
});
