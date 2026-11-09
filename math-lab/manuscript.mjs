import {inspectLatex} from './latex-scan.mjs';
import {sourceAnchor,verifySourceAnchor} from './source-location.mjs';
import {MAX_MANUSCRIPT_BYTES,utf8Size} from './source-limits.mjs';
/**
 * Structural LaTeX manuscript inventory. No theorem prover, no LLM, no source upload.
 * This parser does not execute LaTeX or establish theorem correctness.
 */
export const MANUSCRIPT_SCHEMA = 'vasquez.math-lab.manuscript-structure.v0.1';

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
  if(typeof source!=='string'||!source.trim())throw new TypeError('EMPTY_MANUSCRIPT_SOURCE: paste LaTeX text before analysis.');
  if(source.length>MAX_MANUSCRIPT_BYTES||utf8Size(source)>MAX_MANUSCRIPT_BYTES)
    throw new TypeError('MANUSCRIPT_SOURCE_TOO_LARGE: maximum 131,072 UTF-8 bytes.');
  if (source.includes('\0')) throw new TypeError('Null bytes are not accepted.');
  const scanned=inspectLatex(source);
  const text=scanned.text;
  const titleMatch = /\\title\s*\{([^{}]{1,500})\}/.exec(text);
  const title = titleMatch ? concise(titleMatch[1], 180) : 'Untitled manuscript';
  const claims = [];
  const re = /\\begin\{(definition|lemma|theorem|corollary|proposition)\}(?:\[([^\]]{0,180})\])?([\s\S]*?)\\end\{\1\}/g;
  for (const m of text.matchAll(re)) {
    if (!CLAIM_TYPES.has(m[1])) continue;
    if (claims.length >= 150) throw new TypeError('Too many theorem environments (maximum 150).');
    claims.push({ number: claims.length + 1, kind: m[1], name: concise(m[2] || '', 150),
      excerpt: concise(m[3]), line: lineno(text, m.index),
      source_anchor:sourceAnchor(source,m.index,m.index+m[0].length,scanned.source_sha256),
      status: 'NOT_VERIFIED', verification_engine: null });
  }
  const proofs = [...text.matchAll(/\\begin\{proof\}/g)].length;
  const math=scanned.display.slice(0,150).map(x=>({line:x.line,latex:concise(x.content,380),source_anchor:x.source_anchor,status:'NOT_VERIFIED',reason:'No compatible mathematical proof engine selected.'}));
  for(const item of [...claims,...math,...scanned.flags])if(!verifySourceAnchor(source,item.source_anchor))throw new Error('SOURCE_ANCHOR_INVALID');
  const displayTruncated=scanned.display.length>math.length;
  const findings = [
    { type: 'SCOPE', severity: 'info', label: 'Manuscript structure only',
      detail: 'The Lab inventories theorem environments and displayed mathematics. It does not prove, refute, or infer correctness of the manuscript.' }
  ];
  if (claims.some(c => ['lemma', 'theorem', 'corollary', 'proposition'].includes(c.kind)) && proofs === 0) {
    findings.push({type: 'PROOF_SURFACE', severity: 'review', label: 'No LaTeX proof environments found',
      detail: 'The source contains theorem-like statements but no \\begin{proof} blocks. This does not rule out prose proofs; inspect the source and dependencies.'});
  }
  if (/(?:\\(?:Omega|Theta)\b|\\mathcal\{O\})/.test(text)) {
    findings.push({type: 'ASYMPTOTIC_CLAIM', severity: 'review', label: 'Asymptotic statement requires a justified bound',
      detail: 'Check the precise resource model, quantified parameters, asymptotic hypotheses, and proof of any rate claim. This is a generic review question, not an automated mathematical verdict.'});
  }
  if (/\\(?:Rightarrow|implies)\b/.test(text)) {
    findings.push({type: 'IMPLICATION', severity: 'review', label: 'Displayed implication requires a derivation',
      detail: 'Check that the conclusion follows from its stated assumptions and that the implication is not vacuous. This is a generic syntactic flag, not a refutation.'});
  }
  if(displayTruncated)findings.push({type:'DISPLAY_INVENTORY_TRUNCATED',severity:'review',label:'Displayed mathematics inventory truncated',detail:'Only the first '+math.length+' of '+scanned.display.length+' display blocks were included; no complete inventory is claimed.'});
  const extraction={status:displayTruncated?'REVIEW_REQUIRED':scanned.status,source_sha256:scanned.source_sha256,flags:scanned.flags,flags_truncated:scanned.flags_truncated,display_blocks_truncated:displayTruncated,total_display_blocks:scanned.display.length,extracted_display_blocks:math.length,note:scanned.note};
  if(extraction.flags.length)findings.push({type:'EXTRACTION_COVERAGE',severity:'review',label:'Source equations may be omitted',detail:extraction.flags.length+' flagged source fragments with line numbers require manual inspection.'});
  return {schema: MANUSCRIPT_SCHEMA, status: 'NOT_VERIFIED', extraction, title, source_name: sourceName,
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
