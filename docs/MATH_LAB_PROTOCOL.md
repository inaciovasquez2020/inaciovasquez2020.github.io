# Vasquez Research — Math Verification Lab protocol (experimental v0.1)

This tool is a static GitHub Pages scientific interface. It does not execute Python
on GitHub Pages, send manuscripts to AI, train a model, or automatically commit changes.
There are two distinct methods:

- **Exact Algebra**: supported integer-coefficient univariate polynomial equalities
  over the reals, evaluated with browser `BigInt` and checked against independent
  coefficient normalization. The result is a browser-scoped exact certificate,
  *not* a Python or Lean certificate.
- **Manuscript Structure Audit**: reads up to 64 KiB of `.tex`/`.txt` locally,
  inventories theorem/proof environments and displayed mathematics, and marks all
  mathematical claims `NOT_VERIFIED`. Heuristic review questions are not proofs.

## Required claim manifest

Before checking any claim, the user must provide these fields:

```json
{
  "claim_id": "VR-EXAMPLE-001",
  "source_reference": "Manual entry",
  "field": "algebra",
  "subcategory": "polynomial-identities",
  "assumptions": []
}
```

- `claim_id`: unique identifier chosen by the submitter, 1–100 ASCII characters
  (`A-Za-z0-9._-`, starting alphanumeric).
- `source_reference`: explicit, nonempty source link, publication location, DOI,
  or `Manual entry`; manual declarations are **not** independent provenance.
- `field`: required research field selected from the versioned taxonomy.
  The downloadable machine-readable schema is `math-lab/claim-manifest-schema.json`.
- `subcategory`: required choice under that field. The browser enforces the pair.
- The authoritative **method coverage** is computed from the taxonomy and
  selected verification engine, not supplied by the submitter. The only
  `EXACT_SUPPORTED` pair is `algebra / polynomial-identities` with
  `exact-polynomial`. All other exact-algebra pairs return `NO_ENGINE`.
  Manuscript mode returns `STRUCTURAL_ONLY` across all fields; no proof verdict.
  A keyword-based suggestion is heuristic, requires user confirmation, and cannot
  enlarge engine scope. An unsupported field is never forced into the algebra engine.
- `assumptions`: up to 8 brief additional hypotheses, each ≤180 characters.
  The accepted engine scope is always integer-coefficient polynomials in one
  variable over `R`, regardless of user-provided assumptions. Stating a
  hypothesis does not enlarge the engine's capabilities.

Browser verification includes `canonical_claim` in the exact five-key Python
format (`id`, `domain`, `variable`, `lhs`, `rhs`). The original LaTeX input and
source reference are retained only in the **in-memory session casebook**.
No automatic network POST, persistent storage, cookies, or self-updating model.

## Every-use verification improvement loop

For each supported exact claim, the browser performs bounded **metamorphic tests**:

1. Swap equality sides; verdict and earliest counterexample must agree.
2. Add 1 to both sides; verdict and earliest counterexample must agree.
3. Negate both sides; verdict and earliest counterexample must agree.
4. Multiply both sides by 2; verdict and earliest counterexample must agree.
5. For a true identity only, add 1 to the right side and require refutation.

Resource/grammar limitations cause `SKIPPED_RESOURCE_OR_GRAMMAR`, never PASS.
An unexpected comparison produces `REVIEW_REQUIRED`. These are **same-engine
consistency checks**, not independent proofs and not evidence of general AI
learning. They improve coverage only if retained, replayed, reviewed, and then
explicitly accepted into a permanent regression suite.

For unsupported inputs, a bounded excerpt/reason is stored as `REVIEW_REQUIRED`;
for manuscript audits, only structure/count metadata is kept by default and
status is `INCOMPLETE_SOURCE_REQUIRED` / `NOT_VERIFIED`.

The session holds at most 32 cases and refuses overflow rather than silently
removing old cases. It can be cleared by a user action. Cases are only shared
if the user selects **Export review casebook JSON**. The exported file is
untrusted input to the next review step and may contain scientific text.

## Independent Python replay (explicit, offline)

From a checkout of the site and a reviewed `urf-textbook` checkout:

```sh
python3 math-lab/replay_casebook.py /path/to/vasquez-math-lab-review-casebook.json \
  --checker /path/to/urf-textbook/tools/math_audit.py \
  --receipt /path/to/new-replay-receipt.json
```

The replay now requires the five-field manifest and versioned classification;
exact claims must have `algebra / polynomial-identities / EXACT_SUPPORTED`.
A user-entered field remains metadata, not a formal proof classification.

The offline replay checks the original and each reported successful metamorphic
case with the trusted Python checker, rechecks status, degree, witness and
claim-ID binding, independently reconstructs the required metamorphic
transformations (including the negative control), and rejects mislabeled or
substituted probe claims, forgeries and discrepancies. It never writes into
repositories, changes the website, promotes a test, or claims source-to-LaTeX
translation was independently confirmed. Unsupported manuscript cases remain
`NOT_VERIFIED`. Reject a failed replay or resource timeout as INCOMPLETE/FAILED.

**Promotion** requires independent review of source translation and hypotheses,
Python replay PASS, a new regression test reviewed in source control, and CI
on the exact proposed revision. There is no automatic merge or source rewrite.

Canonical backend source: `inaciovasquez2020/urf-textbook`, PR #177. Record its
exact commit and `#print axioms` where Lean is involved; no Lean engine is
connected to this tool. A successful site build is not a theorem proof.

## Public-code disclosure

This website repository is public, and its existing repository-level license
includes MIT terms. A draft PR and an unmerged Git branch are not private.
The exact browser engine is visible client-side; unpublished theorem sources,
confidential manuscripts, and private verification methods must stay in private
repositories. The owner must explicitly approve any release/licensing decision.
CI cannot decide intellectual-property disposition.
