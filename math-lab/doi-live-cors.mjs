/* Real browser/CORS smoke test for DOI beta: no private input, no secrets.
 * One GET per public example DOI and no retries. Fail closed on inability
 * to reach the live website, API, or browser.
 */
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const origin='https://inaciovasquez2020.github.io';
const entries=[
 {name:'Crossref',doi:'10.1103/PhysRev.48.73',url:'https://api.crossref.org/works/10.1103/PhysRev.48.73'},
 {name:'DataCite',doi:'10.6084/m9.figshare.21545982',url:'https://api.datacite.org/dois/10.6084/m9.figshare.21545982'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function poll(fn,ms,label){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){try{const v=await fn();if(v)return v;}catch{}await sleep(250);}
 throw Error('INCOMPLETE_TIMEOUT: '+label);
}
function chrome(){
 for(const name of ['google-chrome','google-chrome-stable','chromium']){
  const p=spawnSync('which',[name],{encoding:'utf8',timeout:1500});
  if(p.status===0)return p.stdout.trim();
 }
 throw Error('INCOMPLETE_NO_BROWSER');
}
class CDP{
 constructor(ws){
  this.ws=ws;this.id=0;this.pending=new Map();
  ws.onmessage=e=>{
   let m;try{m=JSON.parse(e.data);}catch{return;}
   const j=this.pending.get(m.id);if(!j)return;
   clearTimeout(j.timer);this.pending.delete(m.id);
   m.error?j.reject(Error(m.error.message)):j.resolve(m.result);
  };
 }
 call(method,params={}){
  const id=++this.id;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('INCOMPLETE_CDP_TIMEOUT '+method));},20000);
   this.pending.set(id,{resolve,reject,timer});
   this.ws.send(JSON.stringify({id,method,params}));
  });
 }
 async eval(expr){
  const m=await this.call('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(m.exceptionDetails)throw Error('BROWSER_EXCEPTION '+m.exceptionDetails.text);
  return m.result?.value;
 }
}
async function main(){
 const profile=mkdtempSync(join(tmpdir(),'doi-live-cors-'));
 const proc=spawn(chrome(),['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const port=await poll(()=>{
   const f=join(profile,'DevToolsActivePort');
   return existsSync(f)?Number(readFileSync(f,'utf8').split('\n')[0]):null;
  },15000,'CHROME_START');
  const page=await poll(async()=>{
   const r=await fetch('http://127.0.0.1:'+port+'/json/list');
   if(!r.ok)return null;
   return (await r.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
  },10000,'CHROME_PAGE');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await poll(()=>ws.readyState===WebSocket.OPEN,5000,'BROWSER_CDP');
  const cdp=new CDP(ws);
  await cdp.call('Page.enable');await cdp.call('Runtime.enable');
  const nav=await cdp.call('Page.navigate',{url:origin+'/math-lab/'});
  if(nav.errorText)throw Error('INCOMPLETE_SITE_NAVIGATION '+nav.errorText);
  await poll(async()=>{
   const r=await cdp.eval('({origin:location.origin,state:document.readyState})');
   return r?.origin===origin&&r.state==='complete';
  },20000,'SITE_ORIGIN');
  console.log('REAL_SITE_ORIGIN := '+origin);
  const js='(async function(){'+
   'const targets='+JSON.stringify(entries)+';'+
   'const out=[];for(const x of targets){const controller=new AbortController();'+
   'const timer=setTimeout(()=>controller.abort(),12000);'+
   'try{const r=await fetch(x.url,{method:"GET",mode:"cors",credentials:"omit",redirect:"error",cache:"no-store",referrerPolicy:"no-referrer",headers:{Accept:"application/json"},signal:controller.signal});'+
   'if(!r.ok){out.push({name:x.name,status:"HTTP_"+r.status});continue;}'+
   'const data=await r.json();'+
   'const doi=x.name==="Crossref"?data?.message?.DOI:data?.data?.attributes?.doi;'+
   'const title=x.name==="Crossref"?data?.message?.title?.[0]:data?.data?.attributes?.titles?.[0]?.title;'+
   'out.push({name:x.name,status:typeof doi==="string"&&doi.toLowerCase()===x.doi.toLowerCase()&&typeof title==="string"&&title.length>0?"PASS":"INVALID_METADATA",doi:doi||null});'+
   '}catch(e){out.push({name:x.name,status:"INCOMPLETE_BROWSER_FETCH",error:String(e?.name||e).slice(0,80)});}finally{clearTimeout(timer);}}return out;})()';
  const results=await cdp.eval(js);
  for(const item of results)console.log('LIVE_CORS_'+item.name.toUpperCase()+' := '+JSON.stringify(item));
  if(results.length!==2||results.some(x=>x.status!=='PASS'))throw Error('INCOMPLETE_CORS_OR_METADATA');
  console.log('LIVE_BROWSER_CORS := PASS');
 }finally{try{ws?.close();}catch{}proc.kill('SIGTERM');}
}
try{await main();}catch(e){console.error('LIVE_BROWSER_CORS := INCOMPLETE '+String(e.message).slice(0,200));process.exitCode=2;}
