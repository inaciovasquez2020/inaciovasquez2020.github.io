"""Offline replay smoke tests against a vetted checker supplied explicitly.

Run: python3 math-lab/test_replay_casebook.py --checker /path/to/urf-textbook/tools/math_audit.py
Not part of GitHub Pages CI unless a reviewed checker is made available.
"""
import argparse
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('casebook_replay',HERE/'replay_casebook.py')
replay=importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)
CHECKER=None
class ReplayTests(unittest.TestCase):
    def setUp(self):
        case={'id':'VR-TEST','domain':'R','variable':'x','lhs':'(x+1)**2','rhs':'(x**2+2*x+1)'}
        self.base={'schema':'vasquez.math-lab.casebook.v0.1','cases':[
           {'schema':'vasquez.math-lab.case.v0.1','kind':'exact_polynomial',
            'manifest':{'claim_id':'VR-TEST','source_reference':'Manual entry','field':'algebra','subcategory':'polynomial-identities','assumptions':[]},
            'classification':{'field':'algebra','subcategory':'polynomial-identities','coverage':'EXACT_SUPPORTED','method':'exact-polynomial','taxonomy_version':'vasquez.math-lab.taxonomy.v0.1'},
            'canonical_claim':case,'expected_status':'EXACT_CERTIFICATE_PASS',
            'degree_upper_bound':2,'initial_witness_x':None,
            'probes':[{'outcome':'PASS','expected_status':'EXACT_CERTIFICATE_PASS',
                       'observed_status':'EXACT_CERTIFICATE_PASS','witness_x':None,
                       'candidate_claim':case}],
            'probes_passed':1,'probes_skipped':0,
            'status':'REGRESSION_CANDIDATE','promotion':'NOT_APPROVED'}]}
    def test_replays_authentic(self):
        self.assertEqual(replay.run(self.base,CHECKER)[0]['status'],'PYTHON_REPLAY_PASS')
    def test_detects_forged_status(self):
        x=copy.deepcopy(self.base);x['cases'][0]['expected_status']='REFUTED'
        with self.assertRaises(replay.ReplayFailure):replay.run(x,CHECKER)
    def test_detects_forged_probes(self):
        x=copy.deepcopy(self.base);x['cases'][0]['probes'][0]['candidate_claim']['rhs']='x**2+1'
        with self.assertRaises(replay.ReplayFailure):replay.run(x,CHECKER)
    def test_detects_forged_witness(self):
        x=copy.deepcopy(self.base);x['cases'][0]['initial_witness_x']=0
        with self.assertRaises(replay.ReplayFailure):replay.run(x,CHECKER)
    def test_detects_unauthorized_promotion(self):
        x=copy.deepcopy(self.base);x['cases'][0]['promotion']='APPROVED'
        with self.assertRaises(replay.ReplayFailure):replay.run(x,CHECKER)
    def test_manuscript_not_verified(self):
        x=copy.deepcopy(self.base);x['cases']=[{'schema':'vasquez.math-lab.case.v0.1',
          'kind':'manuscript_inventory','manifest':{'claim_id':'X','source_reference':'Manual','field':'probability-information','subcategory':'entropy-capacity','assumptions':[]},
          'classification':{'field':'probability-information','subcategory':'entropy-capacity','coverage':'STRUCTURAL_ONLY','method':'manuscript-audit','taxonomy_version':'vasquez.math-lab.taxonomy.v0.1'},
          'status':'INCOMPLETE_SOURCE_REQUIRED'}]
        self.assertEqual(replay.run(x,CHECKER)[0]['status'],'NOT_VERIFIED')
    def test_rejects_forged_taxonomy(self):
        x=copy.deepcopy(self.base)
        x['cases'][0]['classification']['field']='topology'
        with self.assertRaises(replay.ReplayFailure): replay.run(x,CHECKER)
        y=copy.deepcopy(self.base)
        y['cases'][0]['manifest']['field']='topology'
        y['cases'][0]['manifest']['subcategory']='manifold-topology'
        y['cases'][0]['classification'].update({'field':'topology','subcategory':'manifold-topology'})
        with self.assertRaises(replay.ReplayFailure): replay.run(y,CHECKER)
    def test_rejects_empty(self):
        x=copy.deepcopy(self.base);x['cases']=[]
        with self.assertRaises(replay.ReplayFailure):replay.run(x,CHECKER)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--checker',required=True)
    args=p.parse_args()
    CHECKER=replay.checker_module(args.checker)
    unittest.main(argv=[sys.argv[0]],verbosity=2)
