import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyComplexityManuscript,reviewTranscriptManuscript,reviewFindingUI} from './research-guards.mjs';

const bridge = String.raw`\documentclass{article}
\title{Universality Bridge for Deterministic Polynomial-Time Computation via Normalized $k$-Tape Transcript Systems}
\begin{document}
\begin{definition}[Initial frame] Y_0 := c_0. The input tape is read-only.\end{definition}
\begin{theorem}[Transcript reconstruction] The full machine configuration satisfies
\[ \Conf_t = D(Y_{\le t}). \]
\end{theorem}
\begin{theorem}[Information bound]
\[ H(X) = \sum_{t=0}^{T-1} I(X;Y_{t+1}\mid Y_{\le t}) + H(X\mid Y_{\le T}).\]
\end{theorem}
SAT solver, deterministic k-tape Turing machine, mutual information, entropy.
\end{document}`;

test('the bridge is classified as computational complexity, heuristic only',()=>{
  assert.deepEqual([classifyComplexityManuscript(bridge).field,classifyComplexityManuscript(bridge).subcategory],['logic-complexity','complexity']);
  assert.equal(classifyComplexityManuscript(bridge).confidence,'HEURISTIC_ONLY');
});
test('negative controls: weak or non-complexity titles must not override',()=>{
  assert.equal(classifyComplexityManuscript('Shannon entropy and mutual information'),null);
  assert.equal(classifyComplexityManuscript(String.raw`\title{Computational Study of Molecular Vibrations} phonon dynamics`),null);
  assert.equal(classifyComplexityManuscript(String.raw`\title{A Polynomial-Time Algorithm} no supporting context`),null);
  // Title tokens cannot satisfy the independent body-evidence gate.
  assert.equal(classifyComplexityManuscript(String.raw`\title{Polynomial-Time Turing Machine} A short introductory note.`),null);
  assert.equal(classifyComplexityManuscript(String.raw`\title{Schwarzschild Wormhole Transcript Capacity} polynomial simulation; entropy`),null);
  assert.equal(classifyComplexityManuscript(String.raw`\title{Polynomial-Time Simulations of Black-Hole Information} quantum gravity, Schwarzschild geometry, Turing machine, SAT solver, polynomial simulation, entropy`),null);
});
test('the reported bridge patterns raise TWO review prompts, never proof verdicts',()=>{
  const f=reviewTranscriptManuscript(bridge);
  assert.deepEqual(f.map(x=>x.type),['TRANSCRIPT_INITIAL_STATE_REVIEW','TRANSCRIPT_CHAIN_RULE_REVIEW']);
  assert.ok(f.every(x=>x.severity==='review' && x.start>=0 && x.end>x.start && !('status' in x)));
  assert.ok(f.every(x=>bridge.slice(x.start,x.end).length>0));
});
test('control: corrected chain rule does not raise omission warning',()=>{
  const corrected=bridge.replace('H(X) = \\sum_{t=0}^{T-1}', 'H(X) = I(X;Y_0) + \\sum_{t=0}^{T-1}');
  assert.equal(reviewTranscriptManuscript(corrected).some(x=>x.type==='TRANSCRIPT_CHAIN_RULE_REVIEW'),false);
});
test('controls: missing assumptions or unrelated paper raise no transcript concerns',()=>{
  const unrelated=String.raw`\title{Entropy of Graphs} \begin{theorem} H(X)=H(X).\end{theorem}`;
  assert.deepEqual(reviewTranscriptManuscript(unrelated),[]);
  assert.equal(reviewTranscriptManuscript(bridge.replace('Y_0 := c_0','Y_0 := (x,c_0)')).some(x=>x.type==='TRANSCRIPT_INITIAL_STATE_REVIEW'),false);
});
test('the review prompts are localized for all supported languages',()=>{
  const finding=reviewTranscriptManuscript(bridge)[0];
  for(const lang of ['en','es','pt-BR','fr','de','zh-Hans']) {
    const p=reviewFindingUI(finding,lang);
    assert.ok(p?.label?.length>8 && p?.detail?.length>30,lang);
  }
  assert.equal(reviewFindingUI({type:'OTHER'},'fr'),null);
});
