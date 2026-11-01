// Seeded random well-sorted `PTy`s (A2 spec §2.2; plan Task 2's "settle
// commutes with erase"): type variables are declared rigids or holes,
// record tails rigid or hole variables, effect-row tails `PTailRigid` or
// `PTailHole`, bases never `DataBase`, record labels distinct and written
// out of order. Built from the modules `load` gives, so a regression probe
// builds them from the compiler under test.
import { rng } from './fx-gen-rng.mjs';

export const ptyModules = async load => ({
  Package: await load('Domain.Verdict.EffectPackage'),
  Atom: await load('Domain.Recorded.Atom'),
  Hole: await load('Domain.Recorded.Hole'),
  Row: await load('Domain.Row'),
  Sets: await load('Data.Set'),
  Ord: await load('Data.Ord'),
  Foldable: await load('Data.Foldable'),
  Maybe: await load('Data.Maybe'),
  Tuple: await load('Data.Tuple')
});

const names = ['a', 'b', 'c', 'd'];
const marks = ['k', 'l'];

const generatorOf = (M, random) => {
  const { Package, Atom, Hole } = M;
  const count = limit => random.int(limit + 1);
  const many = (limit, make) => Array.from({ length: count(limit) }, make);
  const variable = () => random.chance(50)
    ? new Atom.RigidVar(random.int(3)) : Hole.holeVar(random.int(4));
  const base = () => new Package.PBase(random.pick([Atom.IntBase,
    Atom.BoolBase, Atom.TextBase, Atom.UnitBase]).value);
  const term = () => random.pick([
    () => Package.TermN.value, () => Package.TermM.value,
    () => new Package.TermJ(M.Sets.fromFoldable(M.Foldable.foldableArray)(
      M.Ord.ordString)(random.shuffle(marks).slice(0, count(2))))])();
  const effect = () => random.pick([() => M.Row.FailEffect.value,
    () => M.Row.ConsoleEffect.value,
    () => new M.Row.UserEffect(random.int(3))])();
  const label = depth => ({ effect: effect(),
    args: many(2, () => type(depth - 1)), mark: term() });
  const tail = () => random.pick([() => M.Maybe.Nothing.value,
    () => new M.Maybe.Just(new Package.PTailRigid(random.int(3))),
    () => new M.Maybe.Just(new Package.PTailHole(random.int(4)))])();
  const row = depth => ({ labels: many(2, () => label(depth)),
    tail: tail() });
  const record = depth => ({
    fields: random.shuffle(names).slice(0, count(3)).map(name =>
      new M.Tuple.Tuple(name, type(depth - 1))),
    tails: many(2, variable)
  });
  const clauses = depth => random.chance(50) ? M.Maybe.Nothing.value
    : new M.Maybe.Just(row(depth));
  const compound = [
    depth => new Package.PArrow(type(depth - 1), row(depth),
      type(depth - 1)),
    depth => new Package.PRecord(record(depth)),
    depth => new Package.PData(random.int(3),
      random.chance(40) ? [] : many(2, () => type(depth - 1)),
      random.chance(40) ? [] : many(2, () => row(depth))),
    depth => new Package.PHandler(label(depth),
      { inference: row(depth), clauses: clauses(depth) })
  ];
  const type = depth => depth <= 0 || random.chance(30)
    ? random.pick([base, () => new Package.PVar(variable())])()
    : random.pick(compound)(depth);
  return type;
};

// `total` types of nesting depth at most 4, the same for the same seed.
export const randomPTys = (M, seed, total) => {
  const type = generatorOf(M, rng(seed));
  return Array.from({ length: total }, () => type(4));
};
