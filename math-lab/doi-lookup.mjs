/* DOI-only metadata beta. Nothing from the manuscript is transmitted.
 * Records and user confirmation are bibliographic; NEVER mathematical proof.
 */
export const LOOKUP_VERSION='vasquez.doi-metadata.v0.1';
const MAX_BYTES=131072;
const DOI_RE=/^10\.\d{4,9}\/[A-Za-z0-9._;()+:\/-]{1,140}$/;
const HOSTS=Object.freeze({Crossref:'https://api.crossref.org/works/',DataCite:'https://api.datacite.org/dois/'});
export class LookupInputError extends Error{constructor(msg){super(msg);this.name='LookupInputError';}}
export function normalizeDOI(raw){
 if(typeof raw!=='string'||raw.length>240)throw new LookupInputError('DOI must be short text.');
 let value=raw.trim().replace(/^doi:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
 if(value.includes('%')){try{value=decodeURIComponent(value);}catch{throw new LookupInputError('Invalid percent encoding.');}}
 if(!DOI_RE.test(value))throw new LookupInputError('Unsupported DOI syntax; enter a DOI or a doi.org link.');
 return value;
}
export function lookupURL(provider,doi){
 if(!Object.hasOwn(HOSTS,provider))throw new LookupInputError('Unknown provider.');
 return HOSTS[provider]+normalizeDOI(doi).split('/').map(encodeURIComponent).join('/');
}
function clean(raw,max=360){
 return typeof raw==='string'?raw.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
}
function fromCrossref(payload){
 const r=payload?.message;if(!r||typeof r!=='object')throw Error('Missing Crossref record.');
 return {doi:r.DOI,title:clean(Array.isArray(r.title)?r.title[0]:r.title),
 authors:Array.isArray(r.author)?r.author.slice(0,40).map(a=>clean(a?.name||[a?.given,a?.family].filter(Boolean).join(' '),160)).filter(Boolean):[],
 year:Number(r.published?.['date-parts']?.[0]?.[0]||r.issued?.['date-parts']?.[0]?.[0]),
 venue:clean(Array.isArray(r['container-title'])?r['container-title'][0]:r['container-title']),
 publisher:clean(r.publisher),type:clean(r.type,100),registry:'Crossref'};
}
function fromDataCite(payload){
 const r=payload?.data?.attributes;if(!r||typeof r!=='object')throw Error('Missing DataCite record.');
 return {doi:r.doi,title:clean(Array.isArray(r.titles)?r.titles[0]?.title:''),
 authors:Array.isArray(r.creators)?r.creators.slice(0,40).map(a=>clean(a?.name||[a?.givenName,a?.familyName].filter(Boolean).join(' '),160)).filter(Boolean):[],
 year:Number(r.publicationYear),venue:clean(r.container?.title),publisher:clean(r.publisher?.name||r.publisher),
 type:clean(r.types?.resourceTypeGeneral||r.types?.resourceType,100),registry:'DataCite'};
}
function validate(record,expected){
 let doi;try{doi=normalizeDOI(record.doi);}catch{throw Error('Missing or malformed provider DOI.');}
 if(doi.toLowerCase()!==expected.toLowerCase())throw Error('Provider DOI does not match request.');
 if(!record.title||!record.authors.length||!Number.isInteger(record.year)||record.year<1500||record.year>2100)
   throw Error('Metadata lacks required title, authors or publication year.');
 return Object.freeze({...record,doi,canonical_url:'https://doi.org/'+doi,
   metadata_status:'RETRIEVED_UNREVIEWED',peer_review_status:'UNKNOWN',reference_supports_claim:'NOT_CHECKED'});
}
async function readJSON(response){
 const declared=Number(response.headers?.get?.('content-length'));
 if(Number.isFinite(declared)&&declared>MAX_BYTES)throw Error('Oversized response.');
 if(!response.body?.getReader){
   const text=await response.text();
   if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Oversized response.');
   return JSON.parse(text);
 }
 const reader=response.body.getReader(),parts=[];let bytes=0;
 try{
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>MAX_BYTES){await reader.cancel();throw Error('Oversized response.');}parts.push(value);}
 }finally{reader.releaseLock();}
 const joined=new Uint8Array(bytes);let at=0;for(const x of parts){joined.set(x,at);at+=x.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));
}
export async function lookupDOI(raw,{fetchImpl=globalThis.fetch,timeoutMs=6000}={}){
 const doi=normalizeDOI(raw),attempts=[];
 if(typeof fetchImpl!=='function')return {status:'INCOMPLETE',doi,attempts,reason:'Network unavailable.'};
 const providers=doi.toLowerCase().startsWith('10.48550/')?['DataCite','Crossref']:['Crossref','DataCite'];
 for(const provider of providers){
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),Math.max(1,Math.min(10000,timeoutMs)));
  try{
   const response=await fetchImpl(lookupURL(provider,doi),{method:'GET',mode:'cors',credentials:'omit',
    redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/json'},signal:ctrl.signal});
   if(response.status===404){attempts.push({provider,status:'NOT_FOUND'});continue;}
   if(!response.ok){attempts.push({provider,status:'INCOMPLETE_HTTP_'+response.status});continue;}
   const record=validate(provider==='Crossref'?fromCrossref(await readJSON(response)):fromDataCite(await readJSON(response)),doi);
   attempts.push({provider,status:'METADATA_FOUND'});
   return {status:'METADATA_FOUND_UNREVIEWED',doi,record,attempts,mathematical_verification:'NOT_PERFORMED'};
  }catch(e){attempts.push({provider,status:'INCOMPLETE',reason:e?.name==='AbortError'?'TIMEOUT':'NETWORK_CORS_OR_METADATA_ERROR'});}
  finally{clearTimeout(timeout);}
 }
 return {status:attempts.every(x=>x.status==='NOT_FOUND')?'NOT_FOUND':'INCOMPLETE',doi,attempts,
  reason:'No complete matching record retrieved. This does not prove that the DOI does not exist.'};
}
function bibEscape(value){
 return String(value).replace(/\\/g,'\\textbackslash{}').replace(/[{}%&#_$^~]/g,c=>({
 '{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','$':'\\$','^':'\\^{}','~':'\\~{}'}[c]));
}
export function reviewedBibtex(record,{confirmed=false}={}){
 if(!confirmed||record?.metadata_status!=='RETRIEVED_UNREVIEWED')
  throw new LookupInputError('User review required before BibTeX export.');
 const doi=normalizeDOI(record.doi),key='doi_'+doi.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,70);
 const kind=record.type==='journal-article'?'article':'misc';
 const fields=[['title',record.title],['author',record.authors.join(' and ')],['year',String(record.year)],
  [kind==='article'?'journal':'howpublished',record.venue||record.publisher||''],['doi',doi],['url','https://doi.org/'+doi]];
 return '@'+kind+'{'+key+',\n'+fields.filter(([,v])=>v).map(([k,v])=>'  '+k+' = {'+bibEscape(v)+'}').join(',\n')+'\n}\n';
}
