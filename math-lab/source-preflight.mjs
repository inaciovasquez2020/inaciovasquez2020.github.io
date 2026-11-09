import {extractEquations,UnsupportedClaim} from './engine.mjs';
import {inspectLatex} from './latex-scan.mjs';
import {sha256Utf8} from './source-location.mjs';
/** Local bounded text admission; does not execute TeX, upload, or prove claims. */
export const MAX_FILE_BYTES=65536;
export const SOURCE_PREFLIGHT_SCHEMA='vasquez.math-lab.source-preflight.v0.1';
export class SourcePreflightError extends Error {
 constructor(code){super(code);this.name='SourcePreflightError';this.code=code;}
}
const reject=code=>{throw new SourcePreflightError(code);};
const FILENAME=/^[^/\\\u0000-\u001f\u007f]{1,240}\.(?:tex|txt)$/i;
const CONTROLS=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const BIDI=/[\u202a-\u202e\u2066-\u2069]/;
export function validateSourceText(text){
 if(typeof text!=='string'||!text.trim())reject('EMPTY_SOURCE');
 if(text.length>65536)reject('SOURCE_TOO_LARGE');
 if(CONTROLS.test(text))reject('CONTROL_CHARACTER');
 if(BIDI.test(text))reject('BIDI_CONTROL');
 return text;
}
export async function preflightFile(file,method){
 if(!file||typeof file.name!=='string'||!FILENAME.test(file.name))reject('INVALID_EXTENSION_OR_NAME');
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_FILE_BYTES)reject('FILE_SIZE');
 if(method!=='exact-polynomial'&&method!=='manuscript-audit')reject('INVALID_METHOD');
 if(typeof file.arrayBuffer!=='function')reject('FILE_READ_FAILED');
 let buffer;
 try{buffer=await file.arrayBuffer();}catch(_error){reject('FILE_READ_FAILED');}
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==file.size||buffer.byteLength>MAX_FILE_BYTES)reject('BYTE_COUNT_MISMATCH');
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 catch(_error){reject('INVALID_UTF8');}
 validateSourceText(text);
 let candidates=[],status='READY',extraction_flags=0;
 if(method==='exact-polynomial'){
  try{candidates=extractEquations(text);}
  catch(error){if(error instanceof UnsupportedClaim)reject('UNSUPPORTED_EXACT_SOURCE');throw error;}
  if(!candidates.length)reject('NO_SUPPORTED_EQUATION');
 }else{
  const scan=inspectLatex(text);
  extraction_flags=scan.flags.length;
  if(scan.status==='REVIEW_REQUIRED'||scan.flags_truncated)status='REVIEW_REQUIRED';
 }
 return {schema:SOURCE_PREFLIGHT_SCHEMA,status,method,text,candidates,
  filename:file.name,byte_length:buffer.byteLength,source_sha256:sha256Utf8(text),
  extraction_flags,encoding:'UTF8_STRICT',
  source_uploaded:false,mathematical_truth_assessed:false};
}
