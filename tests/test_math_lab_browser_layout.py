#!/usr/bin/env python3
"""Rendered layout checks at narrow and wide browser windows, with actual viewport receipts.
No dependencies or Chrome downloads. Does NOT establish human visual quality."""
from __future__ import annotations
import contextlib, html, json, re, shutil, subprocess, tempfile, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT=Path(__file__).resolve().parents[1]
CHROME=next((p for n in ('google-chrome','google-chrome-stable','chromium','chromium-browser')
             if (p:=shutil.which(n))),None)
if not CHROME:
    raise SystemExit('BROWSER_LAYOUT := INCOMPLETE_NO_INSTALLED_CHROME')
LANGUAGES=('en','es','pt-BR','zh-Hans','fr','de')
WINDOWS=(('narrow',500,900),('wide',1280,900))

SCRIPT=r"""
window.addEventListener('load',()=>{
 const output=document.createElement('pre');output.id='layout-test-output';document.body.append(output);
 try{
   const rect=el=>el.getBoundingClientRect();
   const $=id=>document.getElementById(id);
   const nodes=['ui-language','method','math-field','math-subcategory','equation','run','field-confirm-title'];
   const problems=[];
   const width=document.documentElement.clientWidth;
   const docWidth=document.documentElement.scrollWidth;
   if(docWidth>width+2)problems.push('horizontal document overflow '+docWidth+' / '+width);
   for(const id of nodes){
     const el=$(id);
     if(!el){problems.push(id+' missing');continue;}
     const r=rect(el);
     if(r.width<1||r.height<1)problems.push(id+' not displayed');
     if(r.left< -2||r.right>width+2)problems.push(id+' outside viewport: '+r.left+'/'+r.right);
   }
   const main=document.querySelector('main');
   if(!main)problems.push('main missing');
   const selected=$('ui-language').value;
   if(selected!==new URL(location.href).searchParams.get('lang'))problems.push('incorrect language '+selected);
   output.textContent=JSON.stringify({status:problems.length?'FAIL':'PASS',language:selected,
     viewport:innerWidth,document_width:docWidth,client_width:width,problems});
 }catch(error){output.textContent=JSON.stringify({status:'FAIL',problems:[String(error.stack||error)]});}
});
"""

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*_args):pass
    def do_GET(self):
        info=urlsplit(self.path)
        if 'layout-check' not in parse_qs(info.query):return super().do_GET()
        path=(ROOT/info.path.lstrip('/')).resolve()
        if path!=(ROOT/'math-lab/index.html').resolve():return self.send_error(404)
        source=path.read_text(encoding='utf-8')
        if source.count('</body>')!=1:return self.send_error(500)
        content=source.replace('</body>','<script>'+SCRIPT+'</script></body>').encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(content)))
        self.end_headers();self.wfile.write(content)

with contextlib.chdir(ROOT):
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix='lab-layout-') as temp:
            for label,target_width,target_height in WINDOWS:
                for lang in LANGUAGES:
                    url=f'http://127.0.0.1:{server.server_port}/math-lab/index.html?layout-check=1&lang={lang}'
                    profile=str(Path(temp)/label/lang)
                    args=[CHROME,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
                          '--disable-background-networking','--no-first-run',
                          '--virtual-time-budget=2200','--dump-dom',
                          f'--window-size={target_width},{target_height}',
                          f'--user-data-dir={profile}',url]
                    try:run=subprocess.run(args,capture_output=True,text=True,timeout=30)
                    except subprocess.TimeoutExpired:raise SystemExit(f'BROWSER_LAYOUT := INCOMPLETE_TIMEOUT {label}/{lang}')
                    if run.returncode:raise SystemExit(f'BROWSER_LAYOUT := CHROME_FAILED {label}/{lang} {run.stderr[-350:]}')
                    found=re.search(r'<pre id="layout-test-output">(.*?)</pre>',run.stdout,re.S)
                    if not found:raise SystemExit(f'BROWSER_LAYOUT := INCOMPLETE_NO_RESULT {label}/{lang}')
                    result=json.loads(html.unescape(found.group(1)))
                    if result['status']!='PASS':raise SystemExit(f'BROWSER_LAYOUT := FAIL {label}/{lang} {result}')
                    # Chrome headless can impose a minimum window width. Record the *actual* width.
                    if label=='wide' and result['viewport']<1100:
                        raise SystemExit(f'BROWSER_LAYOUT := INCOMPLETE_BAD_WIDE_VIEWPORT {result}')
                    if label=='narrow' and result['viewport']>550:
                        raise SystemExit(f'BROWSER_LAYOUT := INCOMPLETE_BAD_NARROW_VIEWPORT {result}')
                    print(f'BROWSER_LAYOUT_{label}_{lang} := PASS viewport={result["viewport"]} document={result["document_width"]}')
            print('BROWSER_LAYOUT := PASS 12 desktop/narrow-window renderings; phone-sized 390px NOT_RUN')
    finally:server.shutdown();server.server_close()
