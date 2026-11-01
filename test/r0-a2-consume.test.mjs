import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf, problemOf } from './r0-a2-package.mjs';

// A2 Task 8 (docs/plans/2026-10-31-a2-validator-plan.md): E2 and
// Definition 4.2 (statements §4; spec §9's `Consume` rows). Each case
// checks one recorded obligation, or one hand-built `Consume` record,
// against a package built here, complete and settled by hand: every
// result is fixture-level. Expected check indices j follow spec §9: per
// source label its partner, its arguments unless bare, its edge if the
// site reads marks; then the tail (only for a rigid source); then
// Definition 4.2's exact count per key of the target, with `limit`.
const Consume = await load('Features.Check.Strategy.Effects.Consume');
const Recorded = await load('Domain.Recorded');
const Effect = await load('Domain.Recorded.Effect');
const Atom = await load('Domain.Recorded.Atom');
const Row = await load('Domain.Row');
const { Just, Nothing } = await load('Data.Maybe');

// Ask is effect 0, Log 1, State 2.
const prelude = 'effect Ask { fn ask(): Unit; };\n'
  + 'effect Log { fn log(n: Int): Unit; };\n'
  + 'effect State(s) { fn get(): s; fn put(value: s): Unit; };\n';
const effects = (source, name) => Recorded.fields(problemOf(
  `${prelude}${source}\nfn main(): Int = 0;`, name)).effects;
const consumeAt = (problem, index) => {
  const found = problem.obligations[index].value;
  assert.equal(found.constructor.name, 'Consume');
  return found.value0;
};
const judged = (spec, record) => Consume.consumeCheck({
  package: packageOf(spec), rigidMarks: [] })(record);
const accepted = result => assert.equal(result.constructor.name, 'Right');
const refusedAt = (result, check, limit = false) => {
  assert.equal(result.constructor.name, 'Left');
  assert.deepEqual(result.value0, { check, limit });
};

// Package rows (r0-a2-package.mjs grammar).
const label = (effect, mark, args = []) => ({ effect, args, mark });
const row = (labels, tail = null) => ({ labels, tail });
const ambient = { rigid: 0 };

// Recorded rows with written marks only, read under the empty package.
const written = mark => new Effect.Written(mark === 'N'
  ? Effect.FixedN.value : Effect.FixedM.value);
const mlabel = (effect, mark, args = []) => ({ effect: effect === 'Fail'
  ? Row.FailEffect.value : new Row.UserEffect(effect), args,
mark: written(mark) });
const mrow = (labels, rigid = null) => ({ labels, tail: rigid === null
  ? Nothing.value : new Just(new Effect.EffRigid(rigid)) });
const site = (kind, source, target, flags = {}) => ({ site:
  Effect[kind].value, source, target, marks: flags.marks ?? true,
bare: flags.bare ?? false });

// C10 (spec §12): obligation 2 is h's `AtCallback`, its stage row bound
// to `State(Int) + ϱ`, ϱ the declared rows' rigid tail.
const c10 = payload => {
  const problem = effects('fn w(h: Unit -> Unit with State(Int)): Unit '
    + `with Log + State(${payload}) = h(());`, 'w');
  return judged({ effects: [[problem.flexEff[0], row([label(2, 'M',
    ['Int'])], ambient)]] }, consumeAt(problem, 2));
};

test('C10(a) payload before count', () => {
  // `State`'s partner 0, its payload 1.
  refusedAt(c10('Bool'), 1);
});

test('C10(b) exact count is a limitation', () => {
  // partner 0, payload 1, edge 2, ρ ends in ϱ 3; `Log`'s exact count 4.
  refusedAt(c10('Int'), 4, true);
});

test('N4 p1 refused', () => {
  // statements §12.1: st's InstallR, R = ϱ into `Log + ϱ` (marks
  // ignored): tail 0, then `Log`'s exact count 1.
  const problem = effects('fn st(h: Handler(State(Int))): Int with Log = '
    + 'with h { State.get() };', 'st');
  refusedAt(judged({}, consumeAt(problem, 1)), 1, true);
});

test('closed-R inclusion accepted, near miss refused', () => {
  // statements §12.1 (S2-2): obligation 1 is InstallR, R the package's.
  const problem = effects('fn c(): Int with Log = with handler State(Int) '
    + '{ get() => 1, put(v) => () } { Log.log(1); State.get() };', 'c');
  const r = problem.flexEff[0];
  assert.equal(r.value1.constructor.name, 'HandlerInference');
  const installR = consumeAt(problem, 1);
  accepted(judged({ effects: [[r, row([])]] }, installR));
  refusedAt(judged({ effects: [[r, row([], ambient)]] }, installR), 1, true);
});

// famw (statements §12.2, T2-e): `Fail(Job)` in C, `Fail(Job(Int))` in ρ.
const job = args => new Effect.MData(3, args, []);
const int = new Effect.MBase(Atom.IntBase.value);
const famw = kind => site(kind, mrow([mlabel('Fail', 'N', [job([])])]),
  mrow([mlabel('Fail', 'N', [job([int])])], 0),
  { bare: kind === 'AtInstalledC' });

test('famw bare', () => {
  accepted(judged({}, famw('AtInstalledC')));
  // Elsewhere arguments are read: partner 0, payload 1.
  refusedAt(judged({}, famw('AtCall')), 1);
});

test('installed C: pairing and its edge only', () => {
  const into = (source, target) => judged({}, site('AtInstalledC',
    source, target, { bare: true }));
  // No partner for `Ask`: refused at 0.
  refusedAt(into(mrow([mlabel(0, 'M')]), mrow([mlabel(1, 'M')], 0)), 0);
  // Edge mark(ρ partner) ⊑ mark(C label): M ⊑ N fails at 1.
  refusedAt(into(mrow([mlabel(1, 'N')]), mrow([mlabel(1, 'M')], 0)), 1);
  // A rigid C with ρ holding more: no tail condition, no exact count.
  accepted(into(mrow([mlabel(1, 'M')], 5),
    mrow([mlabel(1, 'M'), mlabel(0, 'M')], 0)));
});

test('E2 payloads', () => {
  // statements §12.2: h's `State(Int)` into `State(Bool)`.
  const problem = effects('fn g(h: Unit -> Unit with State(Int)): Unit '
    + 'with State(Bool) = h(());', 'g');
  refusedAt(judged({ effects: [[problem.flexEff[0], row([label(2, 'M',
    ['Int'])], ambient)]] }, consumeAt(problem, 2)), 1);
});

test('closed source F7', () => {
  // statements §12.2: a closed `Log` into `Log + Ask + ϱ`; `Ask` has no
  // partner, so no edge and no remainder.
  const problem = effects('fn g(h: Unit -> Unit with Log): Unit with '
    + 'Log + Ask = h(());', 'g');
  const stage = mark => judged({ effects: [[problem.flexEff[0],
    row([label(1, mark)])]] }, consumeAt(problem, 2));
  accepted(stage('M'));
  // `Log`'s edge M ⊑ N: partner 0, arguments 1, edge 2.
  refusedAt(stage('N'), 2);
});

test('labels-only sites read no tail', () => {
  const source = mrow([mlabel(1, 'M')], 4);
  const target = mrow([mlabel(1, 'M'), mlabel(0, 'M')]);
  accepted(judged({}, site('AtDefer', source, target)));
  accepted(judged({}, site('AtDeferredRow', source, target)));
  // At a call the rigid source asks ρ to end in it: partner 0,
  // arguments 1, edge 2, tail 3.
  refusedAt(judged({}, site('AtCall', source, target)), 3);
});

test('an unreadable side is refused at the first check', () => {
  const problem = effects('fn g(h: Unit -> Unit with Log): Unit with '
    + 'Log = h(());', 'g');
  refusedAt(judged({}, consumeAt(problem, 2)), 0);
});
