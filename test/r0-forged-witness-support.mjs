// BACKLOG R026's probe (whole-stack review, 2026-10-24): the online
// search's certificate, its effect package's type bindings optionally
// forged (the evidence `certifyPackage` validates, dossier §18.172),
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
  const { holeVar } = await load('Domain.Recorded.Hole');
  const Package = await load('Domain.Verdict.EffectPackage');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const { Right } = await load('Data.Either');
  const { Nothing } = await load('Data.Maybe');
  const bool = new Package.PBase(Atom.BoolBase.value);
  const int = new Package.PBase(Atom.IntBase.value);
  const pure = { labels: [], tail: Nothing.value };
  const intToInt = new Package.PArrow(int, pure, int);
  // Every package type binding replaced by `image`; other fields kept.
  const everyTo = image => certificate => ({ ...certificate,
    effects: new Right({ ...certificate.effects.value0,
      types: Map.functorMap.map(() => image)(
        certificate.effects.value0.types) }) });
  const toBool = everyTo(bool);
  const toFunction = everyTo(intToInt);
  const toHole = everyTo(new Package.PVar(holeVar(0)));
  // The separate pre-default field forged and the package left honest.
  const unsettledToBool = certificate => ({ ...certificate,
    unsettled: Map.functorMap.map(() => Atom.Base.create(
      Atom.BoolBase.value))(certificate.unsettled) });
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
      attempts: decision.attempts.map(named), decision: result };
    if (named(judged) !== 'Just') return found;
    return { ...found,
      compilation: Judged.judgedSolution(judged.value0).compilation,
      elaborated: Elaborate.elaborate(Set.empty)(elaborating)(
        judged.value0) };
  };
  const bindings = compilation => Map.toUnfoldable(unfoldableArray)(
    compilation.value0.bindings).map(pair => pair.value1);
  return { outcomeOf, toBool, toFunction, toHole, unsettledToBool, named,
    bindings };
};
