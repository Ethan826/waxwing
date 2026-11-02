// Tranche 2 Task 9's corpus check (corpus-observed): over the corpus
// loader's candidates (generation and `recheck` both succeed), the
// least terms of each final mark store (ReadBack/Least.purs) and
// `readMarks`: every recorded position reads a term (or the fault, by
// kind); no class holds two constants (`clashes`); every live edge
// `holds` under the terms (the validator's `holds`); no recorded mark
// position sits on a `Fail` or Console label; and `readRows` under the
// least terms (Task 8's faults, now with real terms).
//   node research/t2-read-back-design/marks-corpus.mjs
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';

const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Function = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const { fields } = await load('Domain.Recorded');
const Marks = await load('Features.Check.Strategy.ReadBack.Marks');
const Rows = await load('Features.Check.Strategy.ReadBack.EffectRows');
const { holds } = await load('Features.Check.Strategy.Effects.Term');
const { edgesOf } = await load('Features.Check.MarkStore');
const Sets = await load('Data.Set');
const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');

const named = value => value.constructor.name;
const shown = 3;
const out = { candidates: 0, marksRead: 0, marksFaults: {}, positions: {},
  stores: 0, clashes: 0, edges: 0, edgesFailing: 0, failOrConsolePositions: 0,
  rowsRead: 0, rowsFaults: {}, unsupported: {}, examples: {} };
const bump = (table, key, by = 1) => { table[key] = (table[key] ?? 0) + by; };
const note = (key, at) => {
  out.examples[key] ??= [];
  if (out.examples[key].length < shown) out.examples[key].push(at);
};
const termText = term => (named(term) === 'TermJ'
  ? `J{${Sets.toUnfoldable(unfoldableArray)(term.value0).length}}`
  : named(term).slice(4));

// Recorded labels carrying a position on a Fail or Console label.
const failPositions = (value, found = { count: 0 }) => {
  if (value === null || typeof value !== 'object') return found;
  if (value.effect !== undefined && value.mark !== undefined
    && named(value.mark) === 'At'
    && ['FailEffect', 'ConsoleEffect'].includes(named(value.effect)))
    found.count += 1;
  for (const part of Object.values(value)) failPositions(part, found);
  return found;
};

const storeChecks = (store, terms, at) => {
  out.stores += 1;
  const clashed = Marks.clashes(store);
  out.clashes += clashed;
  if (clashed > 0) note('clash', at);
  for (const edge of edgesOf(store)) {
    out.edges += 1;
    if (!holds(Marks.termOf(terms)(edge.lower))(Marks.termOf(terms)(
      edge.upper))) { out.edgesFailing += 1; note('edge failing', at); }
  }
};

const declaration = (origin, program, inputs, holders, decl) => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return;
  const found = Function.recheck(holders)(program)(decl);
  if (named(found) !== 'Right') return;
  out.candidates += 1;
  const at = `${origin}#${decl.name}`;
  const problem = Elaborating.problem(generated.value0);
  const effects = fields(problem).effects;
  const unsupported = effects.obligations.some(o =>
    named(o.value) === 'Unsupported');
  const { function: checked, state, trace } = found.value0;
  const terms = Marks.leastTerms(state.subst.marks);
  storeChecks(state.subst.marks, terms, at);
  const onFail = failPositions(effects).count;
  out.failOrConsolePositions += onFail;
  if (onFail > 0) note('position on a Fail or Console label', at);
  const marks = Marks.readMarks(terms)(problem)(checked)(trace);
  if (named(marks) === 'Right') {
    out.marksRead += 1;
    for (const pair of Maps.toUnfoldable(unfoldableArray)(marks.value0))
      bump(out.positions, `${named(pair.value0)} ${termText(pair.value1)}`);
  } else {
    const key = `${named(marks.value0)} ${named(marks.value0.value0)}`;
    bump(unsupported ? out.unsupported : out.marksFaults, `marks ${key}`);
    note(`marks ${key}`, at);
  }
  const rows = Rows.readRows(Marks.termOf(terms))(problem)(checked)(trace);
  if (named(rows) === 'Right') return void (out.rowsRead += 1);
  const fault = rows.value0;
  const key = `${named(fault)} ${named(fault.value1 ?? fault.value0)}`;
  bump(unsupported ? out.unsupported : out.rowsFaults, `rows ${key}`);
};

const started = Date.now();
for (const { origin, source } of await loadCorpus()) {
  let program;
  try { program = resolved(source); } catch { continue; }
  const inputs = Inputs.generationInputs(program);
  const holders = functional(program.ctors);
  for (const decl of program.functions)
    declaration(origin, program, inputs, holders, decl);
}
out.seconds = Math.round((Date.now() - started) / 1000);
console.log(JSON.stringify(out, null, 1));
