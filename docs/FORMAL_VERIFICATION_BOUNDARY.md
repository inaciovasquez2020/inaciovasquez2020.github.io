# Formal Verification Boundary

STATUS := PUBLIC_BOUNDARY_PAGE

This page records the boundary between public independent-research identity, reproducible artifact practice, Lean/formal-verification work, and external physics-formalization projects.

## Public identity anchor

ORCID: `0009-0008-8459-3400`

Public profile sentence:

> Formal verification / Lean 4 / reproducible proof artifacts.

## URF and reproducible evidence artifacts

URF evidence packets are treated as frozen, reproducible artifacts. A claim is not promoted beyond its verified boundary unless the supporting text, code, artifact hashes, verifier outputs, and assumptions are available from public inputs.

## Lean / verification repositories

Lean 4 and related verification repositories are used as machine-checkable proof and boundary infrastructure where applicable. A compiled Lean theorem certifies only the theorem actually stated in the source, under the imports and assumptions visible to the checker.

## SHA-256 ledger policy

SHA-256 hashes identify frozen public artifacts and support reproducibility checks. A hash certifies artifact identity, not mathematical truth by itself. Mathematical or scientific claims still require explicit proof objects, verifier outputs, or clearly stated assumptions.

## HepLean / PhysLean boundary

HepLean and PhysLean are independent Lean formalization efforts for physics. This repository may compare methods with those projects, but it does not claim affiliation, contribution, endorsement, or integration unless an actual public citation, issue, pull request, or committed contribution exists.

Reference anchors:

- HepLean: https://arxiv.org/abs/2405.08863
- Lean 4 physics index notation: https://arxiv.org/abs/2411.07667

## Mainstream-impact boundary

The admissible external-status statement is:

> no public evidence found of mainstream adoption or accepted breakthrough impact.

Stronger claims such as `no public evidence found of mainstream adoption or accepted breakthrough impact` are not used here because they require exhaustive negative evidence.

## Major open-problem boundary

P vs NP, Clay Millennium problems, and similarly open problems remain `BOUNDARY` unless the Lean source proves the actual standard theorem without hidden assumptions, `axiom`, `opaque`, `sorry`, or `admit`.

BOUNDARY := no HepLean or PhysLean affiliation is claimed here.

NEXT_ACTIONS :=
1. Add concrete repository links only after verifying they exist.
2. Add public SHA-256 ledger URL only if this repository publishes one.
3. Keep open-problem claims under BOUNDARY unless a standard hidden-assumption-free Lean proof exists.
