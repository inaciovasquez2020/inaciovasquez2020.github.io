# Exact claim audit: product-torus line bundle (research v0.1)

This module is a **separate, bounded mathematical model checker**, not a general scientific/LaTeX proof engine. It has no website UI, automatic manuscript claim extraction, or filesystem/network operations.

## Mathematical semantics
Choose an oriented product of 2-tori and degree-2 classes `a,b` with `a^2=b^2=0`, `<ab,[T^4]>=1`.
For an external tensor-product **complex line bundle** with `c1=n_x*a+n_y*b`, the exact truncated cohomology ring gives:
- `c2_integral=0` (rank-one bundle)
- `ch2_integral=n_x*n_y` (degree-four component of Chern character)
- `c1_square_integral=2*n_x*n_y`

All values are decimal **strings** and are evaluated using exact BigInt arithmetic. The two input Chern numbers are bounded by absolute value 10^9 each. The submitted expected value is bounded by absolute value 2 × 10^18, matching the largest possible magnitude of the computed outputs.

## Example
```js
import {CLAIM_AUDIT_PROFILE,auditTorusLineBundle} from './claim-audit-torus.mjs';
const result=auditTorusLineBundle({
 profile:CLAIM_AUDIT_PROFILE, n_x:'1', n_y:'1',
 operator:'ch2_integral', expected:'0'
});
console.log(result.status); // EXACT_MODEL_COUNTEREXAMPLE
console.log(result.certificate.computed); // 1
```

This refutes the submitted assertion **within the explicitly declared model**, not an unnamed scientific paper. Source attribution, physical band rank, non-Abelian gauge conventions, gap assumptions, and experimental response remain independently OPEN. The output sets `formal_kernel_verified:false`, `experimental_claim_verified:false`, and `original_publication_audited:false`. `EXACT_MODEL_MATCH` means arithmetic agreement under the stated ring assumptions, not unrestricted theorem verification. No external data is uploaded.

## Regression gate
```bash
node --test math-lab/test_claim_audit_torus.mjs
node --test math-lab/test_*.mjs
```
The automated suite also tests deliberate false statements, signs, zeros, full 9x9 integer sweeps, large multiplication, malformed input, unknown operators, reproducibility, and no proof-status promotion.

**Integration guard:** Do not label this method as a manuscript verification engine or enable it as an automatic user-facing method without an independent mathematical and security review. In particular, it is *not* an audit of the original 2018 ETH/Nature publications.
