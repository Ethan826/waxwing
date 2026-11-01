// A2 Task 14 (docs/plans/2026-10-31-a2-validator-plan.md; dossier
// §18.145 (4)): the differential reporter. It compares today's verdict
// for a declaration with the validator's result (`Substitution.validate`,
// an `Either CheckRefusal ValidationResult`) and files the case under one
// category. Test-side only: scripts/r0-results-diff.mjs keeps its results.
//
// Inputs now are fixtures. Corpus reporting waits for Task 16 and tranche
// 2: nothing here reads the corpus, and a `corpus` row is accepted only
// so the two kinds of evidence stay apart in the output. A validator
// acceptance on a fixture is "predicted"; only a corpus row says
// "observed".
//
// A case: { name, evidence: 'fixture' | 'corpus', today, problem, input,
// blocks? }. `today` is { accepts: true } or { accepts: false, refusal:
// <diagnostic name>, at? }, `at` the index in problem.effects.obligations
// of the obligation today refuses at. Every row is classified on the full
// `Substitution.validate` result; the result of a partial pipeline is
// never the validator's. `blocks` are the Decide blocks, read only for a
// `RecordDefective` among them.
//
// Categories:
//   Agree                   both accept, or both refuse (the kind names
//                           the validator's refusal)
//   ValidatorStricter       today accepts, the validator refuses; kind is
//                           Malformed | ObligationFailed | NotCertifiable
//                           | G0 (a refusal of Substitution's G0 check)
//   ValidatorWider          today refuses, the validator accepts
//   C6-expected-divergence  today's refusal is FailNeedsConcrete at (`at`)
//                           a recorded FailConcrete whose payload head is
//                           a hole settled to the default, the validator
//                           accepting (spec C6)
//   GenerationDefect        a RecordDefect refusal or a RecordDefective
//                           block, under any verdict (spec §6)
import { load } from './r0-generate-support.mjs';

const Substitution = await load('Features.Check.Strategy.Substitution');
const Validate = await load('Features.Check.Strategy.Effects.Validate');
const Complete = await load('Features.Check.Strategy.Effects.Complete');
const Package = await load('Features.Check.Strategy.Effects.Package');
const P = await load('Domain.Verdict.EffectPackage');
const Atom = await load('Domain.Recorded.Atom');
const Hole = await load('Domain.Recorded.Hole');
const { Just } = await load('Data.Maybe');

export const evidences = ['fixture', 'corpus'];
export const categories = ['Agree', 'ValidatorStricter', 'ValidatorWider',
  'C6-expected-divergence', 'GenerationDefect'];

const nameOf = value => value.constructor.name;
const isRight = result => nameOf(result) === 'Right';
const refusalName = result => nameOf(result.value0);
const g0Refusals = ['Unsatisfied', 'Undefined', 'NotEntailed',
  'RequirementOpen', 'RequirementFails', 'RequirementUnjudged',
  'NotGeneric'];
const checkRefusals = ['Malformed', 'ObligationFailed', 'NotCertifiable'];

// The default a settled hole takes (ReadBack `settled`, W §1.5).
const isInt = ty => ty instanceof P.PBase
  && ty.value0 instanceof Atom.IntBase;

// Prerequisites, then the recorded obligations judged on the completed
// package: `validate` minus G0, which reads P_in, not P_c. It is shown
// only as a separately labeled note beside a refusal, never as the
// validator's result.
export const obligationsOnly = (problem, input) => {
  const first = Validate.prerequisites(problem)(input);
  return isRight(first) ? Validate.judgeObligations(problem)(
    Complete.complete(problem)(input)) : first;
};

export const validatorOf = (problem, input) =>
  Substitution.validate(problem)(input);

const isFailConcrete = placed => nameOf(placed.value) === 'FailConcrete';

// The head of a `FailConcrete` payload in the completed package is a hole
// that settles to the default.
const settledHole = (completed, placed) => {
  const found = Package.under(completed)(placed.value.value0);
  return found instanceof Just && found.value0 instanceof P.PVar
    && Hole.isHole(found.value0.value0)
    && isInt(Package.settleTy(found.value0));
};

// The recorded obligations C6 can name, by their index.
export const holeSettledPayloads = (problem, input) => {
  const completed = P.completedPackage(Complete.complete(problem)(input));
  return problem.effects.obligations.flatMap((placed, index) =>
    isFailConcrete(placed) && settledHole(completed, placed) ? [index]
      : []);
};

// A provenance as plain data, for the output.
const plain = value => {
  if (Array.isArray(value)) return value.map(plain);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object ? Object.fromEntries(
    Object.keys(value).map(name => [name, plain(value[name])]))
    : { [nameOf(value)]: Object.keys(value).map(name =>
      plain(value[name])) };
};

const defectOf = (result, blocks) => {
  const block = blocks.find(item => nameOf(item) === 'RecordDefective');
  if (block !== undefined) return block.value0;
  return !isRight(result) && refusalName(result) === 'RecordDefect'
    ? result.value0.value0.provenance : undefined;
};

const kindOf = result => {
  const name = refusalName(result);
  if (checkRefusals.includes(name)) return name;
  if (g0Refusals.includes(name)) return 'G0';
  throw new Error(`no differential kind for the refusal ${name}`);
};

const wider = item => item.today.refusal === 'FailNeedsConcrete'
  && holeSettledPayloads(item.problem, item.input).includes(item.today.at)
  ? { category: 'C6-expected-divergence' } : { category: 'ValidatorWider' };

const decided = (item, result, defect) => {
  if (defect !== undefined) return { category: 'GenerationDefect',
    defect: plain(defect) };
  if (isRight(result)) return item.today.accepts ? { category: 'Agree' }
    : wider(item);
  return item.today.accepts ? { category: 'ValidatorStricter',
    kind: kindOf(result) } : { category: 'Agree', kind: refusalName(result) };
};

const noted = (item, result) => isRight(result) ? {} : {
  obligationsOnly: isRight(obligationsOnly(item.problem, item.input))
    ? 'accepts' : 'refuses' };

export const classify = item => {
  if (!evidences.includes(item.evidence))
    throw new Error(`evidence is fixture or corpus: ${item.evidence}`);
  const result = validatorOf(item.problem, item.input);
  const defect = defectOf(result, item.blocks ?? []);
  return { name: item.name, evidence: item.evidence,
    ...decided(item, result, defect), ...noted(item, result),
    today: item.today.accepts ? 'accepts' : `refuses ${item.today.refusal}`,
    validator: isRight(result) ? 'accepts' : `refuses ${refusalName(result)}`,
    basis: item.evidence === 'fixture' ? 'predicted' : 'observed' };
};

const line = row => `  ${row.name}: ${row.category}`
  + `${row.kind ? ` (${row.kind})` : ''}; today ${row.today}; `
  + `${row.basis} validator ${row.validator}`
  + `${row.obligationsOnly ? `; obligations-only: ${row.obligationsOnly}`
    : ''}${row.defect ? `; defect at ${JSON.stringify(row.defect)}` : ''}`;

// One section per kind of evidence, never merged.
export const render = rows => evidences.flatMap(evidence => [
  `${evidence} evidence:`,
  ...rows.filter(row => row.evidence === evidence).map(line)]).join('\n');

const countOf = (rows, evidence, matches) => rows.filter(row =>
  row.evidence === evidence && matches(row)).length;

// Per evidence: each category, and each category with a kind as
// `Category/kind`, so refusals that agree stay separable.
export const summarize = rows => Object.fromEntries(evidences.map(
  evidence => [evidence, Object.fromEntries([
    ...categories.map(category => [category, countOf(rows, evidence,
      row => row.category === category)]),
    ...[...new Set(rows.filter(row => row.kind).map(row =>
      `${row.category}/${row.kind}`))].map(label => [label, countOf(rows,
      evidence, row => `${row.category}/${row.kind}` === label)])])]));
