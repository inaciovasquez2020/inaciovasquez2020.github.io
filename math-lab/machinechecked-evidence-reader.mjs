/* External MachineChecked evidence viewer contract. This module does not run Lean or verify a paper. */
export const LAB_SCHEMA = 'vasquez.math-lab.machinechecked-evidence@1';
const CLAIM_SCHEMA = 'prooflens/manifest@1';
const CHECKED = 'link.checked';
const ALLOWED_AXIOMS = new Set(['propext','Classical.choice','Quot.sound']);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function object(x,name){if(!isObject(x))throw new TypeError(name+': expected object');return x;}
function str(x,name){if(typeof x!=='string'||!x||x.length>32768)throw new TypeError(name+': invalid string');return x;}
function arr(x,name,max=2000){if(!Array.isArray(x)||x.length>max)throw new TypeError(name+': invalid array');return x;}
function finding(code,detail){return {code,detail};}
export function fromPublishedClaim(raw){
 object(raw,'claim');
 if(raw.schema!==CLAIM_SCHEMA)throw new TypeError('Unsupported MachineChecked claim schema');
 const id=str(raw.id,'id'), release=str(raw.release,'release');
 const links=arr(raw.links,'links',128).map(x=>object(x,'link'));
 const issues=[];
 const supportedCodes=new Set(['link.checked','link.incomplete','link.unbuilt','link.axioms','link.suggested','link.other-route','link.definition','link.module-unbuilt','link.unlinked','formal.accepted','formal.review-pending','formal.open','formal.refuted']);
 if(!supportedCodes.has(raw.status_code)||links.some(x=>!supportedCodes.has(x.status_code)))issues.push(finding('UNKNOWN_SOURCE_STATUS','Unrecognized evidence code; cannot infer proof status.'));
 if(raw.status_code!==CHECKED)issues.push(finding('SOURCE_NOT_PROVED','The audit does not report a checked Lean theorem.'));
 if(links.length!==1||links[0]?.status_code!==CHECKED||links[0]?.name===undefined)
   issues.push(finding('DECLARATION_MAPPING_NOT_UNIQUE','One independently identifiable checked link is required.'));
 if(links.some(x=>x.sorry!==false||!Array.isArray(x.axioms)||x.axioms.some(a=>!ALLOWED_AXIOMS.has(a))))
   issues.push(finding('LEAN_CHECK_NOT_CONFIRMED','Incomplete proof, omitted axiom inventory or nonstandard axiom.'));
 if(raw.source_evidence?.state!=='pass')
   issues.push(finding('SOURCE_NOT_VERIFIED','The provided manuscript source-integrity rung is not passing.'));
 if(raw.source_sha256&&raw.anchor?.source_sha256&&raw.source_sha256!==raw.anchor.source_sha256)
   issues.push(finding('SOURCE_PIN_CONFLICT','Claim and source-anchor fingerprints differ.'));
 if(!arr(raw.reviews??[],'reviews',128).some(x=>isObject(x)&&x.current===true))
   issues.push(finding('CORRESPONDENCE_NOT_REVIEWED','Current independent manuscript-to-Lean correspondence is not established.'));
 else issues.push(finding('REVIEW_NOT_AUTHENTICATED','Review provenance and independence have not been verified by this Lab.'));
 const link=links.length===1?links[0]:null;
 const statement=link?.statement?.exact?.text;
 if(typeof statement!=='string'||!statement)
   issues.push(finding('LEAN_STATEMENT_UNAVAILABLE','Exact printed Lean statement is not available.'));
 // A claimed link-check never becomes a manuscript verification result here.
 return {schema:LAB_SCHEMA,mode:'READ_ONLY_UNTRUSTED_EXTERNAL_REPORT',
  source_type:'PUBLISHED_CLAIM',origin_claim_id:id,
  input_provenance:{machinechecked_schema:CLAIM_SCHEMA,machinechecked_release:release,provenance_authenticated:false},
  claims:[{claim_id:id,source_claim_id:id,lean_declaration:link?.name??null,
   reported_status_code:raw.status_code??null,manuscript_text:raw.statement_tex??null,
   lean_statement:statement??null,local_integrity:{
    state:issues.length?'BLOCKED':'NO_INTEGRITY_CONFLICT_FOUND',
    correspondence:'NOT_ESTABLISHED_BY_ADAPTER',review:'NOT_AUTHENTICATED_BY_LAB',
    independent_kernel_replay:'NOT_RUN_BY_ADAPTER'},
   verification_verdict:'NOT_VERIFIED_BY_ADAPTER',issues}]};
}
export function normalizeReport(raw){
 object(raw,'report');
 if(raw.schema===CLAIM_SCHEMA)return fromPublishedClaim(raw);
 if(raw.schema!==LAB_SCHEMA||raw.mode!=='READ_ONLY_UNTRUSTED_EXTERNAL_REPORT')
   throw new TypeError('Unsupported report schema');
 const claims=arr(raw.claims,'claims').map((c,i)=>{
   object(c,'claim '+i);str(c.claim_id,'claim ID');
   arr(c.issues,'issues',256).forEach(x=>object(x,'issue'));
   if(c.verification_verdict!=='NOT_VERIFIED_BY_ADAPTER'||
      c.local_integrity?.correspondence!=='NOT_ESTABLISHED_BY_ADAPTER')
     throw new TypeError('Untrusted report contains unsupported verification verdict');
   if(c.reported_status_code!==null&&typeof c.reported_status_code!=='string')
     throw new TypeError('Malformed external status');
   return c;
 });
 return {...raw,claims};
}
