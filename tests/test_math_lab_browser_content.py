#!/usr/bin/env python3
"""Fail-closed rendered content test of translation gaps reported by site owner.
Runs in installed Chrome; checks all five non-English locales against actual UI dictionaries.
No mathematical source or verification exports are translated."""
from __future__ import annotations
import contextlib, html, json, re, shutil, subprocess, tempfile, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CHROME=next((p for n in ("google-chrome","google-chrome-stable","chromium","chromium-browser")
             if (p:=shutil.which(n))),None)
if CHROME is None:raise SystemExit("FULL_TEXT_SMOKE := INCOMPLETE_NO_CHROME")
LANGS=("es","pt-BR","zh-Hans","fr","de")
SCRIPT=r"""
window.addEventListener('load',async()=>{
 const output=document.createElement('pre');
 output.id='translation-content-receipt';document.body.append(output);
 try {
  const lang=new URL(location.href).searchParams.get('lang');
  const {DICTIONARIES}=await import('./extended-i18n.mjs');
  const {LOCALES}=await import('./i18n.mjs');
  const dictionary=DICTIONARIES[lang],standard=LOCALES[lang];
  if(!dictionary||!standard)throw Error('missing locale');
  const problems=[];
  const assert=(label,actual,expected)=>{
    if(actual.trim()!==expected.trim())problems.push(label+': '+JSON.stringify(actual)+' expected '+JSON.stringify(expected));
  };
  const get=id=>document.getElementById(id)?.textContent||'';
  const intro='Check a polynomial identity or paste an entire LaTeX manuscript. Exact algebra generates integer-arithmetic evidence; manuscript audit inventories claims and highlights unverified obligations. Both run privately in your browser.';
  const introNode=document.querySelector('.intro > p:not(.help)');
  assert('intro',introNode?.textContent||'',dictionary[intro]);
  assert('hero',get('hero-title'),standard.hero);
  assert('locale scope',get('locale-scope'),standard.localeScope);
  assert('quick guide',get('quick-guide-title'),standard.newUser);
  const sentence=document.querySelector('.quick-guide p');
  const quickFragments=['Choose','Exact polynomial identity',
    'to test one supported equation, or','Manuscript structure audit',
    'to inventory a LaTeX document without proving it.'];
  for(const fragment of quickFragments){
    if(!sentence?.textContent.includes(dictionary[fragment]))problems.push('quick guide fragment missing: '+fragment);
  }
  assert('navigation help',document.querySelector('a[href^="how-to.html"]')?.textContent||'',standard.howTo);
  assert('formal request nav',document.querySelector('a[href^="formal-request.html"]')?.textContent||'',dictionary['Formal request beta']);
  assert('method',document.querySelector('label[for=method]')?.textContent||'',standard.method);
  assert('field confirmation',get('field-confirm-title'),
    (await import('./runtime-messages-i18n.mjs')).RUNTIME_MESSAGES[lang].confirmReview);
  const body=document.body.innerText;
  for(const english of [intro,'Choose Exact polynomial identity to test one supported equation, or Manuscript structure audit to inventory a LaTeX document without proving it.']){
    if(body.includes(english))problems.push('unchanged English paragraph: '+english.slice(0,50));
  }
  // Protect mathematical source, machine-readable statuses and IDs.
  if(document.getElementById('math-field')?.value!=='algebra')problems.push('field ID changed');
  if(document.getElementById('math-subcategory')?.value!=='polynomial-identities')problems.push('subcategory ID changed');
  output.textContent=JSON.stringify({status:problems.length?'FAIL':'PASS',language:lang,problems});
 }catch(e){output.textContent=JSON.stringify({status:'FAIL',error:String(e.stack||e)});}
});
"""
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*_):pass
 def do_GET(self):
  from urllib.parse import urlsplit,parse_qs
  u=urlsplit(self.path)
  if 'content-test' not in parse_qs(u.query):return super().do_GET()
  if u.path!='/math-lab/index.html':return self.send_error(404)
  document=(ROOT/'math-lab/index.html').read_text(encoding='utf-8')
  if document.count('</body>')!=1:return self.send_error(500)
  data=document.replace('</body>','<script>'+SCRIPT+'</script></body>').encode()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8')
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

with contextlib.chdir(ROOT):
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with tempfile.TemporaryDirectory(prefix='lab-content-') as directory:
   for language in LANGS:
    url=f'http://127.0.0.1:{server.server_port}/math-lab/index.html?content-test=1&lang={language}'
    cmd=[CHROME,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
         '--disable-background-networking','--no-first-run','--virtual-time-budget=3500',
         '--dump-dom',f'--user-data-dir={directory}/{language}',url]
    try:p=subprocess.run(cmd,capture_output=True,text=True,timeout=35)
    except subprocess.TimeoutExpired:raise SystemExit(f'FULL_TEXT_SMOKE := INCOMPLETE_TIMEOUT {language}')
    if p.returncode:raise SystemExit(f'FULL_TEXT_SMOKE := CHROME_FAILED {language} {p.stderr[-500:]}')
    m=re.search(r'<pre id="translation-content-receipt">(.*?)</pre>',p.stdout,re.S)
    if not m:raise SystemExit(f'FULL_TEXT_SMOKE := INCOMPLETE_NO_RECEIPT {language}')
    result=json.loads(html.unescape(m.group(1)))
    if result['status']!='PASS':raise SystemExit(f'FULL_TEXT_SMOKE := FAIL {result}')
    print(f'FULL_TEXT_{language} := PASS')
   print('FULL_TEXT_SMOKE := PASS main-page priority paragraphs in 5 non-English locales')
 finally:server.shutdown();server.server_close()
