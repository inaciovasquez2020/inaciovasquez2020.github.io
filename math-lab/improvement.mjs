/**
 * Vasquez Research verification improvement loop, v0.1.
 * Each use generates ephemeral, reviewable regression candidates and metamorphic
 * checks. Nothing is submitted, stored persistently, trained or self-modified.
 * Promotion requires independent Python replay, code review, and CI.
 */
import {verifyEquation, UnsupportedClaim, ENGINE_VERSION} from './engine.mjs';
import {category,coverage,TAXONOMY_VERSION} from './taxonomy.mjs';

export const CASEBOOK_SCHEMA = 'vasquez.math-lab.casebook.v0.1';
export const MAX_SESSION_CASES = 32;
const MAX_REFERENCE = 240;
const MAX_ID = 100;
function validText(s, n) { return typeof s === 'string' && s.length > 0 && s.length <= n && !/[\u0000-\u001f\u007f]/.test(s); }
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new TypeError('A source-bound claim manifest is required.');
  if (Object.keys(manifest).sort().join(',') !== 'assumptions,claim_id,field,source_reference,subcategory') throw new TypeError('Manifest must contain exactly claim_id, source_reference, field, subcategory, assumptions.');
  if (!validText(manifest.claim_id, MAX_ID) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(manifest.claim_id)) throw new TypeError('Claim ID must be 1–100 characters using letters, digits, dots, underscores and hyphens.');
  if (!validText(manifest.source_reference, MAX_REFERENCE)) throw new TypeError('Provide a source reference (e.g. "manual entry", DOI, or paper URL).');
  if (!Array.isArray(manifest.assumptions) || manifest.assumptions.length > 8 ||
      manifest.assumptions.some(x => !validText(x, 180))) throw new TypeError('Assumptions must be a list of at most 8 bounded strings.');
  const c=category(manifest.field,manifest.subcategory);
  return {claim_id:manifest.claim_id,source_reference:manifest.source_reference,field:c.field,subcategory:c.subcategory,assumptions:[...manifest.assumptions]};
}
function sameWitness(a,b) {return a.status !== 'REFUTED' || b.certificate.at(-1)?.x === a.certificate.at(-1)?.x;}
function probesFor(claim, status) {
  const l=claim.lhs,r=claim.rhs;
  const probes=[
    {relation:'swap_sides',equation:`(${r}) = (${l})`},
    {relation:'add_one_to_both',equation:`((${l})+1) = ((${r})+1)`},
    {relation:'negate_both',equation:`-(${l}) = -(${r})`},
    {relation:'double_both',equation:`2*(${l}) = 2*(${r})`},
  ];
  if (status==='EXACT_CERTIFICATE_PASS') probes.push({relation:'negative_control_add_one_to_rhs',equation:`(${l}) = ((${r})+1)`,expected_status:'REFUTED'});
  return probes;
}
function runProbe(base, candidate, index) {
  try {
    const r=verifyEquation(candidate.equation,{id:`meta-${index}`,sourceName:'metamorphic transformation'});
    const expected=candidate.expected_status??base.status;
    const matches=r.status===expected && (candidate.expected_status ? true : sameWitness(base,r));
    return {relation:candidate.relation, outcome:matches?'PASS':'FAIL',
      expected_status:expected,observed_status:r.status,
      candidate_claim:r.claim,
      witness_x:r.status==='REFUTED'?r.certificate.at(-1).x:null};
  } catch (e) {
    if (e instanceof UnsupportedClaim) return {relation:candidate.relation,outcome:'SKIPPED_RESOURCE_OR_GRAMMAR',reason:e.message};
    return {relation:candidate.relation,outcome:'FAIL',reason:'Unexpected internal checker exception'};
  }
}
export function buildExactCase(result, manifest) {
  const m=validateManifest(manifest);
  if (coverage(m.field,m.subcategory,'exact-polynomial').status!=='EXACT_SUPPORTED') throw new TypeError('Selected subcategory has no exact verification engine.');
  if (!result || !result.claim || result.engine!==ENGINE_VERSION || !['REFUTED','EXACT_CERTIFICATE_PASS'].includes(result.status)) {
    throw new TypeError('A completed supported exact-algebra check is required.');
  }
  if (result.claim.id!==m.claim_id || result.formal_kernel_verified!==false) throw new TypeError('Manifest/result mismatch.');
  const probes=probesFor(result.claim,result.status).map((p,i)=>runProbe(result,p,i));
  const failed=probes.some(p=>p.outcome==='FAIL');
  const passed=probes.filter(p=>p.outcome==='PASS').length;
  const skipped=probes.filter(p=>p.outcome==='SKIPPED_RESOURCE_OR_GRAMMAR').length;
  return {
    schema:'vasquez.math-lab.case.v0.1', kind:'exact_polynomial',
    manifest:m,classification:{...category(m.field,m.subcategory),taxonomy_version:TAXONOMY_VERSION,coverage:'EXACT_SUPPORTED',method:'exact-polynomial'},
    original_equation:result.source.equation,
    canonical_claim:result.claim,
    browser_engine:ENGINE_VERSION,
    expected_status:result.status,
    degree_upper_bound:result.degree_upper_bound,
    initial_witness_x:result.status==='REFUTED'?result.certificate.at(-1).x:null,
    probes, probes_passed:passed,probes_skipped:skipped,
    status:failed?'REVIEW_REQUIRED':'REGRESSION_CANDIDATE',
    python_replay:'NOT_RUN',formal_kernel_verified:false,
    promotion:'NOT_APPROVED',
  };
}
export function buildManuscriptCase(audit, manifest) {
  const m=validateManifest(manifest);
  if(!audit||audit.status!=='NOT_VERIFIED')throw new TypeError('An unverified structural audit is required.');
  return {schema:'vasquez.math-lab.case.v0.1',kind:'manuscript_inventory',manifest:m,
    // Raw manuscripts are never collected automatically, even into export.
    classification:{...category(m.field,m.subcategory),taxonomy_version:TAXONOMY_VERSION,coverage:'STRUCTURAL_ONLY',method:'manuscript-audit'},
    document_title:audit.title,counts:audit.counts,identified_claims:audit.claims.map(c=>({kind:c.kind,line:c.line,status:'NOT_VERIFIED'})).slice(0,100),
    status:'INCOMPLETE_SOURCE_REQUIRED',python_replay:'NOT_APPLICABLE',
    mathematical_truth_assessed:false,promotion:'NOT_APPROVED'};
}
export function buildUnsupportedCase(error, manifest, {method='exact-polynomial', rawInput=''}={}) {
  const m=validateManifest(manifest);
  return {schema:'vasquez.math-lab.case.v0.1',kind:'unsupported_input',
    manifest:m,classification:{...category(m.field,m.subcategory),taxonomy_version:TAXONOMY_VERSION,coverage:coverage(m.field,m.subcategory,method).status,method},method,input_excerpt:method==='manuscript-audit'?null:String(rawInput).slice(0,512),
    source_length:String(rawInput).length,reason:String(error).slice(0,200),
    status:'REVIEW_REQUIRED',python_replay:'NOT_RUN',promotion:'NOT_APPROVED'};
}
export class SessionCasebook {
  #cases=[];
  add(entry) {
    if (!entry || entry.schema!=='vasquez.math-lab.case.v0.1') throw new TypeError('Invalid casebook entry');
    // Hard cap to bound session memory and prevent silent loss.
    if (this.#cases.length>=MAX_SESSION_CASES) throw new RangeError('Session casebook full. Export it and start a fresh session before checking more claims.');
    this.#cases.push(structuredClone(entry));
    return this.summary();
  }
  summary() {
    return {cases:this.#cases.length,exact:this.#cases.filter(x=>x.kind==='exact_polynomial').length,
      manuscripts:this.#cases.filter(x=>x.kind==='manuscript_inventory').length,
      metamorphic_pass:this.#cases.reduce((n,x)=>n+(x.probes_passed||0),0),
      needs_review:this.#cases.filter(x=>x.status==='REVIEW_REQUIRED').length};
  }
  export() {return {schema:CASEBOOK_SCHEMA,policy:'VOLUNTARY_EXPORT_ONLY',
    privacy:'Never uploaded or stored by this page; source references and exact equations are included in this explicit export.',
    python_replay:'NOT_RUN',promotion:'NOT_APPROVED',cases:structuredClone(this.#cases)};}
  clear(){this.#cases=[];}
}
