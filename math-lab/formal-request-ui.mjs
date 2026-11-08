import {makeRequest,envelope,canonicalJSON,InvalidRequest} from './formal-request-core.mjs';
const $=id=>document.getElementById(id),form=$('formal-form'),out=$('formal-status'),download=$('formal-export');
let ready=null;
function invalidate(){ready=null;download.disabled=true;out.textContent='NOT_RUN — No proof has been checked; no certificate has been issued.';}
form.addEventListener('input',invalidate);
form.addEventListener('change',invalidate);
form.addEventListener('submit',async event=>{
 event.preventDefault();invalidate();
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
  ready=envelope(record,digest);
  out.textContent='REQUEST_READY · SHA-256 '+digest+' · NOT_RUN · NOT_ISSUED · PAYMENT DISABLED';
  download.disabled=false;
 }catch(e){out.textContent='REQUEST_REJECTED: '+(e instanceof InvalidRequest?e.message:'Unexpected error; no request created.');}
});
download.addEventListener('click',()=>{
 if(!ready)return;
 const blob=new Blob([JSON.stringify(ready,null,2)+'\n'],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='vasquez-formal-request-not-verified.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
