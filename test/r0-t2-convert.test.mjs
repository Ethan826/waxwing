import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { shape } from './r0-t2-rows-cases.mjs';

// Tranche 2 Task 8 (design §C.8, §E): the live-type converter the row
// read-back uses and Task 10's type images will reuse. Live types are
// built directly; holes are already renumbered. Fixture-level.
const Convert = await load('Features.Check.Strategy.ReadBack.Convert');
const Core = await load('Domain.Type.Core');
const Row = await load('Domain.Row');
const Checked = await load('Domain.Checked.Internal');
const P = await load('Domain.Verdict.EffectPackage.Types');
const Atom = await load('Domain.Recorded.Atom');
const { holeVar } = await load('Domain.Recorded.Hole');
const { Just, Nothing } = await load('Data.Maybe');
const { Tuple } = await load('Data.Tuple');
const Sets = await load('Data.Set');

const hole = n => new Checked.Hole(n);
const user = new Row.UserEffect(7);
const label = (effect, args, mark) => new Row.Label(effect, args, mark);
const row = (labels, tail) => new Row.Row(labels,
  tail === null ? Nothing.value : new Just(tail));
const terms = mark => new Just(mark instanceof Row.MarkVariable
  ? new P.TermJ(Sets.singleton(mark.value0)) : P.TermM.value);
const convert = ty => Convert.convertTy(terms)(ty);
const right = found => {
  assert.equal(found.constructor.name, 'Right');
  return shape(found.value0);
};
const prow = (labels, tail) => ({ labels, tail: tail === null
  ? shape(Nothing.value) : shape(new Just(tail)) });
const plabel = (effect, args, mark) => ({ effect: shape(effect),
  args: args.map(shape), mark: shape(mark) });
const meta = new Row.MarkMeta(3);
const logRow = row([label(user, [], meta)], hole(3));
const logPRow = prow([plabel(user, [], P.TermM.value)], new P.PTailHole(3));

test('an arrow keeps its row', () => {
  assert.deepEqual(right(convert(new Core.TFun(Core.TInt.value, logRow,
    Core.TBool.value))), { PArrow: [shape(new P.PBase(Atom.IntBase.value)),
    logPRow, shape(new P.PBase(Atom.BoolBase.value))] });
});

test('a handler keeps R and C, and an absent C stays absent', () => {
  const k = label(user, [Core.TInt.value], new Row.MarkVariable('k'));
  const both = right(convert(new Core.THandler(k, { inference: logRow,
    clauses: new Just(row([], null)) })));
  assert.deepEqual(both.PHandler[0], plabel(user, [new P.PBase(
    Atom.IntBase.value)], new P.TermJ(Sets.singleton('k'))));
  assert.deepEqual(both.PHandler[1], { inference: logPRow,
    clauses: shape(new Just({ labels: [], tail: Nothing.value })) });
  const one = right(convert(new Core.THandler(k, { inference: logRow,
    clauses: Nothing.value })));
  assert.deepEqual(one.PHandler[1].clauses, shape(Nothing.value));
});

test('data rows and arguments read', () => {
  assert.deepEqual(right(convert(new Core.TData(4, [new Core.TVar(hole(2))],
    [logRow]))), { PData: [4, [shape(new P.PVar(holeVar(2)))], [logPRow]] });
});

test('record fields and tails read, holes and rigids', () => {
  const ty = new Core.TRecord({ fields: [new Tuple('a', Core.TText.value)],
    tails: [hole(5), new Checked.Rigid(1)] });
  assert.deepEqual(right(convert(ty)), { PRecord: [{
    fields: [shape(new Tuple('a', new P.PBase(Atom.TextBase.value)))],
    tails: [shape(holeVar(5)), shape(new Atom.RigidVar(1))] }] });
});

test('rigid and closed tails', () => {
  const found = Convert.convertRow(terms)(row([], new Checked.Rigid(4)));
  assert.deepEqual(shape(found.value0), prow([], new P.PTailRigid(4)));
  assert.deepEqual(shape(Convert.convertRow(terms)(row([], null)).value0),
    prow([], null));
});

test('Fail and Console are N, the payload kept', () => {
  const fail = label(Row.FailEffect.value, [Core.TText.value],
    Row.Unmarked.value);
  const console = label(Row.ConsoleEffect.value, [], Row.NoFail.value);
  const found = Convert.convertRow(terms)(row([fail, console], null));
  assert.deepEqual(shape(found.value0), prow([plabel(Row.FailEffect.value,
    [new P.PBase(Atom.TextBase.value)], P.TermN.value),
  plabel(Row.ConsoleEffect.value, [], P.TermN.value)], null));
});

test('an unmarked user label is UnmarkedLabel', () => {
  const found = Convert.convertRow(terms)(row([label(user, [],
    Row.Unmarked.value)], null));
  assert.equal(found.constructor.name, 'Left');
  assert.equal(found.value0.constructor.name, 'UnmarkedLabel');
});

// Task 11 ruling: the injected terms are `Mark → Maybe Term`; a mark
// they do not read is an unread label, never a defaulted term.
test('a mark the terms do not read is UnmarkedLabel', () => {
  const none = () => Nothing.value;
  const found = Convert.convertRow(none)(row([label(user, [],
    new Row.MarkMeta(3))], null));
  assert.equal(found.constructor.name, 'Left');
  assert.equal(found.value0.constructor.name, 'UnmarkedLabel');
  const fail = label(Row.FailEffect.value, [], new Row.MarkMeta(3));
  assert.equal(Convert.convertRow(none)(row([fail], null))
    .constructor.name, 'Right');
});

test('a deep spine converts by a loop', () => {
  let ty = Core.TInt.value;
  for (let i = 0; i < 20000; i += 1)
    ty = new Core.TFun(Core.TInt.value, row([], null), ty);
  const found = Convert.convertTy(terms)(ty);
  assert.equal(found.constructor.name, 'Right');
});
