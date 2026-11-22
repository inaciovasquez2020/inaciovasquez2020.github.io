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
 assert.throws(()=>auditManuscript('a'.repeat(131073)), TypeError);
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
 for(const code of ['UNSUPPORTED_DISPLAY_ENVIRONMENT','UNSUPPORTED_DOLLAR_DISPLAY','UNTERMINATED_DISPLAY'])
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
 assert.equal(r.counts.inline_math,1);
 assert.equal(r.inline_equations[0].latex,'x=x');
 assert.equal(r.inline_equations[0].status,'NOT_VERIFIED');
});
test('malformed display environment is rejected by structural scanner',()=>{
 const r=auditManuscript(String.raw`\begin{align}x=x\end{equation}`);
 assert.equal(r.counts.displayed_math,0);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 assert.ok(r.extraction.flags.some(x=>x.code==='MISMATCHED_ENVIRONMENT'));
});

test('comment masking preserves original offsets and exact anchor digest',async()=>{
 const {verifySourceAnchor,sha256Utf8}=await import('./source-location.mjs');
 const src=String.raw`% \begin{theorem} fake \end{theorem}
\begin{theorem} Valid 😀π \end{theorem}
\(x+y\) % comment
\begin{equation}x=x\end{equation}`;
 const r=auditManuscript(src);
 assert.equal(r.counts.theorems,1);
 assert.equal(r.claims[0].source_anchor.start_utf16,src.indexOf('\\begin{theorem}',src.indexOf('\\begin{theorem}')+1));
 for(const item of [...r.claims,...r.displayed_equations,...r.inline_equations,...r.extraction.flags]){
  assert.equal(verifySourceAnchor(src,item.source_anchor),true);
  assert.equal(verifySourceAnchor(src+' ',item.source_anchor),false);
 }
 assert.equal(r.extraction.source_sha256,sha256Utf8(src));
});
test('source positions survive CRLF and escaped percent comments',async()=>{
 const {verifySourceAnchor}=await import('./source-location.mjs');
 const src=String.raw`\% retained percent`+'\r\n'+String.raw`% comment \begin{lemma} false \end{lemma}`+'\r\n'+String.raw`\begin{lemma} actual \end{lemma}`;
 const r=auditManuscript(src);
 assert.equal(r.counts.lemmas,1);
 assert.equal(r.claims[0].line,3);
 assert.equal(r.claims[0].source_anchor.line_start,3);
 assert.equal(verifySourceAnchor(src,r.claims[0].source_anchor),true);
});
test('source location anchor rejects stale offsets, digests and repeated-text relocation',async()=>{
 const {sourceAnchor,verifySourceAnchor,sha256Utf8}=await import('./source-location.mjs');
 assert.equal(sha256Utf8('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(sha256Utf8('café\n'),'7b49b9e063bd91a4f9252b413261f5557b9c570aa61516989499f64a62dbcdd6');
 const src='prefix\n\\(x=x\\)\n\\(x=x\\)';
 const first=src.indexOf('\\(x=x\\)'),second=src.lastIndexOf('\\(x=x\\)');
 const a=sourceAnchor(src,first,first+7);
 assert.ok(verifySourceAnchor(src,a));
 assert.equal(verifySourceAnchor(src,{...a,start_utf16:second,end_utf16:second+7}),false);
 assert.equal(verifySourceAnchor(src,{...a,source_sha256:'0'.repeat(64)}),false);
 assert.equal(verifySourceAnchor('x'+src,a),false);
 assert.throws(()=>sourceAnchor(src,0,src.length+1),RangeError);
});

test('large manuscript retains exact source anchors and non-proof status',async()=>{
 const {verifySourceAnchor,sha256Utf8}=await import('./source-location.mjs');
 const source='\\title{Larger synthetic test}\n'+'% synthetic padding\n'.repeat(4650)+
   '\\begin{theorem}Bounded structural review.\\end{theorem}\n'+
   '\\begin{equation}a=b\\end{equation}\n';
 assert.ok(source.length>65536&&source.length<131072);
 const r=auditManuscript(source);
 assert.equal(r.status,'NOT_VERIFIED');assert.equal(r.source_characters,source.length);
 assert.equal(r.formal_kernel_verified,false);assert.equal(r.mathematical_truth_assessed,false);
 assert.equal(r.extraction.source_sha256,sha256Utf8(source));
 assert.equal(r.counts.theorems,1);assert.equal(r.counts.displayed_math,1);
 assert.equal(verifySourceAnchor(source,r.claims[0].source_anchor),true);
 assert.equal(verifySourceAnchor(source,r.displayed_equations[0].source_anchor),true);
 assert.throws(()=>auditManuscript('x'.repeat(131073)),/MANUSCRIPT_SOURCE_TOO_LARGE/);
 assert.throws(()=>auditManuscript(' '),/EMPTY_MANUSCRIPT_SOURCE/);
});
test('display inventory beyond 150 explicitly reports truncation',()=>{
 const source=Array.from({length:151},(_,i)=>'\\begin{equation}x_'+i+'=x_'+i+'\\end{equation}').join('\n');
 const r=auditManuscript(source);
 assert.equal(r.extraction.display_blocks_truncated,true);
 assert.equal(r.extraction.total_display_blocks,151);
 assert.equal(r.extraction.extracted_display_blocks,150);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 assert.ok(r.findings.some(f=>f.type==='DISPLAY_INVENTORY_TRUNCATED'));
});

test('4D quantum Hall worksheet inline math and aligned display are inventoried without proof',async()=>{
 const {verifySourceAnchor}=await import('./source-location.mjs');
 const source=String.raw`\title{Independent Mathematical Audit Worksheet: Four-Dimensional Quantum Hall Analogues}
Let $T^4=T^2_x\times T^2_y$ and $c_2(L)=0$.
\begin{proposition}[Chern character] Let $c_1(L)$ be specified. \[\begin{aligned}A&=B\\C&=D\end{aligned}\]\end{proposition}
\begin{proof} Conditional proof.\end{proof}`;
 const result=auditManuscript(source);
 assert.equal(result.counts.propositions,1);
 assert.equal(result.counts.proof_environments,1);
 assert.equal(result.counts.displayed_math,1);
 assert.equal(result.counts.inline_math,3);
 assert.equal(result.extraction.flags.some(f=>f.code==='UNSUPPORTED_DISPLAY_ENVIRONMENT'),false);
 assert.equal(result.inline_equations[0].latex,String.raw`T^4=T^2_x\times T^2_y`);
 assert.equal(result.status,'NOT_VERIFIED');
 assert.equal(result.formal_kernel_verified,false);
 assert.equal(result.mathematical_truth_assessed,false);
 for(const x of [...result.inline_equations,...result.displayed_equations])
  assert.equal(verifySourceAnchor(source,x.source_anchor),true);
});
test('inline overflow remains a review-required truncation, not a silent PASS',()=>{
 const source=Array.from({length:151},(_,i)=>'$x_'+i+'$').join(' ');
 const result=auditManuscript(source);
 assert.equal(result.counts.inline_math,150);
 assert.equal(result.extraction.status,'REVIEW_REQUIRED');
 assert.ok(result.extraction.flags.some(f=>f.code==='INLINE_INVENTORY_TRUNCATED'));
 assert.equal(result.status,'NOT_VERIFIED');
});


test('nested claims preserve order, source anchors, and non-proof status',async()=>{
 const {verifySourceAnchor}=await import('./source-location.mjs');
 const src=String.raw`\begin{theorem}[Outer]\begin{lemma}[Inner] B. \end{lemma} A.\end{theorem}`;
 const r=auditManuscript(src);
 assert.deepEqual(r.claims.map(c=>[c.number,c.kind,c.name]),[[1,'theorem','Outer'],[2,'lemma','Inner']]);
 assert.deepEqual([r.counts.theorems,r.counts.lemmas],[1,1]);
 assert.equal(r.status,'NOT_VERIFIED');
 for(const c of r.claims){
  assert.equal(c.status,'NOT_VERIFIED');
  assert.equal(verifySourceAnchor(src,c.source_anchor),true);
 }
});
test('identical nested theorem environments are both inventoried',()=>{
 const r=auditManuscript(String.raw`\begin{theorem} A \begin{theorem} B \end{theorem} C \end{theorem}`);
 assert.equal(r.counts.theorems,2);
 assert.deepEqual(r.claims.map(c=>c.number),[1,2]);
});
test('cross-nested theorem environments fail closed',()=>{
 const r=auditManuscript(String.raw`\begin{theorem}\begin{lemma} B \end{theorem}\end{lemma}`);
 assert.equal(r.claims.length,0);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
 assert.equal(r.status,'NOT_VERIFIED');
});
test('malformed non-theorem container cannot produce trusted inventory',()=>{
 const r=auditManuscript(String.raw`\begin{document}\begin{theorem} A \end{theorem}\end{center}`);
 assert.equal(r.claims.length,0);
 assert.equal(r.extraction.status,'REVIEW_REQUIRED');
});
test('nested claim cap is enforced independently of nesting depth',()=>{
 const src=Array.from({length:150},()=>String.raw`\begin{lemma} A \end{lemma}`).join('\n');
 assert.equal(auditManuscript(src).claims.length,150);
 assert.throws(()=>auditManuscript(src+String.raw`\begin{lemma} B \end{lemma}`),/Too many theorem environments/);
});
