// Review probe (design §I Task 6, "types/rows from today's
// unsettled"): over the corpus loader's online candidates, count the
// type images in today's `unsettled` (row-free `RTExpr`) that contain
// an arrow or a handler head. Each such image's `PTy` needs an effect
// row, label marks or a clause row that the RTExpr does not carry.
// Re-review (rev. 2): also data types with row parameters, which images
// are auxiliaries, and record-row (`SortRow`) images needing rows, which
// §C.8's `readImage` (types only) does not cover.
// Research only; corpus-observed.
//   node research/t2-read-back-review/image-rows.mjs
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';
import { budget, onlineFrom } from '../../test/r0-online-support.mjs';
import { named } from '../t2-read-back-inventory/shape.mjs';

const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const Maps = await load('Data.Map.Internal');
const { fields } = await load('Domain.Recorded');
const { unfoldableArray } = await load('Data.Unfoldable');
const Atom = await load('Domain.Recorded.Atom');

// Arrows and handler heads in one RTExpr, by an explicit stack.
const needs = (image, rowful) => {
  const found = { arrow: 0, handler: 0, rowData: 0 };
  const stack = [image];
  while (stack.length > 0) {
    const t = stack.pop();
    const kind = named(t);
    if (kind === 'Arrow') {
      found.arrow += 1;
      stack.push(t.value0, t.value1);
    } else if (kind === 'App') {
      if (named(t.value0) === 'HandlerHead') found.handler += 1;
      else if (rowful(t.value0.value0)) found.rowData += 1;
      stack.push(...t.value1);
    } else if (kind === 'Record') stack.push(...t.value0.map(p => p.value1));
    else if (kind === 'Base' && named(t.value0) === 'DataBase'
      && rowful(t.value0.value0)) found.rowData += 1;
  }
  return found;
};

const out = { candidates: 0, images: 0, withArrow: 0, withHandler: 0,
  withRowData: 0, rowDataOnly: 0, rowDataAuxiliary: [], anyAuxiliary: 0,
  recordRowImages: [],
  declarations: 0,
  examples: [] };
const declaration = (program, inputs, origin) => decl => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return;
  const problem = Elaborating.problem(generated.value0);
  const found = Online.onlineSearch(online.contextOf(program))(budget)(
    problem);
  if (named(found) !== 'Candidate') return;
  out.candidates += 1;
  // A data type with row parameters (review re-check, §C.8's uncounted
  // case): its `PData` image needs rows the RTExpr does not carry.
  const rowful = id => program.types[id].rowParameters.length > 0;
  let any = false;
  for (const pair of Maps.toUnfoldable(unfoldableArray)(
    found.value0.unsettled)) {
    out.images += 1;
    const { arrow, handler, rowData } = needs(pair.value1, rowful);
    if (arrow > 0) out.withArrow += 1;
    if (handler > 0) out.withHandler += 1;
    if (rowData > 0) out.withRowData += 1;
    if (rowData > 0 && arrow + handler === 0) out.rowDataOnly += 1;
    const info = Maps.lookup(Atom.ordVar)(pair.value0)(fields(problem).vars);
    const auxiliary = named(info.value0.position) === 'Auxiliary';
    if (auxiliary && arrow + handler + rowData > 0) out.anyAuxiliary += 1;
    // §C.8 reads `types` from the live type but `rows` (record-row
    // variables) from `unsettled`: a rowful record-row image has no rule.
    if (named(info.value0.sort) === 'SortRow' && arrow + handler + rowData)
      out.recordRowImages.push(`${origin}#${decl.name} ${auxiliary
        ? "auxiliary" : "positioned"}`);
    if (rowData > 0 && auxiliary)
      out.rowDataAuxiliary.push(`${origin}#${decl.name}`);
    any ||= arrow + handler + rowData > 0;
  }
  if (any) {
    out.declarations += 1;
    if (out.examples.length < 5) out.examples.push(`${origin}#${decl.name}`);
  }
};

for (const { origin, source } of await loadCorpus()) {
  let program;
  try { program = resolved(source); } catch { continue; }
  const inputs = Inputs.generationInputs(program);
  program.functions.forEach(declaration(program, inputs, origin));
}
console.log(JSON.stringify(out, null, 1));
