/* Offline curated metadata checked against original publisher or DOI landing pages.
 * Relevance matching is not a claim-support assessment or proof certificate.
 */
export const CITE_LIBRARY_VERSION='vasquez.citation-assist.v0.2';
export const REFERENCES=Object.freeze([
 {key:'EinsteinRosen1935',authors:'Albert Einstein and Nathan Rosen',title:'The Particle Problem in the General Theory of Relativity',journal:'Physical Review',year:1935,volume:'48',pages:'73--77',doi:'10.1103/PhysRev.48.73',
  signals:['Einstein--Rosen','Einstein-Rosen','Einstein Rosen','Einstein\\textendash Rosen','ER bridge'],
  note:'Foundational historical source; do not presume it proves modern claims about wormhole traversability.'},
 {key:'FriedmanSchleichWitt1993',authors:'John L. Friedman and Kristin Schleich and Donald M. Witt',title:'Topological censorship',journal:'Physical Review Letters',year:1993,volume:'71',pages:'1486--1489',doi:'10.1103/PhysRevLett.71.1486',
  signals:['topological censorship','Friedman, Schleich','Friedman Schleich Witt'],
  note:'Check theorem hypotheses and the 1995 erratum, DOI 10.1103/PhysRevLett.75.1872.'},
 {key:'Shannon1948PartI',authors:'Claude E. Shannon',title:'A Mathematical Theory of Communication',journal:'Bell System Technical Journal',year:1948,volume:'27',pages:'379--423',doi:'10.1002/j.1538-7305.1948.tb01338.x',
  aliases:['Shannon1948'],signals:['Shannon entropy','mutual information','information capacity','Shannon theorem'],
  note:'Historical information-theory source; not a proof of a particular transcript bandwidth bound.'},
 {key:'AroraBarak2009',entry_type:'book',authors:'Sanjeev Arora and Boaz Barak',title:'Computational Complexity: A Modern Approach',publisher:'Cambridge University Press',year:2009,doi:'10.1017/CBO9780511804090',aliases:['AroraBarak'],
  signals:['computational complexity','polynomial-time simulation','complexity classes','deterministic polynomial-time'],
  note:'Computational model and complexity background; inspect the cited chapter and model assumptions.'},
 {key:'CoverThomas2006',entry_type:'book',authors:'Thomas M. Cover and Joy A. Thomas',title:'Elements of Information Theory',publisher:'John Wiley & Sons',year:2006,doi:'10.1002/047174882X',aliases:['CoverThomas'],
  signals:['conditional mutual information','mutual-information chain rule','chain rule for mutual information','entropy chain rule','conditional entropy'],
  note:'Textbook source for information identities; not a proof of a specific computational lower bound.'},
 {key:'HennieStearns1966',authors:'F. C. Hennie and R. E. Stearns',title:'Two-Tape Simulation of Multitape Turing Machines',journal:'Journal of the ACM',year:1966,volume:'13',number:'4',pages:'533--546',doi:'10.1145/321356.321362',
  signals:['multitape Turing machine','multitape Turing-machine','two-tape simulation','Turing-machine simulation','Turing machine simulation'],
  note:'A specific two-tape simulation theorem; do not substitute it for an arbitrary RAM/circuit simulation claim.'},
 {key:'Cook1971',entry_type:'inproceedings',authors:'Stephen A. Cook',title:'The Complexity of Theorem-Proving Procedures',booktitle:'Proceedings of the Third Annual ACM Symposium on Theory of Computing',year:1971,pages:'151--158',doi:'10.1145/800157.805047',
  signals:['SAT solver','SAT-hardness','SAT hardness','Cook--Levin','Cook-Levin','satisfiability problem','NP-completeness'],
  note:'SAT complexity background; does not prove a superpolynomial SAT lower bound.'}
]);
function stripLatexComments(source){
 return source.split('\n').map(line=>{
  for(let i=0;i<line.length;i++)if(line[i]==='%'){
   let slashes=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)slashes++;
   if(slashes%2===0)return line.slice(0,i);
  }
  return line;
 }).join('\n');
}
function citeKeys(source){
 const all=new Set();
 // Multiple keys and optional page notes are supported, never execute TeX.
 for(const match of source.matchAll(/\\cite[a-zA-Z]*\*?(?:\[[^\]]{0,160}\])?\{([^}]{1,300})\}/g)){
  for(const key of match[1].split(','))all.add(key.trim());
 }
 for(const match of source.matchAll(/\\bibitem(?:\[[^\]]{0,160}\])?\{([^}]{1,160})\}/g))all.add(match[1].trim());
 return all;
}
export function formatBibtex(ref){
 const kind=ref.entry_type||'article';
 if(!['article','book','inproceedings'].includes(kind))throw new TypeError('Unknown curated BibTeX entry type');
 const fields={author:ref.authors,title:ref.title};
 if(kind==='article'){Object.assign(fields,{journal:ref.journal,year:ref.year,volume:ref.volume,pages:ref.pages});
  if(ref.number!==undefined)fields.number=ref.number;}
 if(kind==='book')Object.assign(fields,{publisher:ref.publisher,year:ref.year});
 if(kind==='inproceedings')Object.assign(fields,{booktitle:ref.booktitle,year:ref.year,pages:ref.pages});
 fields.doi=ref.doi;
 if(Object.values(fields).some(v=>v===null||v===undefined||v===''))throw new TypeError('Incomplete curated reference');
 return '@'+kind+'{'+ref.key+',\n'+Object.entries(fields).map(([k,v])=>'  '+k+' = {'+String(v).replace(/&/g,'\\&')+'}').join(',\n')+'\n}\n';
}
export function suggestCitations(source){
 if(typeof source!=='string'||!source.trim())return [];
 const trimmed=stripLatexComments(source.slice(0,65536));
 // Bibliography entries are not, by themselves, relevance evidence.
 const body=trimmed.replace(/\\begin\{thebibliography\}(?:\{[^}]*\})?[\s\S]*?\\end\{thebibliography\}/g,' ')
    .replace(/\\bibliography\{[^}]*\}/g,' ');
 const keys=citeKeys(trimmed);
 return REFERENCES.filter(ref=>{
   const names=[ref.key,...(ref.aliases||[])];
   return ref.signals.some(signal=>body.toLowerCase().includes(signal.toLowerCase())) || names.some(key=>keys.has(key));
 }).map(ref=>{
   const aliases=[ref.key,...(ref.aliases||[])];
   const alreadyReferenced=aliases.some(key=>keys.has(key))||trimmed.includes(ref.doi);
   return {...ref,alreadyReferenced,status:'SUGGESTION_ONLY',reference_supports_claim:'NOT_CHECKED'};
 });
}
export function detectArxivIdentifiers(source){
 if(typeof source!=='string')return [];
 const text=source.slice(0,65536),seen=new Set(),out=[];
 const pattern=/(?:arXiv:\s*|https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5}(?:v[1-9]\d*)?)(?![A-Za-z0-9.])/gi;
 for(const match of text.matchAll(pattern)){
   const id=match[1],yy=Number(id.slice(0,2)),month=Number(id.slice(2,4)),digits=id.split('.')[1].match(/^\d+/)[0].length;
   const modern=yy>=15&&yy<=99,old=yy>=7&&yy<=14;
   if(month<1||month>12||(!modern&&!old)||digits!==(modern?5:4)||seen.has(id))continue;
   seen.add(id);out.push({id,url:'https://arxiv.org/abs/'+id,
     status:'IDENTIFIER_DETECTED_METADATA_NOT_FETCHED',title:null,authors:null,
     peer_review_status:'UNKNOWN',reference_supports_claim:'NOT_CHECKED'});
   if(out.length>=30)break;
 }
 return out;
}
