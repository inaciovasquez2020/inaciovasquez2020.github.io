import test from 'node:test';
import assert from 'node:assert/strict';
import {auditManuscript} from './manuscript.mjs';
// This fixture is deliberately synthetic; do not embed unpublished manuscripts in public CI.
const sample=String.raw`\documentclass{article}
\title{Elementary Polynomial Notes}
\begin{document}
\begin{definition}[Evaluation] A polynomial may be evaluated at an integer.\end{definition}
\begin{lemma}[Basic property] For every integer n, n+0=n.\end{lemma}
\begin{theorem}[Toy lower bound] A toy process takes \Omega(n) steps under stated hypotheses.\end{theorem}
\begin{corollary} Let p and q be toy predicates. \[ p \Rightarrow q \] \end{corollary}
\[ x^2+2x+1 = (x+1)^2 \]
\end{document}`;
test('synthetic manuscript inventory and non-proof review questions',()=>{
 const r=auditManuscript(sample,{sourceName:'generic synthetic fixture'});
 assert.equal(r.status,'NOT_VERIFIED');assert.equal(r.formal_kernel_verified,false);
 assert.equal(r.mathematical_truth_assessed,false);assert.equal(r.source_uploaded,false);
 assert.deepEqual([r.counts.definitions,r.counts.lemmas,r.counts.theorems,r.counts.corollaries,r.counts.proof_environments],[1,1,1,1,0]);
 assert.ok(r.findings.some(x=>x.type==='PROOF_SURFACE'));
 assert.ok(r.findings.some(x=>x.type==='ASYMPTOTIC_CLAIM'));
 assert.ok(r.findings.some(x=>x.type==='IMPLICATION'));
 assert.equal(r.counts.displayed_math,2);
});
test('proof blocks counted, comments stripped',()=>{
 const r=auditManuscript(String.raw`% \begin{theorem} fake \end{theorem}
\begin{theorem}[A] Claim \end{theorem}
\begin{proof} proof text \end{proof}`);
 assert.equal(r.counts.theorems,1);
 assert.equal(r.counts.proof_environments,1);
 assert.equal(r.findings.some(x=>x.type==='PROOF_SURFACE'),false);
});
test('untrusted LaTeX bounded with no theorem proof status',()=>{
 assert.throws(()=>auditManuscript('a'.repeat(65537)), TypeError);
 assert.throws(()=>auditManuscript(''), TypeError);
 assert.throws(()=>auditManuscript('a\0b'), TypeError);
 const r=auditManuscript(String.raw`\section{Hello}\[x^2=1\]`);
 assert.equal(r.claims.length,0);
 assert.equal(r.displayed_equations[0].status,'NOT_VERIFIED');
});

test('unrecognized math shows flagged source lines and excerpts',()=>{
 const r=auditManuscript("\\documentclass{article}\n\\begin{document}\n\\begin{equation}x^2=x*x\\end{equation}\n\\begin{split}a=b\\end{split}\n$$ c=d $$\n\\(e=f\\)\n\\begin{equation}g=h\n\\end{document}");
 assert.equal(r.status,'NOT_VERIFIED');
 assert.equal(r.counts.displayed_math,1);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 const flags=r.extraction.flags;
 for(const code of ['UNSUPPORTED_DISPLAY_ENVIRONMENT','UNSUPPORTED_DOLLAR_DISPLAY','INLINE_MATH_NOT_INVENTORIED','UNTERMINATED_DISPLAY'])
   assert.ok(flags.some(x=>x.code===code),code);
 assert.ok(flags.every(x=>x.line>=1 && x.source_excerpt.length && x.mathematical_verdict==='NOT_VERIFIED'));
 assert.ok(flags.some(x=>x.source_excerpt.includes('a=b')));
 assert.ok(flags.some(x=>x.source_excerpt.includes('c=d')));
});
test('absence of flags is never a completeness certificate',()=>{
 const r=auditManuscript('\\begin{equation}x^2=x*x\\end{equation}');
 assert.equal(r.extraction.flags.length,0);
 assert.equal(r.extraction.status,'EXTRACTION_NOT_EXHAUSTIVELY_VERIFIED');
 assert.equal(r.status,'NOT_VERIFIED');
});

test('starred theorem and inline dollars cannot disappear silently',()=>{
 const r=auditManuscript(String.raw`\begin{theorem*}[Uncaptured] The statement is $x=x$. \end{theorem*}`);
 assert.equal(r.counts.theorems,0);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 assert.ok(r.extraction.flags.some(x=>x.code==='UNSUPPORTED_CLAIM_ENVIRONMENT'));
 assert.ok(r.extraction.flags.some(x=>x.code==='INLINE_MATH_NOT_INVENTORIED'));
});
test('malformed display environment is rejected by structural scanner',()=>{
 const r=auditManuscript(String.raw`\begin{align}x=x\end{equation}`);
 assert.equal(r.counts.displayed_math,0);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 assert.ok(r.extraction.flags.some(x=>x.code==='MISMATCHED_ENVIRONMENT'));
});

test('comment masking preserves original offsets and exact anchor digest',async()=>{
 const {verifySourceAnchor,sha256Utf8}=await import('./source-location.mjs');
 const src=String.raw`% \\begin{theorem} fake \\end{theorem}
\\begin{theorem} Valid 😀π \\end{theorem}
\\(x+y\\) % comment
\\begin{equation}x=x\\end{equation}`;
 const r=auditManuscript(src);
 assert.equal(r.counts.theorems,1);
 assert.equal(r.claims[0].source_anchor.start_utf16,src.indexOf('\\\\begin{theorem}',src.indexOf('\\\\begin{theorem}')+1));
 for(const item of [...r.claims,...r.displayed_equations,...r.extraction.flags]){
  assert.equal(verifySourceAnchor(src,item.source_anchor),true);
  assert.equal(verifySourceAnchor(src+' ',item.source_anchor),false);
 }
 assert.equal(r.extraction.source_sha256,sha256Utf8(src));
});
test('source positions survive CRLF and escaped percent comments',async()=>{
 const {verifySourceAnchor}=await import('./source-location.mjs');
 const src=String.raw`\\% retained percent`+'\\r\\n'+String.raw`% comment \\begin{lemma} false \\end{lemma}`+'\\r\\n'+String.raw`\\begin{lemma} actual \\end{lemma}`;
 const r=auditManuscript(src);
 assert.equal(r.counts.lemmas,1);
 assert.equal(r.claims[0].line,3);
 assert.equal(r.claims[0].source_anchor.line_start,3);
 assert.equal(verifySourceAnchor(src,r.claims[0].source_anchor),true);
});
test('source location anchor rejects stale offsets, digests and repeated-text relocation',async()=>{
 const {sourceAnchor,verifySourceAnchor,sha256Utf8}=await import('./source-location.mjs');
 assert.equal(sha256Utf8('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(sha256Utf8('café\\n'),'7b49b9e063bd91a4f9252b413261f5557b9c570aa61516989499f64a62dbcdd6');
 const src='prefix\\n\\\\(x=x\\\\)\\n\\\\(x=x\\\\)';
 const first=src.indexOf('\\\\(x=x\\\\)'),second=src.lastIndexOf('\\\\(x=x\\\\)');
 const a=sourceAnchor(src,first,first+7);
 assert.ok(verifySourceAnchor(src,a));
 assert.equal(verifySourceAnchor(src,{...a,start_utf16:second,end_utf16:second+7}),false);
 assert.equal(verifySourceAnchor(src,{...a,source_sha256:'0'.repeat(64)}),false);
 assert.equal(verifySourceAnchor('x'+src,a),false);
 assert.throws(()=>sourceAnchor(src,0,src.length+1),RangeError);
});
