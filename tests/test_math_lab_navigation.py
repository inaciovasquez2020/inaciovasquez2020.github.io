"""Static website integration checks, no theorem-status inference."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
ROOT = Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.assets=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag=='a' and d.get('href'): self.links.append(d['href'])
        if tag in ('script','link'):
            val=d.get('src' if tag=='script' else 'href')
            if val: self.assets.append(val)
def test_math_lab_navigation():
    index=(ROOT/'index.html').read_text(encoding='utf-8')
    assert 'math-lab/' in index
    page=(ROOT/'math-lab/index.html').read_text(encoding='utf-8')
    for mark in ('VASQUEZ RESEARCH','id="claim-id"','id="source-reference"',
                 'id="assumptions"','id="math-field"','id="math-subcategory"','id="coverage-status"','id="quality-export"','id="quality-clear"',
                 'Manuscript structure audit','Exact polynomial identity'):
        assert mark in page, mark
    parser=Parser();parser.feed(page)
    for ref in parser.links+parser.assets:
        x=urlsplit(ref)
        if x.scheme or x.netloc or ref.startswith('//') or not x.path: continue
        dest=(ROOT/'math-lab'/x.path).resolve()
        assert dest.is_relative_to(ROOT.resolve()),ref
        assert dest.is_file(),ref
    assert (ROOT/'docs/MATH_LAB_PROTOCOL.md').is_file()
    assert (ROOT/'math-lab/claim-manifest-schema.json').is_file()
    for name in ('engine.mjs','improvement.mjs','manuscript.mjs','taxonomy.mjs','ui.mjs'):
        code=(ROOT/'math-lab'/name).read_text(encoding='utf-8')
        assert 'eval(' not in code and 'new Function(' not in code,name
        assert 'fetch(' not in code,name
    assert 'NOT_APPROVED' in (ROOT/'math-lab/improvement.mjs').read_text(encoding='utf-8')
    assert 'NOT_VERIFIED' in (ROOT/'math-lab/manuscript.mjs').read_text(encoding='utf-8')
    assert 'href="how-to.html"' in page
    assert 'href="ai-latex-guide.html"' in page
    assert 'href="formal-request.html"' in page
    assert (ROOT/'math-lab/formal-request.html').is_file()
    assert 'id="open-tour"' in page
    assert 'id="lab-tour"' in page
    assert page.count('data-tour-step ') == 5
    assert (ROOT/'math-lab/AI_LATEX_README.md').is_file()
    assert 'id="evidence-method-tag"' in page
    assert 'id="classification-origin"' in page
    assert 'id="field-confirm"' in page
    assert 'FIELD CONFIRMATION REQUIRED' in page
    ui=(ROOT/'math-lab/ui.mjs').read_text(encoding='utf-8')
    assert 'EQUATION EXTRACTION COVERAGE' in ui
    assert 'SOURCE LINE ' in ui
    assert 'if(!refreshFieldConfirmation())' in ui
    assert "$('source-reference').value,$('assumptions').value,sourceName" in ui
    assert 'confirmed_by_user:true' in ui
    assert 'Previous evidence cleared' in ui
    assert 'EXTRACTION REVIEW REQUIRED' in ui
    assert 'Input and interpretation warning' in page
    assert 'AUTO-SUGGESTED (UNCONFIRMED)' in ui
    assert 'METHOD APPLIED' in ui
    assert 'UNCERTIFIED' in ui
    guide=(ROOT/'math-lab/how-to.html').read_text(encoding='utf-8')
    for phrase in ('EXACT_CERTIFICATE_PASS','REFUTED','NOT_VERIFIED','STRUCTURAL_ONLY','NO_ENGINE','REGRESSION_CANDIDATE','INCOMPLETE_SOURCE_REQUIRED','Manuscript structure audit','Exact polynomial identity','64 KiB'):
        assert phrase in guide, phrase
    guide_links=Parser()
    guide_links.feed(guide)
    for ref in guide_links.links+guide_links.assets:
        x=urlsplit(ref)
        if x.scheme or x.netloc or ref.startswith('//') or not x.path: continue
        dest=(ROOT/'math-lab'/x.path).resolve()
        assert dest.is_relative_to(ROOT.resolve()),ref
        assert dest.is_file(),ref

if __name__=='__main__':
    test_math_lab_navigation()
    print('MATH_LAB_NAVIGATION := PASS')
