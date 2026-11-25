/** Literal candidates only; no reconstruction or proof. */
import {sourceAnchor} from './source-location.mjs';
import {MAX_MANUSCRIPT_BYTES,utf8Size} from './source-limits.mjs';
export function isPlainManuscript(source){
 return !/\\(?:documentclass|title\s*\{|(?:begin|end)\{)/.test(source)
  && /(?:^|\n)[ \t]*abstract\b/i.test(source);
}
export function inspectPlainManuscript(source,digest){
 if(typeof source!=='string'||source.length>MAX_MANUSCRIPT_BYTES||utf8Size(source)>MAX_MANUSCRIPT_BYTES)throw RangeError('SOURCE_TOO_LARGE');
 const headings=[],proofs=[],equations=[];let truncated=false;
 const record=(array,kind,line,start,end)=>{if(array.length>=150){truncated=true;return;}
  array.push({kind,line,source_anchor:sourceAnchor(source,start,end,digest),status:'NOT_VERIFIED'});
 };
 let offset=0,line=0;
 for(const raw of source.split('\n')){
  line++;const s=raw.replace(/\r$/,'');const start=offset;offset+=raw.length+1;
  if(/^[ \t]*(?:references|bibliography)[ \t]*$/i.test(s))break;
  const m=/^[ \t]*(Assumption|Definition|Lemma|Theorem|Corollary|Proposition)[ \t]+(\d+(?:\.\d+)*)(?:[ \t]*\([^)\n]{1,180}\))?[.:](?:[ \t]|$)/.exec(s);
  if(m){record(headings,m[1].toLowerCase(),line,start,start+s.length);continue;}
  if(/^[ \t]*Proof[.:](?:[ \t]|$)/.test(s)){record(proofs,'proof',line,start,start+s.length);continue;}
  if(s.trim()&&s.length<=500&&(/[∂∇∫∑⇒⇔≠≤≥∧]/u.test(s)||/^[ \t]*[\p{L}\p{N}(){}[\]_.,+*/^−\- \t]{1,100}=[^=\n]{1,200}$/u.test(s)))
   record(equations,'equation_candidate',line,start,start+s.length);
 }
 return {headings,proofs,equations,truncated};
}
