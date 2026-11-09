import test from 'node:test';
import assert from 'node:assert/strict';
import {DICTIONARIES,uiText,uiFormat,tourPosition,applyExtended} from './extended-i18n.mjs';

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
 assert.ok(citation.includes("if(analyzed)render()"));
 for(const language of ['en','pt-BR','es'])assert.ok(DICTIONARIES[language]['Manuscript structure reviewed; mathematical claims not verified.']);
});

test('translated dynamic explanations preserve exact witness numbers and user provenance',()=>{
 assert.equal(uiFormat('At x = {x}, the two sides differ. The universal equality is false.',{x:-42},'pt-BR'),'Em x = -42, os dois lados diferem. A igualdade universal é falsa.');
 assert.equal(uiFormat('All {count} exact evaluations agree. The degree bound proves equality for every real x.',{count:33},'es').includes('33'),true);
 const source='original-source.tex',title='\\\\alpha + \\\\beta';
 for(const lang of ['en','pt-BR','es']){
  const text=uiFormat('{title} · {source}. The Lab has not proved or refuted any theorem. Review questions below are heuristic.',{title,source},lang);
  assert.ok(text.includes(source));assert.ok(text.includes(title));
 }
});

test('language switching updates accessible attributes and page title but never input values',()=>{
 const oldDocument=globalThis.document,oldFilter=globalThis.NodeFilter;
 try{
  const attrs={'placeholder':'Reviewed repo URL and commit','aria-label':'Interface language'};
  const control={value:'user-authored-unchanged',hasAttribute:k=>Object.hasOwn(attrs,k),getAttribute:k=>attrs[k],setAttribute(k,v){attrs[k]=v;}};
  const textNode={nodeValue:'',parentElement:{closest:()=>null}};
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.document={body:{},title:'How to Use Math Verification Lab | Vasquez Research',querySelectorAll(){return [control];},createTreeWalker(){return {nextNode:()=>null};}};
  applyExtended('pt-BR');
  assert.equal(attrs.placeholder,'URL do repositório revisado e commit');
  assert.equal(attrs['aria-label'],'Idioma da interface');
  assert.equal(control.value,'user-authored-unchanged');
  applyExtended('es');
  assert.equal(attrs.placeholder,'URL del repositorio revisado y commit');
  applyExtended('en');
  assert.equal(attrs.placeholder,'Reviewed repo URL and commit');
  assert.equal(attrs['aria-label'],'Interface language');
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldFilter===undefined)delete globalThis.NodeFilter;else globalThis.NodeFilter=oldFilter;
 }
});

test('runtime taxonomy provides six locales without altering stable IDs or checker scope',async()=>{
 const {FIELD_LABELS,fieldLabel}=await import('./runtime-taxonomy-i18n.mjs');
 const {TAXONOMY,category,coverage}=await import('./taxonomy.mjs');
 const labels=TAXONOMY.flatMap(f=>[f.label,...f.subcategories.map(c=>c.label)]);
 for(const locale of ['en','es','pt-BR','zh-Hans','fr','de']){
  for(const label of labels)assert.ok(FIELD_LABELS[locale][label],locale+' / '+label);
 }
 assert.equal(fieldLabel('Algebra','de'),'Algebra');
 assert.equal(fieldLabel('Polynomial identities over R','pt-BR'),'Identidades polinomiais sobre R');
 assert.equal(category('algebra','polynomial-identities').field,'algebra');
 assert.equal(coverage('algebra','polynomial-identities','exact-polynomial').status,'EXACT_SUPPORTED');
 assert.equal(coverage('topology','manifold-topology','exact-polynomial').status,'NO_ENGINE');
 const ui=await (await import('node:fs/promises')).readFile(new URL('ui.mjs',import.meta.url),'utf8');
 assert.ok(ui.includes('refreshTaxonomyDisplay()'));
 assert.ok(ui.includes('fieldLabel(s.label,currentLanguage())'));
 assert.ok(ui.includes('option.value=s.id'));
});

test('runtime messages cover every locale and preserve mathematical IDs',async()=>{
 const {RUNTIME_MESSAGES,message}=await import('./runtime-messages-i18n.mjs');
 const {TAXONOMY,coverage}=await import('./taxonomy.mjs');
 const languages=['en','es','pt-BR','zh-Hans','fr','de'];
 const keys=Object.keys(RUNTIME_MESSAGES.en);
 assert.equal(keys.length,18);
 for(const language of languages){
   assert.deepEqual(Object.keys(RUNTIME_MESSAGES[language]),keys);
   for(const key of keys)assert.ok(message(key,language));
 }
 assert.equal(message('confirmReview','de'),'FACHGEBIET UND UNTERKATEGORIE BESTÄTIGEN');
 const rendered=message('selection','pt-BR',{field:'Topologia',subcategory:'Variedades e triangulações',origin:message('autoOrigin','pt-BR'),method:message('manuscript','pt-BR')});
 assert.ok(rendered.includes('Topologia'));assert.ok(rendered.includes('Variedades e triangulações'));
 assert.equal(coverage('topology','manifold-topology','exact-polynomial').status,'NO_ENGINE');
 assert.equal(TAXONOMY.find(f=>f.id==='topology').id,'topology');
 const source=await (await import('node:fs/promises')).readFile(new URL('ui.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("localMessage('selection',currentLanguage()"));
 assert.ok(source.includes("localMessage('classification',currentLanguage()"));
});

test('bounded diagnostic translations cover all six locales and preserve tokens',async()=>{
 const {ERROR_MESSAGES,DIAGNOSTIC_SOURCES,REQUEST_FIELD_NAMES,explainError}=await import('./runtime-errors-i18n.mjs');
 const locales=['en','es','pt-BR','zh-Hans','fr','de'];
 const keys=Object.keys(ERROR_MESSAGES.en);
 assert.ok(keys.length>=50);
 assert.equal(Object.keys(DIAGNOSTIC_SOURCES).length,40);
 for(const locale of locales){
  assert.deepEqual(Object.keys(ERROR_MESSAGES[locale]),keys);
  for(const key of keys)assert.ok(ERROR_MESSAGES[locale][key],locale+' '+key);
  assert.ok(explainError('Expression exceeds 512 characters.',locale));
  assert.equal(explainError('SOURCE_UNRECOGNIZED_STATUS_17',locale),'SOURCE_UNRECOGNIZED_STATUS_17');
 }
 assert.equal(explainError('Exactly one equality sign is required; inequalities and chained equalities are unsupported.','de'),ERROR_MESSAGES.de.missingEquality);
 assert.equal(explainError("Expected 'rparen', received 'eof'.",'es'),"Se esperaba «rparen», se recibió «eof».");
 assert.equal(explainError("Expected a polynomial term, received 'eof'.",'pt-BR'),"Esperado termo polinomial; recebido «eof».");
 assert.equal(explainError('Complete candidate Lean source must be nonempty and under 65536 characters.','de'),'Vollständiger Lean-Quelltext muss 1 bis 65536 Zeichen enthalten.');
 assert.equal(explainError('Theorem declaration must be nonempty and under 8192 characters.','fr'),ERROR_MESSAGES.fr.theorem);
 for(const locale of locales)assert.equal(Object.keys(REQUEST_FIELD_NAMES[locale]).length,10);
 const {readFile}=await import('node:fs/promises');
 const engine=await readFile(new URL('engine.mjs',import.meta.url),'utf8');
 const formal=await readFile(new URL('formal-request-core.mjs',import.meta.url),'utf8');
 assert.ok(engine.includes('Exactly one equality sign is required'));
 assert.ok(formal.includes("required(d.proof,'Complete candidate Lean source',65536)"));
});

test('all static engine fail diagnostics have six-language presentation mappings',async()=>{
 const {DIAGNOSTIC_SOURCES,ERROR_MESSAGES}=await import('./runtime-errors-i18n.mjs');
 const {readFile}=await import('node:fs/promises');
 const engine=await readFile(new URL('engine.mjs',import.meta.url),'utf8');
 const fixed=[...engine.matchAll(/\\bfail\\('([^']+)'\\)/g)].map(m=>m[1]);
 assert.ok(fixed.length>=20,'source scanner should not silently stop finding engine diagnostics');
 for(const raw of fixed){
  const key=DIAGNOSTIC_SOURCES[raw]||(raw==='Exactly one equality sign is required; inequalities and chained equalities are unsupported.'?'missingEquality':null);
  assert.ok(key,'untranslated engine failure: '+raw);
  for(const lang of ['en','es','pt-BR','zh-Hans','fr','de'])assert.ok(ERROR_MESSAGES[lang][key],lang+': '+raw);
 }
 const names=['Request ID','Subject field','Subcategory','Theorem declaration','Complete candidate Lean source','Exact Lean version','Pinned dependency or repository revision','Source reference'];
 const formal=await readFile(new URL('formal-request-core.mjs',import.meta.url),'utf8');
 const found=[...formal.matchAll(/required\\(d\\.\\w+,'([^']+)',\\d+\\)/g)].map(m=>m[1]);
 for(const name of found)assert.ok(names.includes(name),'unknown unlocalized formal field '+name);
});
