// A substitution as an input effect package, each key at its recorded sort
// and no effect variables or marks: how a test-built strategy reaches the
// one minter, `certifyPackage` (dossier §18.174), and how A3's corpus
// property reads a candidate. Takes a loader and loads nothing itself.
export const sigmaPackageFrom = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const P = await load('Domain.Verdict.EffectPackage');
  const { fields } = await load('Domain.Recorded');
  const Maps = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { Nothing } = await load('Data.Maybe');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const named = value => value.constructor.name;
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const closed = { labels: [], tail: Nothing.value };
  const lift = ty => {
    if (ty instanceof Atom.Base) return ty.value0 instanceof Atom.DataBase
      ? new P.PData(ty.value0.value0, [], []) : new P.PBase(ty.value0);
    if (ty instanceof Atom.Arrow)
      return new P.PArrow(lift(ty.value0), closed, lift(ty.value1));
    if (ty instanceof Atom.TVar) return new P.PVar(ty.value0);
    if (ty instanceof Atom.Record) return new P.PRecord(recordOf(ty));
    if (ty.value0 instanceof Atom.DataHead)
      return new P.PData(ty.value0.value0, ty.value1.map(lift), []);
    return new P.PHandler({ effect: ty.value0.value0,
      args: ty.value1.map(lift), mark: P.TermN.value },
    { inference: closed, clauses: Nothing.value });
  };
  const recordOf = ty => ({ tails: ty.value1, fields: ty.value0.map(field =>
    new Tuple(field.value0, lift(field.value1))) });
  return (problem, sigma) => {
    const vars = fields(problem).vars;
    const sorted = sort => pairs(sigma).filter(([key]) => named(
      Maps.lookup(Atom.ordVar)(key)(vars).value0.sort) === sort);
    const mapOf = entries => entries.reduce((made, [key, value]) =>
      Maps.insert(Atom.ordVar)(key)(value)(made), Maps.empty);
    return { effects: Maps.empty, marks: Maps.empty,
      types: mapOf(sorted('SortType').map(([key, ty]) => [key, lift(ty)])),
      rows: mapOf(sorted('SortRow').map(([key, ty]) =>
        [key, recordOf(ty)])) };
  };
};
