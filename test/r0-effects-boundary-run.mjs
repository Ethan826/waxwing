import { load } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { declarationsOf, rt8Sources } from './r0-rt8-run.mjs';

// The corpus survey behind the effects boundary test
// (r0-effects-boundary.serial.test.mjs) and the fail-only cohort writer
// (scripts/r0-fail-only-pin.mjs): each corpus declaration's recorded
// handler facts, its handler constructs read from resolved source, and
// its shadow verdict.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');
const named = value => value.constructor.name;
const valuesOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => pair.value1);

// Whether any `MHandler` sits anywhere in the values, by explicit stack.
const holdsHandler = values => {
  const pending = [...values];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (named(value) === 'MHandler') return true;
    pending.push(...Object.values(value));
  }
  return false;
};

const constructs = { Handler: 'literal', With: 'with', Handle: 'handle',
  Fail: 'fail', THandler: 'type' };
export const sourceKinds = Object.values(constructs);

// Which handler constructs occur in a resolved declaration, by an
// explicit stack over the value, matching constructor names.
const constructsOf = decl => {
  const found = new Set();
  const seen = new Set();
  const pending = [decl];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object' || seen.has(value))
      continue;
    seen.add(value);
    const construct = constructs[named(value)];
    if (construct !== undefined) found.add(construct);
    pending.push(...Object.values(value));
  }
  return [...found].sort();
};

const kindsOf = entries => entries.map(entry => named(entry.value));

const factsOf = row => {
  const { tables, signatures } = Inputs.generationInputs(row.program);
  const generated = Generate.generate(tables)(signatures)(row.decl);
  if (named(generated) !== 'Right') return { at: row.at, refused: true };
  const source = constructsOf(row.decl);
  const fields = Recorded.fields(Elaborating.problem(generated.value0));
  const { effects } = fields;
  const kinds = kindsOf(fields.outside);
  const written = constructsOf({ parameters: row.decl.parameters,
    result: row.decl.result, row: row.decl.row });
  const sites = { nodes: holdsHandler(valuesOf(effects.nodes)),
    instances: holdsHandler(valuesOf(effects.instances)),
    annotations: holdsHandler(valuesOf(effects.annotations)) };
  const verdict = describe(row.decision).verdict.split(' ')[0];
  return { at: row.at, kinds, source, verdict, solved: verdict === 'Solved',
    handler: Object.values(sites).some(Boolean), sites,
  signed: written.includes('type'), recordedSignature:
    holdsHandler([effects.signature]) };
};

export const survey = async () => {
  const rows = (await rt8Sources()).flatMap(declarationsOf);
  const all = rows.map(factsOf);
  const refused = all.filter(fact => fact.refused).map(fact => fact.at);
  const facts = all.filter(fact => !fact.refused);
  const scoped = facts.filter(fact => fact.handler
    || fact.kinds.includes('HandlerType')
    || fact.kinds.includes('FailFamily'));
  return { facts, scoped, refused };
};

// `fail` alone performs the Fail effect and is not a handler construct
// (dossier 18.102): the declarations whose constructs are all `fail`.
export const gated = source => source.some(kind => kind !== 'fail');

// The pinned cohort: fail-only declarations with their verdicts, by site.
export const cohortOf = facts => facts
  .filter(fact => fact.source.length > 0 && !gated(fact.source))
  .map(({ at, verdict }) => ({ at, verdict }))
  .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
