import test from 'node:test';
import assert from 'node:assert/strict';
import {auditManuscript} from './manuscript.mjs';
const sample = String.raw`\documentclass{article}
\title{Structural Capacity Limits Beyond Local Refinement}
\begin{document}
\begin{definition}[Interacting Refinement System] State X.\end{definition}
\begin{definition}[Aggregate Transcript Capacity] Total aggregate transcript capacity is the supremum of mutual information across channels and steps.\end{definition}
\begin{lemma}[Capacity Additivity Bound] Bounded by capacity.\end{lemma}
\begin{lemma}[Adaptive Entropy Reduction Bound] At most constant factor.\end{lemma}
\begin{theorem}[Adaptive Entropy--Depth Lower Bound] H(P)=\Theta(n), requires \Omega(n) total refinement depth.\end{theorem}
\begin{definition}[Operational Mutual Information] Define \[ I_{\mathrm{op}}(X;O) := H(O) - H(O \mid X). \] \end{definition}
\begin{definition}[Viotropic Information] Define I_{\mathrm{op}}(X;O)=0.\end{definition}
\begin{theorem}[Adaptive Viotropic Wall --- Conditional] \[ H_{\mathrm{extractable}} > \kappa \cdot \mathrm{TC}_{\mathrm{agg}} \quad \Rightarrow \quad I_{\mathrm{op}}(X;O)=0 . \] \end{theorem}
\begin{corollary} Infeasible in general.\end{corollary}
\end{document}`;
test('manuscript benchmark extracts scope, counts, and non-proof findings',()=>{
  const r=auditManuscript(sample,{sourceName:'local benchmark'});
  assert.equal(r.status,'NOT_VERIFIED');assert.equal(r.formal_kernel_verified,false);
  assert.equal(r.mathematical_truth_assessed,false); assert.equal(r.source_uploaded,false);
  assert.deepEqual([r.counts.definitions,r.counts.lemmas,r.counts.theorems,r.counts.corollaries,r.counts.proof_environments],[4,2,2,1,0]);
  assert.ok(r.findings.some(x=>x.type==='PROOF_SURFACE'));
  assert.ok(r.findings.some(x=>x.type==='ASSUMPTIONS'));
  assert.ok(r.findings.some(x=>x.type==='IMPLICATION'));
  assert.equal(r.counts.displayed_math,2);
});
test('proof environments counted, comments not counted',()=>{
  const r=auditManuscript(String.raw`% \begin{theorem} fake \end{theorem}
\begin{theorem}[A] Claim \end{theorem}
\begin{proof} proof text \end{proof}`);
  assert.equal(r.counts.theorems,1);
  assert.equal(r.counts.proof_environments,1);
  assert.equal(r.findings.some(x=>x.type==='PROOF_SURFACE'),false);
});
test('untrusted LaTeX safe bounds and no theorem-level status',()=>{
  assert.throws(()=>auditManuscript('a'.repeat(65537)), TypeError);
  assert.throws(()=>auditManuscript(''), TypeError);
  assert.throws(()=>auditManuscript('a\0b'), TypeError);
  const r=auditManuscript(String.raw`\section{Hello}\[x^2=1\]`);
  assert.equal(r.claims.length,0);
  assert.equal(r.displayed_equations[0].status,'NOT_VERIFIED');
});
