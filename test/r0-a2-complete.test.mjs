import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf, problemOf } from './r0-a2-package.mjs';

// A2 Task 4 (docs/plans/2026-10-31-a2-validator-plan.md): completion,
// forcing and settling (spec §2.4), cases C6, C7(a), C14 and Review
// Focus 5 (spec §12). Fixture-level checks.
const Complete = await load('Features.Check.Strategy.Effects.Complete');
const Package = await load('Features.Check.Strategy.Effects.Package');
const Facade = await load('Domain.Verdict.EffectPackage');
const Forced = await load('Features.Check.Strategy.Effects.Forced');
const Recorded = await load('Domain.Recorded');
const Effect = await load('Domain.Recorded.Effect');
const Atom = await load('Domain.Recorded.Atom');
const Hole = await load('Domain.Recorded.Hole');
const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
// Spec §12 C1: at `use`'s call of `mk()` the ResultC tail is forced.
const c1 = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
// Review Focus 5: a closed R gives a closed ResultC.
const closedC = `${log}fn mk3(): Handler(nofail Ask with pure) with pure`
  + ' = handler Ask { ask() => () }; '
  + 'fn use4(): Unit = with mk3() { () }; fn main(): Unit = ();';
// Spec §12 C6: `FailConcrete (MVar ⟨…, field e⟩)`.
const c6 = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;';
// Spec §12 C7(a): the lambda's row and the Apply's row.
const c7 = 'fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }; '
  + 'fn main(): Int = 0;';

const view = problem => Recorded.fields(problem);
const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const effectOf = (completed, variable) =>
  Maps.lookup(Effect.ordEVar)(variable)(completed.effects);
const fromJust = maybe => {
  assert.equal(maybe.constructor.name, 'Just');
  return maybe.value0;
};
const holeOf = variable => fromJust(Hole.holeIndex(variable));
const unsettled = (problem, input) =>
  Facade.completedPackage(Complete.complete(problem)(input));
const flexible = problem => pairs(view(problem).vars)
  .filter(([, info]) => info.quant instanceof Atom.Exists);

// The two orders give the obligations different payloads: this separates
// the stages that read obligations, not end-to-end outcomes. With the
// field absent the pipeline refuses `k` at G0 (dossier §18.148 (4);
// test/r0-a2-differential.test.mjs "C6 field absent").
test('C6 order separates', () => {
  const problem = problemOf(c6, 'k');
  const [payload] = view(problem).effects.obligations
    .map(placed => placed.value)
    .filter(value => value instanceof Effect.FailConcrete)
    .map(value => value.value0);
  // The premise: the payload is a flexible type variable.
  assert.ok(payload instanceof Effect.MVar);
  const input = packageOf({});
  const settled = fromJust(Package.under(
    Complete.settledOf(Complete.complete(problem)(input)))(payload));
  assert.ok(settled instanceof Facade.PBase, settled.constructor.name);
  assert.ok(settled.value0 instanceof Atom.IntBase);
  const late = fromJust(Package.under(
    unsettled(problem, Package.settle(input)))(payload));
  assert.ok(late instanceof Facade.PVar, late.constructor.name);
  assert.ok(Hole.isHole(late.value0));
});

const forcedImage = tail => {
  const problem = problemOf(c1, 'use');
  const [{ forced, source }] = Forced.forcedTails(problem);
  const input = packageOf({ effects: [[source, { labels: [], tail }]] });
  return fromJust(effectOf(unsettled(problem, input), forced));
};

test('C14 hole source', () => {
  const image = forcedImage({ hole: 5 });
  assert.deepEqual(image.labels, []);
  const tail = fromJust(image.tail);
  assert.ok(tail instanceof Facade.PTailHole);
  assert.equal(tail.value0, 5);
});

test('C14 rigid source', () => {
  const tail = fromJust(forcedImage({ rigid: 7 }).tail);
  assert.ok(tail instanceof Facade.PTailRigid);
  assert.equal(tail.value0, 7);
});

test('C7(a) holes settle', () => {
  const problem = problemOf(c7, 'g');
  const [lambda, apply] = view(problem).effects.flexEff;
  // The premise: the lambda's row, then the Apply's stage row.
  assert.ok(lambda.value1 instanceof Effect.EffectOf);
  assert.ok(apply.value1 instanceof Effect.Stage);
  const input = packageOf({ effects: [[lambda, { labels: [],
    tail: { hole: 3 } }], [apply, { labels: [], tail: { hole: 4 } }]] });
  const completed = Complete.complete(problem)(input);
  const before = Facade.completedPackage(completed);
  assert.equal(fromJust(fromJust(effectOf(before, lambda)).tail).value0, 3);
  assert.equal(fromJust(fromJust(effectOf(before, apply)).tail).value0, 4);
  const settled = Complete.settledOf(completed);
  for (const variable of [lambda, apply])
    assert.equal(fromJust(effectOf(settled, variable)).tail
      .constructor.name, 'Nothing');
});

// Every flexible variable's completed hole: a type variable's bare `PVar`
// hole or a row variable's `{ [], [hole] }`.
const freshHole = (completed, [variable, info]) => {
  if (info.sort instanceof Atom.SortType) {
    const image = fromJust(Maps.lookup(Atom.ordVar)(variable)(
      completed.types));
    assert.ok(image instanceof Facade.PVar);
    return holeOf(image.value0);
  }
  const image = fromJust(Maps.lookup(Atom.ordVar)(variable)(completed.rows));
  assert.deepEqual(image.fields, []);
  assert.equal(image.tails.length, 1);
  return holeOf(image.tails[0]);
};

test('numbering injective', () => {
  const problem = problemOf(c6, 'k');
  const domain = flexible(problem);
  const typed = domain.filter(([, info]) =>
    info.sort instanceof Atom.SortType);
  // The premise: both sorts are absent, so both are numbered.
  assert.ok(typed.length >= 2 && domain.length > typed.length);
  const [kept] = typed;
  const [effect] = view(problem).effects.flexEff;
  // An effect hole above every type hole: h is 9, not 2.
  const input = packageOf({ types: [[kept[0], { var: { hole: 2 } }]],
    effects: [[effect, { labels: [], tail: { hole: 9 } }]] });
  const completed = unsettled(problem, input);
  assert.equal(holeOf(fromJust(Maps.lookup(Atom.ordVar)(kept[0])(
    completed.types)).value0), 2);
  assert.equal(fromJust(fromJust(effectOf(completed, effect)).tail)
    .value0, 9);
  // Fresh holes from h + 1, in `Ord Var` order, so distinct.
  const fresh = domain.filter(entry => entry !== kept)
    .map(entry => freshHole(completed, entry));
  assert.deepEqual(fresh, fresh.map((_, index) => 10 + index));
});

test('closed ResultC forces nothing', () => {
  const problem = problemOf(closedC, 'use4');
  // The premise: one instance result owns a C whose tail is closed, and
  // nothing is forced.
  const closedResults = pairs(view(problem).effects.instances)
    .map(([, sig]) => sig.result)
    .filter(result => result instanceof Effect.MHandler
      && result.value1.clauses.constructor.name === 'Just'
      && fromJust(result.value1.clauses).tail.constructor.name === 'Nothing');
  assert.equal(closedResults.length, 1);
  assert.deepEqual(Forced.forcedTails(problem), []);
  const flexEff = view(problem).effects.flexEff;
  const input = packageOf({ effects: flexEff.map(variable =>
    [variable, { labels: [], tail: null }]) });
  const completed = unsettled(problem, input);
  assert.equal(Maps.size(completed.effects), flexEff.length);
  assert.equal(Maps.size(completed.effects), Maps.size(input.effects));
});

test('witness shares holes', () => {
  const problem = problemOf(c6, 'k');
  // An effect hole above every other hole, so completion numbers from 10
  // while a witness numbering P_in's type images itself would from 0.
  const [effect] = view(problem).effects.flexEff;
  const completed = Complete.complete(problem)(packageOf({ effects:
    [[effect, { labels: [], tail: { hole: 9 } }]] }));
  const witness = Complete.witnessOf(problem)(completed);
  const domain = flexible(problem);
  // The premise: every type and row variable is absent, so every one is
  // completed.
  assert.ok(domain.length >= 3);
  assert.equal(Maps.size(witness.bindings), domain.length);
  assert.deepEqual(witness.names, []);
  for (const entry of domain) {
    const bound = fromJust(Maps.lookup(Atom.ordVar)(entry[0])(
      witness.bindings));
    assert.equal(bound.constructor.name, 'Free');
    assert.ok(bound.value0 >= 10, `Free ${bound.value0}`);
    assert.equal(bound.value0,
      freshHole(Facade.completedPackage(completed), entry));
  }
});

// The validator runs I3 before completion, and I3 refuses this input.
test('an absent forced source leaves its tail unbound', () => {
  const problem = problemOf(c1, 'use');
  const [{ forced }] = Forced.forcedTails(problem);
  const completed = unsettled(problem, packageOf({}));
  assert.equal(effectOf(completed, forced).constructor.name, 'Nothing');
});
