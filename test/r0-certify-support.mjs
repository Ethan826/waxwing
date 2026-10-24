// BACKLOG R030: the checks behind `certify`'s settle-and-witness
// argument (docs/plans/r0-certify-argument.md). `agreementFindings`
// checks C2 on one certificate: for every variable the pre-default σ₀
// binds, the witness's binding, read with lowering's hole defaults (a
// `Free n` is hole `n` at its variable's sort: `Int` for a type, `{}`
// for a row, W §1.6), is the judged σ's image, settled(σ₀(v)); for
// every flexible variable σ₀ leaves out, the binding is `Free` at a hole
// above every hole σ₀ mentions. `certifyFrom` takes a loader and loads
// nothing itself.
import { stableStringify } from './r0-canonical.mjs';
import { decodeType, decodeVar } from './r0-canonical-decode.mjs';

const named = value => value.constructor.name;

export const certifyFrom = async load => {
  const { settled, holesIn } =
    await load('Features.Check.Strategy.ReadBack.Type');
  const { holeVar } = await load('Domain.Recorded.Hole');
  const { fields } = await load('Domain.Recorded');
  const Atom = await load('Domain.Recorded.Atom');
  const Map = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const pairs = map => Map.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const text = ty => stableStringify(decodeType(ty));
  // A binding read as lowering reads it: a `Free n` hole, or an image's
  // holes, at their defaults.
  const bare = (sort, index) => (named(sort) === 'SortRow'
    ? new Atom.Record([], [holeVar(index)])
    : Atom.TVar.create(holeVar(index)));
  const defaulted = (sort, binding) => settled(named(binding) === 'Free'
    ? bare(sort, binding.value0) : binding.value0);
  const sortOf = (problem, variable) => Map.lookup(Atom.ordVar)(variable)(
    fields(problem).vars).value0.sort;
  const agreementFindings = (problem, unsettled, witness) => {
    const judged = new globalThis.Map(pairs(unsettled).map(([v, image]) =>
      [stableStringify(decodeVar(v)), image]));
    const top = Math.max(-1, ...[...judged.values()].flatMap(holesIn));
    return pairs(witness.bindings).flatMap(([variable, binding]) => {
      const key = stableStringify(decodeVar(variable));
      const image = judged.get(key);
      if (image === undefined)
        return named(binding) === 'Free' && binding.value0 > top ? []
          : [`${key}: unbound in σ₀ but bound ${named(binding)}`];
      const read = text(defaulted(sortOf(problem, variable), binding));
      return read === text(settled(image)) ? []
        : [`${key}: ${read} ≠ ${text(settled(image))}`];
    });
  };
  return { agreementFindings, sortOf, settled, holeVar, Atom, text };
};
