// The labels-only row problems of research/open-row-merge (README,
// "Encoding") as Z3 formulas, written from the oracle's stated meaning,
// not from its code paths: one Boolean in(m, a) per meta m and atom a
// (a label or a rigid of the problem). A row's count of an atom is its
// fields and rigid tails equal to the atom plus in(t, a) for each meta
// tail t. A row is well formed iff every count is at most 1, no rigid
// sits beside a label it is not hypothesised to lack, and no two rigids
// sit together unless hypothesised apart; each meta's own set is a row.
// eq: both rows well formed and equal counts; dis: the joined row well
// formed; lacks v l: v holds neither l nor a rigid not known to lack l.
const isMeta = v => /^m/.test(v);
const isLab = a => /^[a-z]/.test(a);

export function encoder(Z3) {
  const one = Z3.Int.val(1), zero = Z3.Int.val(0);
  return (problem) => {
    const { hyp, cs, metas, universe } = problem;
    const atoms = [...new Set([...universe, ...cs.flatMap(c => (c.k === 'lacks'
      ? [c.l] : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails]
        .filter(t => !isMeta(t))))])].sort();
    const v = new Map(metas.map(m => [m, new Map(atoms.map(a =>
      [a, Z3.Bool.const(`in_${m}_${a}`)]))]));
    const lacks = (r, l) => (hyp.lacks[r] || []).includes(l);
    const apart = (r, s) => (hyp.apart || []).some(p =>
      (p[0] === r && p[1] === s) || (p[0] === s && p[1] === r));
    const count = (row, a) => {
      const k = [...row.fields, ...row.tails].filter(x => x === a).length;
      const parts = row.tails.filter(isMeta)
        .map(t => Z3.If(v.get(t).get(a), one, zero));
      return Z3.Sum(Z3.Int.val(k), ...parts);
    };
    // Well-formedness of anything with a per-atom count.
    const wfBy = cnt => {
      const out = atoms.map(a => cnt(a).le(1));
      const rig = atoms.filter(a => !isLab(a));
      for (const r of rig) {
        for (const l of atoms.filter(isLab)) {
          if (!lacks(r, l)) out.push(Z3.Not(Z3.And(cnt(r).ge(1),
            cnt(l).ge(1))));
        }
        for (const s of rig) {
          if (r < s && !apart(r, s)) {
            out.push(Z3.Not(Z3.And(cnt(r).ge(1), cnt(s).ge(1))));
          }
        }
      }
      return out;
    };
    const wfRow = row => wfBy(a => count(row, a));
    const join = (l, r) => ({ fields: [...l.fields, ...r.fields],
      tails: [...l.tails, ...r.tails] });
    const formulas = metas.flatMap(m => wfRow({ fields: [], tails: [m] }));
    for (const c of cs) {
      if (c.k === 'eq') {
        formulas.push(...wfRow(c.l), ...wfRow(c.r),
          ...atoms.map(a => count(c.l, a).eq(count(c.r, a))));
      } else if (c.k === 'dis') formulas.push(...wfRow(join(c.l, c.r)));
      else {
        const x = v.get(c.v);
        formulas.push(Z3.Not(x.get(c.l)));
        for (const r of atoms.filter(a => !isLab(a) && !lacks(a, c.l))) {
          formulas.push(Z3.Not(x.get(r)));
        }
      }
    }
    return { formulas, vars: v, atoms };
  };
}

// Solutions as { meta: [atoms] } read from a model.
export const readModel = (Z3, model, vars) => Object.fromEntries(
  [...vars].map(([m, row]) => [m, [...row].filter(([, b]) =>
    Z3.isTrue(model.eval(b, true))).map(([a]) => a).sort()]));
