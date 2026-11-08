/**
 * Structural LaTeX manuscript inventory. No theorem prover, no LLM, no source upload.
 * This parser does not execute LaTeX or establish theorem correctness.
 */
export const MANUSCRIPT_SCHEMA = 'vasquez.math-lab.manuscript-structure.v0.1';
const LIMIT = 65536;

/** Conservative omission detector. Not a complete LaTeX parser. */
function inspectExtraction(text, extractedCount) {
  const flags=[],limit=30,excerptLimit=260;
  const recognized=new Set(['equation','equation*','align','align*','gather','gather*']);
  const unusual=/^(?:math|displaymath|multline|multline\*|split|flalign|flalign\*|alignat|alignat\*|eqnarray|eqnarray\*|gathered|aligned)$/;
  let overflow=false;
  function add(code,reason,index,endIndex) {
    if(flags.length>=limit){overflow=true;return;}
    flags.push({code,reason,line:lineno(text,index),source_excerpt:text.slice(index,Math.min(endIndex,index+excerptLimit)).replace(/\s+/g,' ').trim(),mathematical_verdict:'NOT_VERIFIED'});
  }
  const starts=[...text.matchAll(/\\begin\{([A-Za-z*]+)\}/g)];
  const ends=[...text.matchAll(/\\end\{([A-Za-z*]+)\}/g)];
  const seen=starts.filter(m=>recognized.has(m[1])),ended=ends.filter(m=>recognized.has(m[1]));
  for(const m of seen){
    if(text.indexOf('\\end{'+m[1]+'}',m.index+m[0].length)<0)
      add('UNTERMINATED_DISPLAY','No matching end for a displayed equation environment.',m.index,m.index+excerptLimit);
  }
  for(const m of starts.filter(x=>unusual.test(x[1]))) {
    const at=text.indexOf('\\end{'+m[1]+'}',m.index+m[0].length);
    add('UNSUPPORTED_DISPLAY_ENVIRONMENT','This math environment is not inventoried as a display.',m.index,at<0?m.index+excerptLimit:at+16);
  }
  const dd=[...text.matchAll(/\$\$/g)];
  for(let i=0;i<dd.length;i+=2){
    const start=dd[i].index,end=dd[i+1]?.index;
    add(end===undefined?'UNBALANCED_DOLLAR_DISPLAY':'UNSUPPORTED_DOLLAR_DISPLAY',
      end===undefined?'Missing closing $ delimiter.':'A $ display is not inventoried.',start,end===undefined?start+excerptLimit:end+2);
  }
  const inline=[...text.matchAll(/\\\(/g)];
  for(const m of inline){
    const end=text.indexOf('\\)',m.index+m[0].length);
    add(end<0?'UNBALANCED_INLINE_MATH':'INLINE_MATH_NOT_INVENTORIED',
      end<0?'Missing closing inline math delimiter.':'Inline math is not included in the displayed-equation count.',
      m.index,end<0?m.index+excerptLimit:end+2);
  }
  if(seen.length>extractedCount)add('EXTRACTION_COUNT_MISMATCH','More recognized displays than extracted math blocks.',0,Math.min(text.length,excerptLimit));
  if(seen.length!==ended.length)add('DISPLAY_DELIMITER_COUNT_MISMATCH','Display begin/end counts differ.',0,Math.min(text.length,excerptLimit));
  return {status:flags.length?'REVIEW_REQUIRED':'EXTRACTION_NOT_EXHAUSTIVELY_VERIFIED',
    flags,flags_truncated:overflow,recognized_display_starts:seen.length,
    extracted_display_blocks:extractedCount,
    note:'Heuristic diagnostics only. No-warning status does not prove every equation was found.'};
}

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
  if (/(?:\\(?:Omega|Theta)\b|\\mathcal\{O\})/.test(text)) {
    findings.push({type: 'ASYMPTOTIC_CLAIM', severity: 'review', label: 'Asymptotic statement requires a justified bound',
      detail: 'Check the precise resource model, quantified parameters, asymptotic hypotheses, and proof of any rate claim. This is a generic review question, not an automated mathematical verdict.'});
  }
  if (/\\(?:Rightarrow|implies)\b/.test(text)) {
    findings.push({type: 'IMPLICATION', severity: 'review', label: 'Displayed implication requires a derivation',
      detail: 'Check that the conclusion follows from its stated assumptions and that the implication is not vacuous. This is a generic syntactic flag, not a refutation.'});
  }
  const extraction=inspectExtraction(text,math.length);
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
