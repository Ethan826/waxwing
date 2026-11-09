// D1's corpus run (R0 Task 7.1b, D1 spec §10 T1, T2, T8): for every
// declaration of every resolving program of the pinned corpus, its
// `Elaborating` (`generate`), the `Judged` `decide` pairs with a Solved
// verdict (`judgedDecision`), `elaborate`'s result, the online
// certificate, whose checked declaration is today's IR, which T2
// compares `build`'s with, and `build` under the witness (the verdict's
// for Solved; beyond Solved, one built from the certificate's `unsettled`).
// The `Checking` is the shadow run's (`shadowChecking`) with its online
// search observed, so the certificate is the one the verdict rests on,
// and with no shadow refuter, whose records never change a verdict
// (AT17, Task 5.2), so the corpus is decided once.
import { loadCorpus } from './r0-corpus.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';

const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Decide = await load('Features.Check.Decide');
const Shadow = await load('Features.Check.Decide.Shadow');
const Online = await load('Features.Check.Strategy.Online');
const Elaborate = await load('Features.Check.Elaborate');
const Elaborating = await load('Domain.Elaborating');
const Judged = await load('Domain.Verdict.Judged');
const { build } = await load('Domain.Elaborating.Build');
const { substitutionWitness } = await load('Features.Check.Strategy.Witness');
const Set = await load('Data.Set');

export const named = value => value.constructor.name;

// The shadow `Checking`, its online search observed: each certificate
// the search offers, by problem.
const observedChecking = program => {
  const searched = new Map();
  const search = online.Online.onlineSearch(online.contextOf(program));
  const observed = given => problem => {
    const found = search(given)(problem);
    if (named(found) === 'Candidate') searched.set(problem, found.value0);
    return found;
  };
  const checking = { ...Shadow.shadowChecking(online.legacyText)(budget)(
    program), strategies: [Online.onlineWith(observed)], shadows: [] };
  return { checking, certificateOf: problem => searched.get(problem) };
};

// One declaration's row: what generation, `decide` and `elaborate` gave.
const rowOf = (origin, program, inputs, observed) => decl => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(decl);
  const at = `${origin}#${decl.name}`;
  if (named(generated) !== 'Right') return { at, fault: true };
  const elaborating = generated.value0;
  const problem = Elaborating.problem(elaborating);
  const decided = Decide.judgedDecision(observed.checking)(problem);
  const judged = named(decided) === 'Right'
    && named(decided.value0.judged) === 'Just'
    ? decided.value0.judged.value0 : null;
  const compilation = judged === null ? null
    : Judged.judgedSolution(judged).compilation;
  const certificate = observed.certificateOf(problem) ?? null;
  return { at, program, decl, elaborating, problem, judged, compilation,
    certificate, built: builtOf(elaborating, problem, certificate),
    elaborated: judged === null ? null
      : Elaborate.elaborate(Set.empty)(elaborating)(judged) };
};

// T2 beyond the Solved verdicts: wherever the search offered a
// certificate, `build` under its witness (G0's adapter, Task 4.4), so
// declarations a marker blocks are compared too. `null` when there is
// no certificate or Cov refused its witness.
const builtOf = (elaborating, problem, certificate) => {
  if (certificate === null) return null;
  const compilation = substitutionWitness(problem)(certificate.unsettled);
  if (named(compilation) !== 'Witnessed') return null;
  return build(elaborating)(compilation.value0);
};

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

// One source's rows, none when it does not resolve.
export const sourceRows = ({ origin, source }) => {
  const program = programOf(source);
  if (program === null) return [];
  const inputs = Inputs.generationInputs(program);
  return program.functions.map(rowOf(origin, program, inputs,
    observedChecking(program)));
};

export const elabRows = async () => (await loadCorpus()).flatMap(sourceRows);
