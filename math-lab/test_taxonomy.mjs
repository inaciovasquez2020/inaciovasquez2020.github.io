import test from 'node:test';
import assert from 'node:assert/strict';
import {TAXONOMY,category,coverage,subcategoriesFor,suggestCategory} from './taxonomy.mjs';
test('taxonomy field/subcategory coverage exact scope and no other engine',()=>{
  assert.ok(TAXONOMY.length>=8);
  for(const field of TAXONOMY){
    assert.ok(field.subcategories.length);
    for(const sub of field.subcategories){
      const c=category(field.id,sub.id);
      const exact=coverage(field.id,sub.id,'exact-polynomial');
      const structure=coverage(field.id,sub.id,'manuscript-audit');
      assert.equal(structure.status,'STRUCTURAL_ONLY');assert.equal(structure.can_run,true);
      assert.equal(exact.can_run,field.id==='algebra'&&sub.id==='polynomial-identities');
      assert.equal(c.exact_supported,exact.can_run);
    }
  }
  assert.throws(()=>category('topology','polynomial-identities'),TypeError);
  assert.throws(()=>coverage('algebra','polynomial-identities','fake-method'),TypeError);
});
test('deterministic manuscript suggestions never claim verification',()=>{
  let a=suggestCategory('Shannon entropy and mutual information');
  assert.deepEqual([a.field,a.subcategory,a.confidence],['probability-information','entropy-capacity','HEURISTIC_ONLY']);
  a=suggestCategory('Pachner triangulation of a 3-manifold');
  assert.deepEqual([a.field,a.subcategory],['topology','manifold-topology']);
  a=suggestCategory('no indexed mathematical signals');
  assert.equal(a.confidence,'NO_MATCH');
  assert.deepEqual(subcategoriesFor('not-a-field'),[]);
});
import fs from 'node:fs';
test('published required manifest schema tracks category/subcategory matrix',()=>{
  const schema=JSON.parse(fs.readFileSync(new URL('./claim-manifest-schema.json',import.meta.url),'utf8'));
  assert.deepEqual(schema.required,['claim_id','source_reference','field','subcategory','assumptions']);
  assert.equal(schema.additionalProperties,false);
  assert.deepEqual(schema.allOf.map(x=>x.if.properties.field.const),TAXONOMY.map(x=>x.id));
  for(let i=0;i<TAXONOMY.length;i++)assert.deepEqual(schema.allOf[i].then.properties.subcategory.enum,TAXONOMY[i].subcategories.map(x=>x.id));
});
