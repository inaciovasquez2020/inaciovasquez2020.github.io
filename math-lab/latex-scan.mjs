/**
 * Bounded, conservative LaTeX delimiter scanner for an audit, not a TeX compiler.
 * Offsets are relative to comment-stripped source (newlines are retained).
 * Unsupported and malformed source is flagged, never silently certified.
 */
const DISPLAY = new Set(['equation','equation*','align','align*','gather','gather*']);
const MATH_ENV = /^(?:math|displaymath|multline\*?|split|flalign\*?|alignat\*?|eqnarray\*?|gathered|aligned)$/;
const CLAIM_ENV = /^(?:definition|lemma|theorem|corollary|proposition)\*?$/;
const MAX_FLAGS=30,MAX_EXCERPT=260;
export function removeLatexComments(tex) {
 return tex.split('\n').map(line=>{
   for(let i=0;i<line.length;i++)if(line[i]==='%'){
     let slashes=0;for(let k=i-1;k>=0&&line[k]==='\\';k--)slashes++;
     if(slashes%2===0)return line.slice(0,i);
   }
   return line;
 }).join('\n');
}
export function inspectLatex(source) {
 const text=removeLatexComments(String(source));
 const display=[],flags=[];let truncated=false;
 const lineno=pos=>1+text.slice(0,pos).split('\n').length-1;
 function flag(code,reason,pos,to=pos+MAX_EXCERPT) {
   if(flags.length>=MAX_FLAGS){truncated=true;return;}
   flags.push({code,reason,line:lineno(pos),
     source_excerpt:text.slice(pos,Math.min(text.length,to,pos+MAX_EXCERPT)).replace(/\s+/g,' ').trim(),
     mathematical_verdict:'NOT_VERIFIED'});
 }
 const stack=[];
 const re=/\\(begin|end)\{([A-Za-z*]+)\}|\\\[|\\\]|\$\$|\\\(|\\\)|(?<!\\)\$(?!\$)/g;
 for(const m of text.matchAll(re)){
   const t=m[0],pos=m.index;
   if(m[1]==='begin'){
     const name=m[2];
     if(MATH_ENV.test(name)||name.endsWith('*')&&CLAIM_ENV.test(name)){
       flag(MATH_ENV.test(name)?'UNSUPPORTED_DISPLAY_ENVIRONMENT':'UNSUPPORTED_CLAIM_ENVIRONMENT',
         'This environment is not extracted by the current inventory.',pos);
     }
     if(name.endsWith('*')&&CLAIM_ENV.test(name)){} // explicit flagged starred theorem
     stack.push({kind:'env',name,pos,contentStart:pos+t.length,invalid:stack.some(x=>x.kind==='display')});
     if(stack.slice(0,-1).some(x=>x.kind==='display')&&DISPLAY.has(name))
       flag('NESTED_DISPLAY','Nested math structure cannot be independently extracted.',pos);
   }else if(m[1]==='end'){
     const name=m[2];
     if(!stack.length||stack.at(-1).kind!=='env'||stack.at(-1).name!==name){
       flag('MISMATCHED_ENVIRONMENT','Closing environment does not match the most recent opening environment.',pos);
       for(const x of stack)x.invalid=true;
     }else{
       const x=stack.pop();
       if(DISPLAY.has(name)&&!x.invalid)display.push({start:x.pos,end:pos+t.length,content:text.slice(x.contentStart,pos),line:lineno(x.pos),kind:name});
     }
   }else if(t==='\\['||t==='$$'||t==='\\('||t==='$'){
     const kind=t==='\\['?'bracket':t==='$$'?'dollar-display':t==='\\('?'inline-paren':'inline-dollar';
     // A closing $ is indistinguishable from opening $; toggle when on stack.
     if(t==='$'&&stack.at(-1)?.kind==='inline-dollar'){
       const x=stack.pop();flag('INLINE_MATH_NOT_INVENTORIED','Inline dollar mathematics is not included in displayed equations.',x.pos,pos+1);
     }else if(t==='$$'&&stack.at(-1)?.kind==='dollar-display'){
       const x=stack.pop();if(!x.invalid)display.push({start:x.pos,end:pos+2,content:text.slice(x.contentStart,pos),line:lineno(x.pos),kind:'dollar-display'});
     }else{
       if((t==='\\('||t==='$')&&stack.length&&stack.at(-1).kind.startsWith('inline'))
         flag('NESTED_INLINE_MATH','Nested inline-math delimiter.',pos);
       stack.push({kind,pos,contentStart:pos+t.length,invalid:stack.some(x=>x.kind==='display')});
     }
   }else if(t==='\\]'||t==='\\)'){
     const expected=t==='\\]'?'bracket':'inline-paren';
     if(stack.at(-1)?.kind!==expected) {
       flag('UNBALANCED_MATH_DELIMITER','Closing mathematical delimiter has no matching opener.',pos);
       for(const x of stack)x.invalid=true;
     }else{
       const x=stack.pop();
       if(expected==='bracket'&&!x.invalid)display.push({start:x.pos,end:pos+2,content:text.slice(x.contentStart,pos),line:lineno(x.pos),kind:'bracket'});
       else if(expected==='inline-paren')flag('INLINE_MATH_NOT_INVENTORIED','Inline mathematics is not included in the displayed equation count.',x.pos,pos+2);
     }
   }
 }
 for(const x of stack){
   const code=x.kind==='env'?(DISPLAY.has(x.name)?'UNTERMINATED_DISPLAY':'UNTERMINATED_ENVIRONMENT'):'UNBALANCED_MATH_DELIMITER';
   flag(code,'Opening LaTeX delimiter/environment has no matching closure.',x.pos);
 }
 display.sort((a,b)=>a.start-b.start);
 flags.sort((a,b)=>a.line-b.line);
 return {text,display,flags,flags_truncated:truncated,
   status:flags.length?'REVIEW_REQUIRED':'EXTRACTION_NOT_EXHAUSTIVELY_VERIFIED',
   note:'Heuristic check only: no flags does not prove complete LaTeX parsing.'};
}
