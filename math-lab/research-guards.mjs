/**
 * Narrow research audit guards: keyword suggestions and review prompts only.
 * No component in this file proves or refutes a mathematical statement.
 */
import {MAX_MANUSCRIPT_BYTES,utf8Size} from './source-limits.mjs';

export function classifyComplexityManuscript(source) {
  const text = String(source ?? '').slice(0, 65536);
  const titleMatch = /\\title\s*\{([^{}]{1,500})\}/.exec(text);
  const title = titleMatch?.[1] ?? '';
  // Independent body evidence is required; words in the title are not
  // corroborating signals, even when they match multiple pattern groups.
  const body = titleMatch
    ? text.slice(0, titleMatch.index) + text.slice(titleMatch.index + titleMatch[0].length)
    : text;
  const complexityTitle = /(?:polynomial[\s~-]*time|computational complexity|turing machine)/i.test(title)
    || /(?:\bP\s*(?:vs\.?|=)\s*NP\b|\bSAT\b)/.test(title);
  // Require corroboration in the body: a generic 'computation' in a physics title
  // must not override the ordinary cross-field ambiguity rule.
  const signals = [
    /(?:deterministic[\s~-]*polynomial[\s~-]*time|polynomial[\s~-]*time)/i,
    /(?:turing machine|\\(?:text|mathrm)\{Turing\}|\bk[\s~-]*tape\b)/i,
    /(?:\bSAT\s+solver\b|\bsatisfiability\b|\bPdet\b|\\Pdet\b)/i,
    /(?:uniform Boolean circuit|complexity class|polynomial simulation)/i,
  ];
  const total = signals.filter(re => re.test(body)).length;
  // Do not force a complexity classification when the title itself explicitly
  // identifies a competing physical subject; preserve the base classifier's
  // cross-field abstention and user-confirmation requirement.
  const competingPhysicsTitle = /(?:black[\s-]*hole|schwarzschild|wormhole|quantum gravity|phonon|chiral[\s-]*vibrat|molecular vibrat|cosmolog)/i.test(title);
  if (!complexityTitle || total < 2 || competingPhysicsTitle) return null;
  return {
    field: 'logic-complexity', subcategory: 'complexity', confidence: 'HEURISTIC_ONLY',
    reason: 'Title and multiple machine-complexity signals identify the primary subject. Information-theoretic material may be secondary. Confirm the field manually; this is not mathematical verification.'
  };
}

/**
 * Locates two narrowly defined information-accounting concerns. Outputs only
 * source-located review questions; a match is NEVER a theorem-level verdict.
 * Caller must attach source anchors and keep overall status NOT_VERIFIED.
 */
export function reviewTranscriptManuscript(source) {
  const text = String(source ?? '');
  // Match the admitted manuscript limit; never silently ignore late claims.
  if (text.length > MAX_MANUSCRIPT_BYTES || utf8Size(text) > MAX_MANUSCRIPT_BYTES)
    throw new RangeError('Transcript review source exceeds the admitted manuscript limit.');
  const findings = [];
  const initialization = /Y_\{?0\}?\s*:?=\s*c_\{?0\}?/.exec(text);
  const reconstruction = /\\Conf_\{?t\}?\s*=\s*D\s*\(\s*Y_\{\\le\s*t\}\s*\)/.exec(text);
  if (initialization && reconstruction && /(?:full machine configuration|input tape|read.only input)/i.test(text)) {
    findings.push({
      type: 'TRANSCRIPT_INITIAL_STATE_REVIEW', severity: 'review',
      label: 'Check initial transcript information sufficiency',
      detail: 'The initial frame appears to contain local observations while the claimed decoder reconstructs the full configuration. Check two inputs with identical initial observations but different unscanned tape contents. The decoder may require the input as an explicit parameter. This is a review prompt, not a proof verdict.',
      start: reconstruction.index, end: reconstruction.index + reconstruction[0].length
    });
  }
  const sum = /\\sum_\{t\s*=\s*0\}\^\{T\s*-\s*1\}/g;
  for (const m of text.matchAll(sum)) {
    const left = text.slice(Math.max(0, m.index - 220), m.index);
    const right = text.slice(m.index, Math.min(text.length, m.index + 250));
    if (!/H\s*\(\s*X\s*\)\s*=/.test(left)) continue;
    if (!/I\s*\(\s*X\s*;\s*Y_\{?t\+1\}?/.test(right)) continue;
    if (/I\s*\(\s*X\s*;\s*Y_\{?0\}?\s*\)/.test(left + right)) continue;
    if (!initialization) continue;
    findings.push({
      type: 'TRANSCRIPT_CHAIN_RULE_REVIEW', severity: 'review',
      label: 'Check initial-frame term in information chain rule',
      detail: 'A sum over frames Y_{t+1} starting at t=0 appears in an identity for H(X), but Y_0 is defined separately. Check whether I(X;Y_0) is missing. The general identity is H(X)=I(X;Y_0)+sum I(X;Y_{t+1}|Y_{<=t})+H(X|Y_{<=T}). This is a review prompt, not an automated refutation.',
      start: m.index, end: m.index + m[0].length
    });
    break; // One bounded report per concern; avoid flooding the interface.
  }
  return findings;
}

const translations = {
  en: {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['Check initial transcript information sufficiency','The initial local frame may not encode unscanned input cells. Check reconstruction from two inputs with identical initial observations but different full configurations. Review prompt only; no theorem verdict.'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['Check initial-frame term in information chain rule','The information sum appears to omit I(X;Y₀) although Y₀ is defined separately. Review the exact identity and its assumptions. Review prompt only; no theorem verdict.']
  },
  es: {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['Comprobar la información del estado inicial','La trama local inicial quizá no codifique las celdas de entrada no leídas. Compruebe dos entradas con la misma observación inicial y distintas configuraciones completas. Solo revisión; no es un veredicto matemático.'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['Comprobar el término de la trama inicial','La suma de información parece omitir I(X;Y₀), aunque Y₀ se define aparte. Compruebe la identidad y sus hipótesis. Solo revisión; no es un veredicto matemático.']
  },
  'pt-BR': {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['Verificar a informação do estado inicial','O quadro local inicial pode não codificar células da entrada ainda não lidas. Compare duas entradas com observações iniciais iguais e configurações completas diferentes. Apenas revisão; não é um veredito matemático.'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['Verificar o termo do quadro inicial','A soma de informação parece omitir I(X;Y₀), embora Y₀ seja definido separadamente. Confira a identidade e suas hipóteses. Apenas revisão; não é um veredito matemático.']
  },
  fr: {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['Vérifier les informations de la configuration initiale','La trame locale initiale ne code peut-être pas les cellules d’entrée non lues. Comparez deux entrées ayant la même observation initiale mais des configurations complètes distinctes. Simple question de vérification, pas un verdict mathématique.'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['Vérifier le terme de la trame initiale','La somme d’information semble omettre I(X;Y₀), alors que Y₀ est défini séparément. Vérifiez l’identité et ses hypothèses. Simple question de vérification, pas un verdict mathématique.']
  },
  de: {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['Information des Anfangszustands prüfen','Der anfängliche lokale Frame kodiert möglicherweise keine ungelesenen Eingabezellen. Vergleichen Sie zwei Eingaben mit gleicher Anfangsbeobachtung und verschiedenen Gesamtkonfigurationen. Nur Prüffrage, kein mathematisches Urteil.'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['Anfangsframe im Informationskettensatz prüfen','In der Informationssumme scheint I(X;Y₀) zu fehlen, obwohl Y₀ separat definiert ist. Prüfen Sie die Identität und die Annahmen. Nur Prüffrage, kein mathematisches Urteil.']
  },
  'zh-Hans': {
    TRANSCRIPT_INITIAL_STATE_REVIEW:['检查初始状态信息是否充分','初始局部帧可能未编码尚未读取的输入单元。请比较初始观测相同但完整配置不同的两个输入。这只是审查提示，并非数学判定。'],
    TRANSCRIPT_CHAIN_RULE_REVIEW:['检查信息链式法则中的初始帧项','尽管单独定义了 Y₀，信息求和式似乎遗漏了 I(X;Y₀)。请检查恒等式及其假设。这只是审查提示，并非数学判定。']
  }
};
export function reviewFindingUI(f, lang='en') {
  const pair = translations[lang]?.[f.type] ?? translations.en[f.type];
  return pair ? {label: pair[0], detail: pair[1]} : null;
}
