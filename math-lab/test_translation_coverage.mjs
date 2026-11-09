import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DICTIONARIES} from './extended-i18n.mjs';
import {LOCALES} from './i18n.mjs';

const pages=['index.html','how-to.html','ai-latex-guide.html','formal-request.html'];
// These are intentionally stable technical or initial runtime states, not untranslated prose.
// Source snippets, LaTeX, code, selectable language names and browser title are checked separately.
const stable=new Set(['Step 1 of 5','64 KiB','AUTO-SUGGESTED (UNCONFIRMED)']);
function fragments(html){
 // Do not concatenate prose on opposite sides of protected mathematical/code blocks.
 const safe=html.replace(/<(script|style|pre|code|textarea|select|title)\b[^>]*>[\s\S]*?<\/\1>/gi,'<span data-protected></span>');
 return [...safe.matchAll(/>([^<>]+)</g)]
  .map(m=>m[1].trim().replaceAll('&amp;','&'))
  .filter(s=>s&&/[A-Za-z]/.test(s));
}
function localizable(text){
 return !stable.has(text)&&!/^[A-Z0-9._\- ·/=≠]+$/.test(text);
}
test('every locale has the exact same nonempty translation keys',()=>{
 const keys=Object.keys(DICTIONARIES.en);
 assert.equal(Object.keys(DICTIONARIES).length,6);
 for(const [locale,d] of Object.entries(DICTIONARIES)){
  assert.deepEqual(Object.keys(d),keys,locale);
  assert.ok(keys.every(k=>typeof d[k]==='string'&&d[k].length>0),locale);
 }
});
test('every static visible prose fragment on all four Math Lab pages is translated',async()=>{
 const standard=new Set(Object.values(LOCALES.en));
 let total=0;
 for(const page of pages){
  const html=await readFile(new URL(page,import.meta.url),'utf8');
  const texts=fragments(html).filter(localizable);
  const missing=[...new Set(texts.filter(t=>!Object.hasOwn(DICTIONARIES.en,t)&&!standard.has(t)))];
  total+=texts.length;
  assert.deepEqual(missing,[],page+' contains untranslated static prose');
 }
 console.log('STATIC_UI_TRANSLATION := COMPLETE_FOR_SCANNED_NODES · '+total+' classified fragments');
 console.log('DYNAMIC_DIAGNOSTIC_COVERAGE := NOT_EXHAUSTIVELY_VERIFIED');
 console.log('RENDERED_BROWSER_COVERAGE := NOT_RUN');
});
