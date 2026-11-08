# Vasquez Research — Math Verification Lab (isolated website integration candidate)

**Not deployed.** Intended destination: `inaciovasquez2020/inaciovasquez2020.github.io/math-lab/`.
Keep the GitHub Pages root on its existing site and add a Research Tools link in
its navigation only after reviewing an isolated website PR.

This package contains a static Math Verification Lab for GitHub Pages, including:

- **Exact Algebra:** exact BigInt polynomial-identity checking in one variable x.
  Shows a mathematical certificate or an exact counterexample and exports the
  normalized Python checker claim for independent replay. It is not a Lean proof.
- **Manuscript Structure Audit:** extracts named theorem environments, counts
  proof blocks, inventories equations and raises heuristic review questions.
  It does **not** prove or refute theorems, call an LLM, or upload source.
- **Versioned field/subcategory taxonomy:** compulsory user classification and a
  capability indicator that distinguishes `EXACT_SUPPORTED`, `STRUCTURAL_ONLY`,
  and `NO_ENGINE`. Keyword category suggestions are heuristic, not proof.
- **Verification Improvement Loop:** a mandatory 5-field claim manifest and
  per-use metamorphic tests, one-way in-memory casebook, voluntary JSON export,
  and a separate Python replay tool. This does not train or rewrite the checker.

## How to run

From this package root:

```sh
node --test math-lab/test_*.mjs
python3 -m py_compile math-lab/replay_casebook.py
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/math-lab/` in a browser.

After exporting a casebook, replay against the reviewed `urf-textbook` checker:

```sh
python3 math-lab/replay_casebook.py /path/to/review-casebook.json \
  --checker /path/to/urf-textbook/tools/math_audit.py \
  --receipt /path/to/new-replay-receipt.json
```

Read `docs/MATH_LAB_PROTOCOL.md` for the mandatory format, trust boundaries,
resource limits, evidence semantics and promotion gates.

## Validation performed for this candidate

- JavaScript unit tests: 23 / 23 PASS (including 400 randomized statements and
  four metamorphic checks plus a negative control on supported true identities).
- Offline Python replay tests: 8 / 8 PASS against the current reviewed
  `urf-textbook` checker at Git blob `edf3690bbc6156f62433487baec836e69bf5ac25`.
- Cross-language replay: four classified exact claims and their metamorphic
  candidate claims PASS; one generic synthetic manuscript record remains `NOT_VERIFIED`.
- Browser validation: a Chromium offline DOM interaction test passed (identity,
  refutation, download, unsupported-category restriction, manuscript status,
  appearance switching). Direct HTTP module navigation was blocked by the
  sandbox policy, so the deployed-site E2E test remains NOT_RUN.
- GitHub Pages publication: NOT RUN. `main` and live site were not modified.

## PR integration checklist

1. Inspect the exact remote website HEAD, branch/PR state, and local working tree
   before creating/merging an isolated PR.
2. Place `math-lab/`, `docs/MATH_LAB_PROTOCOL.md`, and
   `tests/test_math_lab_navigation.py` in the website repository.
3. Add `math-lab/` to the homepage navigation and keep external status disclaimers.
4. Add these CI commands *after* Node setup to the site's existing
   `.github/workflows/verify.yml`:

   ```sh
   node --test math-lab/test_*.mjs
   python3 tests/test_math_lab_navigation.py
   python3 -m py_compile math-lab/replay_casebook.py
   ```

5. Validate the exact branch revision in a browser, run public link/privacy tests,
   inspect source diff, and request approval before merging.

The published site should retain a static interface. The Python replay is an
**offline audit gate**, not a server endpoint or proof service.

## Privacy and public-source boundary

The GitHub Pages repository is public. Browser-delivered JavaScript is public and
can be inspected or copied. Do not put private checker implementations, unpublished
manuscripts, secret tokens or proprietary research into this repository or its
PR branches. The manuscript fixture uses deliberately synthetic mathematics.
Review the existing repository MIT license with the owner before publishing
new tool code; CI success does not grant license or publication approval.
