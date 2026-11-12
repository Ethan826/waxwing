// R037 (2)'s remaining sites, dossier §18.182: Walked's `walkedRow`,
// DeclarationUse's instantiated row (Scheme `atRow`, `mapRowMarks`), and
// Function's `current` and Body's `rowOf` (Checked `rigidRow`) are
// row-level. The old forms wrapped a row in `TFun TUnit row TUnit`, ran
// the type-level operation and unwrapped it, with an arm for a non-arrow.
// They are the oracle here. Rows are plain JS (test/unify-support.mjs):
// type metas 0 and 1, rigids 4 and 5, row metas 10..12; marks vary, so a
// conversion that drops or rewrites one shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TFun, TInt, TRecord, TUnit } from '../output/Domain.Type/index.js';
import { ordVarId, renameRow } from '../output/Domain.Type.Core/index.js';
import { mapMarks, mapRowMarks } from '../output/Domain.Type.Marks/index.js';
import { MarkMeta, Plain, closedRow } from '../output/Domain.Row/index.js';
import { Nothing } from '../output/Data.Maybe/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';
import { desugaredType }
  from '../output/Features.Check.RowMerge.Desugar/index.js';
import * as checked from '../output/Domain.Checked.Internal/index.js';
import * as scheme from '../output/Features.Check.Scheme/index.js';
import * as subst from '../output/Features.Check.Subst/index.js';
import { Meta } from '../output/Features.Check.Subst/index.js';
import * as walked from '../output/Features.Check.Walked/index.js';
import * as unifier from '../output/Features.Check.Unify/index.js';
import * as rows from '../output/Features.Check.UnifyRow/index.js';
import { Right } from '../output/Data.Either/index.js';
import { choose, generator } from './coverage-oracle.mjs';
import { named, sourceRows } from './r0-elab-corpus-run.mjs';
import { bool, fromLabel, int, meta, plainMark, rigid,
  toRow } from './unify-support.mjs';

const cases = 400;
const plainLabel = l => ({ ...fromLabel(l), mark: plainMark(l.value2) });
const plainFlex = flexRow => ({ labels: flexRow.value0.map(plainLabel),
  tail: flexRow.value1.constructor.name === 'Just'
    ? [flexRow.value1.value0.constructor.name, flexRow.value1.value0.value0]
    : null });
// An Open row, compared through the conversion r0-entry-rows checks.
const plain = open => plainFlex(scheme.flexibleRow(open));
// Raw structure as well: `plain` reads no mark inside a label argument.
const same = (found, old) => {
  assert.deepEqual(plain(found), plain(old));
  assert.deepEqual(found, old);
};
const arrow = row => TFun.create(TUnit.value)(row)(TUnit.value);
const rowOfArrow = ty => {
  assert.ok(ty instanceof TFun, 'the old form kept the arrow');
  return ty.value1;
};

// A nested arrow's row puts labels, with marks, inside a label argument,
// so the conversions' recursion into arguments is compared too.
const nested = mark => ({ k: 'fun', args: [int, meta(1)],
  row: { labels: [{ e: 1, args: [int], mark }], tail: meta(11) } });
const genArg = next => [int, bool, meta(0), meta(1), rigid(4),
  nested('nofail'), nested({ variable: 'm' })][choose(next, 7)];
const genLabel = next => {
  const shape = choose(next, 4);
  if (shape === 0) return { e: 'console', args: [] };
  return { e: shape - 1, args: shape === 3 ? [] : [genArg(next)],
    mark: ['plain', 'nofail', 3, { variable: 'm' }][choose(next, 4)] };
};
const genRow = (next, tails) => ({
  labels: Array.from({ length: choose(next, 5) }, () => genLabel(next)),
  tail: tails[choose(next, tails.length)] });
const anyTail = [null, rigid(5), meta(10), meta(11), meta(12)];
const genSubst = next => {
  const result = rows.unifyRows(unifier.unify)(unifier.empty)(
    toRow(genRow(next, [meta(10), meta(11)])))(
    toRow(genRow(next, [null, meta(12)])));
  return result instanceof Right ? result.value0 : unifier.empty;
};
const genOpen = next => scheme.checkedRow(toRow(genRow(next, anyTail)));
// A declared row: every variable of an Open row as a signature's VarId.
// VarId is a newtype, a number at run time.
const declared = open => renameRow(ordVarId)(variable => variable.value0)(
  open);
const duplicates = { labels: [{ e: 0, args: [int] }, { e: 0, args: [int] },
  { e: 'console', args: [] }, { e: 0, args: [meta(0)], mark: 3 }],
tail: meta(10) };
const fixed = [duplicates, { labels: [], tail: null },
  { labels: [], tail: meta(11) }, { ...duplicates, tail: rigid(5) }]
  .map(row => scheme.checkedRow(toRow(row)));

test('walkedRow agrees with the arrow round trip under a substitution',
  () => {
    const next = generator(0x3712);
    for (let index = 0; index < cases + fixed.length; index += 1) {
      const found = genSubst(next);
      const open = fixed[index] ?? genOpen(next);
      const old = rowOfArrow(scheme.opened(arrow(
        subst.walkRow(found)(scheme.flexibleRow(open)))));
      same(walked.walkedRow(found)(open), old);
    }
  });

test('walkedRow splices a bound tail\'s labels, duplicates kept', () => {
  // [E0(Int) | 10] against [E0(Int), E1, E0(Int)]: 10 := [E1, E0(Int)].
  const written = { labels: [{ e: 0, args: [int] }], tail: meta(10) };
  const result = rows.unifyRows(unifier.unify)(unifier.empty)(
    toRow(written))(toRow({ labels: [{ e: 0, args: [int] },
    { e: 1, args: [] }, { e: 0, args: [int] }], tail: null }));
  assert.ok(result instanceof Right);
  const found = plain(walked.walkedRow(result.value0)(
    scheme.checkedRow(toRow(written))));
  assert.deepEqual(found.labels.map(l => [l.e, l.args]),
    [[0, [int]], [1, []], [0, [int]]]);
  assert.equal(found.tail, null);
});

// A mark change that tells every input mark apart.
const remark = mark => MarkMeta.create(mark === Plain.value ? 7
  : mark instanceof MarkMeta ? 20 + mark.value0 : 8);

test('atRow, with and without marks, agrees with at on the arrow', () => {
  const next = generator(0x3713);
  for (let index = 0; index < cases + fixed.length; index += 1) {
    const row = declared(fixed[index] ?? genOpen(next));
    const use = { arguments: [], base: choose(next, 30) };
    const old = at => rowOfArrow(scheme.at(use)(arrow(at)));
    same(scheme.atRow(use)(row), old(row));
    same(mapRowMarks(remark)(scheme.atRow(use)(row)),
      rowOfArrow(mapMarks(remark)(scheme.at(use)(arrow(row)))));
  }
});

test('atRow shifts every variable by the use\'s base', () => {
  const row = declared(scheme.checkedRow(toRow(duplicates)));
  const found = plain(scheme.atRow({ arguments: [], base: 100 })(row));
  assert.deepEqual(found.labels.map(l => [l.e, l.args]),
    [[0, [int]], [0, [int]], ['console', []], [0, [meta(100)]]]);
  assert.deepEqual(found.tail, ['Meta', 110]);
});

test('rigidRow agrees with rigid on the arrow', () => {
  const next = generator(0x3714);
  for (let index = 0; index < cases + fixed.length; index += 1) {
    const row = declared(fixed[index] ?? genOpen(next));
    same(checked.rigidRow(row), rowOfArrow(checked.rigid(arrow(row))));
  }
});

// End to end, Body's `rowOf`: each elaborated declaration's row is its
// written row, rigid, as the old form gave it; `main`'s tail is closed
// (Body's provisional fallback). Effect-erased T2 does not read rows.
const program = 'effect Two { fn two(a: Int, b: Int): Int; };\n'
  + 'fn fully(): Int with Two = Two.two(1, 2);\n'
  + 'fn both(): Unit with Two + Console = '
  + '{ Console.print(Two.two(1, 2)) };\n'
  + 'fn main(): Unit with Console = Console.print(1);\n';

test('Body: an elaborated declaration keeps its written row', () => {
  const found = sourceRows({ origin: 'site-rows', source: program });
  const names = found.map(row => row.decl.name);
  assert.deepEqual(names, ['fully', 'both', 'main']);
  for (const row of found) {
    assert.equal(named(row.elaborated), 'Elaborated', row.decl.name);
    const old = plain(rowOfArrow(checked.rigid(arrow(row.decl.row))));
    // `main`'s written row has a tail variable, which Body closes.
    if (row.decl.name === 'main') assert.notEqual(old.tail, null);
    const expected = row.decl.name === 'main' ? { ...old, tail: null } : old;
    const elaborated = plain(row.elaborated.value0.row);
    assert.ok(elaborated.labels.length > 0, row.decl.name);
    assert.deepEqual(elaborated, expected, row.decl.name);
  }
});

// Desugar's `freshRow`: a record with fewer than two unknown tails is
// left as written, so a closed record in a type that has a row of
// several unknown tails gets no invented tail. The old code passes too:
// its guard made the `Meta 0` default unreachable (dossier §18.181).
// This catches that default restored without the guard (mutants.mjs).
// `desugaredType` rebuilds every record of such a type.
test('Desugar: a closed record beside a several-tail one stays closed',
  () => {
    const record = (fields, tails) => TRecord.create({ fields: fields.map(
      ([name, ty]) => Tuple.create(name)(ty)), tails });
    const several = record([['a', TInt.value]],
      [Meta.create(1), Meta.create(2)]);
    const closedRecord = record([['b', TInt.value]], []);
    const oneTail = record([['c', TInt.value]], [Meta.create(3)]);
    const ty = TFun.create(several)(closedRow)(
      TFun.create(closedRecord)(closedRow)(oneTail));
    const found = desugaredType(Nothing.value)(ty)(unifier.empty).ty;
    const tailsOf = t => t.value0.tails.map(v => [v.constructor.name,
      v.value0]);
    assert.deepEqual(tailsOf(found.value0).length, 1, 'several merged');
    assert.deepEqual(tailsOf(found.value2.value0), []);
    assert.deepEqual(tailsOf(found.value2.value2), [['Meta', 3]]);
  });
