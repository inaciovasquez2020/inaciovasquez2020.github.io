import test from 'node:test';
import assert from 'node:assert/strict';
import {auditManuscript} from './manuscript.mjs';
import {suggestCategory} from './taxonomy.mjs';
import {verifySourceAnchor} from './source-location.mjs';
import {preflightFile} from './source-preflight.mjs';
const sample='Synthetic General Relativity Study\nAbstract\nBondi news and covariant phase space in vacuum spacetime. Information-theoretic entropy is not used.\nAssumption 1. Smooth data.\nDefinition 1. A symbol.\nLemma 2 (Example). A claim.\nProof. Prose.\nTheorem 3. A conclusion.\nProposition 4. Another claim.\nN = ∂u C\nReferences\nLemma 99. Citation only.';
test('literal plain headings, proof headings and equation candidates remain unverified',()=>{
 const r=auditManuscript(sample);const p=r.plain_text_inventory;
 assert.equal(r.counts.definitions,1);assert.equal(r.counts.lemmas,1);assert.equal(r.counts.theorems,1);assert.equal(r.counts.propositions,1);assert.equal(r.counts.proof_environments,0);
 assert.equal(p.headings.length,5);assert.equal(p.proofs.length,1);assert.equal(p.equations.length,1);
 assert.equal(r.status,'NOT_VERIFIED');assert.equal(r.extraction.status,'REVIEW_REQUIRED');assert.equal(r.formal_kernel_verified,false);
 for(const x of [...p.headings,...p.proofs,...p.equations,...r.claims])assert.ok(verifySourceAnchor(sample,x.source_anchor));
});
test('gravity title with independent body evidence overrides incidental entropy',()=>{
 assert.equal(suggestCategory(sample).field,'mathematical-physics');assert.equal(suggestCategory(sample).subcategory,'field-equations');
 assert.equal(suggestCategory('Schwarzschild wormhole transcript capacity and mutual information.').confidence,'AMBIGUOUS');
});
test('plain text file admitted only for review',async()=>{
 const bytes=new TextEncoder().encode(sample);
 const r=await preflightFile({name:'sample.txt',size:bytes.length,arrayBuffer:async()=>bytes.buffer},'manuscript-audit');
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.text,sample);assert.equal(r.source_uploaded,false);
});
test('LaTeX and ordinary prose do not create duplicate heading inventories',()=>{
 const r=auditManuscript('\\title{Example}\\begin{theorem}A\\end{theorem}');
 assert.equal(r.plain_text_inventory,null);assert.equal(r.counts.theorems,1);
 assert.equal(auditManuscript('Theorem 1. A sentence.').plain_text_inventory,null);
});
test('heading inventory caps and preserves source offsets with CRLF',()=>{
 const s='Synthetic paper\r\nAbstract\r\n'+Array.from({length:151},(_,i)=>'Lemma '+(i+1)+'. Test.').join('\r\n');
 const r=auditManuscript(s);assert.equal(r.plain_text_inventory.truncated,true);assert.equal(r.claims.length,150);assert.ok(verifySourceAnchor(s,r.claims[149].source_anchor));
});

test('compressed heading preserves literal name and number without inventing spaces',()=>{
 const s='Synthetic paper\nAbstract\nTheorem1(Capacityceiling). A claim.\nDefinition 2 (Ordinary name). A statement.\nTheoremology3. Not a heading.\nTheorem1abc. Not a heading.';
 const r=auditManuscript(s);
 assert.deepEqual(r.claims.map(x=>[x.kind,x.name,x.source_number]),[['theorem','Capacityceiling','1'],['definition','Ordinary name','2']]);
 assert.ok(r.claims.every(x=>verifySourceAnchor(s,x.source_anchor)&&x.status==='NOT_VERIFIED'));
});
test('prefix and accumulated capacity prompts have literal anchors and no verdict',()=>{
 const s='Synthetic paper\nAbstract\nThe transcript prefix through step t is Tt. Assume I Tt+1; Tt ≤b.\nThe complete transcript has a per-step information bound. TC(A, n) ≤ C1(log n)k.';
 const r=auditManuscript(s);
 for(const kind of ['TRANSCRIPT_PREFIX_ENTROPY_REVIEW','TRANSCRIPT_ACCUMULATED_CAPACITY_REVIEW']){
  const f=r.findings.find(x=>x.type===kind);assert.ok(f,kind);assert.ok(verifySourceAnchor(s,f.source_anchor));assert.equal(f.severity,'review');
 }
 assert.equal(r.status,'NOT_VERIFIED');
 const innocent=auditManuscript('Synthetic paper\nAbstract\nI Tt+1; Tt ≤b. TC(A, n) ≤ C1(log n)k.');
 assert.ok(!innocent.findings.some(x=>x.type==='TRANSCRIPT_PREFIX_ENTROPY_REVIEW'||x.type==='TRANSCRIPT_ACCUMULATED_CAPACITY_REVIEW'));
});
