/** Strict byte and source-length limits; keep exact engine admission unchanged. */
export const MAX_EXACT_BYTES=65536;
export const MAX_MANUSCRIPT_BYTES=131072;
export function utf8Size(text){return new TextEncoder().encode(text).byteLength;}
