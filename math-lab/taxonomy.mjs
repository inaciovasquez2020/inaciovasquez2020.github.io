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
/** Untrusted hint only. This may miss or misclassify material; user must confirm. */
export function suggestCategory(text){
  const t=String(text??'').slice(0,65536);
  const patterns=[
    [/\\mathrm\{TC\}|transcript capacity|mutual information|entropy|shannon|fano|information capacity/i,'probability-information','entropy-capacity'],
    [/poincar[eé]|pachner|triangulat|3.manifold|3-sphere/i,'topology','manifold-topology'],
    [/homotopy|homology|cohomology/i,'topology','algebraic-topology'],
    [/complexity|p\s*(?:vs\.?|=)\s*np|sat\b|nondeterministic/i,'logic-complexity','complexity'],
    [/lean\s*4|theorem prover|proof assistant|formal verification/i,'logic-complexity','formal-proof'],
    [/graph Laplacian|adjacen|vertices|edges/i,'discrete','graph-theory'],
    [/riemann|curvature|metric tensor/i,'geometry','differential-geometry'],
    [/einstein|schwarzschild|black hole|field equation/i,'mathematical-physics','field-equations'],
    [/eigenvalue|spectrum|spectral gap/i,'analysis','functional-analysis'],
    [/integral|derivative|\\frac\{d\}/i,'analysis','calculus'],
    [/congruence|prime numbers|divisibility/i,'number-theory','divisibility'],
    [/\\sum|polynomial|x\^|x\*\*|x\s*\+/i,'algebra','polynomial-identities']
  ];
  for(const [re,field,subcategory] of patterns){if(re.test(t))return {field,subcategory,confidence:'HEURISTIC_ONLY',reason:'Keyword match; review and confirm the classification manually.'};}
  return {field:'other',subcategory:'unclassified',confidence:'NO_MATCH',reason:'No deterministic category match; select the field manually.'};
}
