import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEquation,UnsupportedClaim} from './engine.mjs';
const reject=s=>assert.throws(()=>verifyEquation(s),UnsupportedClaim,s);
test('adversarial number and unsupported grammar checks',()=>{
 for(const s of [
  '9007199254740993 = 9007199254740992',
  String.raw`x^{1e1} = x^{10}`,String.raw`x^{0x10} = x^{16}`,
  String.raw`x^{+2} = x^2`,String.raw`x^{2.0} = x^2`,
  String.raw`\\left|x\\right| = x`,
  String.raw`\\left(x+1\\right]^2 = x^2+2x+1`,
  'x=x)', 'x=x=x+1',String.raw`x\\neq x+1`,String.raw`x\\le x+1`,
  'x^2^3=x^6',String.raw`\\frac{x^2-1}{x-1}=x+1`,
  String.raw`\\frac{x^2}{x}=x`,String.raw`\\frac{x}{2}+\\frac{x}{2}=x`,
  '0*x^17=0'
 ])reject(s);
});
test('negative precedence is distinguished from bracketed negative base',()=>{
 assert.equal(verifyEquation('-x^2=x^2').status,'REFUTED');
 assert.equal(verifyEquation('(-x)^2=x^2').status,'EXACT_CERTIFICATE_PASS');
});
test('consecutive numeric tokens are not silently multiplied',()=>reject('2 3 = 6'));
test('unbraced multi-digit TeX superscripts must be rejected or distinguished',()=>reject('x^12=x^{12}'));
test('resource exhaustion is unsupported, never proof',()=>{
 reject('('.repeat(1000)+'x'+')'.repeat(1000)+'=x');
 reject('9'.repeat(100000)+'=9'.repeat(100000));
});
test('equation rejection does not reuse earlier PASS record',()=>{
 assert.equal(verifyEquation('(x+1)^2=x^2+2x+1').status,'EXACT_CERTIFICATE_PASS');
 reject('x=x=x+1');
});

test('versioned exponent grammar accepts braced powers and rejects ambiguous shorthand',()=>{
 const pass=[
  'x^2=x^{2}',
  'x^{12}=x^{12}',
  'x^(12)=x^{12}',
  '(x+1)^{12}=(x+1)^{12}'
 ];
 for(const equation of pass)
   assert.equal(verifyEquation(equation).status,'EXACT_CERTIFICATE_PASS',equation);
 const unsupported=['x^12=x^{12}','x^16=x^{16}','x^12=x^12','x^{17}=x^{17}'];
 for(const equation of unsupported)reject(equation);
});

test('public grammar, input guidance, and six-language strings cover multi-digit exponents',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {DICTIONARIES}=await import('./extended-i18n.mjs');
 const grammar=await readFile(new URL('./PARSER_GRAMMAR.md',import.meta.url),'utf8');
 const page=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const guide=await readFile(new URL('./how-to.html',import.meta.url),'utf8');
 for(const token of ['x^12','x^{12}','x^(12)','2 3 = 6','unsupported','Unsupported'])assert.ok(grammar.includes(token),token);
 assert.match(page,/multi-digit exponents require braces/i);
 assert.match(page,/PARSER_GRAMMAR\.md/);
 assert.match(guide,/Multi-digit exponents require braces/);
 assert.match(guide,/PARSER_GRAMMAR\.md/);
 const keys=[
  'Multi-digit exponents require braces (x^{12}); bare x^12 is unsupported.',
  'Parser grammar',
  'For one-digit powers, x^2 and x^{2} are accepted. Multi-digit exponents require braces: x^{12} is accepted, but bare x^12 is unsupported to avoid LaTeX ambiguity. ASCII x^(12) is accepted by this limited expression parser but is not faithful LaTeX notation.',
  'Parser grammar and compatibility contract'];
 for(const locale of ['en','es','pt-BR','zh-Hans','fr','de']){
  for(const key of keys)assert.ok(DICTIONARIES[locale][key],locale+': '+key);
 }
});
