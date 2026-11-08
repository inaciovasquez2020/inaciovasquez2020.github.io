# AI-assisted LaTeX preparation for the Vasquez Research Math Verification Lab

This file supplies instructions for users and AI assistants preparing LaTeX for the experimental Lab. **It is not a proof certificate or permission to publish source material.**

## Rules for an AI assistant

- Transcribe from the provided source exactly. Preserve mathematical symbols, signs, subscripts, quantifiers, hypotheses, definitions, equation order and proof steps.
- Do not silently correct, reconstruct or invent a mathematical argument. Mark illegible or ambiguous source explicitly as UNCERTAIN and give the source location.
- List proposed editorial changes separately. Never describe inferred steps as quotations from the source.
- Use standard LaTeX environments when appropriate, but do not change the mathematics merely to satisfy the parser.
- Explicitly disclose any omitted, unreadable or unsupported expression. Never assert that all equations were captured without comparing against the original.
- Require human confirmation of subject field and subcategory.
- Do not equate AI approval, LaTeX compilation, manuscript extraction or a certificate for one polynomial equality with verification of a general theorem.

## Copy-paste prompt for an AI assistant

Transcribe the supplied mathematics into LaTeX for source review. Preserve all signs, assumptions, quantifiers, notation, equation order and theorem statements exactly. Do not fill gaps or invent a proof. Use conventional LaTeX environments where possible. Mark unreadable material as UNCERTAIN with the source location. List any assumptions and editorial changes separately. Do not claim correctness, proof verification or peer review. The human user will compare your result to the original before using the Lab.

## What the Lab can currently do

1. Manuscript structure audit: extract supported theorem environments and displayed math, showing selected suspicious source excerpts. The result is NOT_VERIFIED.
2. Exact polynomial identity: check one supported equality with integer coefficients, one variable x, powers at most 16 and degree bound at most 32. It can return EXACT_CERTIFICATE_PASS or REFUTED in that domain. It is not a Lean proof.
3. Heuristic subject selection: suggest a field/subcategory, which the user must inspect and confirm. A classification does not provide verification.
4. Export: evidence and source references may contain private content. Review exported files before sharing.

Source extraction is not exhaustive: unusual delimiters, inline expressions, custom environments, and malformed LaTeX may be omitted. The user must compare the report to the original document.

## Privacy

The current Lab operates in the browser without uploading source. Sending source to an external AI service is a separate act subject to that provider's data practices. Do not share private, unpublished or third-party material without authorization. Never commit private research or secrets to the public website repository.
