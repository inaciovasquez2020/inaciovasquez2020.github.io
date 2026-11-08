import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEquation,extractEquations,parseExpression,UnsupportedClaim} from './engine.mjs';
function check(equation,status){const result=verifyEquation(equation);assert.equal(result.status,status);assert.equal(result.formal_kernel_verified,false);return result;}
test('valid identity and exact counterexample',()=>{
 const a=check('(x+1)^2 = x^2+2x+1','EXACT_CERTIFICATE_PASS');assert.equal(a.certificate.length,3);
 const b=check('(x+1)^2 = x^2+1','REFUTED');assert.deepEqual(b.certificate.at(-1),{x:1,lhs:'4',rhs:'2'});
});
test('LaTeX subset and implicit multiplication',()=>{
 check(String.raw`\left(x+1\right)^2 = x^2 + 2\cdot x + 1`,'EXACT_CERTIFICATE_PASS');
 check(String.raw`(x+1)^{2} = x^{2}+2\times x+1`,'EXACT_CERTIFICATE_PASS');
 check('3x(x-1)=3x^2-3x','EXACT_CERTIFICATE_PASS');
 check('-(x^2)+x^2=0','EXACT_CERTIFICATE_PASS');
});
test('ring conventions and terminal root witness',()=>{
 check('x^0=1','EXACT_CERTIFICATE_PASS');check('0^0=1','EXACT_CERTIFICATE_PASS');
 check('(x-1)(x-2)(x-3)(x-4)=0','REFUTED');
 const w=check('x(x-1)(x-2)(x-3)=0','REFUTED');assert.equal(w.certificate.at(-1).x,4);
});
test('reject complex grammar, unsupported macros, and fake identities',()=>{
 for(const s of [String.raw`\frac{x}{1}=x`,String.raw`\sin(x)=x`,'x^(-1)=x','x^(1+1)=x^2',
  'True*x=x','ｘ=x','𝐱=x','0x10=16','1_000=1000','x # a=x', 'x/x=1', 'x<=x', 'x=x=x', 'x=x; console.log(1)', 'x^33=x^33',
  '(x^16*x^16*x)^0=1','x'.repeat(513)+'=x','x\u0000=x']){
   assert.throws(()=>verifyEquation(s),UnsupportedClaim,s);
 }
});
test('exact arithmetic on large integers under cap',()=>{
 check('999999^16=999999^15*999999','EXACT_CERTIFICATE_PASS');
});
test('source equation extraction and candidate limits',()=>{
 const latex=String.raw`\documentclass{article}
\begin{document}
\begin{equation}(x+1)^2 = x^2+2x+1\end{equation}
\[ x^3-x = x(x-1)(x+1) \]
\end{document}`;
 const candidates=extractEquations(latex);assert.equal(candidates.length,2);candidates.forEach(x=>check(x,'EXACT_CERTIFICATE_PASS'));
 assert.deepEqual(extractEquations('x^2=x*x'),['x^2=x*x']);
 assert.deepEqual(extractEquations('here is a proof without displayed math'),[]);
 assert.throws(()=>extractEquations('a'.repeat(65537)),UnsupportedClaim);
});
test('Python-compatible normalized claims',()=>{
 for(const eq of ['(x+1)^2=x^2+2x+1','2x*(x-1)=2x^2-2x',String.raw`\left(x+1\right)^{2}=x^2+2\cdot x+1`]){
   const r=verifyEquation(eq);assert.equal(r.claim.domain,'R');assert.equal(r.claim.variable,'x');
   for(const side of ['lhs','rhs'])assert.match(r.claim[side],/^[0-9x()+*\-]+$/);
 }
});
test('deterministic seeded differential identities and refutations',()=>{
 let seed=20261108;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed};
 for(let i=0;i<400;i++){
  let a=(rand()%19)-9,b=(rand()%19)-9,c=(rand()%19)-9;
  const lhs=`(${a}x+${b})(${a}x+${b})+${c}`;
  const rhs=`${a*a}x^2+${2*a*b}x+${b*b+c}`;
  check(`${lhs}=${rhs}`,'EXACT_CERTIFICATE_PASS');
  check(`${lhs}=(${rhs})+1`,'REFUTED');
 }
});
