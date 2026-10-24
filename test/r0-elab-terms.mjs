// A seeded generator of `Elab` terms over D1's public API (R0 Task
// 7.1a, spec §10 T4 and T9), fixed here before any run. Grammar, depth
// at most 3:
//   term   ::= readType(t) | readRow(r) | pure(k) | map(tag, term)
//            | apply(pair, term, term) | traverse([term, term])
//            | positioned(gty) | slots([type gty | row r])
//   gty    ::= int | flex(t) | fun(gty, gty) | record(fields, tails)
// where t and r are the generation's type and row handles (four each,
// minted first), `fields` are one or two fields labelled `w0`, `w1`
// over gty, `tails` a duplicate-free choice of row handles, and every
// site is fresh (a counter), so no site is written twice. Images
// (`imageOf`): a type handle binds `Inline Int`, `Inline Bool` or
// `Free k`; a row handle `Inline { l<i>: Int }` (a label of its own, so
// no splice repeats a label), `Inline (rigid 0)` or `Free k`.
import { rng } from './fx-gen-rng.mjs';

export const handles = 4;

export const termsFrom = t => {
  const { gen, ty, site, sort, use, elab } = t;
  const tag = name => value => [name, value];
  const pair = left => right => ['pair', left, right];
  const mint = gen.seq([
    ...Array.from({ length: handles }, (_, i) => () => gen.fresh(['t', i])),
    ...Array.from({ length: handles }, (_, i) => () =>
      gen.fresh(['r', i], sort.row))], (...all) => gen.pure(all));
  // A generator type and the Gen of a term, from one random source.
  const build = (random, minted) => {
    let sites = 0;
    const fresh = () => site.node(['s', sites++]);
    const types = minted.slice(0, handles);
    const rows = minted.slice(handles);
    const gty = depth => {
      const choice = random.int(depth <= 0 ? 2 : 4);
      if (choice === 0) return ty.int;
      if (choice === 1) return ty.flex(random.pick(types));
      if (choice === 2) return ty.fun(gty(depth - 1), gty(depth - 1));
      const fields = Array.from({ length: 1 + random.int(2) },
        (_, i) => [`w${i}`, gty(depth - 1)]);
      const tails = random.shuffle(rows).slice(0, random.int(3))
        .map(ty.flexRef);
      return ty.record(fields, tails);
    };
    const term = depth => {
      const choice = random.int(depth <= 0 ? 3 : 8);
      if (choice === 0)
        return gen.pure(t.m.Elab.readType(fresh())(random.pick(types)));
      if (choice === 1)
        return gen.pure(t.m.Elab.readRow(fresh())(random.pick(rows)));
      if (choice === 2) return gen.pure(elab.pure(random.int(9)));
      if (choice === 3)
        return gen.bind(term(depth - 1), e => gen.pure(elab.map(tag('m'), e)));
      if (choice === 4) return gen.bind(term(depth - 1), a => gen.bind(
        term(depth - 1), b => gen.pure(elab.apply(elab.map(pair, a), b))));
      if (choice === 5) return gen.bind(term(depth - 1), a => gen.bind(
        term(depth - 1), b => gen.pure(elab.traverse(x => x, [a, b]))));
      if (choice === 6) return gen.positioned(fresh(), gty(depth));
      return gen.slots(['c', sites++], Array.from({ length: 2 },
        () => (random.chance(50) ? [use.type, gty(depth)]
          : [use.row, ty.flex(random.pick(rows))])));
    };
    return term(3);
  };
  // The sealed term of a seed, with its minted variables.
  const sealedTerm = seed => {
    const random = rng(seed);
    let variables = [];
    const e = t.sealed(gen.bind(mint, minted => {
      variables = minted;
      return build(random, minted);
    }));
    return { e, variables, random };
  };
  const imageOf = (random, variable, isRow, index) => {
    const choice = random.int(3);
    if (choice === 2) return t.free(random.int(5));
    if (!isRow) return t.inline(choice === 0 ? t.base.int : t.base.bool);
    return t.inline(choice === 0 ? t.recordOf([[`l${index}`, t.base.int]])
      : new t.m.Atom.TVar(new t.m.Atom.RigidVar(0)));
  };
  return { sealedTerm, imageOf, termOf: build, mint };
};
