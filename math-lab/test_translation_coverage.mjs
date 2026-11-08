import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DICTIONARIES} from './extended-i18n.mjs';

// Diagnostic inventory, not a complete rendered-DOM or translation-quality proof.
// HTML strings with nested markup and runtime-generated explanations require a browser audit.
function visibleFragments(html){
 const stripped=html.replace(/<(script|style|pre|code|textarea)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi,'');
 return [...stripped.matchAll(/>([^<>]+)</g)]
  .map(m=>m[1].trim())
  .filter(x=>x.length>4&&/[A-Za-z]{3}/.test(x));
}
test('all locale dictionaries cover the same UI keys',()=>{
 const keys=Object.keys(DICTIONARIES.en);
 for(const [lang,d] of Object.entries(DICTIONARIES)){
  assert.deepEqual(Object.keys(d),keys,lang);
  assert.ok(keys.every(k=>typeof d[k]==='string'&&d[k].length>0),lang);
 }
});
test('report untranslated static candidate inventory without claiming full translation',async()=>{
 const pages=['index.html','how-to.html','ai-latex-guide.html','formal-request.html'];
 const inventory={};
 for(const name of pages){
  const html=await readFile(new URL(name,import.meta.url),'utf8');
  const candidates=visibleFragments(html);
  const untranslated=candidates.filter(x=>!Object.hasOwn(DICTIONARIES.en,x)&&
    !/^[A-Z0-9._\\- ·/=≠]+$/.test(x)&&
    !/^(?:English|Español|Português \\(Brasil\\)|Français|Deutsch|简体中文|VASQUEZ RESEARCH)$/.test(x));
  inventory[name]={candidate_nodes:candidates.length,not_in_extended_dictionary:untranslated.length,examples:untranslated.slice(0,8)};
  assert.ok(candidates.length>0,name);
 }
 console.log('STATIC_TRANSLATION_INVENTORY := '+JSON.stringify(inventory));
 console.log('FULL_RENDERED_TRANSLATION := NOT_VERIFIED');
 // Never confuse a green test runner with complete localization.
 assert.ok(Object.values(inventory).some(x=>x.not_in_extended_dictionary>0));
});
