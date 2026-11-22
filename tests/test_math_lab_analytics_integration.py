"""Static regression for the Math Lab Cloudflare page-view integration."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class MathLabAnalyticsIntegration(unittest.TestCase):
    def test_wires_existing_privacy_guarded_loader(self):
        page = (ROOT / "math-lab/index.html").read_text(encoding="utf-8")
        config = (ROOT / "analytics-config.js").read_text(encoding="utf-8")
        loader = (ROOT / "analytics.js").read_text(encoding="utf-8")
        self.assertEqual(page.count('src="../analytics-config.js"'), 1)
        self.assertEqual(page.count('src="../analytics.js"'), 1)
        self.assertLess(page.index('src="../analytics-config.js"'),
                        page.index('src="../analytics.js"'))
        self.assertRegex(config, r'VASQUEZ_ANALYTICS_TOKEN\s*=\s*"[a-fA-F0-9]{32}"')
        self.assertIn("navigator.globalPrivacyControl === true", loader)
        self.assertIn('navigator.doNotTrack === "1"', loader)
        self.assertIn('script[data-cf-beacon]', loader)
        self.assertIn("standard page-view data", page)
        self.assertIn("equation input and manuscripts remain in your browser", page)
        self.assertNotIn("no automatic uploads, cookies, local storage, external services", page)

if __name__ == "__main__":
    unittest.main()
