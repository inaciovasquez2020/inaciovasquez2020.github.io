/* Optional, user-triggered DOI lookup. No manuscript content is transmitted. */
import {lookupDOI,reviewedBibtex,LookupInputError} from './doi-lookup.mjs';
const root=document.getElementById('doi-beta');
if(root){
 const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const title=make('h3','DOI lookup · beta');
 const description=make('p','Only the DOI you enter is sent to Crossref or DataCite after you select Lookup. Your manuscript and equations are not sent. Bibliographic metadata is not proof or peer review.');
 const group=make('div');group.className='doi-lookup-row';
 const label=make('label','DOI or doi.org link');label.htmlFor='doi-lookup-input';
 const input=make('input');input.id='doi-lookup-input';input.maxLength=240;input.placeholder='10.1103/PhysRev.48.73';input.autocomplete='off';
 const run=make('button','Look up DOI');run.type='button';
 group.append(label,input,run);
 const results=make('div');results.id='doi-lookup-result';results.setAttribute('role','status');results.setAttribute('aria-live','polite');
 const confirmation=make('label');confirmation.className='citation-check';
 const check=make('input');check.type='checkbox';check.disabled=true;
 confirmation.append(check,make('span','I reviewed this bibliographic record and want to export its BibTeX entry.'));
 const download=make('button','Export reviewed BibTeX');download.type='button';download.disabled=true;
 const foot=make('p','If external lookup fails (network, CORS, limits), open the DOI record manually. No proxy or private API keys are used.');
 root.append(title,description,group,results,confirmation,download,foot);
 let record=null,version=0;
 function reset(){version++;record=null;check.checked=false;check.disabled=true;download.disabled=true;results.replaceChildren();run.disabled=false;}
 input.addEventListener('input',reset);
 check.addEventListener('change',()=>{download.disabled=!check.checked||!record;});
 run.addEventListener('click',async()=>{
  reset();const revision=version;run.disabled=true;
  results.append(make('p','LOOKUP_IN_PROGRESS · mathematical verification NOT_PERFORMED'));
  let reply;try{reply=await lookupDOI(input.value);}catch(e){reply={status:'INVALID_INPUT',reason:e instanceof LookupInputError?e.message:'Invalid input.'};}
  if(revision!==version)return;
  results.replaceChildren();run.disabled=false;results.append(make('strong',reply.status));
  if(reply.status!=='METADATA_FOUND_UNREVIEWED'){results.append(make('p',reply.reason||'No matching complete metadata record.'));return;}
  record=reply.record;
  results.append(make('p',record.title),make('p',record.authors.join(', ')+' ('+record.year+') · '+(record.venue||record.publisher||'Venue unspecified')));
  results.append(make('p','Provider: '+record.registry+' · Metadata: RETRIEVED_UNREVIEWED · Peer review: UNKNOWN · Claim support: NOT_CHECKED'));
  const link=make('a',record.canonical_url);link.href=record.canonical_url;link.target='_blank';link.rel='noopener noreferrer';
  results.append(link);check.disabled=false;
 });
 download.addEventListener('click',()=>{
  if(!record||!check.checked)return;
  const bib=reviewedBibtex(record,{confirmed:true}),url=URL.createObjectURL(new Blob([bib],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='reviewed-doi-citation.bib';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
