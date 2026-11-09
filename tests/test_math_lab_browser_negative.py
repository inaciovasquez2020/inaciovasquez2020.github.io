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
    change('en');
    if(title()!=='NOT VERIFIED — UNSUPPORTED INPUT')fail('error heading did not restore English');
    if(message()!==raw)fail('raw diagnostic changed during translation');
    if($('math-field').value!==field||$('math-subcategory').value!==sub)fail('taxonomy IDs changed');
    if($('equation').value!=='x + 1')fail('invalid source modified');
    out.textContent=JSON.stringify({status:'PASS',test:'exact-negative',language:lang});
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
