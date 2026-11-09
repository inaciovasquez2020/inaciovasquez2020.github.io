#!/usr/bin/env python3
"""Six-language browser negative-path smoke; no downloads, no claims of proof."""
from __future__ import annotations
import contextlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import html, json, re, shutil, subprocess, tempfile, threading
from urllib.parse import urlsplit, parse_qs

ROOT=Path(__file__).resolve().parents[1]
CHROME=next((p for x in ('google-chrome','google-chrome-stable','chromium','chromium-browser') if (p:=shutil.which(x))),None)
if not CHROME:raise SystemExit('BROWSER_NEGATIVE := INCOMPLETE_NO_CHROME')
LANGS=['en','es','pt-BR','zh-Hans','fr','de']
SCRIPT=r"""
window.addEventListener('load',async()=>{
 const out=document.createElement('pre');out.id='ci-negative-result';document.body.append(out);
 const $=id=>document.getElementById(id);
 const change=lang=>{const x=$('ui-language');x.value=lang;x.dispatchEvent(new Event('change',{bubbles:true}));};
 const fail=message=>{throw Error(message);};
 try{
  const lang=new URL(location.href).searchParams.get('lang');
  const isFormal=location.pathname.endsWith('formal-request.html');
  if(isFormal){
    const request=$('formal-form');
    request.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,0));
    const first=$('formal-status').textContent;
    if(!first.includes('REQUEST_REJECTED'))fail('formal validation not rejected '+first);
    if(lang!=='en'&&first.includes('Source and privacy confirmations required.'))fail('untranslated formal rejection');
    if(!$('formal-export').disabled)fail('invalid formal request enabled download');
    change('en');
    const en=$('formal-status').textContent;
    if(!en.includes('Source and privacy confirmations required.'))fail('rejected formal reason failed English restoration');
    if(!$('formal-export').disabled)fail('invalid formal request enabled download after language change');
    out.textContent=JSON.stringify({status:'PASS',test:'formal-request',language:lang});
  }else{
    // No mathematical verification can run until the subject is confirmed.
    const field=$('math-field').value,sub=$('math-subcategory').value;
    $('field-confirm').click();
    if(!$('field-confirm').checked)fail('field cannot be confirmed');
    $('equation').value='x + 1';$('equation').dispatchEvent(new Event('input',{bubbles:true}));
    $('field-confirm').click();
    $('claim-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    const title=()=>document.querySelector('#result-area .error-block strong')?.textContent||'';
    const message=()=>document.querySelector('#result-area .error-block p')?.textContent||'';
    if(!title())fail('unsupported equality lacked error');
    if(lang!=='en'&&title()==='NOT VERIFIED — UNSUPPORTED INPUT')fail('error heading remained English');
    const raw=message();
    if(lang!=='en'&&raw.includes('Exactly one equality sign is required'))fail('exact reason untranslated: '+lang);
    change('en');
    if(title()!=='NOT VERIFIED — UNSUPPORTED INPUT')fail('error heading did not restore English');
    if(message()!=='Exactly one equality sign is required; inequalities and chained equalities are unsupported.')fail('original English diagnostic not restored');
    if($('math-field').value!==field||$('math-subcategory').value!==sub)fail('taxonomy IDs changed');
    if($('equation').value!=='x + 1')fail('invalid source modified');
    // Switch to manuscript mode and submit an empty source through the existing confirmation gate.
    const method=$('method');method.value='manuscript-audit';method.dispatchEvent(new Event('change',{bubbles:true}));
    const newField=$('math-field');newField.value='topology';newField.dispatchEvent(new Event('change',{bubbles:true}));
    if($('math-subcategory').value!=='manifold-topology')fail('unexpected topology subcategory');
    $('field-confirm').click();
    if(!$('field-confirm').checked)fail('manuscript field confirmation failed');
    change(lang);
    // Method presentation must update in the selected locale without touching text or confirmation.
    const methodCaption=$('run').textContent;
    const sourceCaption=$('source-label').textContent;
    if(lang==='pt-BR'&&!methodCaption.includes('Analisar a estrutura'))fail('Portuguese method caption missing');
    if(lang==='es'&&!methodCaption.includes('Analizar la estructura'))fail('Spanish method caption missing');
    if(lang==='de'&&!sourceCaption.includes('Manuskript'))fail('German manuscript input label missing');
    if(lang!=='en'&&sourceCaption==='LaTeX manuscript · paste entire source')fail('manuscript label untranslated');
    if($('equation').value!=='')fail('language switch altered empty manuscript input');
    if(!$('field-confirm').checked)fail('language switch reset field confirmation');
    $('claim-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    const manuscriptError=message();
    if(lang!=='en'&&manuscriptError.includes('Paste LaTeX manuscript text before analyzing.'))fail('manuscript error untranslated: '+lang);
    if(!title())fail('manuscript error missing');
    if($('equation').value!=='')fail('empty manuscript source unexpectedly changed');
    change('en');
    if(!message().includes('Paste LaTeX manuscript text before analyzing.'))fail('manuscript English restoration failed');
    // Accepted manuscript with an unsupported display environment: translate the warning, never the excerpt.
    const source=String.raw`\begin{split}x=x\end{split}`;
    $('equation').value=source;
    $('equation').dispatchEvent(new Event('input',{bubbles:true}));
    $('field-confirm').click();
    if(!$('field-confirm').checked)fail('manuscript re-confirmation failed');
    change(lang);
    $('claim-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    const excerpt=document.querySelector('#result-area .flagged-source')?.textContent;
    const flagReason=document.querySelector('#result-area .audit-claims .audit-item.review p')?.textContent||'';
    if(!excerpt||!flagReason)fail('manuscript extraction warning not rendered');
    if(lang!=='en'&&flagReason.includes('This environment is not extracted by the current inventory.'))fail('manuscript warning untranslated');
    if(!document.querySelector('#result-area .verdict-top')?.textContent.includes('NOT_VERIFIED'))fail('manuscript status changed');
    change('en');
    const englishReason=document.querySelector('#result-area .audit-claims .audit-item.review p')?.textContent||'';
    if(!englishReason.includes('This environment is not extracted by the current inventory.'))fail('manuscript warning English restoration failed');
    if(document.querySelector('#result-area .flagged-source')?.textContent!==excerpt)fail('flagged source excerpt changed');
    if($('equation').value!==source)fail('manuscript source altered during translation');
    out.textContent=JSON.stringify({status:'PASS',test:'exact-and-manuscript-negative-and-extraction',language:lang});
  }
 }catch(e){out.textContent=JSON.stringify({status:'FAIL',error:String(e.stack||e)});}
});
"""
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  url=urlsplit(self.path)
  if 'ci-negative' not in parse_qs(url.query):return super().do_GET()
  requested=(ROOT/url.path.lstrip('/')).resolve()
  if requested not in (ROOT/'math-lab/index.html',ROOT/'math-lab/formal-request.html'):
   return self.send_error(404)
  document=requested.read_text(encoding='utf-8')
  if document.count('</body>')!=1:return self.send_error(500)
  data=document.replace('</body>','<script>'+SCRIPT+'</script></body>').encode()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8')
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

with contextlib.chdir(ROOT):
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with tempfile.TemporaryDirectory(prefix='lab-negative-') as root:
   for path in ('index.html','formal-request.html'):
    for lang in LANGS:
     profile=str(Path(root)/path/lang)
     url=f'http://127.0.0.1:{server.server_port}/math-lab/{path}?ci-negative=1&lang={lang}'
     cmd=[CHROME,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
          '--disable-background-networking','--no-first-run','--virtual-time-budget=3200',
          '--dump-dom',f'--user-data-dir={profile}',url]
     try:p=subprocess.run(cmd,text=True,capture_output=True,timeout=30)
     except subprocess.TimeoutExpired:raise SystemExit(f'BROWSER_NEGATIVE := INCOMPLETE_TIMEOUT {path} {lang}')
     if p.returncode:raise SystemExit(f'BROWSER_NEGATIVE := CHROME_FAIL {path} {lang} {p.stderr[-350:]}')
     m=re.search(r'<pre id="ci-negative-result">(.*?)</pre>',p.stdout,re.S)
     if not m:raise SystemExit(f'BROWSER_NEGATIVE := NO_RESULT {path} {lang}')
     result=json.loads(html.unescape(m.group(1)))
     if result['status']!='PASS':raise SystemExit(f'BROWSER_NEGATIVE := FAIL {path} {lang} {result}')
     print(f'BROWSER_NEGATIVE_{path}_{lang} := PASS')
   print('BROWSER_NEGATIVE := PASS (12 rendered cases)')
 finally:server.shutdown();server.server_close()
