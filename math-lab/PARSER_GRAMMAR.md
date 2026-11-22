# Exact-polynomial parser grammar — compatibility contract v0.1

**Scope:** The Math Verification Lab checks only equalities of one-variable integer-coefficient polynomial expressions, in a deliberately restricted shared ASCII/LaTeX subset. The parser is not a general TeX engine or a computer algebra system. The normalization output is a separate machine representation and is not a certificate of manuscript correspondence.

## Input and exponent semantics

The workbench accepts one equality `left = right`. Each side supports decimal integer constants (0 to 1,000,000), variable `x`, parentheses, `+`, `-`, explicit `*`, implicit multiplication such as `2x` and `(x+1)(x-1)`, and nonnegative integer literal exponents (0 to 16). A literal power is applied before unary minus: `-x^2` is `-(x^2)`, while `(-x)^2` squares the negative base. The parser also recognizes `\\cdot`, `\\times`, compatible `\\left(` / `\\right)` delimiters, and TeX braces in exponents.

**Required compatibility rule:** an exponent of two or more decimal digits must be surrounded by braces: write `x^{12}`, not `x^12`. The unbraced form was accepted before the parser-fidelity repair in PR #31; it is now **unsupported**, rather than silently interpreted as the LaTeX twelfth power. One-digit exponents (`x^2`, `x^{2}`) are supported.

ASCII-parenthesized powers such as `x^(12)` are also accepted by this constrained expression parser, but **are not faithful LaTeX exponent notation**. For manuscript transcription and research-grade claim exchange, prefer the braced form `x^{12}`. Neither this exception nor other accepted ASCII syntax implies general TeX compatibility.

| Input | v0.1 verdict | Reason |
|---|---|---|
| `x^2 = x^{2}` | Exact certificate pass | Unambiguous single-digit exponent |
| `x^{12} = x^{12}` | Exact certificate pass | Supported braced multi-digit exponent |
| `x^12 = x^{12}` | Unsupported | Unbraced multi-digit exponent |
| `x^{17} = x^{17}` | Unsupported | Exponent limit of 16 |
| `2x = x+x` | Exact certificate pass | Defined implicit multiplication |
| `2 3 = 6` | Unsupported | Adjacent numeric literals are ambiguous |
| `-x^2 = x^2` | Refuted | Unary minus binds outside the power |
| `(-x)^2 = x^2` | Exact certificate pass | Parenthesized negative base |

Unsupported inputs include chained equations, inequalities, unknown TeX macros, division, general rational expressions, multivariable claims, floating-point literals and negative exponents. Rejecting input is **not a mathematical refutation**.

## Bounds and evidence

Input length is bounded; the parser caps token and AST counts, nesting, intermediate syntactic degree (32), power (16), and integer bit length (8192). Exact polynomial identity evidence uses a degree bound and exact integer evaluations and cross-checks the result against normalized integer coefficients. A resource limit is a refusal or incomplete check, never a mathematical PASS. The Lab does not infer user assumptions or field changes from the manifest.

The source equation, normalized claim, method and exact witnesses must remain distinguishable in exports. The independent Python replay confirms a second implementation's behavior for the normalized claim; it does not independently establish that the source manuscript meant the same expression.

## Release and status boundary

This document describes the candidate parsing policy on **draft PR #31**. Until merged, production may retain the earlier behavior. A separate input-mode selector (ASCII versus full LaTeX) could improve compatibility later, but is **not implemented** by this change. The verified source-of-truth is `math-lab/engine.mjs` plus executable `math-lab/test_*.mjs` tests; this prose is not itself a proof of parser soundness.
