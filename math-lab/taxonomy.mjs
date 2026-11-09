/** Explicit research taxonomy and method coverage. Data labels are not proof claims. */
export const TAXONOMY = Object.freeze([
  {id:'algebra',label:'Algebra',subcategories:[
    {id:'polynomial-identities',label:'Polynomial identities over R',exact:true},
    {id:'polynomial-inequalities',label:'Polynomial inequalities'},
    {id:'rational-expressions',label:'Rational expressions and equations'},
    {id:'abstract-algebra',label:'Groups, rings and fields'}]},
  {id:'analysis',label:'Analysis',subcategories:[
    {id:'calculus',label:'Calculus and derivatives'},
    {id:'limits',label:'Limits and convergence'},
    {id:'functional-analysis',label:'Functional analysis'}]},
  {id:'topology',label:'Topology',subcategories:[
    {id:'manifold-topology',label:'Manifolds and triangulations'},
    {id:'algebraic-topology',label:'Homotopy and homology'}]},
  {id:'geometry',label:'Geometry',subcategories:[
    {id:'differential-geometry',label:'Differential geometry'},
    {id:'metric-geometry',label:'Metric geometry'}]},
  {id:'number-theory',label:'Number theory',subcategories:[
    {id:'divisibility',label:'Divisibility and congruences'},
    {id:'diophantine',label:'Diophantine equations'}]},
  {id:'probability-information',label:'Probability and information theory',subcategories:[
    {id:'entropy-capacity',label:'Entropy and information capacity'},
    {id:'probability',label:'Probability and distributions'},
    {id:'stochastic',label:'Stochastic processes'}]},
  {id:'discrete',label:'Discrete mathematics',subcategories:[
    {id:'graph-theory',label:'Graph theory'},
    {id:'combinatorics',label:'Combinatorics'}]},
  {id:'logic-complexity',label:'Logic and computation',subcategories:[
    {id:'formal-proof',label:'Formal proof and proof assistants'},
    {id:'complexity',label:'Computational complexity'},
    {id:'model-theory',label:'Model theory and locality'}]},
  {id:'mathematical-physics',label:'Mathematical physics',subcategories:[
    {id:'field-equations',label:'Field equations'},
    {id:'spectral-physics',label:'Spectral theory and operators'},
    {id:'cosmology',label:'Cosmology'}]},
  {id:'other',label:'Other / not classified',subcategories:[
    {id:'unclassified',label:'Unclassified claim'}]}
]);
export const TAXONOMY_VERSION='vasquez.math-lab.taxonomy.v0.1';
export function category(field,subcategory){
  const f=TAXONOMY.find(x=>x.id===field);
  const s=f?.subcategories.find(x=>x.id===subcategory);
  if(!f||!s)throw new TypeError('Select a valid mathematical field and subcategory.');
  return {field:f.id,field_label:f.label,subcategory:s.id,subcategory_label:s.label,exact_supported:s.exact===true};
}
export function subcategoriesFor(field){return TAXONOMY.find(x=>x.id===field)?.subcategories??[];}
export function coverage(field,subcategory,method){
  const c=category(field,subcategory);
  if(method==='manuscript-audit')return {
    status:'STRUCTURAL_ONLY',engine:'Manuscript structure inventory',can_run:true,
    description:'The Lab can inventory theorem environments, definitions, proofs and equations in this field. It cannot verify their mathematical truth.'};
  if(method!=='exact-polynomial')throw new TypeError('Unknown verification method.');
  return c.exact_supported?{
    status:'EXACT_SUPPORTED',engine:'Browser exact polynomial identity v0.1',can_run:true,
    description:'Universally quantified identities between integer-coefficient polynomials in one variable x over R; degree bound ≤32, exponents ≤16. No Lean verification.'}:{
    status:'NO_ENGINE',engine:null,can_run:false,
    description:`No mathematical verification engine is connected for ${c.field_label} / ${c.subcategory_label}. Use Manuscript structure audit for a non-proof inventory.`};
}
/**
 * Subject suggestion only. No classification is independently certified.
 * When reviewing a manuscript, algebraic controls do not classify the paper.
 */
export function suggestCategory(source){
  const t=String(source??'').slice(0,65536);
  if(!t.trim())return {field:'other',subcategory:'unclassified',confidence:'NO_MATCH',
    reason:'No source text to classify. Choose the subject manually.'};
  const paper=/\\(?:documentclass|begin\{document\}|begin\{(?:theorem|lemma|definition)\})/.test(t);
  const rules=[
    ['mathematical-physics','spectral-physics',[
      /(?:quantum[\s-]*hall|chern (?:number|character|class)|berry curvature|topological (?:band|charge pump)|photonic topological|spectral projector)/i,
      /chiral[\s-]*(?:vibrat|phonon)|circular dichroism|vibrational (?:inverse|IFE)|molecular vibrat|phonon inverse faraday/i,
      /normal[\s-]*mode|mass[\s-]*weight|hessian|DFTB\+?|degenerate vibrat|vibration[\s-]*induced magnetism/i,
      /\\(?:ddot|dot)\b|\\Gamma\b.*\\omega\b/i]],
    ['mathematical-physics','field-equations',[/einstein[\s-]*rosen|schwarzschild|topological censorship|wormhole|black hole|field equation/i]],
    ['probability-information','entropy-capacity',[/mutual information|transcript capacity|information capacity|\\mathrm\{TC\}|shannon entropy|information-theoretic/i,/\\(?:mathrm\{)?(?:Cap|TC)\b|entropy/i]],
    ['topology','manifold-topology',[/poincar[eé]|pachner|triangulat|3[\s-]*manifold|3[\s-]*sphere/i]],
    ['topology','algebraic-topology',[/homotopy|homology|cohomology/i]],
    ['logic-complexity','complexity',[/\bp[\s-]*(?:vs\.?|=)[\s-]*np\b|satisfiability|computational complexity|\\mathsf\{NP\}/i]],
    ['logic-complexity','formal-proof',[/lean[\s-]*4|theorem prover|proof assistant|formal verification/i]],
    ['geometry','differential-geometry',[/riemann|curvature tensor|metric tensor/i]],
    ['discrete','graph-theory',[/graph Laplacian|adjacen|graph theory/i]],
    ['number-theory','divisibility',[/prime numbers|divisibility|congruence/i]],
    ['analysis','functional-analysis',[/functional analysis|bounded operator|spectral gap/i]],
    ['analysis','calculus',[/differential equation|integration by parts|derivative/i]],
    ['algebra','polynomial-identities',paper?[/\bpolynomial identities\b/i]:[/\bpolynomial\b|x\^|x\*\*|x\s*\+/i]]
  ];
  const hits=rules.map(([field,subcategory,res])=>({field,subcategory,score:res.reduce((n,re)=>n+Number(re.test(t)),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(!hits.length)return {field:'other',subcategory:'unclassified',confidence:'NO_MATCH',
    reason:'No distinctive field signal found. Select the subject manually.'};
  const top=hits[0],rival=hits.find(x=>x.field!==top.field);
  if(rival && (rival.score===top.score || rival.score>=2)){
    return {field:'other',subcategory:'unclassified',confidence:'AMBIGUOUS',
      reason:'Signals from multiple mathematical fields were found; select the appropriate subject manually.'};
  }
  return {field:top.field,subcategory:top.subcategory,confidence:'HEURISTIC_ONLY',
    reason:'Automatically suggested from source keywords. Not independently checked; confirm the subject and assumptions.'};
}
