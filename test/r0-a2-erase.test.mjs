import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf } from './r0-a2-package.mjs';
import { ptyModules, randomPTys } from './r0-a2-pty-gen.mjs';

// A2 Task 2 (docs/plans/2026-10-31-a2-validator-plan.md): erasure (spec
// §2.5), settling (§2.4), reading a recorded type under a package (§2.2)
// and label keys (§4.2). The corpus check of erasure against generation's
// `recordedWith` is test/r0-a2-erase-corpus.serial.test.mjs.
const Package = await load('Features.Check.Strategy.Effects.Package');
const ReadBack = await load('Features.Check.Strategy.ReadBack.Type');
const Atom = await load('Domain.Recorded.Atom');
const Effect = await load('Domain.Recorded.Effect');
const Origin = await load('Domain.Recorded.Origin');
const Row = await load('Domain.Row');
const Hole = await load('Domain.Recorded.Hole');
const Maps = await load('Data.Map.Internal');
const Sets = await load('Data.Set');
const { Just, Nothing } = await load('Data.Maybe');
const { Tuple } = await load('Data.Tuple');
const { foldableArray } = await load('Data.Foldable');
const { unfoldableArray } = await load('Data.Unfoldable');
const M = await ptyModules(load);

const same = (left, right) => Atom.eqRTExpr.eq(left)(right);
const sameKey = (left, right) => Row.eqLabelKey.eq(left)(right);
const members = set => Sets.toUnfoldable(unfoldableArray)(set);
const fromJust = maybe => {
  assert.equal(maybe.constructor.name, 'Just');
  return maybe.value0;
};
const typeOf = value => fromJust(Maps.lookup(Atom.ordVar)(
  Hole.holeVar(0))(packageOf({ types: [[{ hole: 0 }, value]] }).types));
const closed = { labels: [], tail: null };

test('nullary data erases to DataBase', () => {
  assert.ok(same(Package.eraseTy(typeOf({ data: [5, [], []] })),
    new Atom.Base(new Atom.DataBase(5))));
  assert.ok(same(Package.eraseTy(typeOf({ data: [5, [], [closed]] })),
    new Atom.App(new Atom.DataHead(5), [])));
});

test('erase merges types and rows, dropping effects and marks', () => {
  const erased = Package.erase(packageOf({
    types: [[{ hole: 1 }, { arrow: ['Int', closed, 'Bool'] }]],
    rows: [[{ hole: 2 }, { fields: [['b', 'Unit'], ['a', 'Int']],
      tails: [{ rigid: 4 }, { hole: 3 }] }]],
    effects: [[{ effRigid: 9 }, closed]]
  }));
  assert.equal(Maps.size(erased), 2);
  const image = n => fromJust(Maps.lookup(Atom.ordVar)(Hole.holeVar(n))(
    erased));
  assert.ok(same(image(1), new Atom.Arrow(new Atom.Base(Atom.IntBase.value),
    new Atom.Base(Atom.BoolBase.value))));
  assert.ok(same(image(2), new Atom.Record(
    [new Tuple('a', new Atom.Base(Atom.IntBase.value)),
      new Tuple('b', new Atom.Base(Atom.UnitBase.value))],
    // `Ord Var` (derived): every rigid variable before every fresh one.
    [new Atom.RigidVar(4), Hole.holeVar(3)])));
});

test('settle commutes with erase', () => {
  const cases = randomPTys(M, 20261031, 2000);
  // Not vacuous: settling moves many cases' erasure (779 observed).
  assert.ok(cases.filter(type => !same(Package.eraseTy(type),
    ReadBack.settled(Package.eraseTy(type)))).length > 500);
  cases.forEach((type, index) => assert.ok(
    same(Package.eraseTy(Package.settleTy(type)),
      ReadBack.settled(Package.eraseTy(type))), `case ${index}`));
});

test('settle closes hole tails and keeps rigid ones', () => {
  const settled = Package.settle(packageOf({
    effects: [[{ effRigid: 1 }, { labels: [], tail: { hole: 3 } }],
      [{ effRigid: 2 }, { labels: [], tail: { rigid: 7 } }]]
  })).effects;
  const tail = n => fromJust(Maps.lookup(Effect.ordEVar)(
    new Effect.EffRigid(n))(settled)).tail;
  assert.equal(tail(1).constructor.name, 'Nothing');
  assert.equal(fromJust(tail(2)).value0, 7);
});

const failOf = payload => ({ effect: Row.FailEffect.value,
  args: [typeOf(payload)], mark: M.Package.TermN.value });
const keyOf = payload => Package.key(failOf(payload));

test('key of Fail', () => {
  assert.ok(sameKey(fromJust(keyOf('Int')),
    new Row.FailKey(Row.HeadInt.value)));
  for (const fields of [[['a', 'Int'], ['b', 'Bool']],
    [['b', 'Bool'], ['a', 'Int']]]) {
    const found = fromJust(keyOf({ record: { fields, tails: [] } }));
    assert.ok(found instanceof Row.FailKey);
    assert.deepEqual(found.value0.value0, ['a', 'b']);
  }
  for (const keyless of [{ var: { rigid: 1 } },
    { arrow: ['Int', closed, 'Int'] },
    { handler: [{ effect: 3, args: [], mark: 'M' },
      { inference: closed, clauses: null }] },
    { record: { fields: [['a', 'Int']], tails: [{ rigid: 2 }] } }])
    assert.equal(keyOf(keyless).constructor.name, 'Nothing',
      JSON.stringify(keyless));
  assert.ok(sameKey(fromJust(Package.key({ effect: new Row.UserEffect(4),
    args: [], mark: M.Package.TermM.value })),
  new Row.EffectKey(new Row.UserEffect(4))));
});

const path = { root: Origin.InBody.value, steps: [] }; // a newtype
const at = new Effect.Frame(path);
const markedRow = (mark, tail) => ({ labels: [{ effect: new Row.UserEffect(1),
  args: [], mark }], tail });
const arrowOf = row => new Effect.MArrow(
  new Effect.MBase(Atom.IntBase.value), row,
  new Effect.MBase(Atom.UnitBase.value));
const readMark = (spec, mark) => fromJust(Package.under(packageOf(spec))(
  arrowOf(markedRow(mark, Nothing.value)))).value1.labels[0].mark;

test('under reads written marks', () => {
  const rigid = readMark({}, new Effect.Written(new Effect.FixedRigid('k')));
  assert.ok(rigid instanceof M.Package.TermJ);
  assert.deepEqual(members(rigid.value0), ['k']);
  const placed = readMark({ marks: [[at, ['J', 'k', 'l']]] },
    new Effect.At(at));
  assert.deepEqual(members(placed.value0), ['k', 'l']);
  assert.ok(readMark({}, new Effect.Written(Effect.FixedN.value))
    instanceof M.Package.TermN);
  const unbound = new Effect.EffFresh(path, Effect.EffectOf.value);
  assert.equal(Package.under(packageOf({}))(arrowOf(markedRow(
    new Effect.Written(Effect.FixedM.value), new Just(unbound))))
    .constructor.name, 'Nothing');
  assert.equal(Package.under(packageOf({}))(arrowOf(markedRow(
    new Effect.At(at), Nothing.value))).constructor.name, 'Nothing');
});

const fresh = (step, role) => new Atom.FreshVar(
  { root: Origin.InBody.value, steps: [new Origin.Named(step)] }, role);

test('under substitutes images and keeps rigids', () => {
  const x = fresh('x', Atom.Res.value);
  const r = fresh('r', Atom.Rest.value);
  const e = new Effect.EffFresh(path, Effect.EffectOf.value);
  const recorded = new Effect.MArrow(new Effect.MVar(x),
    markedRow(new Effect.Written(Effect.FixedM.value), new Just(e)),
    new Effect.MRecord([new Tuple('b', new Effect.MVar(
      new Atom.RigidVar(1)))], [r, new Atom.RigidVar(2)]));
  const read = fromJust(Package.under(packageOf({
    types: [[x, 'Bool']],
    rows: [[r, { fields: [['a', 'Int']], tails: [{ hole: 6 }] }]],
    effects: [[e, { labels: [{ effect: 'Console', args: [], mark: 'N' }],
      tail: { rigid: 3 } }]]
  }))(recorded));
  assert.ok(Package.eraseTy(read) instanceof Atom.Arrow);
  assert.ok(same(Package.eraseTy(read), new Atom.Arrow(
    new Atom.Base(Atom.BoolBase.value), new Atom.Record(
      [new Tuple('a', new Atom.Base(Atom.IntBase.value)),
        new Tuple('b', new Atom.TVar(new Atom.RigidVar(1)))],
      [new Atom.RigidVar(2), Hole.holeVar(6)]))));
  const row = read.value1;
  assert.deepEqual(row.labels.map(label => label.effect.constructor.name),
    ['UserEffect', 'ConsoleEffect']);
  assert.equal(fromJust(row.tail).value0, 3);
  assert.equal(Package.under(packageOf({}))(new Effect.MVar(x))
    .constructor.name, 'Nothing');
});
