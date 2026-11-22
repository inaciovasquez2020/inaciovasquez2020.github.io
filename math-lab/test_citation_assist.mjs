import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCES,suggestCitations,formatBibtex,detectArxivIdentifiers} from './citation-assist.mjs';
test('curated entries have unique DOIs and type-correct BibTeX',()=>{
 assert.equal(REFERENCES.length,7);
 assert.equal(new Set(REFERENCES.map(x=>x.doi)).size,REFERENCES.length);
 assert.deepEqual(new Set(REFERENCES.map(x=>x.entry_type||'article')),new Set(['article','book','inproceedings']));
 for(const r of REFERENCES){
  assert.match(r.doi,/^10\./);
  const bib=formatBibtex(r);assert.ok(bib.includes(r.doi));
  assert.ok(bib.startsWith('@'+(r.entry_type||'article')+'{'));
 }
});
test('preexisting historical suggestions remain conservative',()=>{
 const r=suggestCitations('We invoke topological censorship in the argument.');
 assert.equal(r.length,1);assert.equal(r[0].key,'FriedmanSchleichWitt1993');
 assert.equal(r[0].status,'SUGGESTION_ONLY');assert.equal(r[0].reference_supports_claim,'NOT_CHECKED');
 assert.equal(r[0].alreadyReferenced,false);
 assert.deepEqual(suggestCitations('Einstein--Rosen bridge and mutual information').map(x=>x.key),['EinsteinRosen1935','Shannon1948PartI']);
 assert.deepEqual(suggestCitations(''),[]);
});
test('a corrected universality manuscript has relevant suggestions, distinguishing existing keys',()=>{
 const src=String.raw`\title{Universality Bridge for Deterministic Polynomial-Time Computation}
\section{Complexity} Computational complexity and multitape Turing-machine simulation.
SAT-hardness and conditional mutual information require context.
\cite{AroraBarak,CoverThomas}.
\begin{thebibliography}{9}\bibitem{AroraBarak} Arora and Barak.
\bibitem{CoverThomas} Cover and Thomas.\end{thebibliography}`;
 const r=suggestCitations(src),m=Object.fromEntries(r.map(x=>[x.key,x]));
 for(const key of ['AroraBarak2009','CoverThomas2006','HennieStearns1966','Cook1971'])assert.ok(m[key],key);
 assert.equal(m.AroraBarak2009.alreadyReferenced,true);
 assert.equal(m.CoverThomas2006.alreadyReferenced,true);
 assert.equal(m.HennieStearns1966.alreadyReferenced,false);
 assert.equal(m.Cook1971.alreadyReferenced,false);
 assert.ok(r.every(x=>x.reference_supports_claim==='NOT_CHECKED'));
});
test('references appearing only in bibliography do not trigger relevance by themselves',()=>{
 const src=String.raw`\title{An unrelated manuscript}
\begin{thebibliography}{9}\bibitem{AroraBarak} Computational Complexity: A Modern Approach.\end{thebibliography}`;
 // Existing citation key is a legitimate library match, explicitly marked as already present.
 assert.deepEqual(suggestCitations(src).map(x=>[x.key,x.alreadyReferenced]),[['AroraBarak2009',true]]);
 assert.deepEqual(suggestCitations('This is an unrelated geometry manuscript.').map(x=>x.key),[]);
});
test('recognizes optional cite notes and aliases, not substring keys',()=>{
 const r=suggestCitations(String.raw`\cite[p.~10]{AroraBarak, CoverThomas}`);
 assert.deepEqual(r.map(x=>x.key),['AroraBarak2009','CoverThomas2006']);
 assert.ok(r.every(x=>x.alreadyReferenced));
 assert.equal(suggestCitations(String.raw`\cite{AroraBarakExtended}`).length,0);
});
test('empty and unsupported bibliographic type refuse, and arxiv remains identifier only',()=>{
 assert.throws(()=>formatBibtex({key:'x',entry_type:'untrusted'}),TypeError);
 assert.deepEqual(suggestCitations(''),[]);
 const arxiv=detectArxivIdentifiers('arXiv:2601.00113v2 and https://arxiv.org/abs/2601.00113v2');
 assert.equal(arxiv.length,1);assert.equal(arxiv[0].reference_supports_claim,'NOT_CHECKED');
});
test('actual corrected manuscript produces marked existing sources and additional candidates',()=>{
 const source=String.raw`\title{Computational Complexity with conditional mutual information}
SAT-hardness and multitape Turing-machine simulation.
\cite{AroraBarak,CoverThomas,Shannon1948,HennieStearns1966,Cook1971}`;
 const r=suggestCitations(source);
 const byKey=Object.fromEntries(r.map(x=>[x.key,x]));
 for(const key of ['AroraBarak2009','CoverThomas2006','Shannon1948PartI','HennieStearns1966','Cook1971']){
  assert.ok(byKey[key],key);assert.equal(byKey[key].alreadyReferenced,true,key);
 }
 assert.equal(r.length,5);
});

test('LaTeX comments are not matching evidence and BibTeX escapes publisher symbols',()=>{
 assert.deepEqual(suggestCitations('% SAT-hardness and computational complexity'),[]);
 assert.ok(formatBibtex(REFERENCES.find(x=>x.key==='CoverThomas2006')).includes('Wiley \\& Sons'));
});

test('citation and arXiv identifiers are scanned past the former 64 KiB limit',()=>{
 const source='x'.repeat(75000)+' SAT-hardness arXiv:2601.00113v2';
 assert.ok(suggestCitations(source).some(x=>x.key==='Cook1971'));
 const ids=detectArxivIdentifiers(source);
 assert.equal(ids.length,1);assert.equal(ids[0].id,'2601.00113v2');
});
