/** Request builder ONLY — no proof execution, verification or billing. */
export const REQUEST_SCHEMA='vasquez.formal-request.v0.1';
export class InvalidRequest extends Error {constructor(msg){super(msg);this.name='InvalidRequest';}}
function required(s,name,max) {
 if(typeof s!=='string'||!s.trim()||s.length>max||s.includes('\0'))throw new InvalidRequest(name+' must be nonempty and under '+max+' characters.');
 return s.replace(/\r\n?/g,'\n').trim();
}
function optional(s,name,max){return s===undefined||s===null||s===''?'':required(s,name,max);}
export function makeRequest(d){
 if(!d||typeof d!=='object'||Array.isArray(d))throw new InvalidRequest('Request object required.');
 if(d.verifier!=='lean4')throw new InvalidRequest('Only future Lean 4 verification requests are supported.');
 if(d.confirmed!==true||d.privacyAcknowledged!==true)throw new InvalidRequest('Source and privacy confirmations required.');
 const id=required(d.id,'Request ID',100);
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id))throw new InvalidRequest('Invalid request identifier.');
 const field=required(d.field,'Subject field',100),subcategory=required(d.subcategory,'Subcategory',100);
 if(field==='other'||subcategory==='unclassified')throw new InvalidRequest('Select an explicit subject field and subcategory.');
 const theorem=required(d.theorem,'Theorem declaration',8192);
 const proof=required(d.proof,'Complete candidate Lean source',65536);
 const toolchain=required(d.toolchain,'Exact Lean version',160);
 const dependency=required(d.dependency,'Pinned dependency or repository revision',240);
 if(!/lean|v4\./i.test(toolchain))throw new InvalidRequest('An explicit Lean 4 toolchain string is required.');
 return {
  schema:REQUEST_SCHEMA,id,subject:{field,subcategory,provenance:'USER_DECLARED_AND_CONFIRMED_NOT_VERIFIED'},
  source_reference:required(d.source,'Source reference',240),
  repository_revision:optional(d.repo,'Repository and commit',240),
  target_theorem:theorem,
  candidate_lean_source:proof,
  assumptions:optional(d.assumptions,'Assumptions',4000),
  environment:{requested_verifier:'LEAN4_KERNEL_NOT_CONNECTED',exact_toolchain:toolchain,pinned_dependencies:dependency},
  execution_status:'NOT_RUN',certificate_status:'NOT_ISSUED',
  payment_status:'DISABLED',axiom_audit:'NOT_RUN',
  assertion:'This is an unverified request package. A hash is not a proof or an authenticated certification.'
 };
}
export const canonicalJSON=request=>JSON.stringify(request);
export function envelope(request,digest) {
 if(!/^[a-f0-9]{64}$/.test(digest))throw new InvalidRequest('Invalid SHA-256 string.');
 return {schema:'vasquez.formal-request-envelope.v0.1',
  request_hash_algorithm:'SHA-256',
  canonical_encoding:'JSON.stringify(ordered makeRequest record), UTF-8',
  request_sha256:digest,request,verification_status:'NOT_RUN',certificate_status:'NOT_ISSUED',
  disclaimer:'Integrity digest is not a digital signature, source provenance or formal proof.'};
}
