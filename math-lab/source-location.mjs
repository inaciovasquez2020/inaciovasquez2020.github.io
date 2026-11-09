/**
 * Original-manuscript source anchors, not proof certificates.
 * UTF-16 half-open offsets refer to the exact original JS string.
 * SHA-256 digests use UTF-8 with replacement for unpaired surrogates.
 * Does not read files, transmit source, or use a non-portable crypto backend.
 */
import {MAX_MANUSCRIPT_BYTES} from './source-limits.mjs';
export const SOURCE_ANCHOR_SCHEMA='vasquez.math-lab.source-anchor.v0.1';
const LIMIT=MAX_MANUSCRIPT_BYTES,EXCERPT_LIMIT=240;
const H0=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
const K=[
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];
function utf8Bytes(source){
 const out=[];
 for(let i=0;i<source.length;i++){
  let n=source.charCodeAt(i);
  if(n>=0xd800&&n<=0xdbff){
   const next=source.charCodeAt(i+1);
   if(next>=0xdc00&&next<=0xdfff){n=0x10000+((n-0xd800)<<10)+(next-0xdc00);i++;}
   else n=0xfffd;
  }else if(n>=0xdc00&&n<=0xdfff)n=0xfffd;
  if(n<0x80)out.push(n);
  else if(n<0x800)out.push(0xc0|(n>>>6),0x80|(n&63));
  else if(n<0x10000)out.push(0xe0|(n>>>12),0x80|((n>>>6)&63),0x80|(n&63));
  else out.push(0xf0|(n>>>18),0x80|((n>>>12)&63),0x80|((n>>>6)&63),0x80|(n&63));
 }
 return out;
}
const rotr=(v,b)=>(v>>>b)|(v<<(32-b));
export function sha256Utf8(source){
 if(typeof source!=='string'||source.length>LIMIT)throw new RangeError('SHA-256 input must be a string of at most 65536 UTF-16 code units.');
 const bytes=utf8Bytes(source);
 if(bytes.length>LIMIT)throw new RangeError('SHA-256 source exceeds 128 KiB UTF-8.');
 const size=Math.ceil((bytes.length+9)/64)*64;
 const block=new Uint8Array(size);
 block.set(bytes);block[bytes.length]=0x80;
 const bits=bytes.length*8;
 block[size-4]=(bits>>>24)&255;block[size-3]=(bits>>>16)&255;block[size-2]=(bits>>>8)&255;block[size-1]=bits&255;
 const h=H0.slice(),w=new Uint32Array(64);
 for(let offset=0;offset<size;offset+=64){
  for(let i=0;i<16;i++){
   const j=offset+4*i;
   w[i]=((block[j]<<24)|(block[j+1]<<16)|(block[j+2]<<8)|block[j+3])>>>0;
  }
  for(let i=16;i<64;i++){
   const x=w[i-15],y=w[i-2];
   const s0=rotr(x,7)^rotr(x,18)^(x>>>3);
   const s1=rotr(y,17)^rotr(y,19)^(y>>>10);
   w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
  }
  let [a,b,c,d,e,f,g,k]=h;
  for(let i=0;i<64;i++){
   const s1=rotr(e,6)^rotr(e,11)^rotr(e,25);
   const choice=(e&f)^(~e&g);
   const t1=(k+s1+choice+K[i]+w[i])>>>0;
   const s0=rotr(a,2)^rotr(a,13)^rotr(a,22);
   const majority=(a&b)^(a&c)^(b&c);
   const t2=(s0+majority)>>>0;
   k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  const next=[a,b,c,d,e,f,g,k];
  for(let i=0;i<8;i++)h[i]=(h[i]+next[i])>>>0;
 }
 return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function position(source,offset){
 const prior=source.slice(0,offset);
 const last=prior.lastIndexOf('\n');
 return {line:prior.split('\n').length,column_utf16:offset-last};
}
export function sourceAnchor(source,start,end,sourceSha256){
 if(typeof source!=='string'||source.length>LIMIT||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)
  throw new RangeError('Source anchor must refer to a nonempty original UTF-16 span.');
 const digest=sourceSha256===undefined?sha256Utf8(source):sourceSha256;
 if(typeof digest!=='string'||!/^[0-9a-f]{64}$/.test(digest))throw new TypeError('Invalid SHA-256 digest.');
 const a=position(source,start),b=position(source,end-1);
 return {schema:SOURCE_ANCHOR_SCHEMA,start_utf16:start,end_utf16:end,
  line_start:a.line,column_start_utf16:a.column_utf16,line_end:b.line,column_end_utf16:b.column_utf16,
  exact_excerpt:source.slice(start,Math.min(end,start+EXCERPT_LIMIT)),
  span_sha256:sha256Utf8(source.slice(start,end)),source_sha256:digest};
}
/** False, not a proof claim, for stale or altered source, offset or digest metadata. */
export function verifySourceAnchor(source,anchor){
 if(!anchor||typeof anchor!=='object'||anchor.schema!==SOURCE_ANCHOR_SCHEMA)return false;
 try{
  const actual=sourceAnchor(source,anchor.start_utf16,anchor.end_utf16);
  return Object.keys(actual).every(key=>anchor[key]===actual[key]);
 }catch(_error){return false;}
}
