import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestCategory} from './taxonomy.mjs';
import {auditManuscript} from './manuscript.mjs';
import {findingUI} from './manuscript-findings-i18n.mjs';
import {verifySourceAnchor} from './source-location.mjs';

const source=String.raw`\documentclass{article}
\title{Universality Bridge for Deterministic Polynomial-Time Computation via Normalized k-Tape Transcript Systems}
\begin{document}
\begin{definition}Y_0 := c_0; the input tape is read-only.\end{definition}
\begin{theorem}The full machine configuration is reconstructible: \[\Conf_t = D(Y_{\le t}).\]\end{theorem}
\begin{theorem}An information identity: \[H(X) = \sum_{t=0}^{T-1} I(X;Y_{t+1}\mid Y_{\le t})+H(X\mid Y_{\le T}).\]\end{theorem}
The deterministic k-tape Turing machine, polynomial-time SAT solver, uniform Boolean circuits, mutual information and entropy are discussed.
\end{document}`;

test('integration: classified complexity and structural review stays NOT_VERIFIED',()=>{
 const c=suggestCategory(source);
 assert.deepEqual([c.field,c.subcategory,c.confidence],['logic-complexity','complexity','HEURISTIC_ONLY']);
 const r=auditManuscript(source);
 assert.equal(r.status,'NOT_VERIFIED');
 assert.equal(r.formal_kernel_verified,false);
 assert.equal(r.mathematical_truth_assessed,false);
 const marks=r.findings.filter(f=>f.type.startsWith('TRANSCRIPT_'));
 assert.deepEqual(marks.map(x=>x.type),['TRANSCRIPT_INITIAL_STATE_REVIEW','TRANSCRIPT_CHAIN_RULE_REVIEW']);
 assert.ok(marks.every(x=>verifySourceAnchor(source,x.source_anchor)));
 for(const lang of ['en','es','pt-BR','fr','de','zh-Hans']){
  for(const f of marks){const p=findingUI(f,lang);assert.ok(p?.label&&p?.detail);}
 }
});
test('integration: non-applicable paper has no transcript warnings',()=>{
 const r=auditManuscript(String.raw`\title{Elementary Polynomial Notes}\begin{theorem}x=x\end{theorem}`);
 assert.equal(r.findings.filter(x=>x.type.startsWith('TRANSCRIPT_')).length,0);
 assert.equal(r.status,'NOT_VERIFIED');
});

test('review prompts beyond 65,536 characters remain visible in an admitted manuscript',()=>{
 const late=' '.repeat(65540)+source;
 assert.ok(late.length>65536&&late.length<=131072);
 const report=auditManuscript(late);
 const marks=report.findings.filter(f=>f.type.startsWith('TRANSCRIPT_'));
 assert.deepEqual(marks.map(f=>f.type),['TRANSCRIPT_INITIAL_STATE_REVIEW','TRANSCRIPT_CHAIN_RULE_REVIEW']);
 assert.ok(marks.every(f=>f.source_anchor.start_utf16>65536&&verifySourceAnchor(late,f.source_anchor)));
 assert.equal(report.status,'NOT_VERIFIED');
});
