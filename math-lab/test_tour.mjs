import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const guide=readFileSync(new URL('./ai-latex-guide.html',import.meta.url),'utf8');
const readme=readFileSync(new URL('./AI_LATEX_README.md',import.meta.url),'utf8');
test('optional illustrated tour has five steps and close, back and next controls',()=>{
  assert.match(html,/id="open-tour"/);
  assert.match(html,/id="lab-tour"/);
  assert.equal((html.match(/data-tour-step/g)||[]).length,5);
  for(const id of ['tour-close','tour-back','tour-next','tour-position'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/schematic/);
});
test('AI preparation instructions protect source fidelity and status boundaries',()=>{
  for(const token of ['UNCERTAIN','LaTeX','NOT_VERIFIED','EXACT_CERTIFICATE_PASS','privacy'])
    assert.ok((readme+' '+guide).toLowerCase().includes(token.toLowerCase()),token);
  assert.match(readme,/faithful|exactly/i);
  assert.match(guide,/AI agreement is not formal proof/);
});
