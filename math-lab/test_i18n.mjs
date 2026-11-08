import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCALES,getLocale,translate,applyLanguage} from './i18n.mjs';
test('six languages use complete static interface keys',()=>{
 const keys=Object.keys(LOCALES.en);
 assert.equal(Object.keys(LOCALES).length,6);
 for(const [locale,dict] of Object.entries(LOCALES)){
   assert.deepEqual(Object.keys(dict),keys,locale);
   assert.ok(Object.values(dict).every(x=>typeof x==='string'&&x.length>0));
 }
 assert.equal(getLocale('bogus'),'en');
 assert.equal(translate('warning','bogus'),LOCALES.en.warning);
});
test('translation only mutates opt-in labels, never mathematical text or codes',()=>{
 const labels=Object.keys(LOCALES.en).map(k=>({dataset:{i18n:k},textContent:''}));
 const source={textContent:'(x+1)^2 = x^2+2x+1'};
 const verdict={textContent:'EXACT_CERTIFICATE_PASS'};
 const report={textContent:'NOT_VERIFIED'};
 const root={querySelectorAll:s=>{assert.equal(s,'[data-i18n]');return labels;},documentElement:{setAttribute(k,v){this[k]=v;}}};
 const used=applyLanguage(root,'pt-BR');
 assert.equal(used,'pt-BR');
 assert.equal(labels.find(x=>x.dataset.i18n==='method').textContent,LOCALES['pt-BR'].method);
 assert.equal(root.documentElement.lang,'pt-BR');
 assert.equal(source.textContent,'(x+1)^2 = x^2+2x+1');
 assert.equal(verdict.textContent,'EXACT_CERTIFICATE_PASS');
 assert.equal(report.textContent,'NOT_VERIFIED');
});
