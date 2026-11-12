/** Experimental exact bivariate Z[x,y] checker. Not wired into website or Python replay. */
export const BIVARIATE_VERSION = 'vr-bivariate-experimental-v0.1';
export class UnsupportedBivariate extends Error {
  constructor(message){super(message);this.name='UnsupportedBivariate';}
}
const fail = s => {throw new UnsupportedBivariate(s);};
const MAX_SOURCE=512, MAX_NODES=100, MAX_DEGREE=8, MAX_POWER=8, MAX_BITS=2048;
const MAX_LITERAL=1000000n;
function bits(n){if((n<0n?-n:n).toString(2).length>MAX_BITS)fail('Integer resource limit exceeded.');return n;}
function lex(src){
 if(typeof src!=='string'||src.length>MAX_SOURCE)fail('Expression length exceeds limit.');
 if(!/^[0-9xy+*^()\s-]*$/.test(src))fail('Unsupported syntax; use only integer literals, x, y, +, -, *, ^, parentheses.');
 const out=[];
 for(let i=0;i<src.length;){
  const c=src[i];if(/\s/.test(c)){i++;continue;}
  if(/[0-9]/.test(c)){
   let j=i+1;while(j<src.length&&/[0-9]/.test(src[j]))j++;
   const n=BigInt(src.slice(i,j));if(n>MAX_LITERAL)fail('Literal too large.');
   out.push({type:'num',value:n});i=j;
  }else{out.push({type:c});i++;}
  if(out.length>MAX_NODES)fail('Too many tokens.');
 }
 out.push({type:'end'});return out;
}
function parse(source){
 const tokens=lex(source);let pos=0,nodes=0,depth=0;
 const peek=()=>tokens[pos].type;
 const take=t=>{if(peek()!==t)fail('Expected '+t+', got '+peek()+'.');return tokens[pos++];};
 const node=(type,fields)=>{if(++nodes>MAX_NODES)fail('AST node cap exceeded.');return {type,...fields};};
 const cap=(x,y)=>{if(x>MAX_DEGREE||y>MAX_DEGREE)fail('Syntactic bidegree exceeds (8,8).');return [x,y];};
 function atom(){
  if(++depth>64)fail('Nesting limit exceeded.');
  try{
   if(peek()==='num')return node('num',{value:take('num').value,dx:0,dy:0});
   if(peek()==='x'||peek()==='y'){
    const t=tokens[pos++].type;return node('var',{name:t,dx:t==='x'?1:0,dy:t==='y'?1:0});
   }
   if(peek()==='('){take('(');const a=sum();take(')');return a;}
   fail('Expected integer, variable or parenthesis.');
  }finally{depth--;}
 }
 function power(){let a=atom();if(peek()==='^'){
  take('^');const exponent=take('num').value;
  if(exponent>BigInt(MAX_POWER))fail('Exponent cap exceeded.');
  const e=Number(exponent),[dx,dy]=cap(a.dx*e,a.dy*e);
  a=node('pow',{arg:a,exponent:e,dx,dy});
 }return a;}
 function unary(){if(peek()==='+'){take('+');return unary();}
  if(peek()==='-'){take('-');const arg=unary();return node('neg',{arg,dx:arg.dx,dy:arg.dy});}
  return power();}
 function product(){let a=unary();while(peek()==='*'){
  take('*');const b=unary(),[dx,dy]=cap(a.dx+b.dx,a.dy+b.dy);
  a=node('mul',{a,b,dx,dy});
 }return a;}
 function sum(){let a=product();while(peek()==='+'||peek()==='-'){
  const op=tokens[pos++].type,b=product(),[dx,dy]=cap(Math.max(a.dx,b.dx),Math.max(a.dy,b.dy));
  a=node(op==='+'?'add':'sub',{a,b,dx,dy});
 }return a;}
 const ast=sum();take('end');return ast;
}
const mono=(i,j)=>i+','+j;
function poly(n){
 switch(n.type){
  case 'num':return n.value===0n?new Map():new Map([[mono(0,0),n.value]]);
  case 'var':return new Map([[n.name==='x'?mono(1,0):mono(0,1),1n]]);
  case 'neg':return new Map([...poly(n.arg)].map(([k,v])=>[k,bits(-v)]));
  case 'pow':{
   let acc=new Map([[mono(0,0),1n]]),base=poly(n.arg);
   for(let i=0;i<n.exponent;i++)acc=mul(acc,base);
   return acc;
  }
  case 'add':case 'sub':{
   const acc=poly(n.a);
   for(const [k,v] of poly(n.b)){
    const next=bits((acc.get(k)??0n)+(n.type==='add'?v:-v));
    if(next===0n)acc.delete(k);else acc.set(k,next);
   }return acc;
  }
  case 'mul':return mul(poly(n.a),poly(n.b));
  default:throw Error('Internal AST error');
 }
}
function mul(a,b){
 const acc=new Map();
 for(const [k,u] of a)for(const [l,v] of b){
  const [i,j]=k.split(',').map(Number),[s,t]=l.split(',').map(Number),key=mono(i+s,j+t);
  const next=bits((acc.get(key)??0n)+bits(u*v));
  if(next===0n)acc.delete(key);else acc.set(key,next);
 }return acc;
}
function evalAst(n,x,y){
 let v;
 switch(n.type){
  case 'num':v=n.value;break;
  case 'var':v=n.name==='x'?x:y;break;
  case 'neg':v=-evalAst(n.arg,x,y);break;
  case 'pow':v=evalAst(n.arg,x,y)**BigInt(n.exponent);break;
  case 'add':v=evalAst(n.a,x,y)+evalAst(n.b,x,y);break;
  case 'sub':v=evalAst(n.a,x,y)-evalAst(n.b,x,y);break;
  case 'mul':v=evalAst(n.a,x,y)*evalAst(n.b,x,y);break;
  default:throw Error('Internal AST error');
 }return bits(v);
}
export function verifyBivariate(equation){
 if(typeof equation!=='string'||equation.length>MAX_SOURCE*2)fail('Equation length limit exceeded.');
 const parts=equation.split('=');if(parts.length!==2)fail('Exactly one equality sign required.');
 const a=parse(parts[0]),b=parse(parts[1]);
 const dx=Math.max(a.dx,b.dx),dy=Math.max(a.dy,b.dy);
 const lhs=poly(a),rhs=poly(b);
 const coefficientEqual=lhs.size===rhs.size&&[...lhs].every(([k,v])=>rhs.get(k)===v);
 let counterexample=null,gridChecks=0;
 outer:for(let x=0;x<=dx;x++)for(let y=0;y<=dy;y++){
  const l=evalAst(a,BigInt(x),BigInt(y)),r=evalAst(b,BigInt(x),BigInt(y));
  gridChecks++;
  if(l!==r){counterexample={x,y,lhs:l.toString(),rhs:r.toString()};break outer;}
 }
 if(coefficientEqual===(counterexample!==null))throw Error('INTERNAL CHECKER DISAGREEMENT: no verdict.');
 return {
  schema:'vasquez.math-lab.bivariate.experimental.v0.2',engine:BIVARIATE_VERSION,
  equation,
  status:counterexample?'REFUTED':'EXACT_CERTIFICATE_PASS',domain:'Z[x,y]',
  degree_upper_bounds:{x:dx,y:dy},grid_checks:gridChecks,
  coefficient_terms:lhs.size+rhs.size, counterexample,
  method:'Independent exact sparse coefficient comparison and integer-grid evaluation; grid sizes are syntactic bidegree bounds plus one.',
  formal_kernel_verified:false,python_replay_performed:false,website_integrated:false
 };
}
