// A2 lane regression probes, dispatched through test/regression-r0-a2.mjs;
// the rows are in scripts/regression-r0-a2-prereq.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`.
// `recordCases` builds Task 3's record mutants from any build's modules;
// test/r0-a2-record.test.mjs uses it with the healthy build.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { a2MalformedProbes } from './regression-r0-a2-malformed.mjs';

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
  // `⟨q, result clauses⟩` at a path q that forces nothing, declared in
  // `flexEff` and named by a new `Entry` row.
  const elsewhere = new Effect.EffFresh({ root: Origin.InBody.value,
    steps: [] }, Effect.ResultClauses.value);
  const elsewhereEntry = withEffects(strayEntry, {
    flexEff: [...use.effects.flexEff, elsewhere],
    obligations: strayEntry.effects.obligations.map((placed, at, all) =>
      at < all.length - 1 ? placed : { ...placed, value: new Effect.Entry(
        { labels: [], tail: new Just(elsewhere) }) }) });
  const k = problemOf(failConcrete, 'k');
  const unconcrete = withEffects(k, { obligations: k.effects.obligations
    .filter(placed => !(placed.value instanceof Effect.FailConcrete)) });
  return { Record, Effect, problemOf, withEffects, consumeAt, consumeWith,
    use, path, forced, entryProvenance, strayEntry, closedR, elsewhereEntry,
    k, unconcrete };
};

// Check 1's and check 3's branches, each by one mutant of `k`: obligation
// 0 replaced by an obligation naming the wrong reference, so the defect
// is at obligation 0's provenance. Each is [problem, expected check].
export const referenceMutants = async (load, k) => {
  const Effect = await load('Domain.Recorded.Effect');
  const Atom = await load('Domain.Recorded.Atom');
  const Row = await load('Domain.Row');
  const Origin = await load('Domain.Recorded.Origin');
  const Maps = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const { Just, Nothing } = await load('Data.Maybe');
  const vars = Maps.toUnfoldable(unfoldableArray)(k.vars);
  const ofSort = sort => vars.find(pair => pair.value1.sort instanceof sort);
  const typed = ofSort(Atom.SortType);
  const typeVar = typed.value0;
  const rowVar = ofSort(Atom.SortRow).value0;
  const [first, ...rest] = k.effects.obligations;
  const firstIs = (value, change) => ({ ...k, ...change, effects:
    { ...k.effects, obligations: [{ ...first, value }, ...rest] } });
  const unit = new Effect.MBase(Atom.UnitBase.value);
  const closed = { labels: [], tail: Nothing.value };
  const equal = type => new Effect.Equal(type, unit);
  const tailed = variable => new Effect.Entry({ labels: [],
    tail: new Just(variable) });
  const markN = new Effect.Written(Effect.FixedN.value);
  const failing = payload => new Effect.Entry({ labels: [{
    effect: Row.FailEffect.value, args: [payload], mark: markN }],
  tail: Nothing.value });
  // A declared rigid type variable, `k` having none.
  const rigid = new Atom.RigidVar(77);
  const declared = { vars: Maps.insert(Atom.ordVar)(rigid)(
    { ...typed.value1, quant: new Atom.Forall(77) })(k.vars) };
  const consoleLabel = { effect: Row.ConsoleEffect.value, args: [],
    mark: markN };
  return { provenance: first.provenance, cases: {
    'type variable at row sort': [firstIs(equal(new Effect.MVar(rowVar))), 1],
    'record tail at type sort':
      [firstIs(equal(new Effect.MRecord([], [typeVar]))), 1],
    'undeclared type variable': [firstIs(equal(new Effect.MVar(rigid))), 1],
    'EffRigid outside effectRigids':
      [firstIs(tailed(new Effect.EffRigid(999))), 1],
    'EffFresh outside flexEff': [firstIs(tailed(new Effect.EffFresh(
      { root: Origin.InBody.value, steps: [] }, new Effect.Clauses(99)))), 1],
    'rigid Fail payload':
      [firstIs(failing(new Effect.MVar(rigid)), declared), 3],
    'arrow Fail payload':
      [firstIs(failing(new Effect.MArrow(unit, closed, unit))), 3],
    'handler Fail payload': [firstIs(failing(new Effect.MHandler(consoleLabel,
      { inference: closed, clauses: Nothing.value }))), 3],
    'open-record Fail payload':
      [firstIs(failing(new Effect.MRecord([], [rowVar]))), 3]
  } };
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
  // Task 3: a type variable at row sort and a record tail at type sort
  // are check 1 at obligation 0.
  'r0-a2-record-refs': async context => {
    const load = loader(context);
    const { Record, Effect, k } = await recordCases(load);
    const { provenance, cases } = await referenceMutants(load, k);
    const wrong = ['type variable at row sort', 'record tail at type sort']
      .filter(name => {
        const found = Record.recordDefect(cases[name][0]);
        return checkOf(found) !== 1
          || !Effect.eqProvenance.eq(found.value0.provenance)(provenance);
      });
    if (wrong.length > 0) fail(`references at the wrong sort: ${wrong}`);
    passed(context);
  },
  // Task 3: a forced tail outside its placement is check 2.
  'r0-a2-forced-placement': async context => {
    const { Record, strayEntry } = await recordCases(loader(context));
    const check = checkOf(Record.recordDefect(strayEntry));
    if (check !== 2) fail(`forced tail in an Entry row: check ${check}`);
    passed(context);
  },
  // Task 3 (controller ruling): a `⟨q, result clauses⟩` outside F is
  // check 2, at an instance whose R is closed and at another path.
  'r0-a2-unforced-result-clauses': async context => {
    const { Record, closedR, elsewhereEntry } =
      await recordCases(loader(context));
    const checks = [closedR, elsewhereEntry].map(problem =>
      checkOf(Record.recordDefect(problem)));
    if (checks.some(check => check !== 2))
      fail(`result clauses outside F: checks ${JSON.stringify(checks)}`);
    passed(context);
  },
  // Task 3: a flexible `Fail` payload with no `FailConcrete` is check 3.
  'r0-a2-fail-invariant': async context => {
    const { Record, unconcrete } = await recordCases(loader(context));
    const check = checkOf(Record.recordDefect(unconcrete));
    if (check !== 3) fail(`Fail payload with no FailConcrete: check ${check}`);
    passed(context);
  },
  // Task 5's probes (test/regression-r0-a2-malformed.mjs).
  ...a2MalformedProbes
};
