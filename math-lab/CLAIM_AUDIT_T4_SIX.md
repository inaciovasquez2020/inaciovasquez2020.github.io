# Six-coefficient exact characteristic-class model for T4

**Status: research-only, not deployed, not Lean-verified.** This is deliberately separate from the already-green, restricted rank-one checker in draft PR #36. Nothing in this branch modifies that PR, the website UI, or manuscript inference.

## Mathematics

Take the oriented four-torus `T4` and integral cohomology generators `e1,e2,e3,e4` in degree one, normalized by `<e1∧e2∧e3∧e4,[T4]>=+1`. Any topological **complex line bundle** is determined by its integral first Chern class

`c1(L) = n12 e1e2 + n13 e1e3 + n14 e1e4 + n23 e2e3 + n24 e2e4 + n34 e3e4`.

The six integers may be independently nonzero. Since the degree-one generators anticommute and square to zero, `c1(L)^2 = 2 (n12*n34 - n13*n24 + n14*n23) e1e2e3e4`. For a line bundle, `c2(L)=0` and `ch2(L)=c1(L)^2/2`. Hence

- `c2_integral = 0`
- `ch2_integral = n12*n34 - n13*n24 + n14*n23`
- `c1_square_integral = 2*(n12*n34 - n13*n24 + n14*n23)`

These identities are classical topology, not a new discovery or a proof of a physical experiment.

## Restricted-model compatibility

Set `n12=n_x`, `n34=n_y`, and the four crossed coefficients to zero. This reduces to the product model in PR #36.

**Mandatory adversarial example:** `n13=n24=1` and the other coefficients zero gives `ch2_integral=-1`, whereas the two-coefficient restriction would give zero. This exposes the incompleteness of extrapolating the restricted model to general line bundles.

**Rank-two counterexample:** The direct sum of pulled-back line bundles `E=π1*L1 ⊕ π2*L2` is not a line bundle. Its `c2` can be nonzero; this model must not be used for it.

## Strict input and output

```js
import {GENERAL_T4_PROFILE,auditGeneralT4LineBundle} from './claim-audit-t4-six.mjs';
const result=auditGeneralT4LineBundle({
  profile:GENERAL_T4_PROFILE,
  coefficients:{n12:'0',n13:'1',n14:'0',n23:'0',n24:'1',n34:'0'},
  operator:'ch2_integral',
  expected:'0'
});
// result.status is EXACT_MODEL_COUNTEREXAMPLE; result.certificate.computed is '-1'
```

All six coefficients must be supplied as canonical decimal integer strings between -10^9 and 10^9. The `expected` input is a canonical decimal integer string between -6×10^18 and +6×10^18, matching the maximum possible output magnitude. No floating point numbers are used. The engine enforces plain JSON-like records without accessor fields, rejects unknown/missing keys, and uses BigInt. The returned certificate includes all three signed pairwise products and the computed Pfaffian.

A match means only arithmetic agreement **conditional on the asserted line-bundle model**. Neither a paper nor a physical Hamiltonian nor the mapping from a source equation to those coefficients has been verified. The response always marks `formal_kernel_verified:false`, `scientific_claim_verified:false`, `source_binding_verified:false`, `original_publication_audited:false`, and `proof_scope:'EXACT_MODEL_ONLY'`.

## Reproducible gate

```sh
node --test math-lab/test_claim_audit_t4_six.mjs
node --test math-lab/test_*.mjs
```

The tests use a distinct exterior-algebra oracle, exhaustive `3^6=729` six-coefficient fixtures (2,187 operator evaluations), a fixed-seed 1,024-case sweep (3,072 operator evaluations), exact 10^9 boundary values, adversarial malformed inputs, and explicit status boundary checks. Finite checks do not constitute proof of unrestricted claims.

**Promotion gate:** Green full CI and independent external mathematical/security review of this **exact revision** are necessary before merging or connecting any UI. Keep PR #36 and the prior verified checkpoint unchanged.
