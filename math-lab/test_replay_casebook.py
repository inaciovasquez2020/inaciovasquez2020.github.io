"""Independent replay-integrity tests against a deliberately pinned Python checker.

Run: python3 math-lab/test_replay_casebook.py --checker /path/to/urf-textbook/tools/math_audit.py
These test fixtures contain generic polynomial identities, not unpublished research.
"""
import argparse
import copy
import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('casebook_replay', HERE/'replay_casebook.py')
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)
CHECKER = None

class ReplayTests(unittest.TestCase):
    def setUp(self):
        claim = {'id':'VR-TEST','domain':'R','variable':'x','lhs':'(x+1)**2','rhs':'(x**2+2*x+1)'}
        base = CHECKER.audit(claim)
        probes = []
        for i, (relation, lhs, rhs, status) in enumerate(replay.expected_relations(claim,base['status'])):
            candidate = {'id':f'meta-{i}','domain':'R','variable':'x','lhs':lhs,'rhs':rhs}
            report = CHECKER.audit(candidate)
            self.assertEqual(report['status'],status)
            probes.append({'relation':relation,'outcome':'PASS','expected_status':status,
                           'observed_status':status,
                           'witness_x':report['certificate'][-1]['x'] if status=='REFUTED' else None,
                           'candidate_claim':candidate})
        self.base = {'schema':'vasquez.math-lab.casebook.v0.1','cases':[
            {'schema':'vasquez.math-lab.case.v0.1','kind':'exact_polynomial',
             'manifest':{'claim_id':'VR-TEST','source_reference':'Manual entry','field':'algebra',
                         'subcategory':'polynomial-identities','assumptions':[]},
             'classification':{'field':'algebra','subcategory':'polynomial-identities',
                               'coverage':'EXACT_SUPPORTED','method':'exact-polynomial',
                               'taxonomy_version':'vasquez.math-lab.taxonomy.v0.1'},
             'canonical_claim':claim,'expected_status':'EXACT_CERTIFICATE_PASS',
             'degree_upper_bound':base['degree_upper_bound'],'initial_witness_x':None,
             'probes':probes,'probes_passed':len(probes),'probes_skipped':0,
             'status':'REGRESSION_CANDIDATE','promotion':'NOT_APPROVED'}]}

    def fail_when_modified(self,change):
        record=copy.deepcopy(self.base)
        change(record['cases'][0])
        with self.assertRaises(replay.ReplayFailure):
            replay.run(record,CHECKER)

    def test_authentic_structural_replay(self):
        result=replay.run(self.base,CHECKER)[0]
        self.assertEqual(result['status'],'PYTHON_REPLAY_PASS')
        self.assertEqual(result['verified_probes'],5)

    def test_detects_forged_original_status(self):
        self.fail_when_modified(lambda c:c.update(expected_status='REFUTED'))

    def test_detects_forged_candidate_mathematics(self):
        self.fail_when_modified(lambda c:c['probes'][0]['candidate_claim'].update(rhs='x**2+1'))

    def test_rejects_no_op_disguised_as_swap(self):
        # This exact forgery was accepted by PR #14's original replay implementation.
        self.fail_when_modified(lambda c:c['probes'][0]['candidate_claim'].update(
            lhs=c['canonical_claim']['lhs'],rhs=c['canonical_claim']['rhs']))

    def test_rejects_equivalent_not_the_same_transformation(self):
        self.fail_when_modified(lambda c:c['probes'][1]['candidate_claim'].update(
            lhs='(x+1)**2',rhs='(x**2+2*x+1)'))

    def test_rejects_mislabeled_relation(self):
        self.fail_when_modified(lambda c:c['probes'][0].update(relation='add_one_to_both'))

    def test_rejects_duplicate_relation(self):
        self.fail_when_modified(lambda c:c['probes'][1].update(relation='swap_sides'))

    def test_rejects_missing_negative_control(self):
        self.fail_when_modified(lambda c:c['probes'].pop())

    def test_rejects_manipulated_expected_status(self):
        self.fail_when_modified(lambda c:c['probes'][4].update(expected_status='EXACT_CERTIFICATE_PASS'))

    def test_rejects_changed_probe_id(self):
        self.fail_when_modified(lambda c:c['probes'][0]['candidate_claim'].update(id='not-meta-0'))

    def test_rejects_skipped_with_embedded_candidate(self):
        self.fail_when_modified(lambda c:c['probes'][0].update(
            outcome='SKIPPED_RESOURCE_OR_GRAMMAR',reason='claimed limit'))

    def test_rejects_forged_witness(self):
        self.fail_when_modified(lambda c:c.update(initial_witness_x=0))

    def test_rejects_forged_negative_control_witness(self):
        self.fail_when_modified(lambda c:c['probes'][4].update(witness_x=1))

    def test_rejects_unauthorized_promotion(self):
        self.fail_when_modified(lambda c:c.update(promotion='APPROVED'))

    def test_manuscript_not_verified(self):
        rec=copy.deepcopy(self.base)
        rec['cases']=[{'schema':'vasquez.math-lab.case.v0.1',
          'kind':'manuscript_inventory',
          'manifest':{'claim_id':'X','source_reference':'Manual','field':'algebra','subcategory':'abstract-algebra','assumptions':[]},
          'classification':{'field':'algebra','subcategory':'abstract-algebra','coverage':'STRUCTURAL_ONLY',
                            'method':'manuscript-audit','taxonomy_version':'vasquez.math-lab.taxonomy.v0.1'},
          'status':'INCOMPLETE_SOURCE_REQUIRED'}]
        self.assertEqual(replay.run(rec,CHECKER)[0]['status'],'NOT_VERIFIED')

    def test_rejects_forged_taxonomy(self):
        self.fail_when_modified(lambda c:c['classification'].update(field='topology'))
        self.fail_when_modified(lambda c:(c['manifest'].update(field='topology',subcategory='manifold-topology'),
             c['classification'].update(field='topology',subcategory='manifold-topology')))

    def test_rejects_empty(self):
        rec=copy.deepcopy(self.base);rec['cases']=[]
        with self.assertRaises(replay.ReplayFailure):replay.run(rec,CHECKER)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--checker',required=True)
    args=parser.parse_args()
    CHECKER=replay.checker_module(args.checker)
    unittest.main(argv=[sys.argv[0]],verbosity=2)
