// BACKLOG R026's probe (whole-stack review, 2026-10-24): the online
// search's certificate, its pre-default bindings optionally forged,
// decided through the shadow assembly with only that search
// (`onlineWith`: the production check) and elaborated. Before the fix
// the check judged one field of the certificate and the witness was
// built from another, so `id2`'s bindings forged to `Bool` were Solved
// and `build` gave ill-typed IR (.build/evidence/r026-before.log).
// `forgedFrom` takes a loader and loads nothing itself, so the
// regression row reads the clone's output only.
import { budget, onlineFrom } from './r0-online-support.mjs';

export const id2Source =
  'fn id2(x: Int): Int = {\n  let g = fn(y) => y;\n  g(x)\n};\n'
  + 'fn main(): Int = id2(1);\n';

// A hole the read-back defaults (`y`'s type), judged by the contract.
export const unusedShow =
  'fn f(): Int = { let g = fn(y) => show(y); 0 };\nfn main(): Int = 0;\n';

const named = value => value.constructor.name;

export const forgedFrom = async load => {
  const online = await onlineFrom(load);
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Decide = await load('Features.Check.Decide');
  const Shadow = await load('Features.Check.Decide.Shadow');
  const Online = await load('Features.Check.Strategy.Online');
  const Elaborate = await load('Features.Check.Elaborate');
  const Elaborating = await load('Domain.Elaborating');
  const Judged = await load('Domain.Verdict.Judged');
  const Atom = await load('Domain.Recorded.Atom');
  const Map = await load('Data.Map.Internal');
  const Set = await load('Data.Set');
  const bool = Atom.Base.create(Atom.BoolBase.value);
  const int = Atom.Base.create(Atom.IntBase.value);
  const intToInt = new Atom.Arrow(int, int);
  // Every pre-default binding replaced by `image`; other fields kept.
  const everyTo = image => certificate => ({ ...certificate,
    unsettled: Map.functorMap.map(() => image)(certificate.unsettled) });
  const toBool = everyTo(bool);
  const toFunction = everyTo(intToInt);
  const offering = (search, forge) => given => asked => {
    const found = search(given)(asked);
    return named(found) === 'Candidate'
      ? new found.constructor(forge(found.value0), found.value1,
        found.value2)
      : found;
  };
  // The shadow `Checking` with one online search, its certificate passed
  // through `forge`; the decision, and `elaborate`'s result if Solved.
  const outcomeOf = (source, name, forge = certificate => certificate) => {
    const program = online.programOf(source);
    const inputs = Inputs.generationInputs(program);
    const elaborating = Generate.generate(inputs.tables)(inputs.signatures)(
      program.functions.find(decl => decl.name === name)).value0;
    const problem = Elaborating.problem(elaborating);
    const search = Online.onlineSearch(online.contextOf(program));
    const checking = { ...Shadow.shadowChecking(online.legacyText)(budget)(
      program), strategies: [Online.onlineWith(offering(search, forge))],
    shadows: [] };
    const result = Decide.judgedDecision(checking)(problem);
    if (named(result) !== 'Right') throw new Error('decide faulted');
    const { decision, judged } = result.value0;
    const found = { verdict: named(decision.verdict),
      attempts: decision.attempts.map(named) };
    if (named(judged) !== 'Just') return found;
    return { ...found,
      compilation: Judged.judgedSolution(judged.value0).compilation,
      elaborated: Elaborate.elaborate(Set.empty)(elaborating)(
        judged.value0) };
  };
  return { outcomeOf, toBool, toFunction, named };
};
