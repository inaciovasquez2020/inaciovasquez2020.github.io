import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightFile,validateSourceText,SourcePreflightError,MAX_FILE_BYTES,MAX_MANUSCRIPT_BYTES} from './source-preflight.mjs';
import {preflightMessage} from './source-preflight-i18n.mjs';
import {sha256Utf8} from './source-location.mjs';

function fakeFile(text,name='example.tex'){
 const bytes=new TextEncoder().encode(text);
 return {name,size:bytes.byteLength,async arrayBuffer(){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}};
}
async function rejects(file,method,code){
 await assert.rejects(()=>preflightFile(file,method),e=>e instanceof SourcePreflightError&&e.code===code);
}
test('valid exact text admitted without proof or upload',async()=>{
 const r=await preflightFile(fakeFile('\\[x^2+2x+1=(x+1)^2\\]'),'exact-polynomial');
 assert.equal(r.status,'READY');
 assert.equal(r.candidates.length,1);
 assert.equal(r.source_sha256,sha256Utf8(r.text));
 assert.equal(r.source_uploaded,false);
 assert.equal(r.mathematical_truth_assessed,false);
});
test('structural source admitted as review without proof',async()=>{
 const r=await preflightFile(fakeFile('% \\begin{theorem} hidden \\end{theorem}\n\\begin{theorem}Visible\\end{theorem} \\(x\\)'),'manuscript-audit');
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.extraction_flags>0);
 assert.equal(r.mathematical_truth_assessed,false);
});
test('invalid suffix, names, sizes and read mismatches fail before admission',async()=>{
 for(const name of ['bad.pdf','../bad.tex','folder/bad.txt','a'+String.fromCharCode(0)+'.tex'])
  await rejects(fakeFile('x=x',name),'exact-polynomial','INVALID_EXTENSION_OR_NAME');
 let called=false;
 await rejects({name:'big.tex',size:MAX_FILE_BYTES+1,async arrayBuffer(){called=true;}},'exact-polynomial','FILE_SIZE');
 assert.equal(called,false);
 await rejects({name:'empty.tex',size:0,async arrayBuffer(){called=true;}},'exact-polynomial','FILE_SIZE');
 await rejects({name:'mismatch.txt',size:8,async arrayBuffer(){return new Uint8Array([120,61,120]).buffer;}},'exact-polynomial','BYTE_COUNT_MISMATCH');
 await rejects({name:'unreadable.tex',size:1,async arrayBuffer(){throw Error('read refused');}},'exact-polynomial','FILE_READ_FAILED');
});
test('invalid UTF-8 and dangerous text controls fail closed',async()=>{
 const invalid=new Uint8Array([0xc3,0x28]);
 await rejects({name:'bad.tex',size:2,async arrayBuffer(){return invalid.buffer;}},'exact-polynomial','INVALID_UTF8');
 for(const [value,code] of [['a\0b','CONTROL_CHARACTER'],['x\u202e=y','BIDI_CONTROL']])
  await rejects(fakeFile(value),'manuscript-audit',code);
 await rejects(fakeFile('   '),'manuscript-audit','EMPTY_SOURCE');
 assert.throws(()=>validateSourceText('x'.repeat(65537)),e=>e.code==='SOURCE_TOO_LARGE');
});
test('unsupported exact notation cannot issue a candidate',async()=>{
 await rejects(fakeFile('\\begin{theorem}x=x\\end{theorem}'),'exact-polynomial','NO_SUPPORTED_EQUATION');
 await rejects(fakeFile('$x=x$'),'exact-polynomial','UNSUPPORTED_EXACT_SOURCE');
});
test('six locales preserve machine codes',()=>{
 for(const language of ['en','es','pt-BR','fr','de','zh-Hans']){
  const message=preflightMessage('BLOCKED',language,'INVALID_UTF8');
  assert.ok(message.startsWith('SOURCE_PREFLIGHT_BLOCKED'));
  assert.ok(message.includes('INVALID_UTF8'));
 }
 assert.notEqual(preflightMessage('READY','fr'),preflightMessage('READY','de'));
});

test('large manuscript admitted while exact mode stays limited',async()=>{
 const large='\\title{Synthetic manuscript}\n'+'% synthetic padding\n'.repeat(4900);
 assert.ok(large.length>65536&&new TextEncoder().encode(large).byteLength<MAX_MANUSCRIPT_BYTES);
 const r=await preflightFile(fakeFile(large),'manuscript-audit');
 assert.equal(r.text,large);assert.equal(r.source_sha256,sha256Utf8(large));
 assert.equal(r.source_uploaded,false);assert.equal(r.mathematical_truth_assessed,false);
 assert.equal(MAX_FILE_BYTES,65536);assert.equal(MAX_MANUSCRIPT_BYTES,131072);
 assert.throws(()=>validateSourceText(large),e=>e.code==='SOURCE_TOO_LARGE');
 assert.equal(validateSourceText(large,'manuscript-audit'),large);
 let read=false;
 await rejects({name:'oversize.tex',size:MAX_MANUSCRIPT_BYTES+1,async arrayBuffer(){read=true;}},'manuscript-audit','FILE_SIZE');
 assert.equal(read,false);
 await rejects(fakeFile('π'.repeat(65537)),'manuscript-audit','FILE_SIZE');
 assert.equal(validateSourceText('π'.repeat(65536),'manuscript-audit').length,65536);
 await rejects(fakeFile('x'.repeat(65537)),'exact-polynomial','FILE_SIZE');
});
