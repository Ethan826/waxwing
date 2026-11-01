import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf, problemOf } from './r0-a2-package.mjs';

// A2 Task 9 (docs/plans/2026-10-31-a2-validator-plan.md): the site
// checks E4, E5, E6, E8 and E9 (statements §4; spec §9's rows). Each
// case checks one recorded obligation, or a record built from one,
// against a package built here, completed and settled by hand (E9's
// hole case excepted: the check settles the payload itself). Every
// result is fixture-level. Expected check indices j follow spec §9's
// last column.
const Sites = await load('Features.Check.Strategy.Effects.Sites');
const Recorded = await load('Domain.Recorded');
const Effect = await load('Domain.Recorded.Effect');
const Row = await load('Domain.Row');

// Ask is effect 0, Log 1; type E is data 0.
const prelude = 'effect Ask { fn ask(): Unit; };\n'
  + 'effect Log { fn log(n: Int): Unit; };\ntype E = E;\n';
const effects = (source, name) => Recorded.fields(problemOf(
  `${prelude}${source}`, name)).effects;
const recordAt = (problem, index, kind) => {
  const found = problem.obligations[index].value;
  assert.equal(found.constructor.name, kind);
  return found.value0;
};
const accepted = result => assert.equal(result.constructor.name, 'Right');
const refusedAt = (result, check) => {
  assert.equal(result.constructor.name, 'Left');
  assert.deepEqual(result.value0, { check, limit: false });
};
const context = spec => ({ package: packageOf(spec), rigidMarks: [] });

// Package rows (r0-a2-package.mjs grammar).
const label = (effect, mark, args = []) => ({ effect, args, mark });
const row = (labels, tail = null) => ({ labels, tail });
const failE = label('Fail', 'N', [{ data: [0, [], []] }]);

// `c`: obligation 0 is the `with`'s Install, 5 the literal's HandlerLit;
// flexEff 1 is R, 2 is C, 3 is c_0; positions are [Literal, Frame].
const c = effects('fn c(): Int with Log = with handler Ask '
  + '{ ask() => Fail.fail(E) } { Ask.ask(); 1 };\nfn main(): Int = 0;',
'c');
const [literal, frame] = c.positions;
const lit = (clauseRow, own) => Sites.handlerLitCheck(context({
  effects: [[c.flexEff[3], clauseRow]], marks: [[literal, own]] }))(
  recordAt(c, 5, 'HandlerLit'));

test('own abort', () => {
  // A clause row holding `Fail(E)`: `M ⊑ m` (j = k = 0).
  refusedAt(lit(row([failE]), 'N'), 0);
  accepted(lit(row([failE]), 'M'));
  // Ending in a rigid ϱ does the same; a closed `Log` asks nothing.
  refusedAt(lit(row([], { rigid: 0 }), 'N'), 0);
  accepted(lit(row([label(1, 'M')]), 'N'));
});

const install = (cRow, frameTerm, record = recordAt(c, 0, 'Install')) =>
  Sites.installCheck(context({
    effects: [[c.flexEff[1], row([label(1, 'M')])], [c.flexEff[2], cRow]],
    marks: [[literal, 'N'], [frame, frameTerm]] }))(record);

test('rigid C tail', () => {
  // m ⊑ f 0; C has no labels; ρ ends in ϱ 1; `M ⊑ f` 2.
  refusedAt(install(row([], { rigid: 0 }), 'N'), 2);
  accepted(install(row([], { rigid: 0 }), 'M'));
  // C ending in another rigid: ρ (`Log + ϱ0`) does not end in it.
  refusedAt(install(row([], { rigid: 5 }), 'M'), 1);
});

test('C label partner under the frame', () => {
  // `Log` in C pairs with ρ's `Log` (written M): M ⊑ f at j 1.
  refusedAt(install(row([label(1, 'N')]), 'N'), 1);
  accepted(install(row([label(1, 'N')]), 'M'));
  // No `Ask` in ρ: that label's check fails.
  refusedAt(install(row([label(0, 'N')]), 'M'), 1);
});

test('Console frame counted', () => {
  // No `Handler(Console …)` can be written today (FX011), so the record
  // is c's with its handler's effect replaced by Console.
  const record = recordAt(c, 0, 'Install');
  const handler = record.handler;
  const console = new Effect.MHandler(
    { ...handler.value0, effect: Row.ConsoleEffect.value }, handler.value1);
  // Console's frame N, its C label `Log` paired with ρ's M: refused.
  refusedAt(install(row([label(1, 'N')]), 'N',
    { ...record, handler: console }), 1);
});

test('Install over a non-handler type is refused unread', () => {
  const record = recordAt(c, 0, 'Install');
  refusedAt(install(row([]), 'M',
    { ...record, handler: recordAt(c, 9, 'FailConcrete') }), 0);
});

// §7a: `work` defers `Log.log(1)`; obligation 2 is its Defer.
const work = effects('fn work(): Unit with Log = '
  + '{ defer Log.log(1); () };\nfn main(): Int = 0;', 'work');
const defer = dRow => Sites.deferCheck(context({
  effects: [[work.flexEff[1], dRow]] }))(recordAt(work, 2, 'Defer'));

test('§7a forged refused', () => {
  // Honest d = `Log` at M: no Fail 0, no rigid tail 1, `M ⊑ N` 2.
  refusedAt(defer(row([label(1, 'M')])), 2);
  // Forged d = `Log` at N passes here; its consumption edge refuses it
  // (the `AtDefer` obligation, Task 11).
  accepted(defer(row([label(1, 'N')])));
  refusedAt(defer(row([failE])), 0);
  refusedAt(defer(row([], { rigid: 0 })), 1);
});

test('entry', () => {
  // `main`'s row `Log`, its entry tail settled closed: `Log` at j 0.
  const main = effects('fn main(): Unit with Log = Log.log(1);', 'main');
  const entry = recordAt(main, 3, 'Entry');
  refusedAt(Sites.entryCheck(context({
    effects: [[main.flexEff[0], row([])]] }))(entry), 0);
  // A Console label passes; a rigid tail fails after it, at j 1.
  const consoleOnly = row([label('Console', 'N')]);
  accepted(Sites.entryCheck(context({
    effects: [[main.flexEff[0], consoleOnly]] }))(
    { ...entry, labels: [] }));
  refusedAt(Sites.entryCheck(context({ effects: [[main.flexEff[0],
    row([label('Console', 'N')], { rigid: 0 })]] }))(
    { ...entry, labels: [] }), 1);
});

test('E9 after settling', () => {
  // The audit fixture fail-needs-concrete-check's `k` (C6): obligation
  // 1 is FailConcrete on r.e's payload variable.
  const k = effects('fn k(): Unit with Fail(E) = '
    + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;', 'k');
  const payload = recordAt(k, 1, 'FailConcrete');
  const judged = image => Sites.failConcreteCheck(context({
    types: [[payload.value0, image]] }))(payload);
  // A hole settles to Int, which has a key: the predicted divergence.
  accepted(judged({ var: { hole: 1 } }));
  refusedAt(judged({ var: { rigid: 0 } }), 0);
  refusedAt(judged({ arrow: ['Int', row([]), 'Int'] }), 0);
  accepted(judged({ data: [0, [], []] }));
});
