import test from 'node:test';
import assert from 'node:assert/strict';
import {auditManuscript} from './manuscript.mjs';
import {suggestCategory} from './taxonomy.mjs';
import {verifySourceAnchor} from './source-location.mjs';
const fixture = `Catalog-Based Discovery Saturation1
2
Independent Researcher
ABSTRACT
Infrared survey data and catalog detections.
Information proxy I = 432 N.
SELECT COUNT(*) AS N
FROM <public_survey_detection_table>
WHERE mjd >= :START_MJD_k
AND mjd < :END_MJD_k;
Angular deduplication at 1.5 arcseconds.
Tracklets contain five detections.
Association against known ephemerides.
TRUE NEW-OBJECT YIELD
Discovery saturation is measurable.
`;
test('plain scientific manuscript and source anchors',()=>{
 const r=auditManuscript(fixture);
 assert.equal(r.title,'Catalog-Based Discovery Saturation');
 assert.equal(r.status,'NOT_VERIFIED');
 assert.equal(r.formal_kernel_verified,false);
 assert.equal(r.mathematical_truth_assessed,false);
 assert.equal(r.source_uploaded,false);
 const marks=r.findings.filter(f=>f.type.startsWith('SCIENCE_'));
 assert.equal(marks.length,8);
 assert.ok(marks.every(f=>f.severity==='review'&&verifySourceAnchor(fixture,f.source_anchor)));
 assert.ok(r.findings.some(f=>f.type==='PLAIN_TEXT_MANUSCRIPT_REVIEW'));
 assert.equal(suggestCategory(fixture).subcategory,'observational-science');
});
test('late scientific prompts remain visible',()=>{
 const r=auditManuscript(' '.repeat(66000)+fixture);
 assert.equal(r.findings.filter(f=>f.type.startsWith('SCIENCE_')).length,8);
});
test('ordinary algebra and concrete query have no placeholder flag',()=>{
 const r=auditManuscript(String.raw`\title{Algebra}\[x+x=2x\]`);
 assert.equal(r.counts.displayed_math,1);
 assert.ok(!r.findings.some(f=>f.type.startsWith('SCIENCE_')));
 assert.ok(!auditManuscript('Survey detection data. SELECT COUNT(*) FROM catalog_table;').findings.some(f=>f.type==='SCIENCE_QUERY_PLACEHOLDER'));
});
