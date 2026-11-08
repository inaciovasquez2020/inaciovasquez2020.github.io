import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDOI,lookupURL,lookupDOI,reviewedBibtex,LookupInputError} from './doi-lookup.mjs';
const doi='10.1103/PhysRev.48.73';
const cr={message:{DOI:doi,title:['The Particle Problem in the General Theory of Relativity'],author:[{given:'Albert',family:'Einstein'},{given:'Nathan',family:'Rosen'}],published:{'date-parts':[[1935]]},publisher:'APS',type:'journal-article','container-title':['Physical Review']}};
const dc={data:{attributes:{doi:'10.48550/arXiv.2601.00113',titles:[{title:'Synthetic preprint test'}],creators:[{name:'Example Author'}],publicationYear:2026,publisher:'arXiv',types:{resourceTypeGeneral:'Preprint'}}}};
const answer=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});
test('validated DOI and fixed provider hosts',()=>{
 assert.equal(normalizeDOI('https://doi.org/'+doi),doi);
 assert.equal(lookupURL('Crossref',doi),'https://api.crossref.org/works/'+doi);
 for(const x of ['evil.invalid/path','https://evil.org/a','arXiv:2601.00113','10.1234/foo?redirect=evil','x'.repeat(300)])
  assert.throws(()=>normalizeDOI(x),LookupInputError);
 assert.throws(()=>lookupURL('evil',doi),LookupInputError);
});
test('Crossref metadata is unreviewed and user confirmation gates BibTeX',async()=>{
 const calls=[];
 const r=await lookupDOI(doi,{fetchImpl:async(url,options)=>{calls.push({url,options});return answer(cr);}});
 assert.equal(calls.length,1);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');
 assert.equal(r.status,'METADATA_FOUND_UNREVIEWED');assert.equal(r.record.peer_review_status,'UNKNOWN');
 assert.equal(r.record.reference_supports_claim,'NOT_CHECKED');assert.equal(r.mathematical_verification,'NOT_PERFORMED');
 assert.throws(()=>reviewedBibtex(r.record),LookupInputError);assert.match(reviewedBibtex(r.record,{confirmed:true}),/@article/);
});
test('DataCite arXiv DOI does not assert version verification',async()=>{
 const r=await lookupDOI('10.48550/arXiv.2601.00113',{fetchImpl:async()=>answer(dc)});
 assert.equal(r.record.registry,'DataCite');assert.equal(r.record.peer_review_status,'UNKNOWN');
 assert.equal(r.record.type,'Preprint');assert.match(reviewedBibtex(r.record,{confirmed:true}),/@misc/);
});
test('404 fallback to DataCite is bounded',async()=>{
 const calls=[];
 const r=await lookupDOI(doi,{fetchImpl:async url=>{calls.push(url);return calls.length===1?answer({},404):answer({...dc,data:{attributes:{...dc.data.attributes,doi}}});}});
 assert.equal(calls.length,2);assert.equal(r.record.registry,'DataCite');
});
test('mismatched DOI cannot be exported',async()=>{
 const r=await lookupDOI(doi,{fetchImpl:async()=>answer({...cr,message:{...cr.message,DOI:'10.1000/other'}})});
 assert.equal(r.status,'INCOMPLETE');assert.equal(r.record,undefined);assert.equal(r.attempts.length,2);
});
test('network, HTTP 429 and oversized records are incomplete',async()=>{
 for(const f of [async()=>{throw new TypeError('CORS');},async()=>answer({},429),async()=>new Response('x'.repeat(131073),{status:200})]){
  const r=await lookupDOI(doi,{fetchImpl:f});assert.equal(r.status,'INCOMPLETE');assert.equal(r.record,undefined);
 }
});
test('two 404 responses do not establish nonexistence',async()=>{
 const r=await lookupDOI(doi,{fetchImpl:async()=>answer({},404)});
 assert.equal(r.status,'NOT_FOUND');assert.equal(r.attempts.length,2);assert.match(r.reason,/does not prove/);
});
test('unsafe metadata is displayed as plain text and BibTeX escaped',async()=>{
 const r=await lookupDOI(doi,{fetchImpl:async()=>answer({...cr,message:{...cr.message,title:['<script>alert(1)</script> Source & Title {bad}%']}})});
 assert.equal(r.record.title,'alert(1) Source & Title {bad}%');
 const bib=reviewedBibtex(r.record,{confirmed:true});
 assert.ok(!bib.includes('<script>'));assert.match(bib,/\\&/);assert.match(bib,/\\\{/);
});
