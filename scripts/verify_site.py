from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]

required = [
    "README.md",
    "CITATION.cff",
    "index.html",
    "publications.html",
    "contact.html",
    "styles.css",
]

missing = [p for p in required if not (root / p).exists()]
if missing:
    print({"valid": False, "missing": missing})
    sys.exit(1)

index = (root / "index.html").read_text(encoding="utf-8", errors="ignore").lower()
readme = (root / "README.md").read_text(encoding="utf-8", errors="ignore").lower()

checks = {
    "index_mentions_inacio_or_vasquez": ("inacio" in index) or ("vasquez" in index),
    "readme_mentions_github_pages_site": ("github pages" in readme) or ("root site" in readme) or ("research portal" in readme),
}

failed = [k for k, v in checks.items() if not v]
if failed:
    print({"valid": False, "failed_checks": failed})
    sys.exit(1)

print({"valid": True, "checked": required, "checks": checks})
