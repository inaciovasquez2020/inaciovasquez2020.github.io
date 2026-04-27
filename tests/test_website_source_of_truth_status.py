import subprocess
import sys

def test_website_source_of_truth_status_guard_passes():
    subprocess.run(
        [sys.executable, "scripts/check_website_source_of_truth_status.py"],
        check=True,
    )
