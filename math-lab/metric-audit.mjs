// Exact local audit of ds²=-alpha(r)dt²+dr²+r²dOmega², signature -+++.
// Inputs are manually declared rational jets, not extracted manuscript claims.
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b]}return a};
function Q(n,d=1n){if(d===0n)throw Error('ZERO_DENOMINATOR');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return [n/g,d/g]}
function parse(s){if(typeof s!=='string'||!/^[-+]?\d{1,64}(?:\/\d{1,64})?$/.test(s))throw Error('RATIONAL_INPUT_REQUIRED');const [n,d='1']=s.split('/');return Q(BigInt(n),BigInt(d))}
const add=([a,b],[c,d])=>Q(a*d+c*b,b*d), neg=([a,b])=>Q(-a,b), mul=([a,b],[c,d])=>Q(a*c,b*d), div=([a,b],[c,d])=>Q(a*d,b*c);
const fmt=([a,b])=>b===1n?String(a):`${a}/${b}`;
const sign=([a])=>a<0n?'NEGATIVE':a>0n?'POSITIVE':'ZERO';
export function auditStaticFlatSpatialMetric(input){
 if(!input||input.metric!=='static-spherical-flat-spatial')throw Error('UNSUPPORTED_METRIC');
 const r=parse(input.r),a=parse(input.alpha),p=parse(input.alphaPrime),q=parse(input.alphaSecond);
 if(r[0]<=0n||a[0]<=0n)throw Error('REQUIRE_POSITIVE_R_AND_ALPHA');
 const half=Q(1n,2n),quarter=Q(1n,4n);
 // 8pi G rho=0; 8pi G pr=alpha'/(r alpha);
 // 8pi G pt=alpha''/(2 alpha)-alpha'^2/(4 alpha^2)+alpha'/(2 r alpha).
 const radial=div(p,mul(r,a));
 const ratio=div(p,a);
 const tangential=add(add(mul(half,div(q,a)),neg(mul(quarter,mul(ratio,ratio)))),mul(half,radial));
 const nec=radial[0]<0n||tangential[0]<0n?'VIOLATED':'SATISFIED_AT_POINT';
 return {schema:'static-flat-spatial-metric-jet.v1',scope:'EXACT_LOCAL_CONDITIONAL_ON_DECLARED_JET',input:{metric:input.metric,r:fmt(r),alpha:fmt(a),alphaPrime:fmt(p),alphaSecond:fmt(q)},scaledStressEnergy:{rho:'0',radialPressure:fmt(radial),tangentialPressure:fmt(tangential)},radialNEC:sign(radial),tangentialNEC:sign(tangential),nullEnergyCondition:nec,opticalIndexGradient:p[0]<0n?'POSITIVE':p[0]>0n?'NEGATIVE':'ZERO',globalDeflection:'NOT_ASSESSED',physicalRealizability:'NOT_ASSESSED',formalKernelVerified:false};
}
