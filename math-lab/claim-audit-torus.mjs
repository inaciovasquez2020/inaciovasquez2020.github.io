/**
 * Bounded exact model checker for a separable line bundle on T^2 x T^2.
 * Standalone research API; NOT connected to manuscript inference, UI, or proof claims.
 * Works in the truncated graded ring Z[a,b]/(a^2,b^2), |a|=|b|=2.
 * Assumptions: product orientation, c1(L)=n_x a+n_y b, L has complex rank one.
 * This does NOT validate a physical Hamiltonian, spectral gap, or ETH publication.
 */
export const CLAIM_AUDIT_PROFILE='vasquez.math-lab.claim-audit.torus-line-bundle.v0.1';
const MAX_ABS=1000000000n;
const OPS=Object.freeze(['c2_integral','ch2_integral','c1_square_integral']);
const FIELDS=new Set(['profile','n_x','n_y','operator','expected']);
function requireExactKeys(input){
 if(input===null||typeof input!=='object'||Array.isArray(input))throw new TypeError('CLAIM_AUDIT_INVALID_INPUT');
 if(Object.keys(input).some(k=>!FIELDS.has(k))||Object.keys(input).length!==FIELDS.size)throw new TypeError('CLAIM_AUDIT_INVALID_KEYS');
}
function integer(value,name){
 if(typeof value!=='string'||! /^(?:0|-?[1-9][0-9]{0,9})$/.test(value))
  throw new TypeError('CLAIM_AUDIT_INVALID_INTEGER_'+name);
 const n=BigInt(value);
 if(n>MAX_ABS||n< -MAX_ABS)throw new RangeError('CLAIM_AUDIT_INTEGER_LIMIT_'+name);
 return n;
}
function multiply(x,y){
 // basis [1,a,b,ab], products truncated by a*a=b*b=0.
 return [
   x[0]*y[0],
   x[0]*y[1]+x[1]*y[0],
   x[0]*y[2]+x[2]*y[0],
   x[0]*y[3]+x[3]*y[0]+x[1]*y[2]+x[2]*y[1]
 ];
}
export function auditTorusLineBundle(input){
 requireExactKeys(input);
 if(input.profile!==CLAIM_AUDIT_PROFILE||!OPS.includes(input.operator))
  throw new TypeError('CLAIM_AUDIT_UNSUPPORTED_PROFILE_OR_OPERATOR');
 const nx=integer(input.n_x,'NX'),ny=integer(input.n_y,'NY'),expected=integer(input.expected,'EXPECTED');
 const firstChern=[0n,nx,ny,0n];
 const square=multiply(firstChern,firstChern);
 // ch_2=c_1^2/2 for a line bundle; the degree-four coefficient is even here.
 if(square[3]%2n!==0n)throw new Error('CLAIM_AUDIT_INTERNAL_PARITY');
 const values={c2_integral:0n,ch2_integral:square[3]/2n,c1_square_integral:square[3]};
 const actual=values[input.operator],matches=actual===expected;
 const output={
  schema:CLAIM_AUDIT_PROFILE,
  status:matches?'EXACT_MODEL_MATCH':'EXACT_MODEL_COUNTEREXAMPLE',
  mathematical_scope:'Z[a,b]/(a^2,b^2); deg a=deg b=2; oriented T^2 x T^2; external tensor product complex line bundle',
  assumptions:['n_x,n_y are integral first Chern numbers','c1(L)=n_x a+n_y b','L is a rank-one complex bundle','evaluation of ab on product fundamental class is +1'],
  operator:input.operator,
  inputs:{n_x:nx.toString(),n_y:ny.toString(),expected:expected.toString()},
  certificate:{c1_coefficients:[nx.toString(),ny.toString()],c1_square_ab:square[3].toString(),computed:actual.toString()},
  comparison:matches?'EQUAL':'NOT_EQUAL',
  formal_kernel_verified:false,
  experimental_claim_verified:false,
  original_publication_audited:false,
  proof_scope:'EXACT_MODEL_ONLY',
  source_uploaded:false
 };
 return output;
}
