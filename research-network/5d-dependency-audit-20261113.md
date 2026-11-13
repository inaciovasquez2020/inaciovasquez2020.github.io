# 5D research dependency audit — primary, supporting, background

**Date:** 2026-11-13  
**Status:** DECISION / RESEARCH PRIORITIZATION; **NOT** a proof of five-dimensional physics.  
**Source:** the 21-public-repository Spiderweb (32 documented/proposed edges); public PRs and README/status surfaces checked on 2026-11-13. No private project names or records are included.

## Decision

Not all research repositories must be directly connected to the proposed 5D geometry. Preserve all seven existing *related* 5D links for historical navigation, but distinguish **two primary implementation dependencies**, **one optional mathematical support link**, and **four background analogies/applications**. A background connection is not a failed project, a rejected theorem, or a dependency for 5D model closure.

| Priority | Repository | Justification | Current boundary |
|---|---|---|---|
| **Primary — action/model** | [dfm-mkc-cosmology](https://github.com/inaciovasquez2020/dfm-mkc-cosmology) | Has explicit 5D expanding-circle Einstein solution and reduced-frame analysis ([#335](https://github.com/inaciovasquez2020/dfm-mkc-cosmology/pull/335)) | The example does not stabilize the radion; no phenomenologically complete 5D action or distinctive prediction |
| **Primary — 4D event target** | [chronos-urf-rr](https://github.com/inaciovasquez2020/chronos-urf-rr) | Candidate event-first 4D observational semantics, with independently bounded S3 holonomy collision ([#1357](https://github.com/inaciovasquez2020/chronos-urf-rr/pull/1357)) | No coefficient-matched reduction from the 5D parent to the event observables |
| **Supporting — optional algebra** | [urf-core](https://github.com/inaciovasquez2020/urf-core) | Exact finite S3 orbit information loss and decoder limits ([#594](https://github.com/inaciovasquez2020/urf-core/pull/594)) | A finite local-class collision does not create an extra physical dimension |
| **Background — topology** | [poincare-new-derivation](https://github.com/inaciovasquez2020/poincare-new-derivation) | Topological rigidity analogy only | Independent global descent/recognition remains OPEN; not needed for the chosen 5D reduction |
| **Background — logic** | [cslib-fmt](https://github.com/inaciovasquez2020/cslib-fmt) | Locality/indistinguishability analogy | No semantics-preserving finite-model-theory-to-geometric-locality theorem |
| **Background — application** | [biological-friction-framework](https://github.com/inaciovasquez2020/biological-friction-framework) | Five-coordinate toy states, 5-sphere face counts, metric identifiability limits | Neither biological mechanism nor fifth physical dimension follows |
| **Background — measurement schema** | [darkness-region-dynamics-null-test](https://github.com/inaciovasquez2020/darkness-region-dynamics-null-test) | General apparatus null-test discipline | The existing photon-flux/darkness null test is **not** a 5D-specific observable and cannot serve as the model's distinguishing physical test |

The **primary** category describes a *chosen project architecture*, not an assertion that these are the only logically sufficient/necessary components for all 5D theories.

## Next repository-to-repository bridge (one active target)

**Target:** strengthen the already-present [Chronos ↔ Cosmology connection](https://github.com/inaciovasquez2020/chronos-urf-rr) (Spiderweb edge `e19`); do **not** create another speculative direct 5D edge.

**Exact missing object:** a source-pinned, symbol-by-symbol coefficient dictionary between:

1. a declared five-dimensional parent metric/action, with its circle radius and radion dynamics;
2. the resulting four-dimensional Einstein-frame gravitational/scalar/gauge equations, with explicit dimensional reduction and boundary assumptions;
3. a specific Chronos event-first observable and its sampling/continuum limit;
4. a matched four-dimensional comparator with the same measured variables and uncertainty model.

**Acceptance:** equation-by-equation residuals must vanish at the stated assumptions; the radion stabilization condition and stress-energy conservation must be checked; one measurable statistic must be predicted differently from a suitable 4D model. Counterexamples and degeneracies count as substantive negative results. An absence of any such discriminant leaves **PHYSICAL_5D := OPEN**.

**Most economical immediate test:** inspect the #335 expanding-circle example and attempt the Chronos observable map *before* changing either repository. The verified unstabilized radion is a useful obstruction; do not force an artificial stabilization claim.

## Scope and audit

- 21 public repository nodes; 32 total graph edges. **Unchanged.**
- Seven preserved 5D-related candidate edges: **2 primary + 1 supporting + 4 background**. The background links remain visible.
- These category numbers measure a research decision, **not** proof coverage.
- No general Poincaré descent, emergent spacetime, physical extra dimension, empirical anomaly, clinical efficacy or universal cross-domain transfer is asserted.
- Do not count private research repositories in the public inventory. A private source can be independently audited without publicly naming or linking it.
- PR merge/CI is evidence only for its particular checked artifact; do not substitute website publication for a theorem, Lean axiom audit, or physical experiment.
