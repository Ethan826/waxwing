// Every declaration of the pinned R0 corpus (test/r0-corpus.mjs), with
// its recorded problem, today's live check, the online search's outcome
// and the G0-only comparator's verdict on its candidate (`substitutionOnly`
// since §18.174; its column keeps the label `certify`). Research only.
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';
import { budget, onlineFrom } from '../../test/r0-online-support.mjs';
import { liveOf } from './live.mjs';
import { named } from './shape.mjs';

const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const Substitution = await load('Features.Check.Strategy.Substitution');
const { functional } = await load('Features.Check.Functional');

// The search's outcome by name; a `NoCandidate`'s end by its
// constructor (`Broke` and the live checker's endings).
const searchOf = (program, problem) => {
  const found = Online.onlineSearch(online.contextOf(program))(budget)(
    problem);
  if (named(found) !== 'NoCandidate') return { search: named(found), found };
  return { search: `NoCandidate ${named(found.value0)}`, found };
};

const certifyOf = (problem, found) => {
  if (named(found) !== 'Candidate') return null;
  const verdict = Substitution.substitutionOnly(problem)(
    found.value0.unsettled);
  return named(verdict) === 'Right' ? 'accepts'
    : `refuses ${named(verdict.value0)}`;
};

const declarationOf = (origin, program, inputs, holders) => decl => {
  const at = `${origin}#${decl.name}`;
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right')
    return { at, stage: 'generation refused' };
  const problem = Elaborating.problem(generated.value0);
  const live = liveOf(holders, program, decl);
  const { search, found } = searchOf(program, problem);
  return { at, decl, program, problem, live, search,
    certify: certifyOf(problem, found) };
};

// Each declaration of one corpus entry; an entry that does not resolve
// is one row.
export const declarationsOf = ({ origin, source }) => {
  let program;
  try { program = resolved(source); } catch {
    return [{ at: origin, stage: 'parse or resolve refused' }];
  }
  const inputs = Inputs.generationInputs(program);
  const holders = functional(program.ctors);
  return program.functions.map(declarationOf(origin, program, inputs,
    holders));
};

export const corpus = async () => loadCorpus();

// The four-way split of §18.151 (1), in order: refused by the live
// checker; online search failed otherwise; a candidate (then split by
// the comparator); mapping is the inventory's own column.
export const stageOf = item => {
  if (item.stage !== undefined) return item.stage;
  if (item.live.refused !== undefined)
    return `live refusal (search ${item.search})`;
  if (item.search !== 'Candidate') return `search: ${item.search}`;
  return `candidate, certify ${item.certify}`;
};
