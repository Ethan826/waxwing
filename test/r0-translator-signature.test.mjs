import test from 'node:test';
import assert from 'node:assert/strict';
import { Bool, Int, Text, disjoint, eq, fv, lacks, rec, ruleEntries, rv,
  translated, tv, typeAt, varInfo } from './r0-translator-support.mjs';

// RT1's translator, rule by rule (Task 3.3): the declaration's rules,
// T-R0b §3.1. Expected values are hand-derived from the rule tables.
const signature = translated(`
type Holder(...r) = Holder({ y: Bool, ...r });
fn f(p: { a: Int, ...r }, h: Holder({ z: Int, ...t }), j: { ...u, ...w }): Int
    where r lacks { c, d }, u disjoint w = p.a;
fn main(): Text = "x";
`);
const f = signature.f;
const main = 'fn main(): Int = 0;';

test('Sig1: rigid record rows by VarId; the effect row is erased', () => {
  assert.deepEqual(f.rigidRow, [rv(0), rv(1), rv(2), rv(3)]);
  assert.deepEqual(f.rigidTy, []);
  assert.deepEqual(varInfo(f, rv(2)),
    ['row', { forall: 2 }, 'Sig1', { rigidName: 2 }]);
  assert.ok(!f.vars.some(([key]) => key.rigid === 4), 'no RowSort var');
  const typed = translated(`fn g(x: a): a = x;
${main}`).g;
  assert.deepEqual(typed.rigidTy, [rv(0)]);
  assert.deepEqual(varInfo(typed, rv(0)),
    ['type', { forall: 0 }, 'Sig1', { rigidName: 0 }]);
});

test('Sig2: parameter i is local i at ⟦T_i⟧ν_f', () => {
  assert.deepEqual(typeAt(f, 'body:FieldAccess/record'),
    rec({ a: Int }, [rv(0)]));
});

test('Sig3: the body against the declared result, at ε', () => {
  assert.deepEqual(ruleEntries(f, 'Sig3'), [['b', 'body:', 0, 'B1', 'body',
    eq(tv(fv('body:', { field: 'a' })), Int)]]);
});

test('Sig4 and Sig5: written clauses, per label and per pair', () => {
  assert.deepEqual(ruleEntries(f, 'Sig4'), [
    ['d', 'constraints:0', 0, 'A1', 'contract', lacks(rv(0), 'c')],
    ['d', 'constraints:0', 1, 'A1', 'contract', lacks(rv(0), 'd')]]);
  assert.deepEqual(ruleEntries(f, 'Sig5'), [
    ['d', 'constraints:1', 0, 'A2', 'contract', disjoint(rv(2), rv(3))]]);
});

test('Sig6 and Sig7: implied lacks per written label; joined pairs', () => {
  assert.deepEqual(ruleEntries(f, 'Sig6'), [
    ['d', 'parameters:0', 0, 'A3', 'types', lacks(rv(0), 'a')],
    ['d', 'parameters:1', 0, 'A3', 'types', lacks(rv(1), 'z')]]);
  assert.deepEqual(ruleEntries(f, 'Sig7'), [
    ['d', 'joined:0', 0, 'A4', 'types', disjoint(rv(2), rv(3))]]);
});

test('Sig6 reaches records at any depth, results and effect rows', () => {
  const deep = translated(`
effect E(x) { fn op(): x; };
fn g(k: Int -> { b: { c: Int, ...s } }): { d: Int, ...s }
    with E({ e: Int, ...s }) = crash("no");
${main}`).g;
  assert.deepEqual(ruleEntries(deep, 'Sig6').map(([, path, index, , ,
    value]) => [path, index, value]), [
    ['parameters:0', 0, lacks(rv(0), 'c')],
    ['result:', 0, lacks(rv(0), 'd')],
    ['result:row', 0, lacks(rv(0), 'e')]]);
  const arrowRow = translated(`
effect E(x) { fn op(): x; };
fn g(k: Int -> Int with E({ f: Int, ...s })): Int = 1;
${main}`).g;
  assert.deepEqual(ruleEntries(arrowRow, 'Sig6'),
    [['d', 'parameters:0', 0, 'A3', 'types', lacks(rv(0), 'f')]]);
});

test('Sig8: a declared type\'s record argument, and its marker', () => {
  assert.deepEqual(ruleEntries(f, 'Sig8'), [
    ['d', 'parameters:1', 0, 'A5', 'types', lacks(rv(1), 'y')],
    ['outside', 'parameters:1', 1, 'O5', 'types', 'DataOverRecords']]);
  const list = translated(`
type List(a) = Nil | Cons(a, List(a));
fn g(xs: List(Int)): List(Bool) = Nil;
${main}`).g;
  assert.deepEqual(ruleEntries(list, 'Sig8'), [
    ['outside', 'parameters:0', 0, 'F8', 'types', 'DataApplication'],
    ['outside', 'result:', 0, 'F8', 'types', 'DataApplication']]);
});

test('Sig9 and Sig10: Q empty; the entry\'s result printable', () => {
  assert.deepEqual([f.q, signature.main.q], [[], []]);
  assert.deepEqual(ruleEntries(f, 'Sig10'), []);
  assert.deepEqual(ruleEntries(signature.main, 'Sig10'),
    [['bq', 'result:', 0, 'C5', 'contract', { pr: Text }]]);
});

test('Sig3 with a boolean result, for the record of `main`', () => {
  const main = translated('fn main(): Bool = true;').main;
  assert.deepEqual(ruleEntries(main, 'Sig3'),
    [['b', 'body:', 0, 'B1', 'body', eq(Bool, Bool)]]);
});
