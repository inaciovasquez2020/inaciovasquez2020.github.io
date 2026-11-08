#!/usr/bin/env python3
"""Read-only, opt-in, independent Python replay of Math Lab casebook candidates.

Accepts an explicitly provided trusted urf-textbook checker path. Neither this
script nor the website auto-promotes tests, modifies source, or uploads claims.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

SCHEMA = 'vasquez.math-lab.casebook.v0.1'
MAX_CASEBOOK_BYTES = 2 * 1024 * 1024
MAX_CASES = 32
MAX_PROBES = 5
VALID_STATUSES = {'EXACT_CERTIFICATE_PASS', 'REFUTED'}

class ReplayFailure(ValueError):
    pass


def no_duplicates(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise ReplayFailure('duplicate key')
        out[k] = v
    return out


def load(path):
    with Path(path).open('rb') as f:
        data = f.read(MAX_CASEBOOK_BYTES + 1)
    if len(data) > MAX_CASEBOOK_BYTES:
        raise ReplayFailure('casebook exceeds 2 MiB')
    try:
        obj = json.loads(data.decode('utf-8'), object_pairs_hook=no_duplicates)
    except (UnicodeError, json.JSONDecodeError, ValueError, RecursionError) as e:
        raise ReplayFailure('invalid casebook JSON') from e
    return obj, hashlib.sha256(data).hexdigest()


def checker_module(path):
    source = Path(path)
    if not source.is_file():
        raise ReplayFailure('trusted checker file does not exist')
    spec = importlib.util.spec_from_file_location('trusted_math_audit', source)
    module = importlib.util.module_from_spec(spec)
    if spec.loader is None:
        raise ReplayFailure('unable to load trusted checker')
    spec.loader.exec_module(module)
    return module


def check_claim(claim, expected, checker):
    if type(claim) is not dict or set(claim) != {'id', 'domain', 'variable', 'lhs', 'rhs'}:
        raise ReplayFailure('invalid exact claim shape')
    if expected not in VALID_STATUSES:
        raise ReplayFailure('unrecognized expected status')
    generated = checker.audit(claim)
    replay = checker.verify(generated, claim)
    if replay != expected:
        raise ReplayFailure('browser/Python status disagreement')
    return generated



def expected_relations(claim, status):
    """Reconstruct exact transformations, never trust labels from the casebook."""
    lhs, rhs = claim['lhs'], claim['rhs']
    relations = [
        ('swap_sides', rhs, lhs, status),
        ('add_one_to_both', f'(({lhs})+1)', f'(({rhs})+1)', status),
        ('negate_both', f'-({lhs})', f'-({rhs})', status),
        ('double_both', f'2*({lhs})', f'2*({rhs})', status),
    ]
    if status == 'EXACT_CERTIFICATE_PASS':
        relations.append(('negative_control_add_one_to_rhs', lhs, f'(({rhs})+1)', 'REFUTED'))
    return relations


def same_expression(actual, expected):
    """Compare syntax trees, not only polynomial values or a claimed relation."""
    if type(actual) is not str or type(expected) is not str:
        return False
    try:
        return ast.dump(ast.parse(actual, mode='eval'), include_attributes=False) == \
            ast.dump(ast.parse(expected, mode='eval'), include_attributes=False)
    except (SyntaxError, ValueError, RecursionError, UnicodeError):
        return False


def verify_relation(probe, index, relation, checker):
    label, expected_lhs, expected_rhs, expected_status = relation
    if type(probe) is not dict or probe.get('relation') != label:
        raise ReplayFailure(f'probe {index}: wrong, missing or reordered transformation')
    outcome = probe.get('outcome')
    if outcome == 'SKIPPED_RESOURCE_OR_GRAMMAR':
        if not isinstance(probe.get('reason'), str) or not probe['reason'] or probe.get('candidate_claim') is not None:
            raise ReplayFailure(f'probe {index}: invalid skip record')
        return 'SKIPPED'
    if outcome != 'PASS':
        raise ReplayFailure(f'probe {index}: transformation did not pass')
    candidate = probe.get('candidate_claim')
    if type(candidate) is not dict or set(candidate) != {'id', 'domain', 'variable', 'lhs', 'rhs'}:
        raise ReplayFailure(f'probe {index}: malformed transformed claim')
    if candidate['id'] != f'meta-{index}' or candidate['domain'] != 'R' or candidate['variable'] != 'x':
        raise ReplayFailure(f'probe {index}: transformed claim provenance mismatch')
    if not same_expression(candidate['lhs'], expected_lhs) or not same_expression(candidate['rhs'], expected_rhs):
        raise ReplayFailure(f'probe {index}: alleged transformation does not match original claim')
    if probe.get('expected_status') != expected_status:
        raise ReplayFailure(f'probe {index}: expected status manipulated')
    report = check_claim(candidate, expected_status, checker)
    if report['status'] != probe.get('observed_status'):
        raise ReplayFailure(f'probe {index}: reported status disagrees with Python')
    witness = report['certificate'][-1]['x'] if report['status'] == 'REFUTED' else None
    if witness != probe.get('witness_x'):
        raise ReplayFailure(f'probe {index}: witness mismatch')
    return 'PASS'


def run(casebook, checker):
    if type(casebook) is not dict or casebook.get('schema') != SCHEMA:
        raise ReplayFailure('incorrect casebook schema')
    cases = casebook.get('cases')
    if type(cases) is not list or not 1 <= len(cases) <= MAX_CASES:
        raise ReplayFailure('casebook requires 1–32 cases')
    results = []
    for index, case in enumerate(cases):
        if type(case) is not dict or case.get('schema') != 'vasquez.math-lab.case.v0.1':
            raise ReplayFailure(f'case {index}: incorrect schema')
        m = case.get('manifest')
        if type(m) is not dict or set(m) != {'claim_id','source_reference','field','subcategory','assumptions'}:
            raise ReplayFailure(f'case {index}: invalid source manifest')
        if not isinstance(m['claim_id'], str) or not isinstance(m['source_reference'], str) or not m['source_reference']:
            raise ReplayFailure(f'case {index}: invalid source reference')
        classification = case.get('classification')
        if type(classification) is not dict or classification.get('field') != m['field'] or classification.get('subcategory') != m['subcategory']:
            raise ReplayFailure(f'case {index}: classification/manifest mismatch')
        if classification.get('taxonomy_version') != 'vasquez.math-lab.taxonomy.v0.1':
            raise ReplayFailure(f'case {index}: taxonomy revision mismatch')
        kind = case.get('kind')
        if kind == 'exact_polynomial' and (m['field'] != 'algebra' or m['subcategory'] != 'polynomial-identities'
                                           or classification.get('coverage') != 'EXACT_SUPPORTED'
                                           or classification.get('method') != 'exact-polynomial'):
            raise ReplayFailure(f'case {index}: unsupported exact-algebra classification')
        if kind == 'manuscript_inventory' and classification.get('coverage') != 'STRUCTURAL_ONLY':
            raise ReplayFailure(f'case {index}: manuscript classification mismatch')
        if kind != 'exact_polynomial':
            results.append({'index':index, 'kind':kind, 'status':'NOT_VERIFIED', 'reason':'Non-algebra case requires a separate review engine'})
            continue
        claim = case.get('canonical_claim')
        if type(claim) is not dict or claim.get('id') != m['claim_id']:
            raise ReplayFailure(f'case {index}: claim ID mismatch')
        base = check_claim(claim, case.get('expected_status'), checker)
        if base['degree_upper_bound'] != case.get('degree_upper_bound'):
            raise ReplayFailure(f'case {index}: degree bound mismatch')
        witness = base['certificate'][-1]['x'] if base['status'] == 'REFUTED' else None
        if witness != case.get('initial_witness_x'):
            raise ReplayFailure(f'case {index}: first witness mismatch')
        probes = case.get('probes')
        expected = expected_relations(claim, base['status'])
        if type(probes) is not list or len(probes) != len(expected):
            raise ReplayFailure(f'case {index}: expected {len(expected)} named transformations')
        checked, skipped = 0, 0
        for j, (probe, relation) in enumerate(zip(probes, expected)):
            outcome = verify_relation(probe, j, relation, checker)
            checked += int(outcome == 'PASS')
            skipped += int(outcome == 'SKIPPED')
        if case.get('probes_passed') != checked or case.get('probes_skipped') != skipped:
            raise ReplayFailure(f'case {index}: probe count mismatch')
        if checked == 0:
            raise ReplayFailure(f'case {index}: no metamorphic probes independently replayed')
        if case.get('status') != 'REGRESSION_CANDIDATE':
            raise ReplayFailure(f'case {index}: unexpected promotion status')
        if case.get('promotion') != 'NOT_APPROVED':
            raise ReplayFailure(f'case {index}: unauthorized promotion marker')
        results.append({'index':index,'kind':kind,'status':'PYTHON_REPLAY_PASS',
                        'original_status':base['status'], 'verified_probes':checked, 'skipped':skipped})
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('casebook', help='opt-in exported casebook JSON')
    parser.add_argument('--checker', required=True, help='trusted urf-textbook tools/math_audit.py at a reviewed revision')
    parser.add_argument('--receipt', help='optional new output JSON; refuses overwrite')
    args = parser.parse_args(argv)
    try:
        casebook, h = load(args.casebook)
        checker = checker_module(args.checker)
        results = run(casebook, checker)
        output = {'schema':'vasquez.math-lab.python-replay.v0.1','input_sha256':h,
                  'checker_sha256':hashlib.sha256(Path(args.checker).read_bytes()).hexdigest(),
                  'cases':results,'promotion':'NOT_APPROVED',
                  'source_to_claim_translation':'NOT_INDEPENDENTLY_REVIEWED',
                  'mathematical_scope':'univariate integer-coefficient polynomial identities over R'}
        if args.receipt:
            with Path(args.receipt).open('x', encoding='utf-8') as f:
                json.dump(output,f,sort_keys=True,indent=2)
                f.write('\n')
        print('REPLAY := PASS')
        print('EXACT_CASES :=',sum(c['status']=='PYTHON_REPLAY_PASS' for c in results))
        print('NON_EXACT_CASES :=',sum(c['status']=='NOT_VERIFIED' for c in results))
        print('PROMOTION := NOT_APPROVED')
        return 0
    except (OSError, ValueError, TypeError, OverflowError, RecursionError) as exc:
        print('REPLAY := FAILED (' + type(exc).__name__ + ': ' + str(exc)[:200] + ')',file=sys.stderr)
        return 2

if __name__=='__main__':
    sys.exit(main())
