#!/usr/bin/env python3
"""Independent, bounded stdlib replay for Math Lab experimental Z[x,y] reports."""
import ast
import json
import re
import sys

class ReplayError(ValueError):
    pass

def require(p, msg):
    if not p:
        raise ReplayError(msg)

LIMIT = 2048
MAX_SIZE = 8192
TOKEN = re.compile(r'\s+|\d+|[xy+*^()\-]')

def parse(source):
    """Build an AST from the browser grammar, not Python's power precedence."""
    require(isinstance(source, str) and len(source) <= 512, 'expression length')
    items = []
    offset = 0
    for m in TOKEN.finditer(source):
        require(m.start() == offset, 'unsupported expression character')
        offset = m.end()
        if not m.group().isspace():
            items.append(m.group())
    require(offset == len(source) and len(items) <= 100, 'unsupported expression / tokens')
    for item in items:
        if item[0].isdigit():
            require(int(item) <= 1000000, 'literal too large')
    pos = 0
    depth = 0

    def peek():
        return items[pos] if pos < len(items) else None

    def take(expected=None):
        nonlocal pos
        got = peek()
        require(got is not None and (expected is None or got == expected),
                'unexpected expression token')
        pos += 1
        return got

    def atom():
        nonlocal depth
        depth += 1
        require(depth <= 64, 'expression nesting')
        try:
            token = peek()
            if token is None:
                raise ReplayError('missing atom')
            if token[0].isdigit():
                return ast.Constant(value=int(take()))
            if token in ('x', 'y'):
                return ast.Name(id=take(), ctx=ast.Load())
            if token == '(':
                take('(')
                expression = summation()
                take(')')
                return expression
            raise ReplayError('invalid atom')
        finally:
            depth -= 1

    def power():
        base = atom()
        if peek() == '^':
            take('^')
            exponent = take()
            require(exponent[0].isdigit() and int(exponent) <= 8, 'literal exponent')
            return ast.BinOp(left=base, op=ast.Pow(),
                             right=ast.Constant(value=int(exponent)))
        return base

    def unary():
        nonlocal depth
        depth += 1
        require(depth <= 64, 'expression nesting')
        try:
            if peek() in ('+', '-'):
                op = ast.UAdd() if take() == '+' else ast.USub()
                return ast.UnaryOp(op=op, operand=unary())
            return power()
        finally:
            depth -= 1

    def product():
        value = unary()
        while peek() == '*':
            take('*')
            value = ast.BinOp(left=value, op=ast.Mult(), right=unary())
        return value

    def summation():
        value = product()
        while peek() in ('+', '-'):
            op = ast.Add() if take() == '+' else ast.Sub()
            value = ast.BinOp(left=value, op=op, right=product())
        return value

    root = summation()
    require(pos == len(items), 'unconsumed expression tokens')
    return root

def bits(n):
    require(abs(n).bit_length() <= LIMIT, 'integer resource limit')
    return n

def combine(a, b, op):
    out = dict(a)
    for k, v in b.items():
        t = bits(out.get(k, 0) + op*v)
        if t:
            out[k] = t
        else:
            out.pop(k, None)
    return out

def mul(a, b):
    out = {}
    for (i, j), u in a.items():
        for (k, l), v in b.items():
            key = (i+k, j+l)
            t = bits(out.get(key, 0) + bits(u*v))
            if t:
                out[key] = t
            else:
                out.pop(key, None)
    return out

def build(tree, guard):
    guard[0] += 1
    require(guard[0] <= 100, 'AST nodes')
    if isinstance(tree, ast.Constant) and type(tree.value) is int:
        require(0 <= tree.value <= 1000000, 'literal')
        return {(0, 0): tree.value} if tree.value else {}, (0, 0)
    if isinstance(tree, ast.Name) and tree.id in ('x','y'):
        key = (1, 0) if tree.id == 'x' else (0, 1)
        return {key: 1}, key
    if isinstance(tree, ast.UnaryOp) and isinstance(tree.op, (ast.USub, ast.UAdd)):
        p, d = build(tree.operand, guard)
        return ({k:bits(-v) for k,v in p.items()} if isinstance(tree.op, ast.USub) else p), d
    if isinstance(tree, ast.BinOp):
        a, da = build(tree.left, guard)
        if isinstance(tree.op, ast.Pow):
            require(isinstance(tree.right, ast.Constant) and type(tree.right.value) is int and 0 <= tree.right.value <= 8, 'power')
            exponent = tree.right.value
            d = (da[0]*exponent,da[1]*exponent)
            require(max(d) <= 8, 'degree')
            acc = {(0,0):1}
            for _ in range(exponent):
                acc = mul(acc,a)
            return acc,d
        b, db = build(tree.right, guard)
        if isinstance(tree.op, (ast.Add, ast.Sub)):
            d = max(da[0],db[0]),max(da[1],db[1])
            require(max(d) <= 8,'degree')
            return combine(a,b,-1 if isinstance(tree.op,ast.Sub) else 1), d
        if isinstance(tree.op, ast.Mult):
            d = da[0]+db[0],da[1]+db[1]
            require(max(d) <= 8,'degree')
            return mul(a,b),d
    raise ReplayError('unsupported grammar')

def eval_poly(coeffs,x,y):
    total=0
    for (i,j),value in coeffs.items():
        total=bits(total+bits(value*x**i*y**j))
    return total

def replay(report):
    require(type(report) is dict, 'report object')
    require(set(report)=={'schema','engine','equation','status','domain','degree_upper_bounds','grid_checks','coefficient_terms','counterexample','method','formal_kernel_verified','python_replay_performed','website_integrated'},'unexpected or missing report field')
    require(report['domain']=='Z[x,y]','domain')
    require(report['method']=='Independent exact sparse coefficient comparison and integer-grid evaluation; grid sizes are syntactic bidegree bounds plus one.','method')
    require(report.get('schema') == 'vasquez.math-lab.bivariate.experimental.v0.2','schema')
    require(report.get('engine') == 'vr-bivariate-experimental-v0.1','engine')
    eq=report.get('equation')
    require(isinstance(eq,str) and len(eq)<=1024 and eq.count('=')==1,'equation')
    left,right=eq.split('=')
    lp,ld=build(parse(left),[0])
    rp,rd=build(parse(right),[0])
    dx=max(ld[0],rd[0]);dy=max(ld[1],rd[1])
    mismatch=None;checks=0
    for x in range(dx+1):
        for y in range(dy+1):
            checks+=1
            a,b=eval_poly(lp,x,y),eval_poly(rp,x,y)
            if a!=b:
                mismatch={'x':x,'y':y,'lhs':str(a),'rhs':str(b)}
                break
        if mismatch is not None:
            break
    expected={'status':'REFUTED' if mismatch is not None else 'EXACT_CERTIFICATE_PASS',
              'degree_upper_bounds':{'x':dx,'y':dy},'grid_checks':checks,
              'coefficient_terms':len(lp)+len(rp),'counterexample':mismatch,
              'formal_kernel_verified':False,'python_replay_performed':False,
              'website_integrated':False}
    require((lp == rp) == (mismatch is None),'coefficient-grid disagreement')
    for key,value in expected.items():
        require(type(report.get(key)) == type(value) and report.get(key)==value,'report mismatch: '+key)
    return {'status':'REPLAY_PASS','equation':eq,'grid_checks':checks}

def reject_duplicate_keys(pairs):
    output = {}
    for key, value in pairs:
        require(key not in output, 'duplicate JSON key: '+key)
        output[key] = value
    return output

def load_report(raw):
    return json.loads(raw, object_pairs_hook=reject_duplicate_keys)

def main():
    if len(sys.argv)!=2:
        print('usage: replay_bivariate.py report.json',file=sys.stderr)
        return 2
    try:
        with open(sys.argv[1],'rb') as f:
            raw=f.read(MAX_SIZE+1)
        require(len(raw)<=MAX_SIZE,'report size')
        receipt=replay(load_report(raw))
    except (OSError,ValueError,TypeError,OverflowError,RecursionError) as exc:
        print('REPLAY_REJECT: '+str(exc),file=sys.stderr)
        return 1
    print(json.dumps(receipt,sort_keys=True))
    return 0

if __name__=='__main__':
    sys.exit(main())
