import {uiText} from './extended-i18n.mjs';
import {verifyEquation,extractEquations,UnsupportedClaim} from './engine.mjs';
import {auditManuscript} from './manuscript.mjs';
import {TAXONOMY,subcategoriesFor,category,coverage,suggestCategory} from './taxonomy.mjs';
import {SessionCasebook,validateManifest,buildExactCase,buildManuscriptCase,buildUnsupportedCase} from './improvement.mjs';
const $=id=>document.getElementById(id);
const form=$('claim-form'),equation=$('equation'),area=$('result-area');
const theme=$('theme'),picker=$('file-picker'),drop=$('drop-area'),method=$('method');
const candidateControl=$('candidate-control'),candidateSelect=$('candidate-select'),fileStatus=$('file-status');
let last=null,candidates=[],sourceName='manual input';
let classificationOrigin='ENGINE_SCOPE', classificationLocked=false, classificationLastInput='';
const casebook=new SessionCasebook();
const fieldConfirmation=$('field-confirm');
let confirmedSelectionKey=null;
function selectionKey(){return JSON.stringify([method.value,$('math-field').value,$('math-subcategory').value,equation.value,$('claim-id').value,$('source-reference').value,$('assumptions').value,sourceName]);}
function invalidateFieldConfirmation(){
  fieldConfirmation.checked=false;confirmedSelectionKey=null;
  if(last!==null){last=null;area.replaceChildren(el('div','empty-state','Source or field changed. Previous evidence cleared; re-run after confirmation.'));}
  refreshFieldConfirmation();
}
function refreshFieldConfirmation(){
  if(!$('math-field').value||!$('math-subcategory').value)return false;
  const chosen=category($('math-field').value,$('math-subcategory').value);
  const missing=chosen.field==='other'||chosen.subcategory==='unclassified';
  const confirmed=fieldConfirmation.checked&&confirmedSelectionKey===selectionKey();
  if(!confirmed)fieldConfirmation.checked=false;
  fieldConfirmation.disabled=missing;
  const state=missing?'missing':confirmed?'confirmed':'review';
  $('field-confirm-panel').dataset.status=state;
  $('field-confirm-title').textContent=missing?'FIELD MISSING / REVIEW REQUIRED':confirmed?'FIELD CONFIRMED BY USER':'CONFIRM FIELD AND SUBCATEGORY';
  $('field-confirm-summary').textContent='Current selection: '+chosen.field_label+' / '+chosen.subcategory_label+
    '. '+(classificationOrigin==='AUTO'?'Automatically suggested; user review required.':'User selection or engine scope; review required.')+
    ' Method: '+(method.value==='manuscript-audit'?'Manuscript structure only; no theorem verification.':'Exact univariate polynomial identity.');
  return !missing&&confirmed;
}
for(const id of ['claim-id','source-reference','assumptions']){
 $(id).addEventListener('input',()=>{invalidateFieldConfirmation();updateCoverage();});
}
fieldConfirmation.addEventListener('change',()=>{
  confirmedSelectionKey=fieldConfirmation.checked?selectionKey():null;
  refreshFieldConfirmation();updateCoverage();
});
function claimManifest(){
  const assumptions=$('assumptions').value.split(/\n/).map(x=>x.trim()).filter(Boolean);
  return validateManifest({claim_id:$('claim-id').value.trim(),source_reference:$('source-reference').value.trim(),field:$('math-field').value,subcategory:$('math-subcategory').value,assumptions});
}
function updateCasebook(entry){
  const summary=casebook.add(entry);
  $('quality-cases').textContent=String(summary.cases);
  $('quality-probes').textContent=String(summary.metamorphic_pass);
  $('quality-review').textContent=String(summary.needs_review);
  $('quality-export').disabled=false;$('quality-clear').disabled=false;
  $('quality-last').textContent=`Last record: ${entry.kind} · ${entry.status}. ${entry.probes?.length||0} follow-up probes; ${entry.probes_passed||0} passed; ${entry.probes_skipped||0} skipped. Python replay NOT RUN.`;
}
$('quality-export').addEventListener('click',()=>downloadJSON(casebook.export(),'vasquez-math-lab-review-casebook.json'));
$('quality-clear').addEventListener('click',()=>{casebook.clear();$('quality-cases').textContent='0';$('quality-probes').textContent='0';$('quality-review').textContent='0';$('quality-export').disabled=true;$('quality-clear').disabled=true;$('quality-last').textContent='Session casebook cleared by user. No data was uploaded.';});
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderError(message){area.replaceChildren();const box=el('div','error-block');box.append(el('strong','', 'NOT VERIFIED — UNSUPPORTED INPUT'),el('p','',message));box.append(el('p','result-disclaimer','Input may be incomplete, mistranscribed, unsupported or incorrectly classified; no mathematical verdict has been established.'));area.append(box);last=null;}
function addRow(container,k,v){let row=el('div','meta-row');row.append(el('span','',k),el('span','result-code',v));container.append(row);}
function renderResult(r,entry){area.replaceChildren();last=r;const ok=r.status==='EXACT_CERTIFICATE_PASS';
  const root=el('div','result-content');const verdict=el('div',`verdict ${ok?'good':'bad'}`);const head=el('div','verdict-top');head.append(el('span','status-symbol',ok?'✓':'×'),el('span','',r.status));verdict.append(head);
  verdict.append(el('div','verdict-title',ok?uiText('Identity established within polynomial scope.'):uiText('Counterexample found.')));
  verdict.append(el('div','verdict-desc',ok?`All ${r.degree_upper_bound+1} exact evaluations agree. The degree bound proves equality for every real x.`:`At x = ${r.certificate.at(-1).x}, the two sides differ. The universal equality is false.`));
  root.append(verdict);const c=category(entry.manifest.field,entry.manifest.subcategory);root.append(el('p','classification-line',`SUBJECT FIELD: ${c.field_label} / ${c.subcategory_label} · ${classificationOrigin === 'MANUAL' ? 'MANUALLY SELECTED · USER CONFIRMED' : 'ENGINE-REQUIRED SCOPE · USER CONFIRMED'}`));root.append(el('p','classification-line','METHOD APPLIED: Exact integer polynomial identity over R, variable x · EXACT_SUPPORTED · NOT A LEAN PROOF'));root.append(el('p','result-disclaimer','INPUT WARNING — UNCERTIFIED SOURCE: The checker establishes only the entered polynomial equality. Incorrect transcription, missing assumptions or incorrect source identification are not validated.'));root.append(el('h3','section-title',uiText('EXACT EVALUATION RECORD')));
  const table=el('table','evidence-table');const thead=el('thead'),th=el('tr');for(const name of ['x','LHS','RHS'])th.append(el('th','',name));thead.append(th);table.append(thead);
  const body=el('tbody');for(const sample of r.certificate){const tr=el('tr',sample.lhs!==sample.rhs?'witness':'');for(const key of ['x','lhs','rhs'])tr.append(el('td','',String(sample[key])));body.append(tr);}table.append(body);root.append(table);
  root.append(el('h3','section-title',uiText('CERTIFICATE SCOPE')));const meta=el('div','meta-rows');addRow(meta,uiText('Method'),'Exact Z[x] identity / root bound');addRow(meta,uiText('Degree bound'),String(r.degree_upper_bound));addRow(meta,uiText('Original claim'),r.source.equation);addRow(meta,uiText('Python replay'),uiText('Not yet performed'));addRow(meta,uiText('Lean proof'),uiText('Not performed'));root.append(meta);
  root.append(el('p','scope-note',`Improvement loop: ${entry.probes_passed}/${entry.probes.length} metamorphic checks passed; ${entry.probes_skipped} skipped. Candidate status: ${entry.status}. Independent Python replay not performed.`));
  const buttons=el('div','report-actions');const certificate=el('button','', uiText('Download evidence JSON'));certificate.type='button';certificate.onclick=()=>downloadJSON(last,'vasquez-lab-evidence.json');
  const python=el('button','', uiText('Download Python claim JSON'));python.type='button';python.onclick=()=>downloadJSON(last.claim,'vasquez-lab-claim.json');
  const replay=el('button','', uiText('Show Python replay command'));replay.type='button';replay.onclick=()=>{const text=`python3 tools/math_audit.py check vasquez-lab-claim.json --output result.json\npython3 tools/math_audit.py verify result.json --claim vasquez-lab-claim.json`;const info=el('pre','file-note',text);buttons.after(info);replay.disabled=true;};
  buttons.append(certificate,python,replay);root.append(buttons);root.append(el('p','scope-note','Browser-side certificate only. The evidence JSON is not a Python-generated certificate; download the claim and run the authoritative Python checker independently.'));area.append(root);
}
function renderManuscript(r,entry){
  area.replaceChildren(); last=r; const root=el('div','result-content');
  const verdict=el('div','verdict unverified');
  const top=el('div','verdict-top'); top.append(el('span','status-symbol','◇'),el('span','',r.status));
  verdict.append(top,el('div','verdict-title','Manuscript structure reviewed; mathematical claims not verified.'),
    el('div','verdict-desc',`${r.title} · ${r.source_name}. The Lab has not proved or refuted any theorem. Review questions below are heuristic.`));root.append(verdict);
  const c=category(entry.manifest.field,entry.manifest.subcategory);root.append(el('p','classification-line',`SUBJECT FIELD: ${c.field_label} / ${c.subcategory_label} · ${classificationOrigin === 'MANUAL' ? 'MANUALLY SELECTED · USER CONFIRMED' : classificationOrigin === 'AUTO' ? 'AUTO-SUGGESTED · USER CONFIRMED' : 'USER CONFIRMED'}`));root.append(el('p','classification-line','METHOD APPLIED: LaTeX manuscript structure inventory · STRUCTURAL_ONLY · NO MATHEMATICAL CLAIMS VERIFIED'));root.append(el('p','result-disclaimer','INPUT WARNING — UNCERTIFIED SOURCE: LaTeX extraction can miss statements or misread notation, proofs and assumptions. Subject classification is heuristic or user-declared, and this report is not a mathematical or scientific validation.'));
  const stats=el('div','auditor-grid');
  for(const [name,count] of [[uiText('Definitions'),r.counts.definitions],[uiText('Lemmas'),r.counts.lemmas],[uiText('Theorems'),r.counts.theorems],[uiText('Corollaries'),r.counts.corollaries],[uiText('Proof blocks'),r.counts.proof_environments],[uiText('Math blocks'),r.counts.displayed_math]]){
    const div=el('div');div.append(el('strong','',String(count)),el('span','',name));stats.append(div);
  }root.append(stats);
  const extraction=r.extraction;
  root.append(el('h3','section-title',uiText('EQUATION EXTRACTION COVERAGE')));
  root.append(el('p','result-disclaimer',extraction.status==='REVIEW_REQUIRED'?
    'EXTRACTION REVIEW REQUIRED: Some displayed or inline mathematics was not included in the extracted equation inventory. Review the flagged source below.':
    'EXTRACTION NOT EXHAUSTIVELY VERIFIED: No suspicious patterns detected by these bounded checks. This does not guarantee that every equation was recovered.'));
  const flagList=el('div','audit-claims');
  for(const flag of extraction.flags){
    const block=el('div','audit-item review');
    block.append(el('div','audit-item-meta','SOURCE LINE '+flag.line+' · '+flag.code+' · NOT VERIFIED'));
    block.append(el('p','',flag.reason));
    const raw=el('pre','flagged-source',flag.source_excerpt);
    block.append(raw);flagList.append(block);
  }
  if(!extraction.flags.length)flagList.append(el('p','scope-note',uiText('No flagged excerpts in supported detection patterns; manual source comparison is still required.')));
  if(extraction.flags_truncated)flagList.append(el('p','scope-note',uiText('WARNING: Source flags truncated at the configured limit.')));
  root.append(flagList);
  root.append(el('h3','section-title',uiText('AUDIT FINDINGS — NOT PROOF VERDICTS')));
  const findings=el('div','audit-claims');for(const f of r.findings){const block=el('div','audit-item review');block.append(el('div','audit-item-meta',f.type+' · '+f.severity.toUpperCase()),el('h4','',f.label),el('p','',f.detail));findings.append(block);}root.append(findings);
  root.append(el('h3','section-title',uiText('EXTRACTED CLAIM ENVIRONMENTS')));
  const claims=el('div','audit-claims');if(!r.claims.length)claims.append(el('p','scope-note',uiText('No supported theorem environments found. No mathematical inference has been made.')));
  for(const c of r.claims){const block=el('div','audit-item');block.append(el('div','audit-item-meta',c.kind.toUpperCase()+` · LINE ${c.line} · `+c.status),
    el('h4','',c.name||'Unnamed '+c.kind),el('p','',c.excerpt));claims.append(block);}root.append(claims);
  root.append(el('h3','section-title',uiText('DISPLAYED MATHEMATICS')));
  const math=el('div','audit-claims');if(!r.displayed_equations.length)math.append(el('p','scope-note',uiText('No displayed mathematics found.')));
  for(const entry of r.displayed_equations.slice(0,24)){
    const block=el('div','audit-item');block.append(el('div','audit-item-meta','LINE '+entry.line+' · NOT VERIFIED'),el('p','result-code',entry.latex));math.append(block);
  }if(r.displayed_equations.length>24)math.append(el('p','scope-note',`${r.displayed_equations.length-24} additional blocks omitted from screen; included in JSON report.`));root.append(math);
  const actions=el('div','report-actions');const save=el('button','',uiText('Download structural audit JSON'));save.type='button';save.onclick=()=>downloadJSON(r,'vasquez-manuscript-audit.json');actions.append(save);root.append(actions);
  root.append(el('p','scope-note',`Casebook entry: ${entry.status}; no manuscript text was retained in the regression casebook. No AI model is connected, and this parser provides no theorem-level verdict.`));area.append(root);
}
function updateMethod(){const isMs=method.value==='manuscript-audit';
  $('evidence-method-tag').textContent=isMs?'MANUSCRIPT STRUCTURE ONLY':'EXACT POLYNOMIAL ARITHMETIC';
  classificationLocked=false;classificationOrigin=isMs?'UNCLASSIFIED':'ENGINE_SCOPE';
  $('source-label').textContent=isMs?'LaTeX manuscript · paste entire source':'Equation · LaTeX or ASCII';
  $('equation-help').textContent=isMs?'Paste a .tex document, including theorem environments. All content is processed in-browser. Findings are structural, not mathematical proof.':'Supported examples: (x+1)^2=x^2+2x+1, or \\left(x+1\\right)^2=x^2+2\\cdot x+1.';
  $('run').textContent=isMs?'Analyze manuscript structure →':'Run exact verification →';
  $('presets').hidden=isMs;
  equation.classList.toggle('manuscript-copy',isMs);
  if(isMs){equation.value='';}else{equation.value='(x+1)^2 = x^2 + 2x + 1';}
  candidateControl.hidden=true;candidates=[];sourceName='manual input';
  area.replaceChildren(el('div','empty-state',isMs?'Paste or drop LaTeX to inventory statements and review questions; no theorem verdict will be produced.':'Enter a polynomial equality and run exact verification.'));
  if(isMs){fieldSelect.value='other';fillSubcategories('unclassified');}else{fieldSelect.value='algebra';fillSubcategories('polynomial-identities');}
  invalidateFieldConfirmation();updateProvenance();updateCoverage();
}
// User-selected classification is metadata, not evidence that a mathematical claim is true.
const fieldSelect=$('math-field'),subcategorySelect=$('math-subcategory');
function fillSubcategories(preferred){
  subcategorySelect.replaceChildren();
  for(const s of subcategoriesFor(fieldSelect.value)){
    const option=document.createElement('option');option.value=s.id;option.textContent=s.label;subcategorySelect.append(option);
  }
  if(preferred&&subcategoriesFor(fieldSelect.value).some(s=>s.id===preferred))subcategorySelect.value=preferred;
  updateCoverage();
}
function updateCoverage(){
  const c=coverage(fieldSelect.value,subcategorySelect.value,method.value);
  $('coverage-status').textContent=c.status==='EXACT_SUPPORTED'?'EXACT SUPPORTED':c.status==='STRUCTURAL_ONLY'?'STRUCTURAL INVENTORY ONLY':'NOT SUPPORTED';
  $('coverage-panel').dataset.coverage=c.status;
  $('coverage-description').textContent=c.description;
  const confirmed=refreshFieldConfirmation();
  $('run').disabled=!c.can_run||!confirmed;
  $('run').title=!c.can_run?'No exact engine for the chosen field.':!confirmed?'Review and confirm the field and subcategory before continuing.':'';
}
for(const f of TAXONOMY){const option=document.createElement('option');option.value=f.id;option.textContent=f.label;fieldSelect.append(option);}
fieldSelect.value='algebra';fillSubcategories('polynomial-identities');
function updateProvenance(){
  const note=classificationOrigin==='MANUAL'?'MANUALLY SELECTED — user declaration, not verified':
    classificationOrigin==='AUTO'?'AUTO-SUGGESTED (UNCONFIRMED) — review the source subject':
    classificationOrigin==='ENGINE_SCOPE'?'ENGINE-REQUIRED ALGEBRA SCOPE — only the entered equality is verified':
    'UNCLASSIFIED / UNCONFIRMED — no reliable subject selection';
  $('classification-origin').textContent='Subject classification: '+note;
}
function applySuggestedCategory({force=false}={}){
  if(method.value!=='manuscript-audit'||(!force&&classificationLocked))return;
  if(!force&&classificationLastInput===equation.value)return;
  classificationLastInput=equation.value;
  const hint=suggestCategory(equation.value);
  fieldSelect.value=hint.field;fillSubcategories(hint.subcategory);
  classificationOrigin=hint.confidence==='HEURISTIC_ONLY'?'AUTO':'UNCLASSIFIED';
  $('suggest-note').textContent=hint.confidence+': '+hint.reason;
  invalidateFieldConfirmation();updateProvenance();updateCoverage();
}
let categorizationTimer=null;
equation.addEventListener('input',()=>{
  invalidateFieldConfirmation();updateCoverage();
  if(method.value!=='manuscript-audit')return;
  clearTimeout(categorizationTimer);
  categorizationTimer=setTimeout(()=>applySuggestedCategory(),250);
});
fieldSelect.addEventListener('change',()=>{fillSubcategories();classificationLocked=true;classificationOrigin='MANUAL';$('suggest-note').textContent='Manual override: mathematical field not independently verified.';invalidateFieldConfirmation();updateProvenance();updateCoverage();});
subcategorySelect.addEventListener('change',()=>{classificationLocked=true;classificationOrigin='MANUAL';invalidateFieldConfirmation();updateCoverage();$('suggest-note').textContent='Manual override: mathematical field not independently verified.';updateProvenance();});
$('suggest-category').addEventListener('click',()=>{classificationLocked=false;classificationLastInput='';applySuggestedCategory({force:true});});
updateProvenance();updateCoverage();
method.addEventListener('change',updateMethod);
function setExample(kind){invalidateFieldConfirmation();let texts={identity:'(x+1)^2 = x^2 + 2x + 1',false:'(x+1)^2 = x^2 + 1',latex:'\\left(x+1\\right)^2 = x^2 + 2\\cdot x + 1'};equation.value=texts[kind]||texts.identity;sourceName='manual input';candidates=[];candidateControl.hidden=true;area.replaceChildren(el('div','empty-state','Ready to verify the selected example.'));equation.focus();}
form.addEventListener('submit',e=>{e.preventDefault();if(method.value==='manuscript-audit'&&!classificationLocked)applySuggestedCategory();if(!refreshFieldConfirmation()){renderError('FIELD MISSING / CONFIRMATION REQUIRED: choose a specific field and subcategory, then confirm this choice before continuing.');return;}let m;
  try{
    m=claimManifest();
    const c=coverage(m.field,m.subcategory,method.value);
    if(!c.can_run)throw new UnsupportedClaim(c.description);
    if(method.value==='manuscript-audit'){
      const r=auditManuscript(equation.value,{sourceName});
      r.subject_classification={field:m.field,subcategory:m.subcategory,origin:classificationOrigin,confirmed_by_user:true,confirmation_is_mathematical_verification:false};
      r.method_applied='STRUCTURAL_ONLY';
      const entry=buildManuscriptCase(r,m);updateCasebook(entry);renderManuscript(r,entry);
    }else{
      const r=verifyEquation(equation.value,{id:m.claim_id,sourceName});
      r.subject_classification={field:m.field,subcategory:m.subcategory,origin:classificationOrigin,confirmed_by_user:true,confirmation_is_mathematical_verification:false};
      r.method_applied='EXACT_POLYNOMIAL_IDENTITY';
      const entry=buildExactCase(r,m);updateCasebook(entry);renderResult(r,entry);
    }
  }catch(err){
    const message=(err instanceof UnsupportedClaim||err instanceof TypeError||err instanceof RangeError)?err.message:'Internal checker failure; no verdict produced.';
    if(m && (err instanceof UnsupportedClaim||err instanceof TypeError)){
      try{updateCasebook(buildUnsupportedCase(message,m,{method:method.value,rawInput:equation.value}));}catch(_err){/* Session limit: do not silently overwrite cases. */}
    }
    renderError(message);
  }
});
$('reset').addEventListener('click',()=>{if(method.value==='manuscript-audit'){invalidateFieldConfirmation();equation.value='';sourceName='manual input';area.replaceChildren();}else setExample('identity');});
for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>setExample(b.dataset.example));
theme.addEventListener('change',()=>{document.documentElement.dataset.theme=theme.value;});
function showCandidates(list,name){invalidateFieldConfirmation();candidates=list;sourceName=name;candidateSelect.replaceChildren();candidateControl.hidden=false;
  list.forEach((c,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`${i+1}. ${c.replace(/\s+/g,' ').slice(0,75)}`;candidateSelect.append(opt);});
  fileStatus.textContent=`${name}: ${list.length} equation candidate${list.length===1?'':'s'} found. Only the selected equation is evaluated.`;
  equation.value=list[0];if(method.value==='manuscript-audit')applySuggestedCategory({force:true});area.replaceChildren(el('div','empty-state', 'Source loaded. Review the selected equation and run verification.'));
}
async function readFile(f){try{if(!f) return;if(!/\.(tex|txt)$/i.test(f.name))throw new UnsupportedClaim('Only .tex and .txt files are accepted.');if(f.size>65536)throw new UnsupportedClaim('File exceeds the 64 KiB limit; use a smaller excerpt.');
  const text=await f.text();if($('source-reference').value==='Manual entry')$('source-reference').value=f.name;if(text.includes('\0'))throw new UnsupportedClaim('Input contains a null byte.');
  if(method.value==='manuscript-audit'){invalidateFieldConfirmation();equation.value=text;sourceName=f.name;candidateControl.hidden=true;fileStatus.textContent='';applySuggestedCategory();area.replaceChildren(el('div','empty-state','File loaded locally. Select Analyze manuscript structure.'));return;}
  const list=extractEquations(text);if(!list.length)throw new UnsupportedClaim('No displayed equality found. Paste a single polynomial equation instead.');showCandidates(list,f.name);
 }catch(err){renderError(err instanceof UnsupportedClaim?err.message:'Unable to read the source file.');candidateControl.hidden=true;}}
picker.addEventListener('change',()=>readFile(picker.files?.[0]));
candidateSelect.addEventListener('change',()=>{invalidateFieldConfirmation();equation.value=candidates[Number(candidateSelect.value)]||'';last=null;area.replaceChildren(el('div','empty-state','Equation selected. Review before checking.'));});
for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('is-dragover');});
for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('is-dragover');});
drop.addEventListener('drop',e=>readFile(e.dataTransfer?.files?.[0]));
