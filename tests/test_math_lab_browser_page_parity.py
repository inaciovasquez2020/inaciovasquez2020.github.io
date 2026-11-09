#!/usr/bin/env python3
"""Rendered-translation source-to-DOM parity, four Math Lab pages × five locales.
No browser installation or external network. Preserve source/code, inspect translated prose.
This is a rendered coverage gate, not an independent linguistic quality certificate.
"""
from __future__ import annotations
import contextlib, html, json, re, shutil, subprocess, tempfile, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT=Path(__file__).resolve().parents[1]
CHROME=next((p for name in ("google-chrome","google-chrome-stable","chromium","chromium-browser")
             if (p:=shutil.which(name))),None)
if not CHROME:raise SystemExit("RENDERED_TRANSLATION_PARITY := INCOMPLETE_NO_INSTALLED_CHROME")
LOCALES=("es","pt-BR","zh-Hans","fr","de")
PAGES=("index.html","how-to.html","ai-latex-guide.html","formal-request.html")

SCRIPT=r"""
window.addEventListener('load',async()=>{
 const output=document.createElement('pre');
 output.id='ci-translation-parity';document.body.append(output);
 try{
  const {DICTIONARIES}=await import('./extended-i18n.mjs');
  const {LOCALES}=await import('./i18n.mjs');
  const lang=new URL(location.href).searchParams.get('lang');
  const dict=DICTIONARIES[lang];
  if(!dict)throw Error('unknown locale '+lang);
  const original=await fetch(location.pathname+'?reference=1',{cache:'no-store'}).then(r=>r.text());
  const dom=new DOMParser().parseFromString(original,'text/html');
  const excluded='textarea,input,code,pre,script,style,select,title,[contenteditable],#result-area,#citation-results,#quality-last';
  const walker=dom.createTreeWalker(dom.body,NodeFilter.SHOW_TEXT);
  const standard=Object.fromEntries(Object.entries(LOCALES.en).map(([key,text])=>[text,LOCALES[lang][key]]));
  const seen=new Set();
  const violations=[];
  const untranslated=[];
  let tested=0;
  for(let node; (node=walker.nextNode());){
    if(!node.parentElement||node.parentElement.closest(excluded))continue;
    const text=node.nodeValue.trim().replaceAll('&amp;','&');
    if(!text||seen.has(text))continue;
    seen.add(text);
    const target=Object.hasOwn(DICTIONARIES.en,text)?dict[text]:standard[text];
    if(target!==undefined){
      if(target===text)continue; // legitimate shared scientific term or cognate
      // Document text includes labels and narration from all static page sections.
      if(!document.body.innerText.includes(target))violations.push({source:text.slice(0,115),expected:target.slice(0,115)});
      tested++;
    }else if(text.length>=30&&/[a-z]{4,}/.test(text)&&text.split(/\s+/).length>=6){
      // Unmapped human language is a coverage omission; preserve mathematical sources.
      if(!/^(?:[A-Z][A-Z\s/ ·\-0-9]+|https?:\/\/)/.test(text))untranslated.push(text.slice(0,180));
    }
  }
  if(document.documentElement.lang!==lang)violations.push({documentLang:document.documentElement.lang});
  output.textContent=JSON.stringify({status:violations.length||untranslated.length?'FAIL':'PASS',
    locale:lang,static_translations_tested:tested,violations,unmapped_prose:untranslated});
 }catch(e){output.textContent=JSON.stringify({status:'FAIL',error:String(e.stack||e)});}
});
"""
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*_):pass
 def do_GET(self):
  url=urlsplit(self.path)
  if 'parity-test' not in parse_qs(url.query):return super().do_GET()
  path=(ROOT/url.path.lstrip('/')).resolve()
  if path not in [(ROOT/'math-lab'/p).resolve() for p in PAGES]:return self.send_error(404)
  text=path.read_text(encoding='utf-8')
  if text.count('</body>')!=1:return self.send_error(500)
  data=text.replace('</body>','<script>'+SCRIPT+'</script></body>').encode('utf-8')
  self.send_response(200)
  self.send_header('Content-Type','text/html; charset=utf-8')
  self.send_header('Content-Length',str(len(data)))
  self.end_headers();self.wfile.write(data)
with contextlib.chdir(ROOT):
 server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with tempfile.TemporaryDirectory(prefix="math-lab-parity-") as folder:
   total=0
   for page in PAGES:
    for lang in LOCALES:
     url=f"http://127.0.0.1:{server.server_port}/math-lab/{page}?parity-test=1&lang={lang}"
     args=[CHROME,"--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
           "--disable-background-networking","--no-first-run","--virtual-time-budget=2200",
           "--dump-dom",f"--user-data-dir={folder}/{page}/{lang}",url]
     try:proc=subprocess.run(args,capture_output=True,text=True,timeout=30)
     except subprocess.TimeoutExpired:raise SystemExit(f"RENDERED_TRANSLATION_PARITY := INCOMPLETE_TIMEOUT {page}/{lang}")
     if proc.returncode:raise SystemExit(f"RENDERED_TRANSLATION_PARITY := CHROME_ERROR {page}/{lang}: {proc.stderr[-300:]}")
     match=re.search(r'<pre id="ci-translation-parity">(.*?)</pre>',proc.stdout,re.S)
     if not match:raise SystemExit(f"RENDERED_TRANSLATION_PARITY := INCOMPLETE_NO_RESULT {page}/{lang}")
     result=json.loads(html.unescape(match.group(1)))
     if result['status']!="PASS":raise SystemExit("RENDERED_TRANSLATION_PARITY := FAIL "+json.dumps({"page":page,**result},ensure_ascii=False))
     total+=result['static_translations_tested']
     print(f"RENDERED_TRANSLATION_{page}_{lang} := PASS checked={result['static_translations_tested']}")
   print(f"RENDERED_TRANSLATION_PARITY := PASS 20 page×locale states; translated_fragments_checked={total}")
 finally:server.shutdown();server.server_close()
