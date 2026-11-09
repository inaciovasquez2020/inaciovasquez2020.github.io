import {inspectLatex} from './latex-scan.mjs';
/**
 * Vasquez Research Math Verification Lab: browser-side, exact Z[x] certificate.
 * No Python execution, network access, eval, third-party libraries, or theorem-level claims.
 * Generated claim JSON can be independently checked with urf-textbook's Python checker.
 */
export const ENGINE_VERSION = 'vr-polynomial-browser-v0.1';
const MAX_SOURCE = 65536, MAX_EXPR = 512, MAX_NODES = 120, MAX_DEGREE = 32;
const MAX_POWER = 16, MAX_BITS = 8192, MAX_LITERAL = 1000000n;
const ascii = /^[0-9x+*^(){}\-\s]*$/;
export class UnsupportedClaim extends Error { constructor(message) { super(message); this.name = 'UnsupportedClaim'; } }
function fail(message) { throw new UnsupportedClaim(message); }
function checkBits(n) { if (n.toString(2).replace('-','').length > MAX_BITS) fail('Exact integer exceeds the 8192-bit resource limit.'); return n; }
function trimmed(xs) { while (xs.length > 1 && xs.at(-1) === 0n) xs.pop(); if (xs.length > MAX_DEGREE + 1) fail('Polynomial degree exceeds 32.'); xs.forEach(checkBits); return xs; }
function polyAdd(a,b,sign=1n) { return trimmed(Array.from({length:Math.max(a.length,b.length)},(_,i)=>checkBits((a[i]??0n)+sign*(b[i]??0n)))); }
function polyMul(a,b) { const r=Array(a.length+b.length-1).fill(0n); for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) r[i+j]=checkBits(r[i+j]+a[i]*b[j]); return trimmed(r); }
function polyPow(a,n) { let out=[1n]; for(let i=0;i<n;i++) out=polyMul(out,a); return out; }
function bound(n) { if(n>MAX_DEGREE) fail('Intermediate syntactic degree exceeds 32.'); return n; }
function polynomial(n) { switch(n.type) {
  case 'num': return [n.value]; case 'var': return [0n,1n];
  case 'neg': return polynomial(n.arg).map(x=>-x);
  case 'add': return polyAdd(polynomial(n.left),polynomial(n.right));
  case 'sub': return polyAdd(polynomial(n.left),polynomial(n.right),-1n);
  case 'mul': return polyMul(polynomial(n.left),polynomial(n.right));
  case 'pow': return polyPow(polynomial(n.left),n.exp);
  default: fail('Invalid internal expression.');
}}
function valueAt(n,x) { let r; switch(n.type) {
  case 'num': r=n.value;break; case 'var':r=x;break;
  case 'neg':r=-valueAt(n.arg,x);break;
  case 'add':r=valueAt(n.left,x)+valueAt(n.right,x);break;
  case 'sub':r=valueAt(n.left,x)-valueAt(n.right,x);break;
  case 'mul':r=valueAt(n.left,x)*valueAt(n.right,x);break;
  case 'pow':r=valueAt(n.left,x)**BigInt(n.exp);break;
  default:fail('Invalid internal expression.');
} return checkBits(r); }
function toPython(n) { switch(n.type){
  case 'num':return n.value.toString();case 'var':return 'x';
  case 'neg':return `(-${toPython(n.arg)})`;
  case 'pow':return `(${toPython(n.left)}**${n.exp})`;
  case 'add':case 'sub':case 'mul':return `(${toPython(n.left)}${{add:'+',sub:'-',mul:'*'}[n.type]}${toPython(n.right)})`;
  default:fail('Invalid internal expression.');
}}
function translateLatex(text) {
  if(typeof text!=='string'||text.length>MAX_EXPR*2)fail('Expression exceeds input length limit.');
  // A strict subset only: no \frac, macros, commands, relations, or multivariable claims.
  let s=text.replace(/\\(?:left|right)(?=\s*[(){}])/g,'')
    .replace(/\\(?:cdot|times)\b/g,'*')
    .replace(/\\[,;!]/g,' ')
    .replace(/\\\s/g,' ')
    .replace(/\*\*/g,'^');
  if(!ascii.test(s))fail('Unsupported LaTeX/Python syntax. Allowed: integer literals, x, +, -, multiplication, parentheses, and literal powers.');
  if(!s.trim())fail('Empty expression.');
  // Distinguish x^2 from symbols and reject hexadecimal or Python comments.
  if(/0x[0-9]/.test(s))fail('Hex-like tokens are ambiguous; use explicit multiplication.');
  s=s.replace(/\{/g,'(').replace(/\}/g,')');
  if(s.length>MAX_EXPR)fail('Expression exceeds 512 characters.');
  return s;
}
function lex(s) {
  const out=[]; for(let i=0;i<s.length;) {
    let c=s[i];if(/\s/.test(c)){i++;continue;}
    if(/[0-9]/.test(c)){let j=i+1;while(j<s.length&&/[0-9]/.test(s[j]))j++;
      const t=s.slice(i,j);if(out.at(-1)?.type==='num')fail('Unsupported LaTeX/Python syntax. Allowed: integer literals, x, +, -, multiplication, parentheses, and literal powers.');const val=BigInt(t);if(val>MAX_LITERAL)fail('Integer literal exceeds 1,000,000.');
      out.push({type:'num',value:val,digits:t.length});i=j;continue;}
    if(c==='x'){out.push({type:'x'});i++;continue;}
    if('+-*^()'.includes(c)){out.push({type:c});i++;continue;}
    fail('Unsupported expression character.');
  }
  if(out.length>MAX_NODES)fail('Expression token count exceeds 120.');
  out.push({type:'end'});return out;
}
export function parseExpression(text){const tokens=lex(translateLatex(text));let i=0,nodes=0,depth=0;
  const peek=()=>tokens[i].type;const take=t=>{if(peek()!==t)fail(`Expected '${t}', received '${peek()}'.`);return tokens[i++];};
  function node(data){if(++nodes>MAX_NODES)fail('Expression AST exceeds 120 nodes.');return data;}
  function withDepth(fn){if(++depth>64)fail('Expression nesting exceeds 64.');try{return fn();}finally{depth--;}}
  function atom(){return withDepth(()=>{if(peek()==='num')return node({type:'num',value:take('num').value,degree:0});
    if(peek()==='x'){take('x');return node({type:'var',degree:1});}
    if(peek()==='('){take('(');let a=sum();take(')');return a;}
    fail(`Expected a polynomial term, received '${peek()}'.`);});}
  function power(){let a=atom();if(peek()==='^'){take('^');let exp;
    if(peek()==='('){take('(');exp=take('num').value;take(')');}else {const token=take('num');if(token.digits>1)fail('Unsupported LaTeX/Python syntax. Allowed: integer literals, x, +, -, multiplication, parentheses, and literal powers.');exp=token.value;}
    if(exp>BigInt(MAX_POWER))fail('Only integer powers 0..16 are supported.');
    a=node({type:'pow',left:a,exp:Number(exp),degree:bound(a.degree*Number(exp))});}
    return a;}
  function unary(){return withDepth(()=>{if(peek()==='+'){take('+');return unary();}
    if(peek()==='-'){take('-');const a=unary();return node({type:'neg',arg:a,degree:a.degree});}
    return power();});}
  function product(){let a=unary();while(peek()==='*'||peek()==='num'||peek()==='x'||peek()==='('){
    if(peek()==='*')take('*'); // Otherwise implicit multiplication: 2x or (x+1)(x-1).
    let b=unary();a=node({type:'mul',left:a,right:b,degree:bound(a.degree+b.degree)});
  }return a;}
  function sum(){let a=product();while(peek()==='+'||peek()==='-'){
    let op=tokens[i++].type,b=product();a=node({type:op==='+'?'add':'sub',left:a,right:b,degree:bound(Math.max(a.degree,b.degree))});
  }return a;}
  const ast=sum();take('end');const normalized=toPython(ast);
  if(normalized.length>MAX_EXPR)fail('Normalized expression exceeds 512-character Python checker limit.');
  return {ast,degree:ast.degree,normalized};
}
export function extractEquations(tex){
 if(typeof tex!=='string'||tex.length>MAX_SOURCE)fail('Dropped source must be a text file of at most 64 KiB.');
 const audit=inspectLatex(tex);
 if(audit.flags.length)fail('SOURCE_REVIEW_REQUIRED: '+audit.flags[0].code+
   ' at line '+audit.flags[0].line+'. '+audit.flags[0].reason+
   ' Review or isolate a correctly delimited equation before exact checking.');
 const found=[];
 for(const block of audit.display){
   for(const line of block.content.split(/\\\\/)){
     const candidate=line.replace(/&/g,'').trim();
     if(candidate.includes('=')){
       if(candidate.length>MAX_EXPR*2)fail('Displayed equation exceeds the maximum supported length.');
       found.push(candidate);
     }
   }
 }
 if(!found.length&&tex.trim()&&!/\\(?:documentclass|begin\{document\})/.test(tex)){
   // Only treat a stand-alone equality as a candidate, never a fragment
   // of an unparsed LaTeX document or a compound malformed expression.
   if(tex.includes('=')&&!/\\begin\{|\\end\{|\\\[|\\\]|\$\$/.test(tex))found.push(tex.trim());
 }
 const unique=[...new Set(found)];
 if(unique.length>40)fail('Too many equation candidates; submit a smaller excerpt.');
 return unique;
}
export function verifyEquation(equation,{id='website-example',sourceName='manual input'}={}){
  if(typeof equation!=='string'||equation.length>MAX_EXPR*2)fail('Equation exceeds input size limit.');
  const sides=equation.split('=');if(sides.length!==2)fail('Exactly one equality sign is required; inequalities and chained equalities are unsupported.');
  const left=parseExpression(sides[0]),right=parseExpression(sides[1]);
  const d=Math.max(left.degree,right.degree);if(d>MAX_DEGREE)fail('Syntactic degree exceeds 32.');
  const lp=polynomial(left.ast),rp=polynomial(right.ast);
  const exact=[];for(let x=0;x<=d;x++){
    const v=BigInt(x),l=valueAt(left.ast,v),r=valueAt(right.ast,v);
    exact.push({x,lhs:l.toString(),rhs:r.toString()});if(l!==r)break;
  }
  const status=exact.at(-1).lhs!==exact.at(-1).rhs?'REFUTED':'EXACT_CERTIFICATE_PASS';
  const algebraicEqual=lp.length===rp.length&&lp.every((v,i)=>v===rp[i]);
  if(algebraicEqual!==(status==='EXACT_CERTIFICATE_PASS'))throw new Error('INTERNAL CHECKER DISAGREEMENT: no verdict produced.');
  if(typeof id!=='string'||id.length>100||!id)fail('Invalid claim id.');
  const claim={id,domain:'R',variable:'x',lhs:left.normalized,rhs:right.normalized};
  return {schema:'vasquez.math-lab.browser.v0.1',engine:ENGINE_VERSION,
    source:{name:sourceName,equation},claim,status,degree_upper_bound:d,
    certificate:exact,method:'Exact integer evaluations at x=0..d and polynomial degree upper bound d; checked against independently normalized Z[x] coefficients.',
    formal_kernel_verified:false,python_replay_performed:false};
}
