// Tranche 2 Task 9 (statements §2, §5; design §C.8, §E, §F): the mark
// read-back's fixtures and helpers, shared by test/r0-t2-marks.test.mjs,
// test/r0-t2-marks-oracle.test.mjs and the restored-defect probes
// (test/regression-r0-t2-marks.mjs). `marksCases(load)` takes a module
// loader, so a probe reads the compiler under test only. Terms print as
// N, M or `J{a,b}`. Fixture-level.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources as rowSources } from './r0-t2-rows-cases.mjs';
import { aroundBoth } from './fx008-defer-programs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const named = value => value.constructor.name;
const right = (result, phase) => {
  if (named(result) !== 'Right')
    throw new Error(`${phase} refused: ${named(result.value0)}`);
  return result.value0;
};

export const sources = {
  handlers: rowSources.handlers,
  aroundBoth,
  rigidFrame: `effect Log { fn log(n: Int): Unit; };
fn g(): Unit with nofail(k) Log =
  with handler Log { log(n) => Log.log(n) } { Log.log(1) };
fn main(): Int = 0;
`,
  famw: readFileSync(join(root, 'test/fx008-probes/witness/famw.wxw'),
    'utf8'),
  annotations: readFileSync(join(root,
    'research/t2-read-back-design/examples/annotations.wxw.txt'), 'utf8'),
  // FX008 §7a's control: the cleanup's Log is `nofail`, so it is accepted.
  cleanup: `effect Log { fn log(n: Int): Unit; };
fn work(): Unit with nofail Log = { defer Log.log(1); () };
fn main(): Unit with Console = Console.print(1);
`
};

export const marksCases = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const { fields } = await load('Domain.Recorded');
  const Marks = await load('Features.Check.Strategy.ReadBack.Marks');
  const Rows = await load('Features.Check.Strategy.ReadBack.EffectRows');
  const Term = await load('Features.Check.Strategy.Effects.Term');
  const Row = await load('Domain.Row');
  const { Push, Bottom } = await load('Features.Check.Search');
  const Maps = await load('Data.Map.Internal');
  const Sets = await load('Data.Set');
  const { Tuple, ordTuple } = await load('Data.Tuple');
  const { ordInt } = await load('Data.Ord');
  const { foldableArray } = await load('Data.Foldable');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const spanOrd = ordTuple(ordInt)(ordInt);
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);

  const mark = {
    N: Row.NoFail.value, M: Row.Plain.value, U: Row.Unmarked.value,
    rigid: name => new Row.MarkVariable(name),
    meta: index => new Row.MarkMeta(index)
  };
  // A mark store from `[meta, mark]` bindings and `[lower, upper]` edges;
  // an edge's label and reason are never read by the read-back.
  const store = (bindings, edges) => ({
    bindings: Maps.fromFoldable(ordInt)(foldableArray)(bindings.map(
      ([meta, value]) => Tuple.create(meta)(value))),
    edges: edges.reduce((stack, [lower, upper]) => Push.create({ lower,
      upper, label: null, reason: null })(stack), Bottom.value),
    fresh: -1
  });
  const termText = term => (named(term) === 'TermJ'
    ? `J{${Sets.toUnfoldable(unfoldableArray)(term.value0).join(',')}}`
    : named(term).slice(4));
  const least = given => Marks.leastTerms(given);
  // A mark's term under a store's least terms, as text.
  const termIn = (given, which) => termText(Marks.termOf(least(given))(
    which));

  // The named declaration's problem, checked declaration, trace and final
  // mark store.
  const live = (source, name) => {
    const program = right(resolve(right(parse(source), 'parse')),
      'resolve');
    const decl = program.functions.find(item => item.name === name);
    const { tables, signatures } = Inputs.generationInputs(program);
    const problem = Elaborating.problem(right(Generate.generate(tables)(
      signatures)(decl), 'generate'));
    const found = right(Function.recheck(functional(program.ctors))(
      program)(decl), 'recheck');
    return { source, problem, checked: found.function, trace: found.trace,
      store: found.state.subst.marks };
  };
  const read = (item, trace = item.trace) => Marks.readMarks(least(
    item.store))(item.problem)(item.checked)(trace);
  const rowsOf = item => Rows.readRows(Marks.termOf(least(item.store)))(
    item.problem)(item.checked)(item.trace);
  // A read's positions as `Kind:term` texts, in the map's order.
  const positionsText = map => pairs(map).map(([position, term]) =>
    `${named(position)}:${termText(term)}`);
  const positionsOf = item => fields(item.problem).effects.positions;
  // Every live edge holds under the least terms (the validator's `holds`).
  const edgesHold = given => {
    const terms = least(given);
    const all = [];
    for (let at = given.edges; named(at) === 'Push'; at = at.value1)
      all.push(at.value0);
    return all.every(edge => Term.holds(Marks.termOf(terms)(edge.lower))(
      Marks.termOf(terms)(edge.upper)));
  };
  // A trace map with every entry list changed by `change`.
  const remap = (map, change) => Maps.fromFoldable(spanOrd)(foldableArray)(
    pairs(map).map(([key, entries]) => Tuple.create(key)(change(entries))));
  return { live, read, rowsOf, remap, positionsText, positionsOf, store, mark,
    termIn, termText, least, edgesHold, pairs, named, Marks, Term, Row,
    Maps, Sets, Tuple, ordInt, fields };
};
