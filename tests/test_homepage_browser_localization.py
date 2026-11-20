#!/usr/bin/env python3
"""Installed-Chrome regression: full homepage locale coverage and interactive round trips."""
from __future__ import annotations

import html
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]

def chrome_path():
    candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        str(Path.home() / 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ] + [shutil.which(n) for n in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser')]
    for candidate in candidates:
        if not candidate or not Path(candidate).is_file() or not os.access(candidate, os.X_OK):
            continue
        try:
            p = subprocess.run([candidate, '--version'], capture_output=True, text=True, timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if p.returncode == 0 and re.search(r'chrome|chromium', p.stdout+p.stderr, re.I):
            return candidate
    raise SystemExit('HOMEPAGE_LOCALIZATION := INCOMPLETE_NO_INSTALLED_CHROME')

SCRIPT = r"""
import { extraRows, translations } from './site-i18n.mjs';
window.addEventListener('load',()=>{
  const out=document.createElement('pre');out.id='homepage-locale-result';
  try {
    const languages=['en','pt-BR','es','zh-Hans','fr','de'];
    const names=new Set(['GitHub','ORCID','Inacio F. Vasquez','Chronos / URF–RR','VASQUEZ RESEARCH']);
    const maps=Object.fromEntries(languages.map((lang,i)=>[lang,new Map([
      ...Object.entries(translations.en).map(([key,value])=>[value,translations[lang][key]]),
      ...extraRows.map(row=>[row[0],row[i]])
    ])]));
    const check=(ok,message)=>{if(!ok)throw Error(message)};
    const change=lang=>{
      const s=document.getElementById('site-language');
      s.value=lang;s.dispatchEvent(new Event('change',{bubbles:true}));
      check(document.documentElement.lang===lang,'document language '+lang);
      check(new URL(location.href).searchParams.get('lang')===lang,'URL locale '+lang);
    };
    check(document.documentElement.lang==='pt-BR','initial query-string language');
    check(document.querySelector('#urf-entropy-update').textContent.includes('Entropia'),'initial Portuguese entropy title');
    check(new Set(extraRows.map(r=>r[0])).size===extraRows.length,'duplicate source strings');
    check(extraRows.every(r=>r.length===6&&r.every(v=>typeof v==='string'&&v.trim())),'missing locale strings');
    const textNodes=()=>{
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const values=[];
      for(let n=w.nextNode();n;n=w.nextNode()){
        if(n.parentElement.closest('script,style,select,.site-language-label,.wordmark'))continue;
        const t=n.nodeValue.trim();if(t)values.push(t);
      }
      return values;
    };
    const attrs=()=>[...document.querySelectorAll('[aria-label],[placeholder]')].flatMap(
      el=>['aria-label','placeholder'].filter(a=>el.hasAttribute(a)).map(a=>el.getAttribute(a))
    );
    const snapshot=()=>[document.title,...textNodes(),...attrs()];
    const cards=[...document.querySelectorAll('.research-card')];
    check(cards.length===6,'unexpected project count');
    change('en');
    const baseline=cards.map(card=>{card.click();return snapshot()});
    const unmapped=[...new Set(baseline.flat().filter(t=>/[A-Za-z]{2,}/.test(t)&&!maps.en.has(t)&&!names.has(t)))];
    check(unmapped.length===0,'unmapped English prose: '+unmapped.join(' | '));
    const sourceLinks=[...document.querySelectorAll('a[href]')].filter(a=>new URL(a.href).origin!==location.origin&&!a.closest('#evidence-panel')).map(a=>a.href);
    check(baseline[0].filter(t=>maps.en.has(t)).length>=70,'coverage guard');
    let checked=0;
    for(const lang of languages){
      change(lang);
      for(let i=0;i<cards.length;i++){
        cards[i].click();
        const actual=snapshot(), expected=baseline[i].map(t=>maps[lang].get(t)??t);
        check(actual.length===expected.length,'node count mismatch '+lang+'/'+i);
        for(let k=0;k<expected.length;k++){
          check(actual[k]===expected[k],lang+'/'+i+' text '+k+': '+JSON.stringify(actual[k])+' expected '+JSON.stringify(expected[k]));
          checked++;
        }
        check(cards[i].getAttribute('aria-pressed')==='true','selection lost '+lang+'/'+i);
        const links=[...document.querySelectorAll('a[href]')];
        for(const link of links){
          const href=link.getAttribute('href'),url=new URL(link.href);
          if(href.startsWith('#')||url.origin!==location.origin||!/^https?:$/.test(url.protocol))continue;
          check(url.searchParams.get('lang')===lang,'stale internal link '+lang+' '+link.href);
        }
        const external=links.filter(a=>new URL(a.href).origin!==location.origin&&!a.closest('#evidence-panel')).map(a=>a.href);
        check(JSON.stringify(external)===JSON.stringify(sourceLinks),'external evidence URL changed '+lang);
      }
    }
    change('en');cards[0].click();
    check(JSON.stringify(snapshot())===JSON.stringify(baseline[0]),'English round trip');
    out.textContent=JSON.stringify({status:'PASS',languages:languages.length,projects:cards.length,checked_text_values:checked,dictionary_rows:extraRows.length});
  }catch(e){out.textContent=JSON.stringify({status:'FAIL',error:String(e.stack||e)});}
  document.body.append(out);
});
"""

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):
        pass
    def do_GET(self):
        url=urlsplit(self.path)
        if url.path!='/index.html' or 'homepage-locale-test' not in parse_qs(url.query):
            return super().do_GET()
        source=(ROOT/'index.html').read_text(encoding='utf-8')
        if source.count('</body>')!=1:
            self.send_error(500,'unexpected homepage markup')
            return
        data=source.replace('</body>','<script type="module">'+SCRIPT+'</script></body>').encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers()
        self.wfile.write(data)

def main():
    chrome=chrome_path()
    with ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with tempfile.TemporaryDirectory(prefix='homepage-locale-') as tmp:
                url=f'http://127.0.0.1:{server.server_port}/index.html?lang=pt-BR&homepage-locale-test=1'
                cmd=[chrome,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
                     '--disable-background-networking','--no-first-run','--virtual-time-budget=12000',
                     '--dump-dom',f'--user-data-dir={tmp}',url]
                try:
                    p=subprocess.run(cmd,text=True,capture_output=True,timeout=55)
                except subprocess.TimeoutExpired:
                    raise SystemExit('HOMEPAGE_LOCALIZATION := INCOMPLETE_TIMEOUT')
                if p.returncode:
                    raise SystemExit(f'HOMEPAGE_LOCALIZATION := FAIL_CHROME {p.returncode} {p.stderr[-500:]}')
                match=re.search(r'<pre id="homepage-locale-result">(.*?)</pre>',p.stdout,re.S)
                if not match:
                    raise SystemExit('HOMEPAGE_LOCALIZATION := INCOMPLETE_NO_RESULT')
                result=json.loads(html.unescape(match.group(1)))
                if result['status']!='PASS':
                    raise SystemExit('HOMEPAGE_LOCALIZATION := FAIL '+str(result))
                print('HOMEPAGE_LOCALIZATION := PASS '+json.dumps(result,sort_keys=True))
        finally:
            server.shutdown()

if __name__=='__main__':
    main()
