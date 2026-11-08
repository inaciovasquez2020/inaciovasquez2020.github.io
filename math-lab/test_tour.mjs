import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
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

test('walkthrough really advances, reverses, resets, and dismisses without auto-opening',()=>{
 const listeners=new Map();
 const element=id=>({
   id,hidden:false,disabled:false,textContent:'',attrs:{},focused:false,
   addEventListener(type,cb){listeners.set(id+':'+type,cb);},
   setAttribute(k,v){this.attrs[k]=v;},
   focus(){this.focused=true;}
 });
 const ids=['lab-tour','open-tour','tour-back','tour-next','tour-close','tour-position'];
 const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
 const slides=Array.from({length:5},(_,i)=>({hidden:i>0}));
 const dialog=elements['lab-tour'];
 dialog.querySelectorAll=selector=>selector==='[data-tour-step]'?slides:[];
 dialog.open=false;
 dialog.showModal=()=>{dialog.open=true;};
 dialog.close=()=>{dialog.open=false;listeners.get('lab-tour:close')();};
 const document={getElementById:id=>elements[id]};
 const script=readFileSync(new URL('./tour.mjs',import.meta.url),'utf8');
 runInNewContext(script,{document,window:{location:{assign(){throw Error('unexpected navigation');}}}});
 const emit=(id,type,ev={})=>listeners.get(id+':'+type)(ev);
 assert.equal(dialog.open,false,'tour must not open by default');
 emit('open-tour','click');
 assert.equal(dialog.open,true);
 assert.equal(elements['tour-close'].focused,true);
 assert.equal(elements['tour-position'].textContent,'Step 1 of 5');
 assert.equal(elements['tour-back'].disabled,true);
 assert.deepEqual(slides.map(x=>x.hidden),[false,true,true,true,true]);
 for(let i=2;i<=5;i++){
   emit('tour-next','click');
   assert.equal(elements['tour-position'].textContent,'Step '+i+' of 5');
   assert.equal(slides.filter(x=>!x.hidden).length,1);
   assert.equal(slides[i-1].hidden,false);
 }
 assert.equal(elements['tour-next'].textContent,'Finish');
 emit('tour-back','click');
 assert.equal(elements['tour-position'].textContent,'Step 4 of 5');
 emit('tour-next','click');
 emit('tour-next','click');
 assert.equal(dialog.open,false);
 assert.equal(elements['open-tour'].focused,true,'close restores focus to launcher');
 emit('open-tour','click');
 assert.equal(elements['tour-position'].textContent,'Step 1 of 5','reopening resets the tour');
 emit('tour-close','click');
 assert.equal(dialog.open,false);
 emit('open-tour','click');
 emit('lab-tour','click',{target:dialog});
 assert.equal(dialog.open,false,'backdrop click dismisses');
});
