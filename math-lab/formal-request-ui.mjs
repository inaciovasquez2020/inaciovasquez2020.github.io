import {makeRequest,envelope,canonicalJSON,InvalidRequest} from './formal-request-core.mjs';
import {errorText,explainError} from './runtime-errors-i18n.mjs';
const $=id=>document.getElementById(id),form=$('formal-form'),out=$('formal-status'),download=$('formal-export');
let ready=null,revision=0,lastFormalStatus={kind:'notRun'};
const locale=()=>document.getElementById('ui-language')?.value||'en';
function showFormalStatus(){const {kind,reason,digest}=lastFormalStatus;
 if(kind==='ready')out.textContent='REQUEST_READY · SHA-256 '+digest+' · NOT_RUN · NOT_ISSUED · PAYMENT DISABLED';
 else if(kind==='rejected')out.textContent=errorText('rejected',locale(),{reason:explainError(reason,locale())});
 else out.textContent=errorText('notRun',locale());}
function invalidate(){revision++;ready=null;download.disabled=true;lastFormalStatus={kind:'notRun'};showFormalStatus();}
form.addEventListener('input',invalidate);
form.addEventListener('change',invalidate);
form.addEventListener('submit',async event=>{
 event.preventDefault();invalidate();
 const submittedRevision=revision;
 try{
  const record=makeRequest({id:$('req-id').value,source:$('req-source').value,
   repo:$('req-repo').value,field:$('req-field').value,subcategory:$('req-subcategory').value,
   theorem:$('req-theorem').value,proof:$('req-proof').value,toolchain:$('req-toolchain').value,
   dependency:$('req-dependency').value,assumptions:$('req-assumptions').value,
   verifier:'lean4',confirmed:$('req-confirm').checked,privacyAcknowledged:$('req-privacy').checked});
  if(!globalThis.crypto?.subtle)throw new InvalidRequest('Secure-context hashing unavailable; use HTTPS.');
  const bytes=new TextEncoder().encode(canonicalJSON(record));
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const digest=Array.from(hash,n=>n.toString(16).padStart(2,'0')).join('');
  if(submittedRevision!==revision)return; // Input changed while SHA-256 was in progress.
  ready=envelope(record,digest);
  lastFormalStatus={kind:'ready',digest};showFormalStatus();
  download.disabled=false;
 }catch(e){if(submittedRevision===revision){lastFormalStatus={kind:'rejected',reason:e instanceof InvalidRequest?e.message:errorText('unexpected','en')};showFormalStatus();}}
});
download.addEventListener('click',()=>{
 if(!ready)return;
 const blob=new Blob([JSON.stringify(ready,null,2)+'\n'],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='vasquez-formal-request-not-verified.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});

$('ui-language')?.addEventListener('change',showFormalStatus);
