#!/usr/bin/env python3
"""Real Chromium/Chrome DOM smoke test; no browser downloads or proof-status inference."""
from __future__ import annotations
import contextlib
import html
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {
    "en": ("Algebra", "Polynomial identities over R", "CONFIRM FIELD AND SUBCATEGORY"),
    "es": ("Álgebra", "Identidades polinómicas sobre R", "CONFIRMAR CAMPO Y SUBCATEGORÍA"),
    "pt-BR": ("Álgebra", "Identidades polinomiais sobre R", "CONFIRMAR ÁREA E SUBCATEGORIA"),
    "zh-Hans": ("代数", "R 上的多项式恒等式", "确认领域和子类别"),
    "fr": ("Algèbre", "Identités polynomiales sur R", "CONFIRMER LE DOMAINE ET LA SOUS-CATÉGORIE"),
    "de": ("Algebra", "Polynomidentitäten über R", "FACHGEBIET UND UNTERKATEGORIE BESTÄTIGEN"),
}
CHROME = next((p for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")
               if (p := shutil.which(name))), None)
if CHROME is None:
    raise SystemExit("BROWSER_SMOKE := INCOMPLETE_NO_INSTALLED_CHROME")

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def fragment(dom: str, id_value: str) -> str:
    match = re.search(r'<[^>]+\bid="' + re.escape(id_value) + r'"[^>]*>(.*?)</[^>]+>', dom, re.S)
    if not match:
        raise AssertionError(f"missing rendered node {id_value}")
    return html.unescape(re.sub(r'<[^>]*>', "", match.group(1))).strip()

with contextlib.chdir(ROOT):
    server = ThreadingHTTPServer(("127.0.0.1", 0),
                                 lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="math-lab-chrome-") as tmp:
            for lang, (field, subcategory, confirmation) in LANGUAGES.items():
                userdir = str(Path(tmp) / lang)
                url = f"http://127.0.0.1:{server.server_port}/math-lab/index.html?lang={lang}"
                cmd = [CHROME, "--headless", "--no-sandbox", "--disable-gpu",
                       "--disable-dev-shm-usage", "--disable-background-networking",
                       "--no-first-run", "--no-default-browser-check",
                       "--virtual-time-budget=2500", "--dump-dom",
                       f"--user-data-dir={userdir}", url]
                try:
                    p = subprocess.run(cmd, text=True, capture_output=True, timeout=30, check=False)
                except subprocess.TimeoutExpired:
                    raise SystemExit(f"BROWSER_SMOKE := INCOMPLETE_TIMEOUT lang={lang}")
                if p.returncode != 0:
                    raise SystemExit(f"BROWSER_SMOKE := FAIL_CHROME lang={lang} rc={p.returncode} stderr={p.stderr[-700:]}")
                dom = p.stdout
                if not re.search(r'<html\b[^>]*\blang="' + re.escape(lang) + '"', dom, re.S):
                    raise AssertionError(f"document language not set: {lang}")
                if fragment(dom, "field-confirm-title") != confirmation:
                    raise AssertionError(f"confirmation not translated: {lang}: {fragment(dom, 'field-confirm-title')!r}")
                field_html = re.search(r'<select[^>]*id="math-field"[^>]*>(.*?)</select>', dom, re.S)
                sub_html = re.search(r'<select[^>]*id="math-subcategory"[^>]*>(.*?)</select>', dom, re.S)
                if not field_html or not sub_html:
                    raise AssertionError(f"taxonomy selector absent: {lang}")
                if field not in html.unescape(field_html.group(1)):
                    raise AssertionError(f"field option not translated: {lang}")
                if subcategory not in html.unescape(sub_html.group(1)):
                    raise AssertionError(f"subcategory option not translated: {lang}")
                if "(x+1)^2" not in dom:
                    raise AssertionError(f"mathematical source modified: {lang}")
                print(f"BROWSER_LOCALE_{lang} := PASS")
        print("BROWSER_TRANSLATION_SMOKE := PASS (initial render, 6 languages)")
    finally:
        server.shutdown()
        server.server_close()
