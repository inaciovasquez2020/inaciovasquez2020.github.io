# Exact local metric audit

Scope: ds² = −α(r) dt² + dr² + r² dΩ², r>0, α>0, twice differentiable lapse, signature −+++, Einstein equations with no explicit cosmological constant term, c=1. User-supplied rational jets are not checked against any manuscript or global function.

With N=√α, the flat spatial static lapse formulas give 8πGρ=0, 8πGp_r=2N′/(rN), and 8πGp_t=(N″+N′/r)/N. Substituting N yields the formulas in the module. The NEC is satisfied at the point iff both principal pressures are nonnegative because ρ=0. The sign of n′ for n=α^(−1/2) is the opposite of α′. This does not calculate global scattering or establish a physical optical medium.

Run node --test math-lab/test_metric_audit.mjs. The 3,025 cases are finite integer jets with 1≤r,α≤5 and −5≤α′,α″≤5, checked using exact sign numerators and lapse scaling. Finite tests are not formal proof. Browser E2E and deployed-site tests remain separate. No manuscript text is included. The standalone English-language interface does not change the existing manuscript parser or taxonomy.
