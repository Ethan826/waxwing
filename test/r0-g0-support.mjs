// Support for Task 4.2's G0 tests: a program's recorded problems and
// holder set, a test-side candidate search, and a G0 strategy built by
// the production `strategy` from G0's production guard and check. The
// search is untrusted test code (as Task 4.3's `onlineSearch` will be):
// it reads the problem's most general unifier through
// Features.Check.Entailed's `reduction`, so its candidate maps each
// flexible variable to its reduced type, and `override` replaces some
// bindings (a candidate that is not the problem's). Only G0's check
// judges the candidate.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const d02Source = readFileSync(join(root,
  'research/division-campaign/r0/probes/d02-body-type-lacking.wxw'), 'utf8');
// d02 is refused at Resolve today (`r may already have field a`), so
// generation cannot record it; Task 6.5 lifts that refusal. Its problem
// is built from the same program with `where r lacks { a }`, which
// resolves, with that clause's one `D` atom (Sig4) removed; the clause
// adds nothing else (r0-g0-check.test.mjs checks it), so this is d02's
// problem as generation would record it (argued).
export const d02Lacking = d02Source.replace('fn f(p: { ...r }): Int =',
  'fn f(p: { ...r }): Int where r lacks { a } =');
export const d02From = stubs => {
  const withLacks = stubs.recorded.problem(d02Lacking);
  return { withLacks, problem: { ...withLacks, d: [] } };
};

export const g0From = async (load, stubs) => {
  const Atom = await load('Domain.Recorded.Atom');
  const Map = await load('Data.Map.Internal');
  const Entailed = await load('Features.Check.Entailed');
  const Strategy = await load('Features.Check.Strategy');
  const Verdict = await load('Domain.Verdict');
  const Guard = await load('Features.Check.Strategy.Guard');
  const Substitution = await load('Features.Check.Strategy.Substitution');
  const Open = await load('Features.Check.Decide.Open');
  const { Tuple } = await load('Data.Tuple');
  const { unfoldableArray } = await load('Data.Unfoldable');

  const keys = vars => Map.keys(vars);
  // The flexible variables' reduced types, identities left out.
  const candidateOf = (problem, override = []) => {
    const reduce = Entailed.reduction(problem);
    let made = Map.empty;
    const flexible = Map.toUnfoldable(unfoldableArray)(problem.vars)
      .map(pair => [pair.value0, pair.value1]).filter(([, info]) =>
        info.quant instanceof Atom.Exists);
    for (const [variable, info] of flexible) {
      const own = info.sort instanceof Atom.SortRow
        ? new Atom.Record([], [variable]) : new Atom.TVar(variable);
      const found = reduce(own);
      if (found.constructor.name === 'Reduced'
        && JSON.stringify(found.value0) !== JSON.stringify(own))
        made = Map.insert(Atom.ordVar)(variable)(found.value0)(made);
    }
    for (const [variable, image] of override)
      made = Map.insert(Atom.ordVar)(variable)(image)(made);
    return made;
  };
  const g0 = (override = []) => Strategy.strategy({
    name: Verdict.OnlineSolver.value,
    sound: new Verdict.Pending(Substitution.genericSubstitutionSound),
    guard: Guard.g0Guard,
    search: () => problem => new Strategy.Candidate(
      candidateOf(problem, override), Verdict.ClaimsComplete.value, []),
    check: Substitution.checkSubstitution,
    witness: () => () => stubs.nonConstructive });
  const open = Open.openRequirements;
  const check = (problem, candidate) =>
    Substitution.checkSubstitution(problem)(candidate);
  // The flexible type variable a `BQ` atom names, for an override.
  const atomVariable = entry => entry.value.value0.value0;
  return { candidateOf, g0, open, check, keys, atomVariable,
    Atom, Map, Tuple, Guard, Open, Entailed };
};
