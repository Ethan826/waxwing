import test from 'node:test';
import assert from 'node:assert/strict';
import { B, app, eq, fresh, fun, generated, rec, rigid, ruleEntries,
  tv } from './r0-generate-support.mjs';
import { problemFindings } from './r0-generate-checks.mjs';

// R0 Task 3.2 (b): T-R0b §3.2-§3.3, E1-E16, each pinned by a
// hand-checked list of `(AtomId, entry)` as `[list, path, index,
// value]`; RT7's checks on every fixture. Index order is reading 4 of
// docs/findings.md "RT1's translator": listed entries, then markers.
const main = '\nfn main(): Int = 1;\n';
const at = (steps, role) => tv(fresh(steps, role));
const inst = (steps, index) => fresh(steps, { inst: index });
const res = steps => at(steps, 'res');
const pinned = (source, name, rule, expected) => {
  const { decl, problem } = generated(source + main, name);
  assert.deepEqual(ruleEntries(problem, rule), expected, rule);
  assert.deepEqual(problemFindings(decl, problem), [], rule);
  return problem;
};

test('E1, E2: literals and locals add no entry; types are recorded', () => {
  const { problem } = generated('fn f(x: Int): Int = x;' + main);
  assert.deepEqual(problem.types, [[{ root: 'body', steps: [] }, B('Int')]]);
  assert.deepEqual(problem.b.map(entry => entry.origin.rule), ['Sig3']);
});

const callee = 'fn g(p: { a: Int, ...r }, n: x): x where r lacks { c } = n;\n';
test('E5: θ(D_g) written, implied, adm, split, then argument equations',
  () => {
    const problem = pinned(callee + 'fn f(): Int = g({ a: 1 }, 2);', 'f',
      'E5', [
        ['b', ['body'], 0, { lacks: [inst([], 1), 'c'] }],
        ['b', ['body'], 1, { lacks: [inst([], 1), 'a'] }],
        ['adm', ['body'], 2, { callee: { function: 0 },
          slots: [inst([], 0), inst([], 1)] }],
        ['split', ['body'], 3, { callee: { function: 0 },
          slots: [inst([], 1)] }],
        ['b', ['body'], 4, eq(rec([['a', B('Int')]]),
          rec([['a', B('Int')]], [inst([], 1)]))],
        ['b', ['body'], 5, eq(B('Int'), tv(inst([], 0)))]]);
    assert.deepEqual(problem.b.filter(entry => entry.origin.rule === 'E5')
      .map(entry => [entry.origin.row, entry.origin.kind]),
    [['F2', 'inst'], ['F3', 'inst'], ['F1', 'body'], ['F1', 'body']]);
    assert.deepEqual(problem.vars.map(([variable, info]) =>
      [variable, info.sort, info.position]), [
      [inst([], 0), 'type', { slot: [{ root: 'body', steps: [] }, 0] }],
      [inst([], 1), 'row', { slot: [{ root: 'body', steps: [] }, 1] }]]);
  });

test('E5 over-applied: ⟨p, res⟩ and the over-application atom (B1)', () => {
  pinned('fn inc(n: Int): Int = n + 1;\nfn two(): (Int) -> Int = inc;\n'
    + 'fn f(): Int = two(5);', 'f', 'E5', [
    ['adm', ['body'], 0, { callee: { function: 1 }, slots: [] }],
    ['b', ['body'], 1, eq(fun([B('Int')], B('Int')),
      fun([B('Int')], res([])))]]);
});

test('E3: an adm site per reference, slots every inst variable', () => {
  const problem = pinned('fn id(n: x): x = n;\nfn f(): (Int) -> Int = id;',
    'f', 'E3', [['adm', ['body'], 0, { callee: { function: 0 },
      slots: [inst([], 0)] }]]);
  assert.deepEqual(problem.types[0][1], fun([tv(inst([], 0))],
    tv(inst([], 0))));
});

// `Hold` makes `Box` a holder, outside Scope A's boundary (dossier
// §18.198), so it keeps its marker; the in-scope pair follows E6.
const box = 'type Box(a) = Box(a) | Hold(Unit -> Unit);\n';
const inBox = 'type Box(a) = Box(a);\n';
test('E4: the owner\'s app is marked DataApplication (F8, inst)', () => {
  const problem = pinned(box + 'fn f(): (Int) -> Box(Int) = Box;', 'f',
    'E4', [['outside', ['body'], 0, 'DataApplication']]);
  assert.deepEqual(problem.types[0][1], fun([tv(inst([], 0))],
    app({ data: 0 }, [tv(inst([], 0))])));
});

test('E6 over-applied: F1 at 0, B1 at 1, the marker at 2', () => {
  pinned(box + 'fn f(): Int = Box(1, 2);', 'f', 'E6', [
    ['b', ['body'], 0, eq(B('Int'), tv(inst([], 0)))],
    ['b', ['body'], 1, eq(app({ data: 0 }, [tv(inst([], 0))]),
      fun([B('Int')], res([])))],
    ['outside', ['body'], 2, 'DataApplication']]);
});

test('Scope A: an in-scope head records its app with no marker', () => {
  const problem = pinned(inBox + 'fn f(): (Int) -> Box(Int) = Box;', 'f',
    'E4', []);
  assert.deepEqual(problem.types[0][1], fun([tv(inst([], 0))],
    app({ data: 0 }, [tv(inst([], 0))])));
  pinned(inBox + 'fn f(): Int = Box(1, 2);', 'f', 'E6', [
    ['b', ['body'], 0, eq(B('Int'), tv(inst([], 0)))],
    ['b', ['body'], 1, eq(app({ data: 0 }, [tv(inst([], 0))]),
      fun([B('Int')], res([])))]]);
});

const ops = 'fn f(x: Int, t: Text): Bool = '
  + 'if x < 1 then t == "${t}!" ++ "a" else true;';
test('E7-E11: operators and if', () => {
  const right = ['If', 'then', 'Compare', 'right'];
  pinned(ops, 'f', 'E11', [
    ['b', ['body'], 0, eq(B('Bool'), B('Bool'))],
    ['b', ['body'], 1, eq(B('Bool'), res([]))],
    ['b', ['body'], 2, eq(B('Bool'), res([]))]]);
  pinned(ops, 'f', 'E10', [
    ['b', ['body', 'If', 'condition'], 0, eq(B('Int'), B('Int'))],
    ['bq', ['body', 'If', 'condition'], 1, { cmp: B('Int') }],
    ['b', ['body', 'If', 'then'], 0, eq(B('Text'), B('Text'))],
    ['bq', ['body', 'If', 'then'], 1, { cmp: B('Text') }]]);
  pinned(ops, 'f', 'E8', [0, 1].map(index =>
    ['b', ['body', ...right], index, eq(B('Text'), B('Text'))]));
  pinned(ops, 'f', 'E9', [0, 1].map(index =>
    ['b', ['body', ...right, 'Concat', 'left'], index,
      eq(B('Text'), B('Text'))]));
  pinned('fn f(x: Int): Int = x + 1;', 'f', 'E7', [0, 1].map(index =>
    ['b', ['body'], index, eq(B('Int'), B('Int'))]));
  // `cmp` is at the left operand only (T-R0b §3.3 note).
  const field = at(['Compare', 'left'], { field: 'a' });
  pinned('fn f(p: { a: Int, ...r }): Bool = p.a == 1;', 'f', 'E10', [
    ['b', ['body'], 0, eq(field, B('Int'))],
    ['bq', ['body'], 1, { cmp: field }]]);
});

test('E14, E15: application and pipe against ⟨p, res⟩', () => {
  const source = 'fn f(k: (Int) -> Int, x: Int): Int = (x |> k) + k(1);';
  const arrow = fun([B('Int')], B('Int'));
  pinned(source, 'f', 'E15', [['b', ['body', 'Add', 'left'], 0,
    eq(arrow, fun([B('Int')], res(['Add', 'left'])))]]);
  pinned(source, 'f', 'E14', [['b', ['body', 'Add', 'right'], 0,
    eq(arrow, fun([B('Int')], res(['Add', 'right'])))]]);
});

test('E13: unannotated param k, annotated with its definedness atom', () => {
  const problem = pinned('fn f(): (Int) -> Bool = fn(x, _: Bool) => true;',
    'f', 'E13', [['b', ['body'], 0, eq(B('Bool'), B('Bool'))]]);
  assert.equal(problem.b[1].origin.row, 'B14');
  assert.equal(problem.b[1].origin.kind, 'types');
  assert.deepEqual(problem.types[0][1],
    fun([at([], { param: 0 }), B('Bool')], B('Bool')));
  assert.deepEqual(problem.vars[0][1].position,
    { paramType: [{ root: 'body', steps: [] }, 0] });
});

test('E12: each arm\'s body against ⟨p, res⟩', () => {
  pinned('fn f(b: Bool): Int = match b { true => 1, false => 0 };', 'f',
    'E12', [0, 1].map(index => ['b', ['body'], index,
      eq(B('Int'), res([]))]));
});

test('E16: defer at the item: eq τ_e Unit, then Outside Deferred', () => {
  const problem = pinned('fn f(x: Int): Int = { let y = x; '
    + 'defer Console.print(y); Console.print(y); y };', 'f', 'E16', [
    ['b', ['body', 'Block', 'items', 1], 0, eq(B('Unit'), B('Unit'))],
    ['outside', ['body', 'Block', 'items', 1], 1, 'Deferred']]);
  assert.deepEqual(problem.types.map(([path]) => path.steps.join('/')), [
    '', 'Block/items/0/Let/value', 'Block/items/1/Defer/value',
    'Block/items/1/Defer/value/Print/args/0', 'Block/items/2/Discard/value',
    'Block/items/2/Discard/value/Print/args/0', 'Block/result']);
});

test('the rigid variables a body mentions are Sig1\'s', () => {
  const { problem } = generated('fn f(p: { a: Int, ...r }): Int = p.a;'
    + main);
  assert.deepEqual(problem.rigidRow, [rigid(0)]);
});
