import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCES,suggestCitations,formatBibtex,detectArxivIdentifiers} from './citation-assist.mjs';
test('curated entries have unique DOIs and conservative exact metadata',()=>{
 assert.equal(REFERENCES.length,3);
 assert.equal(new Set(REFERENCES.map(x=>x.doi)).size,3);
 for(const r of REFERENCES){assert.match(r.doi,/^10\./);assert.ok(r.authors&&r.title&&r.year&&r.journal);
   assert.match(formatBibtex(r),/@article/);assert.ok(formatBibtex(r).includes(r.doi));}
});
test('keyword matching is only suggestion and never verification',()=>{
 const r=suggestCitations('We invoke topological censorship in the argument.');
 assert.equal(r.length,1);
 assert.equal(r[0].key,'FriedmanSchleichWitt1993');
 assert.equal(r[0].status,'SUGGESTION_ONLY');assert.equal(r[0].reference_supports_claim,'NOT_CHECKED');
 assert.equal(r[0].alreadyReferenced,false);
 assert.equal(suggestCitations('No indexed matching phrases.').length,0);
});
test('existing citation is distinguished from missing reference',()=>{
 const r=suggestCitations('We discuss topological censorship. \\cite{FriedmanSchleichWitt1993}');
 assert.equal(r.length,1);assert.equal(r[0].alreadyReferenced,true);
});
test('historical physics and information-theory hints are bounded',()=>{
 assert.deepEqual(suggestCitations('Einstein--Rosen bridge and mutual information').map(x=>x.key),['EinsteinRosen1935','Shannon1948PartI']);
 assert.deepEqual(suggestCitations(''),[]);
});

test('arXiv links are identifier-only, never fabricated metadata or certified results',()=>{
 const x=detectArxivIdentifiers('arXiv:2601.00113v2 and https://arxiv.org/abs/2601.00113v2');
 assert.equal(x.length,1);
 assert.equal(x[0].id,'2601.00113v2');
 assert.equal(x[0].url,'https://arxiv.org/abs/2601.00113v2');
 assert.equal(x[0].title,null);
 assert.equal(x[0].peer_review_status,'UNKNOWN');
 assert.equal(x[0].reference_supports_claim,'NOT_CHECKED');
 assert.equal(x[0].status,'IDENTIFIER_DETECTED_METADATA_NOT_FETCHED');
 assert.deepEqual(detectArxivIdentifiers('arXiv:2613.00113 invalid; arXiv:1412.0001; arXiv:2601.0001'),
   [{id:'1412.0001',url:'https://arxiv.org/abs/1412.0001',status:'IDENTIFIER_DETECTED_METADATA_NOT_FETCHED',title:null,authors:null,peer_review_status:'UNKNOWN',reference_supports_claim:'NOT_CHECKED'}]);
});
