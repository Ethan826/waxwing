import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { arityCases, sources } from './r0-a2-arity-cases.mjs';

// Dossier §18.148 (1) (docs/plans/2026-11-01-a2-arity-metadata.md):
// generation records the program's declared effect and data arities;
// I3's check (k) refuses an undeclared or wrong-arity application in any
// package image, unused bindings included (Malformed); record check 5
// refuses invalid metadata and recorded applications that contradict it
// (RecordDefect). Fixture-level checks of the recorded obligations.
const cases = await arityCases(load);
const { Row, Maps, Effect, Atom, P, Nothing, row, cell, int } = cases;
const Equal = await load('Features.Check.Strategy.Effects.Equal');
const Consume = await load('Features.Check.Strategy.Effects.Consume');
const { unfoldableArray } = await load('Data.Unfoldable');

const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const refName = ref => ref instanceof Row.UserEffect ? ref.value0
  : ref.constructor.name;

test('generation records the program\'s declared arities', () => {
  const { declarations } = cases.problemOf(sources.cell, 'f').effects;
  assert.deepEqual(pairs(declarations.effects).map(([ref, count]) =>
    [refName(ref), count]), [[0, 1], [1, 0], [2, 0], ['FailEffect', 1],
    ['ConsoleEffect', 0]]);
  assert.deepEqual(pairs(declarations.types), [[0, { types: 1, rows: 1 }]]);
  // Every declaration of a program records the same set.
  const other = cases.problemOf(sources.cell, 'main').effects.declarations;
  assert.deepEqual(pairs(other.types), pairs(declarations.types));
});

for (const item of cases.imageRows)
  test(`I3 (k): ${item[0]}`, () => {
    assert.equal(cases.imageFound(item), item[3]);
  });

test('the validator refuses the unused binding\'s labels as Malformed',
  () => {
    const run = bound => cases.describe(cases.validate(cases.unused,
      cases.inRow(row(bound))));
    assert.equal(run(cases.stranger()), 'Malformed Undeclared');
    assert.equal(run(cell()), 'Malformed WrongArity');
    assert.equal(run(cell(int)), 'Right');
    assert.equal(cases.describe(cases.validate(cases.unused,
      cases.honest(cases.unused))), 'Right');
  });

for (const [name, , expected, found] of cases.recordRows)
  test(`record check 5: ${name}`, () => {
    assert.equal(found(), expected);
  });

test('a contradicting record is a RecordDefect before the package', () => {
  const [, problem] = cases.recordRows.find(([name]) =>
    name === 'an undeclared label');
  assert.equal(cases.describe(cases.validate(problem, cases.honest(problem))),
    'RecordDefect');
});

// Ruling 3 (§18.148): same-key labels and data of unequal argument
// counts are refused, never compared over their common prefix (which
// agrees in every case below). I3 refuses such packages earlier; these
// obligation-level checks stay defensive.
const bool = new P.PBase(Atom.BoolBase.value);
const context = { package: cases.pkg({}), rigidMarks: [] };
const same = (left, right) =>
  Equal.samePTy(context)(left)(right).constructor.name;
const arrowOf = labels => new P.PArrow(int, row(...labels), int);
const handlerOf = head => new P.PHandler(head,
  { inference: row(), clauses: Nothing.value });

test('Equal and Handler never zip a common prefix', () => {
  for (const [left, right] of [
    [cases.job([int], [row()]), cases.job([int, bool], [row()])],
    [cases.job([int], [row()]), cases.job([int], [row(), row()])],
    [arrowOf([cell(int)]), arrowOf([cell(int, bool)])],
    [handlerOf(cell(int)), handlerOf(cell(int, bool))]]) {
    assert.equal(same(left, left), 'Right');
    assert.equal(same(left, right), 'Left');
    assert.equal(same(right, left), 'Left');
  }
});

test('Consume never zips a common prefix', () => {
  const mint = new Effect.MBase(Atom.IntBase.value);
  const mbool = new Effect.MBase(Atom.BoolBase.value);
  const mrow = (...args) => ({ labels: [{ effect: new Row.UserEffect(0),
    args, mark: new Effect.Written(Effect.FixedN.value) }],
  tail: Nothing.value });
  const consumed = (source, target) => Consume.consumeCheck(context)(
    { site: Effect.AtCall.value, source, target, marks: true, bare: false })
    .constructor.name;
  assert.equal(consumed(mrow(mint), mrow(mint)), 'Right');
  assert.equal(consumed(mrow(mint), mrow(mint, mbool)), 'Left');
  assert.equal(consumed(mrow(mint, mbool), mrow(mint)), 'Left');
});
