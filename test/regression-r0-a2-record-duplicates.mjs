// Record check 6 (dossier §18.155 (2); spec §4.1): the declaration lists
// `flexEff` and `positions` hold each entry once. `duplicateCases`
// builds the mutants from any build's modules, so the probe loads the
// clone's and test/r0-a2-record-duplicates.test.mjs the healthy build's;
// the rows are in scripts/regression-r0-a2-record-duplicates.mjs. Each
// case is [name, problem, expected], the expected defect written as
// `check j table` for an `InRecord` report, `check j appended` for the
// appended obligation's, null for none. Fixture-level checks.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordCases } from './regression-r0-a2-prereq.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

export const duplicateCases = async load => {
  const base = await recordCases(load);
  const { Record, Effect, withEffects, use, forced } = base;
  const { Just, Nothing } = await load('Data.Maybe');
  const Origin = await load('Domain.Recorded.Origin');
  const Row = await load('Domain.Row');
  const Maps = await load('Data.Map.Internal');
  const { flexEff, positions } = use.effects;
  // A package-owned variable: not forced, not a result-clauses tail.
  const owned = flexEff.find(variable => variable instanceof Effect.EffFresh
    && !(variable.value1 instanceof Effect.ResultClauses)
    && !Effect.eqEVar.eq(variable)(forced));
  const root = { root: Origin.InBody.value, steps: [] };
  const siteAt = rule => new Effect.AtSite({ decl: use.decl, path: root,
    rule: new Origin.ExprRule(rule), role: Effect.EntryRow.value });
  // An `Entry` row naming `owned` as its tail and the first position as
  // the mark of a `Log` label, so each names both once more.
  const entryOf = (rule, tail = owned) => ({ ...use.effects.obligations[0],
    provenance: siteAt(rule), value: new Effect.Entry({ labels: [{
      effect: new Row.UserEffect(0), args: [],
      mark: new Effect.At(positions[0]) }], tail: new Just(tail) }) });
  const appended = (problem, ...entries) => withEffects(problem,
    { obligations: [...problem.effects.obligations, ...entries] });
  const referenced = appended(use, entryOf(101), entryOf(102),
    entryOf(103));
  const twiceEff = problem => withEffects(problem,
    { flexEff: [...problem.effects.flexEff, owned] });
  const twicePos = problem => withEffects(problem,
    { positions: [positions[0], ...problem.effects.positions] });
  // A variable no entry names, so coverage (check 1) fails.
  const unnamed = new Effect.EffFresh(root, Effect.OpenedRow.value);
  const uncovered = problem => withEffects(problem,
    { flexEff: [...problem.effects.flexEff, unnamed] });
  // One variable outside `flexEff`, named by an appended entry: check 1.
  const stray = problem => appended(problem, entryOf(104, new Effect
    .EffFresh(root, Effect.Stage.create(9))));
  const failTwo = problem => withEffects(problem, { declarations: {
    ...problem.effects.declarations, effects: Maps.insert(Row.ordEffectRef)(
      Row.FailEffect.value)(2)(problem.effects.declarations.effects) } });
  const rows = [
    ['as generated', use, null],
    ['a repeated flexEff entry', twiceEff(use), 'check 6 InDeclaredLists'],
    ['a repeated positions entry', twicePos(use),
      'check 6 InDeclaredLists'],
    ['both lists repeated', twicePos(twiceEff(use)),
      'check 6 InDeclaredLists'],
    // The distinction (§18.155 (2)): repeated references stay valid.
    ['referenced many times, listed once', referenced, null],
    ['referenced many times, listed twice', twiceEff(referenced),
      'check 6 InDeclaredLists'],
    // Spec §5 item 1: after every entry and the declarations entry,
    // before the coverage.
    ['an entry defect first', stray(twiceEff(use)), 'check 1 appended'],
    ['invalid arities first', failTwo(twicePos(use)),
      'check 5 InDeclarations'],
    ['coverage alone', uncovered(use), 'check 1 InCoverage'],
    ['repeats before coverage', uncovered(twiceEff(use)),
      'check 6 InDeclaredLists']];
  const describe = problem => {
    const found = Record.recordDefect(problem);
    if (found.constructor.name === 'Nothing') return null;
    const { provenance, check } = found.value0;
    if (provenance instanceof Effect.InRecord)
      return `check ${check} ${provenance.value0.table.constructor.name}`;
    const last = problem.effects.obligations.at(-1).provenance;
    return Effect.eqProvenance.eq(provenance)(last)
      ? `check ${check} appended` : `check ${check} elsewhere`;
  };
  return { Record, Effect, Nothing, use, owned, referenced, rows,
    describe };
};

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Every case whose defect differs from its expected one, by name.
const records = async context => {
  const cases = await duplicateCases(loader(context));
  const wrong = cases.rows.map(([name, problem, expected]) =>
    [name, cases.describe(problem), expected])
    .filter(([, found, expected]) => found !== expected)
    .map(([name, found]) => [name, found]);
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const a2DuplicateProbes = {
  'r0-a2-duplicates-dropped': records,
  'r0-a2-duplicates-flexeff-set': records,
  'r0-a2-duplicates-positions-set': records
};
