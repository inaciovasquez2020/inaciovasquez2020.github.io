# Math Verification Lab — Prior-art comparison and improvement backlog
Date: 2026-11-09 · Status: research note, not a novelty or formal-verification claim.

## Current scope
Local browser exact arithmetic for a bounded univariate integer-polynomial identity subset, explicit counterexamples in scope, structural LaTeX review, reproducible outputs, and verification-status boundaries. Neither the manuscript inventory nor the suggestion system proves theorems.

| Comparable project | Publicly described method | Reusable improvement |
| --- | --- | --- |
| [papercheck](https://github.com/cgarryZA/papercheck) | LaTeX structure extraction, source-exact quote validation, stage-gated issue adjudication | Require every extracted concern to match a source excerpt at a pinned line/span and digest |
| [Google Deep Review / PAT](https://research.google/blog/analyzing-technical-documents-with-deep-review/) | Structured specialist manuscript critique | Multiple focused audit passes with separate provenance; never elevate AI advice to proof |
| [OSVerify](https://osverify.github.io/) | Error proposal separated from independent error validation | Record `SUSPECTED` vs `CONFIRMED` errors; reject fabricated counterexamples |
| [LeanTutor](https://leantutor.org/) | Side-by-side natural-language interpretation and Lean feedback | Show the exact interpreted mathematical statement beside original input |
| [Lean4Web](https://github.com/leanprover-community/lean4web) | Server-side Lean 4 small-snippet playground | Handoff to an external pinned Lean environment rather than pretending GitHub Pages executes Lean |
| [Proof Forum](https://www.proofforum.org/) | Version-specific AI, community, and signed human referee records | Distinguish mechanical check, human review, and Lean-kernel outcomes |
| [ProofNet](https://huggingface.co/datasets/hoskinson-center/proofnet) | Informal/formal theorem-statement benchmark | Evaluate meaning preservation when translating notation |
| [CoCalc](https://doc.cocalc.com/) | Versioned collaborative LaTeX and computation | Keep portable evidence bundles and source hashes |

## Recommended progression
1. **P1 — Source-linked finding contract.** Each flagged excerpt carries exact source span, line, claim ID, SHA-256 and parser profile. Fail closed when source text changes. Test duplicate excerpts, comments, macros, source reflow and unsupported environments.
2. **P1 — Interpretation confirmation.** Show normalized exact polynomial / extracted theorem as a separate inspectable interpretation. Confirm user meaning before checking; invalidate on changes.
3. **P2 — Evidence bundle.** Original input digest, scope, checked interpretation, environment/revision, exact certificate, replay steps, explicitly unresolved obligations.
4. **P2 — Adjudicated audit ledger.** Keep generated `SUSPECTED` findings separate from independently validated mathematical errors. Absence of flags is not proof.
5. **P2 — Dependency graph.** Claim labels and explicit references with source locations; do not infer semantic implications from markup alone.
6. **Now — Public feedback invitation.** GitHub Issue Form category, reproducible question, optional public references, sign-in and publicity warning. It does not accept anonymous submissions or upload work automatically.

**Acceptance:** No changes to source mathematics, Lean claims, certificates, browser-only privacy default, or existing scopes. Findings are comparison-based design hypotheses, not demonstrated new results or claims of exclusivity.
