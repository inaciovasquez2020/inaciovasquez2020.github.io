/**
 * Structural LaTeX manuscript inventory. No theorem prover, no LLM, no source upload.
 * This parser does not execute LaTeX or establish theorem correctness.
 */
export const MANUSCRIPT_SCHEMA = 'vasquez.math-lab.manuscript-structure.v0.1';
const LIMIT = 65536;
const CLAIM_TYPES = new Set(['definition', 'lemma', 'theorem', 'corollary', 'proposition']);
function lineno(text, position) { return text.slice(0, position).split('\n').length; }
function concise(s, max = 340) { return s.replace(/\s+/g, ' ').trim().slice(0, max); }
function removeComments(tex) {
  return tex.split('\n').map(line => {
    let escaped = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '%' && !escaped) return line.slice(0, i);
      if (line[i] === '\\') escaped = !escaped;
      else escaped = false;
    }
    return line;
  }).join('\n');
}
export function auditManuscript(source, { sourceName = 'pasted LaTeX' } = {}) {
  if (typeof source !== 'string' || !source.trim() || source.length > LIMIT) {
    throw new TypeError('Manuscript must contain 1–65,536 characters of LaTeX text.');
  }
  if (source.includes('\0')) throw new TypeError('Null bytes are not accepted.');
  const text = removeComments(source);
  const titleMatch = /\\title\s*\{([^{}]{1,500})\}/.exec(text);
  const title = titleMatch ? concise(titleMatch[1], 180) : 'Untitled manuscript';
  const claims = [];
  const re = /\\begin\{(definition|lemma|theorem|corollary|proposition)\}(?:\[([^\]]{0,180})\])?([\s\S]*?)\\end\{\1\}/g;
  for (const m of text.matchAll(re)) {
    if (!CLAIM_TYPES.has(m[1])) continue;
    if (claims.length >= 150) throw new TypeError('Too many theorem environments (maximum 150).');
    claims.push({ number: claims.length + 1, kind: m[1], name: concise(m[2] || '', 150),
      excerpt: concise(m[3]), line: lineno(text, m.index),
      status: 'NOT_VERIFIED', verification_engine: null });
  }
  const proofs = [...text.matchAll(/\\begin\{proof\}/g)].length;
  const math = [];
  const patterns = [
    /\\\[([\s\S]*?)\\\]/g,
    /\\begin\{(equation\*?|align\*?|gather\*?)\}([\s\S]*?)\\end\{\1\}/g,
  ];
  for (let j = 0; j < patterns.length; j++) {
    for (const m of text.matchAll(patterns[j])) {
      if (math.length >= 150) break;
      math.push({line: lineno(text, m.index), latex: concise(m[j === 0 ? 1 : 2], 380),
        status: 'NOT_VERIFIED', reason: 'No compatible mathematical proof engine selected.'});
    }
  }
  math.sort((a,b) => a.line - b.line);
  const findings = [
    { type: 'SCOPE', severity: 'info', label: 'Manuscript structure only',
      detail: 'The Lab inventories theorem environments and displayed mathematics. It does not prove, refute, or infer correctness of the manuscript.' }
  ];
  if (claims.some(c => ['lemma', 'theorem', 'corollary', 'proposition'].includes(c.kind)) && proofs === 0) {
    findings.push({type: 'PROOF_SURFACE', severity: 'review', label: 'No LaTeX proof environments found',
      detail: 'The source contains theorem-like statements but no \\begin{proof} blocks. This does not rule out prose proofs; inspect the source and dependencies.'});
  }
  if (/aggregate transcript capacity/i.test(text) && /(?:Omega|\\Omega)\s*\(?\s*n\s*\)?/.test(text)) {
    findings.push({type: 'ASSUMPTIONS', severity: 'review', label: 'Total capacity versus per-step capacity',
      detail: 'Review whether a total-transcript capacity definition supplies the per-step information bound needed for a linear depth conclusion. This is a review question, not an automated refutation.'});
  }
  if (/viotropic/i.test(text) && /\\Rightarrow/.test(text) && /I_\{\\mathrm\{op\}\}/.test(text)) {
    findings.push({type: 'IMPLICATION', severity: 'review', label: 'Zero-information implication requires proof',
      detail: 'A capacity-exceedance premise does not automatically imply exactly zero operational mutual information. Inspect variable definitions, quantifiers and countermodels.'});
  }
  return {schema: MANUSCRIPT_SCHEMA, status: 'NOT_VERIFIED', title, source_name: sourceName,
    source_characters: source.length, counts: {
      definitions: claims.filter(c => c.kind === 'definition').length,
      lemmas: claims.filter(c => c.kind === 'lemma').length,
      theorems: claims.filter(c => c.kind === 'theorem').length,
      corollaries: claims.filter(c => c.kind === 'corollary').length,
      propositions: claims.filter(c => c.kind === 'proposition').length,
      proof_environments: proofs, displayed_math: math.length },
    claims, displayed_equations: math, findings,
    formal_kernel_verified: false, mathematical_truth_assessed: false,
    source_uploaded: false,
    caveat: 'Automated structural/heuristic audit only; NOT_VERIFIED does not mean false.'};
}
