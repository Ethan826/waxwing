// A2 lane regression probes, dispatched through test/regression-r0-a2.mjs;
// the rows are in scripts/regression-r0-a2-prereq.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`.
// `recordCases` builds Task 3's record mutants from any build's modules;
// test/r0-a2-record.test.mjs uses it with the healthy build.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
// Spec §12 C1: at `use`'s call of `mk()` the ResultC tail is forced.
export const c1 = `${log}fn mk(): Handler(nofail Ask with Log + ...s)`
  + ' with pure = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
// test/fx008-probes/witness/famw.wxw: `Fail(Job)` in C meets
// `Fail(Job(Int))` in ρ, bare.
export const famw = 'type Job(a) = Job(a); '
  + 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn use(h: Handler(Log with Fail(Job(Int)))): Int = 0; '
  + 'fn main(): Unit with Console = { let h = handler Log { log(n) => '
  + 'Fail.fail(Job(n)) }; Console.print(use(h)) };';
// The audit fixture fail-needs-concrete-check (inferred role).
export const failConcrete = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;';

const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${result.value0.constructor.name}`);
  return result.value0;
};

export const recordCases = async load => {
  const Parse = await load('Format.Parse');
  const Resolve = await load('Features.Resolve');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Recorded = await load('Domain.Recorded');
  const Elaborating = await load('Domain.Elaborating');
  const Effect = await load('Domain.Recorded.Effect');
  const Forced = await load('Features.Check.Strategy.Effects.Forced');
  const Maps = await load('Data.Map.Internal');
  const Origin = await load('Domain.Recorded.Origin');
  const Record = await load('Features.Check.Strategy.Effects.Record');
  const { Just, Nothing } = await load('Data.Maybe');
  // A recorded problem is its fields at run time (a newtype).
  const problemOf = (source, name) => {
    const program = right(Resolve.resolve(right(Parse.parse(source),
      'parse')), 'resolve');
    const { tables, signatures } = Inputs.generationInputs(program);
    const decl = program.functions.find(item => item.name === name);
    return Recorded.fields(Elaborating.problem(right(
      Generate.generate(tables)(signatures)(decl), 'generation')));
  };
  const withEffects = (problem, change) =>
    ({ ...problem, effects: { ...problem.effects, ...change } });
  const consumeAt = (problem, site) => problem.effects.obligations
    .findIndex(placed => placed.value instanceof Effect.Consume
      && placed.value.value0.site instanceof site);
  // Obligation `index`'s consume record replaced by `change` of it.
  const consumeWith = (problem, index, change) =>
    withEffects(problem, { obligations: problem.effects.obligations.map(
      (placed, at) => at !== index ? placed : { ...placed,
        value: new Effect.Consume(change(placed.value.value0)) }) });
  const use = problemOf(c1, 'use');
  const [{ forced }] = Forced.forcedTails(use);
  const path = forced.value0;
  const sig = Maps.lookup(Origin.ordPath)(path)(use.effects.instances)
    .value0;
  // `⟨p, result clauses⟩` as the tail of a new `Entry` row.
  const entryProvenance = new Effect.AtSite({ decl: use.decl, path,
    rule: new Origin.ExprRule(1), role: Effect.EntryRow.value });
  const strayEntry = withEffects(use, { obligations: [
    ...use.effects.obligations, { ...use.effects.obligations[0],
      provenance: entryProvenance,
      value: new Effect.Entry({ labels: [], tail: new Just(forced) }) }] });
  // The forcing instance's R closed, its ResultC tail kept.
  const handler = sig.result;
  const closedR = withEffects(use, { instances: Maps.insert(Origin.ordPath)(
    path)({ ...sig, result: new Effect.MHandler(handler.value0,
      { ...handler.value1, inference: { ...handler.value1.inference,
        tail: Nothing.value } }) })(use.effects.instances) });
  const k = problemOf(failConcrete, 'k');
  const unconcrete = withEffects(k, { obligations: k.effects.obligations
    .filter(placed => !(placed.value instanceof Effect.FailConcrete)) });
  return { Record, Effect, problemOf, withEffects, consumeAt, consumeWith,
    use, path, forced, entryProvenance, strayEntry, closedR, k, unconcrete };
};

const fail = message => {
  console.error(message);
  process.exit(1);
};
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const checkOf = found => found.constructor.name === 'Just'
  ? found.value0.check : null;

// Spec §9's site table, as [constructor, argument, marks, bare].
export const siteTable = [['AtCall', null, true, false],
  ['AtPerform', null, true, false], ['AtApply', null, true, false],
  ['AtPipe', null, true, false], ['AtStage', 0, true, false],
  ['AtCallback', null, true, false], ['AtFail', null, true, false],
  ['AtDefer', null, true, false], ['AtDeferredRow', null, true, false],
  ['ClauseIntoR', 0, false, false], ['InstallR', null, false, false],
  ['ClauseIntoC', 0, true, true], ['AtInstalledC', null, true, true]];
export const siteOf = (Effect, [name, argument]) =>
  argument === null ? Effect[name].value : new Effect[name](argument);

export const a2PrereqProbes = {
  // Task 3: every site's flags are spec §9's.
  'r0-a2-site-flags': async context => {
    const { Record, Effect } = await recordCases(loader(context));
    const wrong = siteTable.filter(([name, argument, marks, bare]) => {
      const flags = Record.siteFlags(siteOf(Effect, [name, argument]));
      return flags.marks !== marks || flags.bare !== bare;
    });
    if (wrong.length > 0)
      fail(`site flags differ from spec §9: ${wrong.map(row => row[0])}`);
    passed(context);
  },
  // Task 3: a forced tail outside its placement is check 2.
  'r0-a2-forced-placement': async context => {
    const { Record, strayEntry } = await recordCases(loader(context));
    const check = checkOf(Record.recordDefect(strayEntry));
    if (check !== 2) fail(`forced tail in an Entry row: check ${check}`);
    passed(context);
  },
  // Task 3 (Task 1 review): a ResultC tail forced at p with R closed.
  'r0-a2-forced-closed': async context => {
    const { Record, closedR } = await recordCases(loader(context));
    const check = checkOf(Record.recordDefect(closedR));
    if (check !== 3) fail(`ResultC tail with R closed: check ${check}`);
    passed(context);
  },
  // Task 3: a flexible `Fail` payload with no `FailConcrete` is check 4.
  'r0-a2-fail-invariant': async context => {
    const { Record, unconcrete } = await recordCases(loader(context));
    const check = checkOf(Record.recordDefect(unconcrete));
    if (check !== 4) fail(`Fail payload with no FailConcrete: check ${check}`);
    passed(context);
  }
};
