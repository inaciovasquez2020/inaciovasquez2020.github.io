# Experimental exact bivariate polynomial checker

Status: **EXPERIMENTAL / NOT WEBSITE-INTEGRATED**.

This directory is independent of `math-lab/engine.mjs`, `ui.mjs`,
the public website, and the current univariate Python replay contract.

## Exact scope
- Ring: integer-coefficient polynomials `Z[x,y]` with standard equality.
- Grammar: decimal nonnegative integer literals; `x`, `y`; `+`, `-`, `*`,
  parentheses, and literal nonnegative exponents using `^`. No implicit
  multiplication, LaTeX macros, division, comparisons, or user-supplied code.
- Syntactic bidegree no more than (8,8), each exponent at most 8,
  expression side no more than 512 characters, AST/token and integer-bit caps.
- Exact sparse coefficient calculation independently cross-checked by
  evaluations at all grid points `(i,j)`, `0 <= i <= dx`, `0 <= j <= dy`,
  stopping at the first exact counterexample.

## Certificate rationale
A polynomial over an integral domain of bidegree bounded by (dx,dy)
vanishes identically if and only if it vanishes at the full grid formed
by dx+1 and dy+1 distinct integers. This follows by applying the
univariate root bound successively in x and y. No floating point is used.

## Validation and limits
Run `node --test math-lab/experimental/test_bivariate.mjs` from repository root.

The experimental module was locally tested with 7/7 test groups,
including 250 generated identities and 250 mutated false identities.
An earlier independent SymPy 1.14.0 reference audit reported 300 matches.
Neither result constitutes Lean kernel verification.

Reports now embed the submitted equation and can be independently replayed
with the standard-library Python checker:

```sh
node --test math-lab/experimental/test_bivariate.mjs
python3 -m unittest discover -s math-lab/experimental -p 'test_replay.py' -v
python3 math-lab/experimental/replay_bivariate.py report.json
```

The Python checker independently reconstructs polynomial coefficients, degree
bounds and exact counterexample data and rejects altered report fields.
A replay result is `REPLAY_PASS` only for a report consistent with its
embedded equation; **this does not authenticate the original source or turn
a browser result into a Lean proof**. The experimental output is still not
connected to the public browser interface, its casebook, or univariate replay.
The source and result must be archived together by the operator.

Do **not** feed these reports to the univariate casebook/Python replay.
The `website_integrated` field must remain false until separate browser
validation and review. No public feature is advertised.


No theorem outside the supported polynomial ring is established.
