# URF Evidence Packets vs HepLean / PhysLean Formalization

STATUS := COMPARISON_NOTE_ONLY

## Scope

This note compares two verification-oriented research styles without claiming institutional affiliation, contribution, endorsement, or project integration.

## URF evidence packets

URF evidence packets emphasize frozen artifacts, deterministic reproduction, public hashes, explicit verifier output, and refusal to promote claims past their checked boundary.

Typical object:

```text
claim + artifacts + verifier + hash + boundary statement
The central standard is reproducibility from provided inputs.
HepLean / PhysLean formalization
HepLean and PhysLean emphasize formalizing physics definitions, calculations, and theorems in Lean 4 so that mathematical statements are checked by the Lean kernel.
Reference anchors:
HepLean: https://arxiv.org/abs/2405.08863
Lean 4 physics index notation: https://arxiv.org/abs/2411.07667
Typical object:
definition + theorem statement + Lean proof + kernel check
The central standard is machine-checked formal proof.
Shared verification posture
Both styles reduce reliance on narrative trust. They make claims inspectable through public artifacts, explicit assumptions, and reproducible checks.
Boundary
A URF-style artifact does not become a HepLean or PhysLean contribution merely by discussing Lean or physics. A HepLean or PhysLean relationship requires an actual contribution, citation, issue, pull request, or other public project-level link.
BOUNDARY := comparison only; no HepLean or PhysLean affiliation claimed.
