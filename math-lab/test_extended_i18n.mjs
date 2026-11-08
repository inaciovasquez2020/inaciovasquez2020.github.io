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
