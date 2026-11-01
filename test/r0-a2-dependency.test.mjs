import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { problemOf } from './r0-a2-package.mjs';

// A2 Task 10 (docs/plans/2026-10-31-a2-validator-plan.md): Dep (spec
// §5.1) and the failure classification (spec §5), on the recorded
// problems of spec §10's C1, C15 and C16 with failures injected.
const Dependency = await load('Features.Check.Strategy.Effects.Dependency');
const Forced = await load('Features.Check.Strategy.Effects.Forced');
const Effect = await load('Domain.Recorded.Effect');
const Recorded = await load('Domain.Recorded');
const Sets = await load('Data.Set');
const { unfoldableArray } = await load('Data.Unfoldable');

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
const mk = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; ';
const c1 = `${mk}fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; `
  + 'fn main(): Unit = ();';
const c15 = `${log}fn mk2(): Handler(nofail Ask with ...s) with pure`
  + ' = handler Ask { ask() => () }; '
  + 'fn use2(): Unit with ...e = with mk2() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
const c16 = `${mk}fn use3(): Unit with Log = { defer Log.log(1); `
  + 'with mk() { () } }; fn main(): Unit = ();';

const obligationsOf = problem =>
  Recorded.fields(problem).effects.obligations;
const kindOf = placed => placed.value.constructor.name;
const indexOfKind = (problem, kind, nth = 0) => obligationsOf(problem)
  .map((placed, index) => [kindOf(placed), index])
  .filter(([name]) => name === kind)[nth][1];
const members = set => Sets.toUnfoldable(unfoldableArray)(set);
const failure = (check, limit = false) => ({ check, limit });
const classifyAt = (problem, index, outcome = failure(3)) =>
  Dependency.classify(Dependency.dependencySet(problem))(
    obligationsOf(problem)[index])(outcome);
const refusal = result => result.constructor.name;
const limitation = result => result.value0.constructor.name;

test('C1 A through the frame: use\'s Defer is ForcedTail', () => {
  const problem = problemOf(c1, 'use');
  const index = indexOfKind(problem, 'Defer');
  const result = classifyAt(problem, index);
  assert.equal(refusal(result), 'NotCertifiable');
  assert.equal(limitation(result), 'ForcedTail');
  assert.equal(result.value1.check, 3);
  assert.deepEqual(result.value1.provenance,
    obligationsOf(problem)[index].provenance);
});

test('C1 A\' direct: Install is ForcedTail', () => {
  const problem = problemOf(c1, 'use');
  const result = classifyAt(problem, indexOfKind(problem, 'Install'));
  assert.equal(refusal(result), 'NotCertifiable');
  assert.equal(limitation(result), 'ForcedTail');
});

test('C15 rigid tail: use2\'s Defer is ForcedTail', () => {
  const problem = problemOf(c15, 'use2');
  const result = classifyAt(problem, indexOfKind(problem, 'Defer'));
  assert.equal(refusal(result), 'NotCertifiable');
  assert.equal(limitation(result), 'ForcedTail');
});

test('C16 unrelated: use3\'s first Defer is ObligationFailed', () => {
  const problem = problemOf(c16, 'use3');
  const index = indexOfKind(problem, 'Defer');
  assert.ok(index > indexOfKind(problem, 'Install'));
  const result = classifyAt(problem, index);
  assert.equal(refusal(result), 'ObligationFailed');
  assert.equal(result.value0.check, 3);
});

test('limit wins over a Dep member', () => {
  const problem = problemOf(c1, 'use');
  const index = indexOfKind(problem, 'Defer');
  const result = classifyAt(problem, index, failure(5, true));
  assert.equal(refusal(result), 'NotCertifiable');
  assert.equal(limitation(result), 'RigidExact');
  assert.equal(result.value1.check, 5);
});

test('limit wins for an unrelated obligation too', () => {
  const problem = problemOf(c16, 'use3');
  const result = classifyAt(problem, indexOfKind(problem, 'Defer'),
    failure(1, true));
  assert.equal(limitation(result), 'RigidExact');
});

test('Dep holds F and the source (C1; Install also mentions it)', () => {
  const problem = problemOf(c1, 'use');
  const dep = members(Dependency.dependencySet(problem));
  const effs = dep.filter(node => node instanceof Dependency.NodeEff);
  const roles = effs.map(node => node.value0.value1.constructor.name);
  assert.ok(roles.includes('ResultClauses'), roles.join());
  assert.ok(roles.includes('EffInst'), roles.join());
});

test('Dep reaches the frame position through Install (C1)', () => {
  const problem = problemOf(c1, 'use');
  const dep = members(Dependency.dependencySet(problem));
  const frames = dep.filter(node => node instanceof Dependency.NodePos
    && node.value0 instanceof Effect.Frame);
  assert.equal(frames.length, 1);
});

test('C16: the first Defer mentions no Dep member', () => {
  const problem = problemOf(c16, 'use3');
  const dep = Dependency.dependencySet(problem);
  const defer = obligationsOf(problem)[indexOfKind(problem, 'Defer')];
  const touching = members(Dependency.mentions(defer.value))
    .filter(node => Sets.member(Dependency.ordNode)(node)(dep));
  assert.deepEqual(touching, []);
});

test('forcing edge: a source mentioned alone is in Dep (fixture)', () => {
  // C1 without its Install (a hand-edited problem): only the Consume at
  // index 1 mentions the source t, so only the forcing edge v -> t
  // reaches it. On the programs tried (C1, and `{ let h = mk(); () }`)
  // the edge changed Dep but no classification.
  const full = problemOf(c1, 'use');
  const install = indexOfKind(full, 'Install');
  const kept = obligationsOf(full).filter((_, at) => at !== install);
  const problem = { ...full,
    effects: { ...Recorded.fields(full).effects, obligations: kept } };
  const [{ source }] = Forced.forcedTails(problem);
  const dep = members(Dependency.dependencySet(problem));
  assert.ok(dep.some(node => node instanceof Dependency.NodeEff
    && Effect.ordEVar.compare(node.value0)(source).constructor.name === 'EQ'));
  const result = classifyAt(problem, indexOfKind(problem, 'Consume', 0));
  assert.equal(limitation(result), 'ForcedTail');
});

test('mentions: Unsupported has none', () => {
  const unsupported = new Effect.Unsupported(Effect.UnframedInstall.value);
  assert.equal(Sets.isEmpty(Dependency.mentions(unsupported)), true);
});
