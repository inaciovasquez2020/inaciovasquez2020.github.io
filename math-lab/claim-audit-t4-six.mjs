/**
 * Exact characteristic-class arithmetic for an arbitrary topological complex
 * LINE bundle on an oriented four-torus. Standalone research API; no UI.
 *
 * e_1,...,e_4 are integral H^1 generators; <e_1 e_2 e_3 e_4,[T^4]>=+1.
 * c1(L)=sum_{1<=i<j<=4} n_ij e_i ∧ e_j.
 * The input specifies the coefficients and the comparison expectation;
 * it does NOT establish that a scientific manuscript has this bundle.
 */
export const GENERAL_T4_PROFILE='vasquez.math-lab.claim-audit.t4-line-bundle-six.v0.1';
const COEFFICIENT_LIMIT=1000000000n;
const EXPECTED_LIMIT=6000000000000000000n; // max |<c1^2>| = 6 * 10^18
const OPERATORS=new Set(['c2_integral','ch2_integral','c1_square_integral']);
const KEYS=['profile','coefficients','operator','expected'];
const COEFFICIENT_KEYS=['n12','n13','n14','n23','n24','n34'];

function plainRecord(value,keys,label){
  if(value===null||typeof value!=='object'||Array.isArray(value))throw new TypeError(label+'_NOT_RECORD');
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)throw new TypeError(label+'_PROTOTYPE');
  const ownKeys=Reflect.ownKeys(value);
  if(ownKeys.length!==keys.length||ownKeys.some(k=>!keys.includes(k)))throw new TypeError(label+'_KEYS');
  // Snapshot every checked own data descriptor once. Never read properties
  // again from the caller's object: a Proxy get trap can lie or change values.
  const snapshot=Object.create(null);
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new TypeError(label+'_KEYS_OR_ACCESSOR');
    snapshot[key]=descriptor.value;
  }
  return snapshot;
}
function exactDecimal(value,max,label){
  if(typeof value!=='string'||value.length>20||!/^(?:0|-?[1-9][0-9]*)$/.test(value))
    throw new TypeError(label+'_DECIMAL');
  const n=BigInt(value);
  if(n < -max || n > max)throw new RangeError(label+'_OUT_OF_RANGE');
  return n;
}
export function auditGeneralT4LineBundle(input){
  const request=plainRecord(input,KEYS,'T4_INPUT');
  if(request.profile!==GENERAL_T4_PROFILE||!OPERATORS.has(request.operator))
    throw new TypeError('T4_UNSUPPORTED_PROFILE_OR_OPERATOR');
  const supplied=plainRecord(request.coefficients,COEFFICIENT_KEYS,'T4_COEFFICIENTS');
  const c=Object.fromEntries(COEFFICIENT_KEYS.map(k=>[
    k,exactDecimal(supplied[k],COEFFICIENT_LIMIT,'T4_'+k)
  ]));
  const expected=exactDecimal(request.expected,EXPECTED_LIMIT,'T4_EXPECTED');
  // Pfaffian of the skew-symmetric 4-by-4 integral coefficient matrix.
  const positive1=c.n12*c.n34, negative=c.n13*c.n24, positive2=c.n14*c.n23;
  const pfaffian=positive1-negative+positive2;
  const square=2n*pfaffian;
  // Rank one => c2(L)=0. ch2(L)=c1(L)^2/2.
  const values={c2_integral:0n,ch2_integral:pfaffian,c1_square_integral:square};
  const actual=values[request.operator], matches=actual===expected;
  return {
    schema:GENERAL_T4_PROFILE,
    status:matches?'EXACT_MODEL_MATCH':'EXACT_MODEL_COUNTEREXAMPLE',
    mathematical_scope:'Topological complex line bundle over oriented T^4; integral H^1 exterior basis',
    assumptions:[
      'L is a complex line bundle, not a rank-two or higher vector bundle',
      'e_i are integral H^1(T^4,Z) generators and <e1 e2 e3 e4,[T4]>=+1',
      'c1(L)=sum_(i<j) n_ij e_i wedge e_j, with all six coefficients supplied',
      'The supplied coefficients and bundle identification are assumptions, not verified observations'
    ],
    operator:request.operator,
    inputs:{coefficients:Object.fromEntries(COEFFICIENT_KEYS.map(k=>[k,c[k].toString()])),expected:expected.toString()},
    certificate:{signed_pair_products:[positive1.toString(),negative.toString(),positive2.toString()],
      pfaffian:pfaffian.toString(),c1_square_integral:square.toString(),computed:actual.toString()},
    comparison:matches?'EQUAL':'NOT_EQUAL',
    proof_scope:'EXACT_MODEL_ONLY',
    formal_kernel_verified:false,
    scientific_claim_verified:false,
    source_binding_verified:false,
    original_publication_audited:false,
    source_uploaded:false
  };
}
