import test from 'node:test';
import assert from 'node:assert/strict';
import {DICTIONARIES,uiText,tourPosition,applyExtended} from './extended-i18n.mjs';

test('six language dictionaries have identical keys',()=>{
 const languages=['en','es','pt-BR','zh-Hans','fr','de'];
 assert.deepEqual(Object.keys(DICTIONARIES),languages);
 const keys=Object.keys(DICTIONARIES.en);
 assert.ok(keys.length>=60);
 for(const lang of languages){
  assert.deepEqual(Object.keys(DICTIONARIES[lang]),keys,lang);
  for(const key of keys)assert.ok(typeof DICTIONARIES[lang][key]==='string'&&DICTIONARIES[lang][key]);
 }
 assert.equal(uiText('Counterexample found.','pt-BR'),'Contraexemplo encontrado.');
 assert.equal(uiText('EXACT_CERTIFICATE_PASS','pt-BR'),'EXACT_CERTIFICATE_PASS');
 assert.equal(tourPosition(2,5,'zh-Hans'),'第 3 步，共 5 步');
});

test('language changes restore original whitespace and protect source and certificate',()=>{
 const oldDocument=globalThis.document,oldNodeFilter=globalThis.NodeFilter;
 try {
  const field={nodeValue:'  Counterexample found.  ',parentElement:{closest:()=>null}};
  const source={nodeValue:'(x+1)^2 = x^2 + 2x + 1',parentElement:{closest:(q)=>'textarea'}};
  const status={nodeValue:'EXACT_CERTIFICATE_PASS',parentElement:{closest:()=>null}};
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.document={body:{},createTreeWalker(){const nodes=[field,source,status];let i=0;return {nextNode:()=>nodes[i++]||null};}};
  applyExtended('pt-BR');
  assert.equal(field.nodeValue,'  Contraexemplo encontrado.  ');
  assert.equal(source.nodeValue,'(x+1)^2 = x^2 + 2x + 1');
  assert.equal(status.nodeValue,'EXACT_CERTIFICATE_PASS');
  applyExtended('de');
  assert.equal(field.nodeValue,'  Gegenbeispiel gefunden.  ');
  applyExtended('en');
  assert.equal(field.nodeValue,'  Counterexample found.  ');
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldNodeFilter===undefined)delete globalThis.NodeFilter;else globalThis.NodeFilter=oldNodeFilter;
 }
});

test('all four Math Lab pages expose six-language controls without replacing source fields',async()=>{
 const {readFile}=await import('node:fs/promises');
 const files=['index.html','how-to.html','ai-latex-guide.html','formal-request.html'];
 for(const file of files){
  const html=await readFile(new URL(file,import.meta.url),'utf8');
  assert.match(html,/id="ui-language"/,file);
  assert.match(html,/src="extended-i18n\.mjs"/,file);
  for(const lang of ['en','es','pt-BR','zh-Hans','fr','de'])assert.ok(html.includes('value="'+lang+'"'),file+': '+lang);
 }
 const formal=await readFile(new URL('formal-request.html',import.meta.url),'utf8');
 assert.match(formal,/id="req-theorem"/);
 assert.match(formal,/id="req-proof"/);
 const ui=await readFile(new URL('ui.mjs',import.meta.url),'utf8');
 assert.match(ui,/verifyEquation\(/);
 assert.match(ui,/auditManuscript\(/);
});

test('citation UI translation keys cover all languages and preserve citation identifiers',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=await readFile(new URL('citation-ui.mjs',import.meta.url),'utf8');
 for(const key of ['No matching entries in this small curated library. This does NOT mean the manuscript needs no citations.','Open canonical arXiv record','I checked this reference and want its BibTeX entry.','Status: SUGGESTION_ONLY / CLAIM SUPPORT NOT CHECKED. ','Input changed. Re-run citation suggestions before exporting.']){
  assert.ok(src.includes('uiText('));
  for(const locale of Object.keys(DICTIONARIES))assert.ok(DICTIONARIES[locale][key],locale+': '+key);
 }
 assert.ok(src.includes('ref.doi'));
 assert.ok(src.includes('ref.note'));
 assert.ok(src.includes('ref.title'));
 assert.match(src,/formatBibtex/);
 assert.equal(uiText('NOT_VERIFIED','es'),'NOT_VERIFIED');
});

test('cached results relocalize from stored records, never invoke verification on locale changes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=await readFile(new URL('ui.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("lastRendered={kind:'exact',record:r,entry}"));
 assert.ok(src.includes("lastRendered={kind:'manuscript',record:r,entry}"));
 const handler=src.slice(src.lastIndexOf("// Language changes re-render"));
 assert.ok(handler.includes('renderResult(record,entry)'));
 assert.ok(handler.includes('renderManuscript(record,entry)'));
 assert.ok(!handler.includes('verifyEquation('));
 assert.ok(!handler.includes('auditManuscript('));
 const citation=await readFile(new URL('citation-ui.mjs',import.meta.url),'utf8');
 assert.ok(citation.includes("checkbox.checked=checked.has(i)"));
 assert.ok(citation.includes("if(suggestions.length||arxivIds.length)render()"));
 for(const language of ['en','pt-BR','es'])assert.ok(DICTIONARIES[language]['Manuscript structure reviewed; mathematical claims not verified.']);
});
