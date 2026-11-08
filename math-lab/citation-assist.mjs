/* Publisher-checked bibliographic metadata; suggest relevance, never assert support.
 * Entries must have primary publishing records or original DOI landing pages.
 * No source uploads, searches, AI calls or automatic citation insertion.
 */
export const CITE_LIBRARY_VERSION='vasquez.citation-assist.v0.1';
export const REFERENCES=Object.freeze([
 {key:'EinsteinRosen1935',authors:'Albert Einstein and Nathan Rosen',title:'The Particle Problem in the General Theory of Relativity',journal:'Physical Review',year:1935,volume:'48',pages:'73--77',doi:'10.1103/PhysRev.48.73',
  signals:['Einstein--Rosen','Einstein-Rosen','Einstein Rosen','Einstein\\\\textendash Rosen','ER bridge'],
  note:'Foundational historical source; do not presume it proves modern claims about wormhole traversability.'},
 {key:'FriedmanSchleichWitt1993',authors:'John L. Friedman and Kristin Schleich and Donald M. Witt',title:'Topological censorship',journal:'Physical Review Letters',year:1993,volume:'71',pages:'1486--1489',doi:'10.1103/PhysRevLett.71.1486',
  signals:['topological censorship','Friedman, Schleich','Friedman Schleich Witt'],
  note:'Check theorem hypotheses and the 1995 erratum, DOI 10.1103/PhysRevLett.75.1872.'},
 {key:'Shannon1948PartI',authors:'Claude E. Shannon',title:'A Mathematical Theory of Communication',journal:'Bell System Technical Journal',year:1948,volume:'27',pages:'379--423',doi:'10.1002/j.1538-7305.1948.tb01338.x',
  signals:['Shannon entropy','mutual information','information capacity','Shannon theorem'],
  note:'Part I. Historical relevance does not establish a specific modern capacity theorem.'}
]);
export function formatBibtex(ref) {
 return '@article{'+ref.key+',\n'+
  '  author = {'+ref.authors+'},\n'+
  '  title = {'+ref.title+'},\n'+
  '  journal = {'+ref.journal+'},\n'+
  '  year = {'+ref.year+'},\n'+
  '  volume = {'+ref.volume+'},\n'+
  '  pages = {'+ref.pages+'},\n'+
  '  doi = {'+ref.doi+'}\n}\n';
}
export function suggestCitations(source){
 if(typeof source!=='string'||!source.trim())return [];
 const trimmed=source.slice(0,65536);
 return REFERENCES.filter(ref=>ref.signals.some(signal=>trimmed.toLowerCase().includes(signal.toLowerCase())))
   .map(ref=>({...ref,alreadyReferenced:trimmed.includes('\\cite{'+ref.key+'}')||
    trimmed.includes(ref.doi),status:'SUGGESTION_ONLY',reference_supports_claim:'NOT_CHECKED'}));
}

/**
 * Detect modern arXiv identifiers without network access or invented metadata.
 * Returns canonical outbound links, not confirmed records or BibTeX.
 * A syntactically valid ID is not proof the paper exists or supports a claim.
 */
export function detectArxivIdentifiers(source) {
 if(typeof source!=='string')return [];
 const text=source.slice(0,65536),seen=new Set(),out=[];
 const pattern=/(?:arXiv:\s*|https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5}(?:v[1-9]\d*)?)(?![A-Za-z0-9.])/gi;
 for(const match of text.matchAll(pattern)) {
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
