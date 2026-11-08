import {suggestCitations,formatBibtex,detectArxivIdentifiers} from './citation-assist.mjs';
import {uiText} from './extended-i18n.mjs';
const button=document.getElementById('check-citations');
const panel=document.getElementById('citation-results');
const exportButton=document.getElementById('citation-export');
const source=document.getElementById('equation');
let suggestions=[],arxivIds=[],analyzed=false;
function safeText(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
function render(){
 const checked=new Set(Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(x=>Number(x.dataset.index)));
 panel.replaceChildren();
 const intro=safeText('p',suggestions.length?
  suggestions.length+' '+uiText('possible references found. Source relevance and theorem hypotheses have NOT been checked. Confirm before exporting.'):
  uiText('No matching entries in this small curated library. This does NOT mean the manuscript needs no citations.'));
 panel.append(intro);
 if(arxivIds.length)panel.append(safeText('p',arxivIds.length+' '+uiText('arXiv identifier(s) detected. Metadata, publication identity, version history and peer-review status have NOT been fetched.')));
 for(const ref of arxivIds){
   const item=document.createElement('article');item.className='citation-item';
   item.append(safeText('strong','arXiv:'+ref.id+' · IDENTIFIER ONLY'));
   const link=document.createElement('a');link.href=ref.url;link.textContent=uiText('Open canonical arXiv record');link.target='_blank';link.rel='noopener noreferrer';item.append(link);
   item.append(safeText('p',uiText('IDENTIFIER_DETECTED_METADATA_NOT_FETCHED — Open the record and check authors, title, version and journal status before citing. No BibTeX is generated for an unverified identifier.')));
   panel.append(item);
 }
 suggestions.forEach((ref,i)=>{
  const article=document.createElement('article');article.className='citation-item';
  article.append(safeText('strong',ref.title+' ('+ref.year+')'));
  article.append(safeText('p',ref.authors+' · '+ref.journal));
  const link=document.createElement('a');link.href='https://doi.org/'+ref.doi;link.textContent='DOI: '+ref.doi;link.target='_blank';link.rel='noopener noreferrer';article.append(link);
  article.append(safeText('p',uiText('Status: SUGGESTION_ONLY / CLAIM SUPPORT NOT CHECKED. ')+(ref.alreadyReferenced?uiText('Source includes this DOI or citation key. '):uiText('Potential missing citation. '))+ref.note));
  const label=document.createElement('label');label.className='citation-check';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.index=String(i);checkbox.checked=checked.has(i);
  checkbox.addEventListener('change',()=>{exportButton.disabled=!Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).length;});
  label.append(checkbox,safeText('span',uiText('I checked this reference and want its BibTeX entry.')));
  article.append(label);panel.append(article);
 });
 exportButton.disabled=!Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).length;
}
button.addEventListener('click',()=>{
 analyzed=true;
 suggestions=suggestCitations(source.value);
 arxivIds=detectArxivIdentifiers(source.value);
 render();
});
source.addEventListener('input',()=>{
 suggestions=[];arxivIds=[];analyzed=false;panel.replaceChildren(safeText('p',uiText('Input changed. Re-run citation suggestions before exporting.')));exportButton.disabled=true;
});
exportButton.addEventListener('click',()=>{
 const confirmed=Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(c=>suggestions[Number(c.dataset.index)]).filter(Boolean);
 if(!confirmed.length)return;
 const file=new Blob([confirmed.map(formatBibtex).join('\n')],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download='vasquez-reviewed-citations.bib';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});

// Rebuild human-readable guidance using cached reference matches; do not refetch or alter citations.
document.getElementById('ui-language')?.addEventListener('change',()=>{if(analyzed)render();});
