// Translates a labels-only row problem (research/open-row-merge's
// encoding: steps `eq`, `dis`, `lacks` over rows of fields and tails;
// metas m0-m3; rigid R) into a PureScript module over Prim.Row.
// Type-level only: `P r` is a proxy for a row, `S l` for a label, and
// every field has type `U`. Each step becomes one element of an array,
// so a permutation of the steps is a permutation of the elements:
//   eq l r     same (row l) (row r)
//   dis l r    disj (row l) (row r)
//   lacks v l  lack (S :: S "l") v
// A row with several tails folds them with `merge`, then adds its
// fields with `ext` (Cons plus Lacks, so no duplicate label); a closed
// row is an annotated proxy. Encodings: `nub` is Record.disjointUnion's
// constraint (Union plus Nub of the result), `union` drops the Nub (so
// disjointness of tails is not checked). Modes: `sig`, a declaration
// with a signature, the metas unknowns of an immediately applied lambda
// (nothing is generalized, as in Waxwing); `gen`, a declaration without
// a signature taking the metas as parameters, so PureScript generalizes
// what it cannot solve and reports the inferred type in its
// MissingTypeDeclaration warning. A rigid R is a signature variable with
// the hypotheses as given Lacks constraints (`sig` only).
const isMeta = v => /^m/.test(v);

export const metasOf = steps => [...new Set(steps.flatMap(c =>
  (c.k === 'lacks' ? [c.v] : [...c.l.tails, ...c.r.tails]))
  .filter(isMeta))].sort();
export const hasRigid = steps => steps.some(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails]).some(t => !isMeta(t)));

const tailExpr = t => (isMeta(t) ? t : t.toLowerCase());
const label = l => `(S :: S "${l}")`;

function rowExpr(row) {
  if (!row.tails.length) {
    const fields = [...row.fields].sort().map(f => `${f} :: U`).join(', ');
    return `(P :: P (${fields}))`;
  }
  let e = tailExpr(row.tails[0]);
  for (const t of row.tails.slice(1)) e = `(merge ${e} ${tailExpr(t)})`;
  for (const f of row.fields) e = `(ext ${label(f)} ${e})`;
  return e;
}

const stepExpr = c => (c.k === 'eq'
  ? `same ${rowExpr(c.l)} ${rowExpr(c.r)}`
  : c.k === 'dis' ? `disj ${rowExpr(c.l)} ${rowExpr(c.r)}`
    : `lack ${label(c.l)} ${tailExpr(c.v)}`);

const prelude = enc => {
  const nub = enc === 'nub' ? ' Nub t t =>' : '';
  return [
    'import Prim.Row (class Union, class Nub, class Lacks, class Cons)',
    '',
    'data P (r :: Row Type) = P',
    'data S (l :: Symbol) = S',
    'data U = U',
    '',
    `merge :: forall r s t. Union r s t =>${nub} P r -> P s -> P t`,
    'merge _ _ = P',
    '',
    `disj :: forall r s t. Union r s t =>${nub} P r -> P s -> U`,
    'disj _ _ = U',
    '',
    'ext :: forall l r o. Cons l U r o => Lacks l r => S l -> P r -> P o',
    'ext _ _ = P',
    '',
    'same :: forall r. P r -> P r -> U',
    'same _ _ = U',
    '',
    'lack :: forall l r. Lacks l r => S l -> P r -> U',
    'lack _ _ = U',
  ];
};

// The module text for `steps` (already in the order to test).
export function moduleText(name, { hyp, steps }, enc, mode) {
  const ms = metasOf(steps);
  const items = steps.map(stepExpr).join('\n  , ');
  const body = `[ ${items}\n  ]`;
  const out = [`module ${name} where`, '', ...prelude(enc), ''];
  if (mode === 'gen') {
    out.push(`test ${ms.join(' ')} =`, `  ${body}`);
  } else {
    const rigid = hasRigid(steps);
    const given = Object.entries(hyp.lacks ?? {}).flatMap(([r, ls]) =>
      ls.map(l => `Lacks "${l}" ${r.toLowerCase()} => `)).join('');
    out.push(rigid ? `test :: forall r. ${given}P r -> Array U`
      : 'test :: Array U');
    out.push(`test${rigid ? ' r' : ''} = (\\${ms.join(' ')} ->`,
      `  ${body}) ${ms.map(() => 'P').join(' ')}`);
  }
  return out.join('\n') + '\n';
}
