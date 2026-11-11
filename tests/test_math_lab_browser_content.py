#!/usr/bin/env python3
"""Fail-closed rendered content test of translation gaps reported by site owner.
Runs in installed Chrome; checks all five non-English locales against actual UI dictionaries.
No mathematical source or verification exports are translated."""
from __future__ import annotations
import html, json, re, shutil, subprocess, tempfile, threading
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
  const {COPY}=await import('./runtime-copy-i18n.mjs');
  const shellKeys=["USER GUIDE","01 / INPUT","02 / EVIDENCE","03 / IMPROVEMENT LOOP","04 / VERIFICATION BOUNDARY","ENGINE SCOPE IS ENFORCED","QUICK EXAMPLES","NO AUTOMATIC LEARNING","OPTIONAL / REFERENCE REMINDER","APPEARANCE","EXPERIMENTAL","VASQUEZ RESEARCH / EXACT MATHEMATICS","EXACT POLYNOMIAL CERTIFICATE ≠ LEAN PROOF","EXACT POLYNOMIAL ARITHMETIC","MANUSCRIPT STRUCTURE ONLY","OPTIONAL USER WALKTHROUGH","VASQUEZ RESEARCH · EXPERIMENTAL"];
  for(const key of shellKeys.filter(key=>key!=='MANUSCRIPT STRUCTURE ONLY')){
    const expected=dictionary[key];
    if(!expected||!document.body.textContent.includes(expected))problems.push('missing localized shell label '+key);
  }
  const expectedIdle={
    resultTitle:'Awaiting a claim',
    resultHelp:'Run an exact polynomial check to inspect the evidence and export a replayable source claim.',
    quality:'No checks recorded in this session. All source text stays in memory until you choose to export it.',
    citation:'No citation analysis performed. Optional, local-only and user initiated.'
  };
  if(document.querySelector('#result-area .empty-state h3')?.textContent!==dictionary[expectedIdle.resultTitle])problems.push('result idle heading not localized');
  if(document.querySelector('#result-area .empty-state p')?.textContent!==dictionary[expectedIdle.resultHelp])problems.push('result idle explanation not localized');
  if(document.getElementById('quality-last')?.textContent!==dictionary[expectedIdle.quality])problems.push('casebook idle state not localized');
  if(document.querySelector('#citation-results p')?.textContent!==dictionary[expectedIdle.citation])problems.push('citation idle state not localized');
  const selector=document.getElementById('ui-language');
  const helpKey='Supported examples: (x+1)^2=x^2+2x+1, or \\left(x+1\\right)^2=x^2+2\\cdot x+1.';
  if(document.getElementById('equation-help')?.textContent!==COPY[lang][helpKey])problems.push('runtime equation help not translated');
  const sourceValue=document.getElementById('equation')?.value;
  for(const switchTo of ['de','fr','zh-Hans','es','pt-BR','en',lang]){
   selector.value=switchTo;selector.dispatchEvent(new Event('change',{bubbles:true}));
   const expectedRun=COPY[switchTo]['Run exact verification →'];
   if(document.getElementById('run')?.textContent!==expectedRun)problems.push('run-button cross-language bleed '+switchTo);
   if(document.querySelector('#result-area .empty-state h3')?.textContent!==DICTIONARIES[switchTo][expectedIdle.resultTitle])problems.push('result idle switch '+switchTo);
   if(document.getElementById('quality-last')?.textContent!==DICTIONARIES[switchTo][expectedIdle.quality])problems.push('casebook idle switch '+switchTo);
   if(document.querySelector('#citation-results p')?.textContent!==DICTIONARIES[switchTo][expectedIdle.citation])problems.push('citation idle switch '+switchTo);
   if(document.getElementById('equation')?.value!==sourceValue)problems.push('mathematical source changed on language switch');
  }
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

with ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
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
 finally:server.shutdown()
