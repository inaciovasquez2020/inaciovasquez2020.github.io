#!/usr/bin/env python3
"""Browser interaction test in local headless Chrome: translation must not change exact evidence."""
from __future__ import annotations
import contextlib
import os
import html
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlsplit, parse_qs

ROOT=Path(__file__).resolve().parents[1]
@contextlib.contextmanager
def _chdir_compat(path):
    previous = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)

def _working_chrome():
    # Prefer actual macOS bundles over broken Homebrew/shim launchers.
    applications = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        str(Path.home() / 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ]
    commands = ('google-chrome','google-chrome-stable','chromium','chromium-browser')
    for path in applications + [shutil.which(name) for name in commands]:
        if not path or not Path(path).is_file() or not os.access(path, os.X_OK):
            continue
        try:
            probe = subprocess.run([path,'--version'],capture_output=True,text=True,timeout=5)
        except (OSError,subprocess.TimeoutExpired):
            continue
        if probe.returncode==0 and re.search(r'chrome|chromium', probe.stdout + probe.stderr, re.I):
            return path
    return None
CHROME=_working_chrome()
if not CHROME:
    raise SystemExit('BROWSER_INTERACTION := INCOMPLETE_NO_INSTALLED_CHROME')

SCRIPT=r"""
window.addEventListener('load',async()=>{
  const out=document.createElement('pre');out.id='ci-interaction-result';document.body.append(out);
  const $=id=>document.getElementById(id);
  const change=lang=>{const s=$('ui-language');s.value=lang;s.dispatchEvent(new Event('change',{bubbles:true}));};
  const capture=async()=>{
    let blob=null;
    const oldURL=URL.createObjectURL,oldClick=HTMLAnchorElement.prototype.click;
    try{
      URL.createObjectURL=b=>{blob=b;return 'blob:ci-test';};
      HTMLAnchorElement.prototype.click=function(){};
      const button=document.querySelector('#result-area .report-actions button');
      if(!button)throw Error('evidence download button missing');
      button.click();
    }finally{URL.createObjectURL=oldURL;HTMLAnchorElement.prototype.click=oldClick;}
    if(!blob)throw Error('evidence blob missing');
    return await blob.text();
  };
  try{
    // Original Safari reproduction: other/unclassified must explain the disabled controls.
    const method=$('method');
    method.value='manuscript-audit';method.dispatchEvent(new Event('change',{bubbles:true}));
    if($('math-field').value!=='other'||$('math-subcategory').value!=='unclassified')
      throw Error('expected unclassified manuscript setup');
    const helpPrefixes={
      en:'Select a specific mathematical field',es:'Seleccione arriba un campo matemático',
      'pt-BR':'Selecione acima uma área matemática',fr:'Choisissez ci-dessus un domaine mathématique',
      de:'Wählen Sie oben ein konkretes mathematisches','zh-Hans':'请在上方选择具体的数学领域'
    };
    for(const [lang,prefix] of Object.entries(helpPrefixes)){
      change(lang);
      if(!$('field-confirm').disabled||!$('run').disabled)throw Error('unclassified gate absent: '+lang);
      if(!$('field-confirm-summary').textContent.includes(prefix))throw Error('localized guidance absent: '+lang);
      if(!$('run').title||$('run').title==='Review and confirm the field and subcategory before continuing.')
        throw Error('missing localized disabled reason: '+lang);
    }
    change('en');
    $('math-field').value='logic-complexity';$('math-field').dispatchEvent(new Event('change',{bubbles:true}));
    if($('math-subcategory').value!=='formal-proof'||$('field-confirm').disabled)
      throw Error('specific CS field not confirmable');
    const checkboxRect=$('field-confirm').getBoundingClientRect();
    if(Math.abs(checkboxRect.width-18)>1||Math.abs(checkboxRect.height-18)>1)
      throw Error('checkbox size wrong: '+checkboxRect.width+'x'+checkboxRect.height);
    $('field-confirm').click();
    if(!$('field-confirm').checked||$('run').disabled)throw Error('CS confirmation failed');
    $('equation').value='changed';$('equation').dispatchEvent(new Event('input',{bubbles:true}));
    if($('field-confirm').checked||!$('run').disabled)throw Error('source edit failed to invalidate confirmation');
    method.value='exact-polynomial';method.dispatchEvent(new Event('change',{bubbles:true}));
    $('math-field').value='logic-complexity';$('math-field').dispatchEvent(new Event('change',{bubbles:true}));
    $('field-confirm').click();
    if(!$('run').disabled)throw Error('unsupported exact CS verification enabled');
    method.dispatchEvent(new Event('change',{bubbles:true}));
    const originalInput=$('equation').value;
    const originalField=$('math-field').value;
    const originalSub=$('math-subcategory').value;
    $('field-confirm').click();
    if(!$('field-confirm').checked||$('run').disabled)throw Error('confirmation did not enable run');
    $('claim-form').requestSubmit();
    const verdict=()=>document.querySelector('#result-area .verdict-title')?.textContent;
    const status=()=>document.querySelector('#result-area .verdict-top')?.textContent||'';
    if(!status().includes('EXACT_CERTIFICATE_PASS'))throw Error('exact certificate absent');
    const evidence=await capture();
    const initialVerdict=verdict();
    const table=document.querySelector('#result-area .evidence-table')?.textContent;
    if(!table)throw Error('exact evaluation table absent');
    $('check-citations').click();
    const citationEn=$('citation-results').textContent;
    change('pt-BR');
    const pt=verdict(),citationPt=$('citation-results').textContent;
    if(!pt.includes('Identidade estabelecida'))throw Error('Portuguese verdict not translated: '+pt);
    if(citationPt===citationEn)throw Error('citation guidance failed to relocalize');
    if(await capture()!==evidence)throw Error('evidence changed in Portuguese');
    change('es');
    const es=verdict();
    if(!es.includes('Identidad establecida'))throw Error('Spanish verdict not translated: '+es);
    if(await capture()!==evidence)throw Error('evidence changed in Spanish');
    change('en');
    if(verdict()!==initialVerdict)throw Error('English restoration failed');
    if(await capture()!==evidence)throw Error('evidence changed after full round trip');
    if($('equation').value!==originalInput||$('math-field').value!==originalField||$('math-subcategory').value!==originalSub)
      throw Error('mathematical input or classification IDs changed');
    if(!$('field-confirm').checked||$('run').disabled)throw Error('confirmation state lost');
    if(document.querySelector('#result-area .evidence-table')?.textContent!==table)throw Error('exact evaluation table changed');
    // Citation flow after the exact-evidence preservation test: independent of verification.
    $('equation').value='Shannon entropy and mutual information';
    $('equation').dispatchEvent(new Event('input',{bubbles:true}));
    $('check-citations').click();
    const reference=document.querySelector('#citation-results .citation-item');
    if(!reference||!reference.textContent.includes('Shannon'))throw Error('curated citation suggestion absent');
    const citationCheck=reference.querySelector('input[type=checkbox]');
    if(!citationCheck)throw Error('citation checkbox absent');
    citationCheck.click();
    if($('citation-export').disabled)throw Error('citation export disabled after confirmation');
    async function bibtex(){
      let blob=null;
      const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;
      try{URL.createObjectURL=b=>{blob=b;return 'blob:ci-bibtex';};HTMLAnchorElement.prototype.click=function(){};$('citation-export').click();}
      finally{URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
      if(!blob)throw Error('BibTeX export did not produce a blob');
      return blob.text();
    }
    const bib=await bibtex();
    if(!bib.includes('@article{Shannon1948PartI')||!bib.includes('10.1002/j.1538-7305.1948.tb01338.x'))throw Error('BibTeX source metadata wrong');
    for(const lang of ['pt-BR','es','de','zh-Hans','fr','en']){
      change(lang);
      if(!$('citation-results').querySelector('input[type=checkbox]:checked'))throw Error('citation consent lost: '+lang);
      if($('citation-export').disabled)throw Error('citation export disabled: '+lang);
      if(await bibtex()!==bib)throw Error('BibTeX changed: '+lang);
    }
    if($('equation').value!=='Shannon entropy and mutual information')throw Error('citation source changed');
    const drop=$('drop-area');
    const upload=file=>{
      const event=new Event('drop',{bubbles:true,cancelable:true});
      Object.defineProperty(event,'dataTransfer',{value:{files:[file]}});
      drop.dispatchEvent(event);
    };
    upload(new File([new Uint8Array([0xc3,0x28])],'rejected.tex'));
    // File.arrayBuffer resolves asynchronously; require bounded completion, not one tick.
    let blocked=false;
    for(let attempt=0;attempt<100;attempt++){
      if($('source-preflight-status').dataset.state==='BLOCKED'){blocked=true;break;}
      await new Promise(done=>setTimeout(done,20));
    }
    if(!blocked)throw Error('INCOMPLETE_PRECHECK_TIMEOUT: '+$('source-preflight-status').dataset.state);
    if($('source-reference').value!=='Manual entry'||$('equation').value!=='')throw Error('blocked input preserved stale provenance');
    if(!$('run').disabled||$('field-confirm').checked)throw Error('blocked upload left verification enabled');
    $('equation').value='x=x';$('equation').dispatchEvent(new Event('input',{bubbles:true}));
    if($('source-preflight-status').dataset.state!=='MANUAL')throw Error('manual edit failed reset');
    let finish;
    const deferred=new File(['x=x'],'late.tex');
    Object.defineProperty(deferred,'arrayBuffer',{value:()=>new Promise(done=>{finish=done;})});
    upload(deferred);
    if($('source-preflight-status').dataset.state!=='PENDING'||!$('run').disabled)throw Error('pending upload not gated');
    $('equation').value='x=x+0';$('equation').dispatchEvent(new Event('input',{bubbles:true}));
    finish(new TextEncoder().encode('x=x').buffer);
    await new Promise(done=>setTimeout(done,0));
    if($('source-preflight-status').dataset.state!=='MANUAL'||$('equation').value!=='x=x+0')throw Error('stale upload overwritten current text');
    upload(new File(['x=x'],'good.tex'));
    let admitted=false;
    for(let attempt=0;attempt<100;attempt++){
      if($('source-preflight-status').dataset.state==='READY'){admitted=true;break;}
      if($('source-preflight-status').dataset.state==='BLOCKED')break;
      await new Promise(done=>setTimeout(done,20));
    }
    if(!admitted)throw Error('INCOMPLETE_ADMISSION_TIMEOUT: '+$('source-preflight-status').dataset.state);
    if($('source-reference').value!=='good.tex'||$('equation').value!=='x=x')throw Error('valid file admitted with incorrect provenance');
    if($('field-confirm').checked||!$('run').disabled)throw Error('new file reused old consent');
    out.textContent=JSON.stringify({status:'PASS',languages:['en','pt-BR','es','en'],exact_status:'EXACT_CERTIFICATE_PASS',certificate_bytes:evidence.length,bibtex_bytes:bib.length,citation_languages:6});
  }catch(e){out.textContent=JSON.stringify({status:'FAIL',error:String(e.stack||e)});}
});
"""
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):
        super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*_args):
        pass
    def do_GET(self):
        split=urlsplit(self.path)
        if split.path!='/math-lab/index.html' or 'ci-interaction' not in parse_qs(split.query):
            return super().do_GET()
        source=(ROOT/'math-lab/index.html').read_text(encoding='utf-8')
        if source.count('</body>')!=1:
            self.send_error(500,'unexpected document markup')
            return
        output=source.replace('</body>','<script>'+SCRIPT+'</script></body>').encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(output)))
        self.end_headers()
        self.wfile.write(output)

with _chdir_compat(ROOT):
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix='lab-ci-interactive-') as tmp:
            url=f'http://127.0.0.1:{server.server_port}/math-lab/index.html?lang=en&ci-interaction=1'
            cmd=[CHROME,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
                 '--disable-background-networking','--no-first-run',
                 '--virtual-time-budget=15000','--dump-dom',
                 '--window-size=390,844',f'--user-data-dir={tmp}',url]
            try:
                p=subprocess.run(cmd,text=True,capture_output=True,timeout=55)
            except subprocess.TimeoutExpired:
                raise SystemExit('BROWSER_INTERACTION := INCOMPLETE_TIMEOUT')
            if p.returncode:
                raise SystemExit(f'BROWSER_INTERACTION := FAIL_CHROME rc={p.returncode} {p.stderr[-450:]}')
            match=re.search(r'<pre id="ci-interaction-result">(.*?)</pre>',p.stdout,re.S)
            if not match:
                raise SystemExit('BROWSER_INTERACTION := INCOMPLETE_SCRIPT_OR_LOAD; no result marker')
            if not match.group(1).strip():
                raise SystemExit('BROWSER_INTERACTION := INCOMPLETE_SCRIPT_PENDING; empty result marker')
            result=json.loads(html.unescape(match.group(1)))
            if result['status']!='PASS':
                raise SystemExit('BROWSER_INTERACTION := FAIL '+str(result))
            print('BROWSER_INTERACTION := PASS '+json.dumps(result,sort_keys=True))
    finally:
        server.shutdown()
        server.server_close()
