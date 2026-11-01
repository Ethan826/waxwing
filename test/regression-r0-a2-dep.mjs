// A2 lane regression probes, dispatched through test/regression-r0-a2.mjs;
// the rows are in scripts/regression-r0-a2-dep.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
// Spec §10 C1.
const c1 = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';

const c16 = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use3(): Unit with Log = { defer Log.log(1); with mk() { () } }; '
  + 'fn main(): Unit = ();';

const classified = (Dependency, problem, index, limit = false) =>
  Dependency.classify(Dependency.dependencySet(problem))(
    problem.effects.obligations[index])({ check: 3, limit });
const kindIndex = (problem, kind) => problem.effects.obligations
  .findIndex(placed => placed.value.constructor.name === kind);
const describe = result => result.constructor.name === 'NotCertifiable'
  ? result.value0.constructor.name : result.constructor.name;

export const a2DepProbes = {
  // Task 10, C1 A: `use`'s Defer depends on the forced tail through the
  // frame position.
  'r0-a2-dep-frame': async context => {
    const { load, fieldsOf } = await toolkit(context);
    const Dependency = await load(
      'Features.Check.Strategy.Effects.Dependency');
    const problem = fieldsOf(c1, 'use');
    const result = classified(Dependency, problem,
      kindIndex(problem, 'Defer'));
    if (describe(result) !== 'ForcedTail')
      fail(`C1 A through the frame: expected ForcedTail, got ${
        describe(result)}`);
    passed(context);
  },
  // Task 10: C1 with its Install removed (a fixture): the first Consume
  // mentions the source t alone, reached only by the forcing edge v -> t.
  'r0-a2-dep-forcing-edge': async context => {
    const { load, fieldsOf } = await toolkit(context);
    const Dependency = await load(
      'Features.Check.Strategy.Effects.Dependency');
    const full = fieldsOf(c1, 'use');
    const kept = full.effects.obligations.filter(placed =>
      placed.value.constructor.name !== 'Install');
    const problem = { ...full, effects: { ...full.effects,
      obligations: kept } };
    const result = classified(Dependency, problem,
      kindIndex(problem, 'Consume'));
    if (describe(result) !== 'ForcedTail')
      fail(`forcing edge: expected ForcedTail, got ${describe(result)}`);
    passed(context);
  },
  // Task 10, "limit wins": a limit failure on a Dep-touching obligation.
  'r0-a2-dep-limit-first': async context => {
    const { load, fieldsOf } = await toolkit(context);
    const Dependency = await load(
      'Features.Check.Strategy.Effects.Dependency');
    const problem = fieldsOf(c1, 'use');
    const result = classified(Dependency, problem,
      kindIndex(problem, 'Defer'), true);
    if (describe(result) !== 'RigidExact')
      fail(`limit wins: expected RigidExact, got ${describe(result)}`);
    passed(context);
  },
  // Task 10, C16: `use3`'s first Defer is outside Dep.
  'r0-a2-dep-unrelated': async context => {
    const { load, fieldsOf } = await toolkit(context);
    const Dependency = await load(
      'Features.Check.Strategy.Effects.Dependency');
    const problem = fieldsOf(c16, 'use3');
    const result = classified(Dependency, problem,
      kindIndex(problem, 'Defer'));
    if (describe(result) !== 'ObligationFailed')
      fail(`C16 unrelated: expected ObligationFailed, got ${
        describe(result)}`);
    passed(context);
  }
};
