import copy
import json
import pathlib
import subprocess
import sys
import unittest

ROOT=pathlib.Path(__file__).resolve().parent

def from_js(expr):
    js="import {verifyBivariate} from './bivariate.mjs'; console.log(JSON.stringify(verifyBivariate(process.argv[1])));"
    p=subprocess.run(['node','--input-type=module','-e',js,'--',expr],cwd=ROOT,text=True,capture_output=True,check=True)
    return json.loads(p.stdout)

sys.path.insert(0,str(ROOT))
from replay_bivariate import replay,ReplayError,load_report

class ReplayTest(unittest.TestCase):
    def test_truths_and_counterexamples(self):
        for s in ['(x+y)^2=x^2+2*x*y+y^2','(x+y)^2=x^2+y^2','x*(x-1)*(x-2)*y*(y-1)=0','0^0=1','-x^2=-(x*x)','(x+y)^3=x^3+3*x^2*y+3*x*y^2+y^3']:
            self.assertEqual(replay(from_js(s))['status'],'REPLAY_PASS',s)
    def test_tampered_fields(self):
        original=from_js('(x+y)^2=x^2+y^2')
        modifications={
            'status':'EXACT_CERTIFICATE_PASS','grid_checks':999,'coefficient_terms':1,
            'counterexample':{'x':0,'y':0,'lhs':'0','rhs':'1'},
            'degree_upper_bounds':{'x':0,'y':0},'formal_kernel_verified':True,
            'schema':'v0','engine':'other','equation':'x=x','website_integrated':True,
            'python_replay_performed':True,'method':'fake proof','domain':'R'}
        for field,value in modifications.items():
            doc=copy.deepcopy(original);doc[field]=value
            with self.subTest(field=field):
                with self.assertRaises(ReplayError): replay(doc)
    def test_adversarial_inputs(self):
        for eq in ['1 2=12','1 000000=1000000','x=x=x','x/x=1','x**2=x*x','x^2^2=x^4','x^(2)=x*x','x**y=x','x^9=x^9','a=a','x + 1=1+x;print(1)']:
            doc=from_js('x=x');doc['equation']=eq
            with self.subTest(eq=eq):
                with self.assertRaises(ReplayError): replay(doc)
    def test_spaces_are_not_erased_from_tokens(self):
        valid=from_js('x ^ 2 + y = x * x + y')
        self.assertEqual(replay(valid)['status'],'REPLAY_PASS')
        for malformed in ['1 2=12','1 000000=1000000']:
            forged=from_js('12=12')
            forged['equation']=malformed
            with self.assertRaises(ReplayError): replay(forged)

    def test_duplicate_json_keys_rejected_before_replay(self):
        original=from_js('(x+y)^2=x^2+2*x*y+y^2')
        serialized=json.dumps(original)
        self.assertEqual(replay(load_report(serialized))['status'],'REPLAY_PASS')
        # Ambiguous root-level and nested evidence metadata must be rejected.
        forged_root=serialized.replace('"status": "EXACT_CERTIFICATE_PASS"',
            '"status": "REFUTED", "status": "EXACT_CERTIFICATE_PASS"',1)
        forged_nested=serialized.replace('"x": 2', '"x": 1, "x": 2',1)
        for raw in [forged_root,forged_nested]:
            with self.subTest(raw=raw[:120]):
                with self.assertRaisesRegex(ReplayError,'duplicate JSON key'):
                    load_report(raw)

    def test_unary_power_precedence_and_forged_pass(self):
        # JavaScript parses -x^2 as (-x)^2, unlike native Python.
        valid=from_js('-x^2=x^2')
        self.assertEqual(valid['status'],'EXACT_CERTIFICATE_PASS')
        self.assertEqual(replay(valid)['status'],'REPLAY_PASS')
        false=from_js('-x^2=-(x*x)')
        self.assertEqual(false['status'],'REFUTED')
        self.assertEqual(replay(false)['status'],'REPLAY_PASS')
        forged=copy.deepcopy(valid)
        forged['equation']='-x^2=-(x*x)'
        with self.assertRaises(ReplayError):
            replay(forged)
        for expression in ['-2^2=4', '-(2^2)=-4', '--x^2=x^2']:
            report=from_js(expression)
            self.assertEqual(replay(report)['status'],'REPLAY_PASS',expression)

    def test_deterministic_sweep(self):
        for a in range(1,11):
            for b in range(1,11):
                left=f'({a}*x+{b}*y)^2'
                right=f'{a*a}*x^2+{2*a*b}*x*y+{b*b}*y^2'
                for eq in [f'{left}={right}',f'{left}=({right})+1']:
                    self.assertEqual(replay(from_js(eq))['status'],'REPLAY_PASS',eq)
if __name__=='__main__':unittest.main()
