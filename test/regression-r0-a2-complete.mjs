// A2 lane A regression probes (Task 4), dispatched through
// test/regression-r0-a2.mjs; the rows are in
// scripts/regression-r0-a2-complete.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and mirrors
// one case of test/r0-a2-complete.test.mjs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { onlineFrom } from './r0-online-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);

const c6 = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;';
const c1 = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; '
  + 'fn mk(): Handler(nofail Ask with Log + ...s) with pure'
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';

// The clone's modules, a declaration's problem, and a package from
// [key, image] pairs of the clone's values.
const modulesOf = async context => {
  const load = loader(context);
  const online = await onlineFrom(load);
  const M = {
    Complete: await load('Features.Check.Strategy.Effects.Complete'),
    Package: await load('Features.Check.Strategy.Effects.Package'),
    Forced: await load('Features.Check.Strategy.Effects.Forced'),
    Facade: await load('Domain.Verdict.EffectPackage'),
    Recorded: await load('Domain.Recorded'),
    Effect: await load('Domain.Recorded.Effect'),
    Atom: await load('Domain.Recorded.Atom'),
    Hole: await load('Domain.Recorded.Hole'),
    Maps: await load('Data.Map.Internal'),
    Tuple: (await load('Data.Tuple')).Tuple,
    Maybe: await load('Data.Maybe'),
    foldable: (await load('Data.Foldable')).foldableArray,
    unfoldable: (await load('Data.Unfoldable')).unfoldableArray
  };
  M.problemOf = (source, name) =>
    online.problemOf(online.programOf(source), name);
  const mapOf = (ord, pairs) => M.Maps.fromFoldable(ord)(M.foldable)(
    (pairs ?? []).map(([key, value]) => new M.Tuple(key, value)));
  M.packageOf = spec => ({ types: mapOf(M.Atom.ordVar, spec.types),
    rows: mapOf(M.Atom.ordVar, []),
    effects: mapOf(M.Effect.ordEVar, spec.effects),
    marks: mapOf(M.Effect.ordPosition, []) });
  M.tailRow = tail => ({ labels: [], tail: new M.Maybe.Just(tail) });
  return M;
};

export const a2CompleteProbes = {
  // Spec §12 C6: complete, then settle, so the absent `FailConcrete`
  // payload's fresh hole settles to `Int`.
  'r0-a2-complete-then-settle': async context => {
    const M = await modulesOf(context);
    const problem = M.problemOf(c6, 'k');
    const [payload] = M.Recorded.fields(problem).effects.obligations
      .map(placed => placed.value)
      .filter(value => value instanceof M.Effect.FailConcrete)
      .map(value => value.value0);
    const found = M.Package.under(M.Complete.settledOf(
      M.Complete.complete(problem)(M.packageOf({}))))(payload).value0;
    if (!(found instanceof M.Facade.PBase))
      fail(`C6 order separates: the payload settled to ${found
        .constructor.name}`);
    passed(context);
  },
  // Spec §12 C14: a forced tail is an exact copy of its source's image,
  // hole 5 kept as hole 5.
  'r0-a2-forced-copy': async context => {
    const M = await modulesOf(context);
    const problem = M.problemOf(c1, 'use');
    const [{ forced, source }] = M.Forced.forcedTails(problem);
    const input = M.packageOf({ effects: [[source,
      M.tailRow(new M.Facade.PTailHole(5))]] });
    const image = M.Maps.lookup(M.Effect.ordEVar)(forced)(
      M.Facade.completedPackage(M.Complete.complete(problem)(input)).effects)
      .value0;
    if (image.tail.value0.value0 !== 5)
      fail(`C14 hole source: the forced tail is hole ${image.tail
        .value0.value0}`);
    passed(context);
  },
  // Spec §2.4 (i): h counts effect holes too, so a fresh hole exceeds an
  // effect hole above every type hole.
  'r0-a2-hole-numbering': async context => {
    const M = await modulesOf(context);
    const problem = M.problemOf(c6, 'k');
    const [effect] = M.Recorded.fields(problem).effects.flexEff;
    const input = M.packageOf({ effects: [[effect,
      M.tailRow(new M.Facade.PTailHole(9))]] });
    const completed = M.Facade.completedPackage(
      M.Complete.complete(problem)(input));
    const holes = M.Maps.toUnfoldable(M.unfoldable)(completed.types)
      .map(pair => M.Hole.holeIndex(pair.value1.value0).value0);
    const low = holes.filter(hole => !(hole > 9));
    if (low.length > 0)
      fail(`numbering injective: fresh holes ${low} not above h = 9`);
    passed(context);
  }
};
