// Tranche 2 Task 14 (A2 spec §2.4, §2.5, §4, §11): the owed compatibility
// checks on one honest package (`readEffects`'s output), shared by the
// corpus test (test/r0-t2-compat.serial.test.mjs) and the restored-defect
// probes (test/regression-r0-t2-compat.mjs). `compatChecks(load)` takes a
// module loader, so a probe reads the compiler under test only. Per
// package, with σ today's read-back `unsettled`:
//   erasure    erase P = σ by test/r0-a2-canonical.mjs (field order only);
//   commute    erase (settle P) = map settled (erase P), exactly, and
//              G0's projection erase (settle P) = map settled σ (canonical);
//   g0         G0 (`certify`'s check) on erase (settle P) and on erase P_c,
//              P_c = settle (complete P);
//   numerals   the witness of complete P against `bindingsOf σ`.
// Derived runs drop P's (and σ's) first or last variable in `Ord Var`
// order, so completion numbers a fresh hole: G0 is compared there too,
// the fresh hole must be new to every map of P (types, rows, effects;
// spec §2.4's injectivity), and where bindingsOf's numeral differs from
// completion's (spec-predicted when an effect hole is the largest) it is
// counted, not refused.
import { sameSubstitution } from './r0-a2-canonical.mjs';
import { packageCases } from './r0-t2-package-cases.mjs';

export const compatChecks = async load => {
  const cases = await packageCases(load);
  const { named, pairs, Maps, holesOf } = cases;
  const Package = await load('Features.Check.Strategy.Effects.Package');
  const Complete = await load('Features.Check.Strategy.Effects.Complete');
  const Witness = await load('Features.Check.Strategy.Witness');
  const Substitution = await load('Features.Check.Strategy.Substitution');
  const { settled } = await load('Features.Check.Strategy.ReadBack.Type');
  const Atom = await load('Domain.Recorded.Atom');
  const Hole = await load('Domain.Recorded.Hole');
  const P = await load('Domain.Verdict.EffectPackage');
  const { Tuple } = await load('Data.Tuple');

  // Same keys in order, each image equal by `Eq RTExpr`: no reordering.
  const exact = (one, other) => {
    const left = pairs(one), right = pairs(other);
    return left.length === right.length && left.every(([key, value], at) =>
      Atom.eqVar.eq(key)(right[at][0])
      && Atom.eqRTExpr.eq(value)(right[at][1]));
  };
  const settledMap = map => Maps.functorMap.map(settled)(map);
  const accepts = (problem, substitution) =>
    named(Substitution.certify(problem)(substitution)) === 'Right';
  const completedOf = (problem, pkg) => Complete.complete(problem)(pkg);

  // The canonical comparison, given each map as its [key, image] pairs in
  // key order: exactly how it reads a map, but through this loader's
  // Data.Map, so a probe's rebuilt maps are read by their own module.
  const same = (one, other) => sameSubstitution(pairs(one), pairs(other));
  const erasureHolds = (pkg, sigma) => same(Package.erase(pkg), sigma);
  const commuteHolds = pkg => exact(Package.erase(Package.settle(pkg)),
    settledMap(Package.erase(pkg)));
  const projectionHolds = (pkg, sigma) => same(
    Package.erase(Package.settle(pkg)), settledMap(sigma));
  // 'both', 'before' (only erase (settle P): a violation), 'after' or
  // 'neither'.
  const g0 = (problem, pkg) => {
    const before = accepts(problem, Package.erase(Package.settle(pkg)));
    const after = accepts(problem, Package.erase(Complete.settledOf(
      completedOf(problem, pkg))));
    if (before) return after ? 'both' : 'before';
    return after ? 'after' : 'neither';
  };
  const witnessBindings = (problem, pkg) => Complete.witnessOf(problem)(
    completedOf(problem, pkg)).bindings;
  const numeralsHold = (problem, pkg, sigma) => same(
    witnessBindings(problem, pkg), Witness.bindingsOf(problem)(sigma));

  const less = (pkg, key) => ({ ...pkg,
    types: Maps.delete(Atom.ordVar)(key)(pkg.types),
    rows: Maps.delete(Atom.ordVar)(key)(pkg.rows) });
  const freeAt = (bindings, key) => {
    const found = Maps.lookup(Atom.ordVar)(key)(bindings);
    return named(found) === 'Just' && named(found.value0) === 'Free'
      ? found.value0.value0 : null;
  };
  // The hole completion gives `key` once absent: its `PVar` or its row's
  // one tail.
  const freshOf = (problem, pkg, key) => {
    const at = P.completedPackage(completedOf(problem, pkg));
    const ty = Maps.lookup(Atom.ordVar)(key)(at.types);
    const row = Maps.lookup(Atom.ordVar)(key)(at.rows);
    if (named(ty) === 'Just')
      return named(ty.value0) === 'PVar' ? holeIn(ty.value0.value0) : null;
    return named(row) === 'Just' ? holeIn(row.value0.tails[0]) : null;
  };
  const holeIn = variable => {
    const at = variable === undefined ? null : Hole.holeIndex(variable);
    return at !== null && named(at) === 'Just' ? at.value0 : null;
  };
  // One derived run: P and σ less `key`.
  const derived = (problem, pkg, sigma, key) => {
    const input = less(pkg, key);
    const fresh = freshOf(problem, input, key);
    const used = new Set(holesOf(input).map(each => each.n));
    const today = freeAt(Witness.bindingsOf(problem)(
      Maps.delete(Atom.ordVar)(key)(sigma)), key);
    return { g0: g0(problem, input), fresh,
      collides: fresh === null || used.has(fresh),
      differs: today !== fresh, todayCollides: used.has(today) };
  };
  const derivedKeys = sigma => {
    const keys = pairs(sigma).map(([key]) => key);
    return [...new Set([keys[0], keys.at(-1)].filter(Boolean))];
  };
  // Every check on one honest package.
  const judge = (problem, pkg, sigma) => ({
    erasure: erasureHolds(pkg, sigma), commute: commuteHolds(pkg),
    projection: projectionHolds(pkg, sigma), g0: g0(problem, pkg),
    completedApart: !exact(Package.erase(Package.settle(pkg)),
      Package.erase(Complete.settledOf(completedOf(problem, pkg)))),
    numerals: numeralsHold(problem, pkg, sigma),
    effectHoles: holesOf(pkg).some(each => each.map === 'effects'),
    derived: derivedKeys(sigma).map(key =>
      derived(problem, pkg, sigma, key)) });
  return { cases, judge, erasureHolds, P, Atom, Hole, Maps, Tuple };
};
