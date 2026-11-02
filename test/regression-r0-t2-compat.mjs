// Tranche 2 Task 14 regression probes (the owed compatibility checks,
// test/r0-t2-compat-checks.mjs); the rows are in
// scripts/regression-r0-t2-compat.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, judges the
// package fixtures of test/r0-t2-package-cases.mjs and `records#main`
// (a two-field record row) and fails naming every fixture whose check
// fails. Fixture-level.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the package cases read example and
// research sources a test-tree row's clone does not hold, and the
// registry loads this module there too.
const checksOf = async context =>
  (await import('./r0-t2-compat-checks.mjs')).compatChecks(loader(context));

// `main`'s σ binds `older`'s row variable to `{ id: Int, name: Text }`.
const records = `fn older(p: { age: Int, ...r }): { age: Int, ...r } =
  p { age = p.age + 1 };
fn main(): Unit with Console = {
  let ada = { name: "Ada", age: 36, id: 7 };
  Console.print(older(ada));
};
`;

const judged = checks => [...checks.cases.every(),
  checks.cases.live(records, 'main')].map(item => ({ name: item.name,
  ...checks.judge(item.problem, checks.cases.packageOf(item),
    item.readBack.unsettled) }));
const named = (items, wrong) => items.filter(wrong).map(item => item.name);

const wrongs = {
  erasure: items => named(items, item => !item.erasure),
  commute: items => named(items, item => !item.commute || !item.projection),
  g0: items => named(items, item => item.g0 === 'before'
    || item.derived.some(run => run.g0 === 'before')),
  numerals: items => named(items, item => !item.numerals
    || item.derived.some(run => run.collides))
};

// A planted record tail-order difference is caught; field order is not.
// Loads only what it reads (no package cases), so it runs in a test-tree
// row's clone, where the comparison itself is the restored defect.
const tailOrderWrong = async context => {
  const load = loader(context);
  const { sameSubstitution } = await import('./r0-a2-canonical.mjs');
  const Package = await load('Features.Check.Strategy.Effects.Package');
  const P = await load('Domain.Verdict.EffectPackage');
  const Atom = await load('Domain.Recorded.Atom');
  const { holeVar } = await load('Domain.Recorded.Hole');
  const Maps = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const int = new Atom.Base(Atom.IntBase.value);
  const field = (label, ty) => new Tuple(label, ty);
  const [key, one, two] = [holeVar(0), holeVar(1), holeVar(2)];
  const pkg = { types: Maps.empty, effects: Maps.empty, marks: Maps.empty,
    rows: Maps.singleton(key)({ tails: [one, two], fields: [
      field('a', new P.PBase(Atom.IntBase.value)),
      field('b', new P.PBase(Atom.IntBase.value))] }) };
  const holds = (fields, tails) => sameSubstitution(pairs(Package.erase(
    pkg)), pairs(Maps.singleton(key)(new Atom.Record(fields, tails))));
  return [
    ...holds([field('b', int), field('a', int)], [one, two]) ? [] : ['fields'],
    ...holds([field('a', int), field('b', int)], [two, one]) ? ['tails'] : []];
};

const probe = check => async context => {
  const wrong = check === 'tailOrder' ? await tailOrderWrong(context)
    : wrongs[check](judged(await checksOf(context)));
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2CompatProbes = {
  'r0-t2-compat-erase-field': probe('erasure'),
  'r0-t2-compat-settle': probe('commute'),
  'r0-t2-compat-g0': probe('g0'),
  'r0-t2-compat-numerals': probe('numerals'),
  'r0-t2-compat-tail-order': probe('tailOrder')
};
