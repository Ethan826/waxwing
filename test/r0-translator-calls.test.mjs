import test from 'node:test';
import assert from 'node:assert/strict';
import { Bool, Int, Text, Unit, app, disjoint, eq, fun, fv, lacks,
  nodeType, rec, ruleEntries, slot, translated, tv, typeAt, varInfo }
  from './r0-translator-support.mjs';

// RT1's translator, rule by rule (Task 3.3): leaves, references, calls,
// operators and control (T-R0b §3.2, §3.3: E1-E12). Expected values are
// hand-derived from the rule tables.
const program = translated(`
type Box(a) = Box(a);
type J(...r, ...s) = J({ ...r, ...s });
fn id(x: { a: Int, ...r }): { a: Int, ...r } where r lacks { b } = x;
fn two(x: Int, y: Int): Int = x;
fn leaves(): Unit = { let i = 1; let b = true; let t = "t"; () };
fn refs(): Int = { let g = id; let c = Box; let j = J; 0 };
fn calls(): Int = { let p = two(1); let q = two(1, 2, 3); Box(1, 2); 0 };
fn ops(n: Int): Bool = if 1 + n == 2 then "a" ++ "\${"b"}" == "c" else false;
fn arms(b: Box(Int)): Int = match b { Box(x) => x, _ => 0 };
fn main(): Int = 0;
`);
const item = (index, kind = 'Let') => `body:Block/items/${index}/${kind}/value`;
const inst = (path, index) => tv(fv(path, { inst: index }));

test('E1: literals are bases, with no entries', () => {
  const { leaves } = program;
  assert.deepEqual([0, 1, 2].map(index => typeAt(leaves, item(index))),
    [Int, Bool, Text]);
  assert.deepEqual(typeAt(leaves, 'body:Block/result'), Unit);
  assert.deepEqual(['E1', 'E2'].flatMap(rule => ruleEntries(leaves, rule)),
    []);
});

test('E2: a local reads Γ, a parameter its signature type', () => {
  assert.deepEqual(typeAt(program.id, 'body:'), rec({ a: Int },
    [{ rigid: 0 }]));
});

test('E3: a function reference, θ(D_g), adm and split sites', () => {
  const at = item(0);
  const i0 = fv(at, { inst: 0 });
  assert.deepEqual(typeAt(program.refs, at),
    fun([rec({ a: Int }, [i0])], rec({ a: Int }, [i0])));
  assert.deepEqual(ruleEntries(program.refs, 'E3'), [
    ['b', at, 0, 'F2', 'inst', lacks(i0, 'b')],
    ['b', at, 1, 'F3', 'inst', lacks(i0, 'a')],
    ['b', at, 2, 'F3', 'inst', lacks(i0, 'a')],
    ['adm', at, 3, 'F7', 'inst', { callee: { function: 0 }, slots: [i0] }],
    ['split', at, 4, 'H2', 'inst', { callee: { function: 0 }, slots: [i0] }]
  ]);
  assert.deepEqual(varInfo(program.refs, i0),
    ['row', 'exists', 'E3', slot(at, 0)]);
});

test('E4: a constructor reference, θ(c.joined) and its marker', () => {
  const box = item(1);
  const j = item(2);
  assert.deepEqual(typeAt(program.refs, box),
    fun([inst(box, 0)], app(0, [inst(box, 0)])));
  const [r, s] = [fv(j, { inst: 0 }), fv(j, { inst: 1 })];
  assert.deepEqual(typeAt(program.refs, j), fun([rec({}, [r, s])],
    app(1, [rec({}, [r]), rec({}, [s])])));
  // `Box` is in Scope A's boundary (dossier §18.200), so its reference
  // has no marker; a holder's keeps one (test/r0-generate-expr.test.mjs).
  void box;
  assert.deepEqual(ruleEntries(program.refs, 'E4'), [
    ['b', j, 0, 'F8', 'inst', disjoint(r, s)],
    ['outside', j, 1, 'O5', 'inst', 'DataOverRecords']]);
});

test('E5: argument equations; partial and over-application', () => {
  const [partial, over] = [item(0), item(1)];
  const res = fv(over, 'res');
  assert.deepEqual(typeAt(program.calls, partial), fun([Int], Int));
  assert.deepEqual(typeAt(program.calls, over), tv(res));
  const site = { callee: { function: 1 }, slots: [] };
  assert.deepEqual(ruleEntries(program.calls, 'E5'), [
    ['b', partial, 1, 'F1', 'body', eq(Int, Int)],
    ['b', over, 1, 'F1', 'body', eq(Int, Int)],
    ['b', over, 2, 'F1', 'body', eq(Int, Int)],
    ['b', over, 3, 'B1', 'body', eq(Int, fun([Int], tv(res)))],
    ['adm', partial, 0, 'F7', 'inst', site],
    ['adm', over, 0, 'F7', 'inst', site]]);
  assert.deepEqual(varInfo(program.calls, res),
    ['type', 'exists', 'E5', nodeType(over)]);
});

test('E6: E4\'s atoms, E5\'s equations, then the markers', () => {
  const at = item(2, 'Discard');
  const owner = app(0, [inst(at, 0)]);
  assert.deepEqual(ruleEntries(program.calls, 'E6'), [
    ['b', at, 0, 'F1', 'body', eq(Int, inst(at, 0))],
    ['b', at, 1, 'B1', 'body', eq(owner, fun([Int], tv(fv(at, 'res'))))]]);
  // No marker: the owner is in Scope A's boundary (dossier §18.200).
});

test('E7-E11: operators, interpolation, comparison and `if`', () => {
  const { ops } = program;
  const entries = rule => ruleEntries(ops, rule).map(([list, path, index,
    row, , value]) => [list, path, index, row, value]);
  const cond = 'body:If/condition';
  const then = 'body:If/then';
  assert.deepEqual(entries('E7'), [['b', `${cond}/Compare/left`, 0, 'B1',
    eq(Int, Int)], ['b', `${cond}/Compare/left`, 1, 'B1', eq(Int, Int)]]);
  assert.deepEqual(entries('E8'), [
    ['b', `${then}/Compare/left`, 0, 'B1', eq(Text, Text)],
    ['b', `${then}/Compare/left`, 1, 'B1', eq(Text, Text)]]);
  assert.deepEqual(entries('E9'), [['b',
    `${then}/Compare/left/Concat/right`, 0, 'B1', eq(Text, Text)]]);
  assert.deepEqual(entries('E10'), [
    ['b', cond, 0, 'B1', eq(Int, Int)], ['b', then, 0, 'B1', eq(Text, Text)],
    ['bq', cond, 1, 'C6', { cmp: Int }], ['bq', then, 1, 'C6', { cmp: Text }]
  ]);
  const res = tv(fv('body:', 'res'));
  assert.deepEqual(entries('E11'), [['b', 'body:', 0, 'B1', eq(Bool, Bool)],
    ['b', 'body:', 1, 'B1', eq(Bool, res)],
    ['b', 'body:', 2, 'B1', eq(Bool, res)]]);
});

test('E12: each arm against the scrutinee; bodies against ⟨p, res⟩', () => {
  const { arms } = program;
  const res = tv(fv('body:', 'res'));
  const pattern = 'body:Match/arms/0/pattern';
  assert.deepEqual(ruleEntries(arms, 'E12'), [
    ['b', 'body:', 0, 'B1', 'body', eq(inst(pattern, 0), res)],
    ['b', 'body:', 1, 'B1', 'body', eq(Int, res)]]);
  assert.deepEqual(typeAt(arms, 'body:Match/arms/1/pattern'),
    app(0, [Int]));
});
