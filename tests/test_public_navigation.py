"""Static regression checks for the public research website navigation.

No network access and no theorem-status inference.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "contact.html", "publications.html", "vasquez-index/index.html")
STYLES = ("research.css", "research-pages.css")
EXPECTED = ("research", "verification", "publications", "contact")


class ExtractLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.assets = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag in ("link", "script"):
            key = "href" if tag == "link" else "src"
            if attrs.get(key):
                self.assets.append(attrs[key])


def test_subpages_have_consistent_public_navigation():
    for name in PAGES:
        data = (ROOT / name).read_text(encoding="utf-8")
        assert "VASQUEZ" in data.upper(), name
        assert "research.css" in data, name
        if name != "index.html":
            assert "research-pages.css" in data, name
        assert "publications.html" in data, name
        assert "contact.html" in data, name


def test_local_links_and_assets_resolve():
    for name in PAGES:
        page = ROOT / name
        parser = ExtractLinks()
        parser.feed(page.read_text(encoding="utf-8"))
        for url in parser.links + parser.assets:
            parsed = urlsplit(url)
            if parsed.scheme or url.startswith("//") or parsed.path == "":
                continue
            target = (page.parent / unquote(parsed.path)).resolve()
            assert target.is_relative_to(ROOT.resolve()), (name, url)
            assert target.is_file(), (name, url)


def test_pages_dont_link_to_private_research():
    private = (
        "/urf-open-review-ledger",
        "/flagship-lean",
        "/urf-axioms",
        "/rh-archimedean-kernel-rigidity",
        "/pachner-invariant",
        "/cycle-local-rigidity",
        "/final-wall-fo-k-locality",
    )
    for name in PAGES:
        parser = ExtractLinks()
        parser.feed((ROOT / name).read_text(encoding="utf-8"))
        for url in parser.links:
            assert not any(
                url.startswith("https://github.com/inaciovasquez2020" + fragment)
                for fragment in private
            ), (name, url)


def test_unchanged_source_of_truth_bounded():
    text = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "open" in text.lower()
    assert (ROOT / "docs/FORMAL_VERIFICATION_BOUNDARY.html").is_file()
