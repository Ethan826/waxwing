// Independent brute-force oracle, written by the adversarial review
// without reading the solver or the first author's oracle.
// Universe: labels (lowercase) and rigids (uppercase). A meta ('m…')
// denotes a subset of the universe. A row is a multiset union; it is well
// formed iff no atom occurs twice, every rigid in it lacks every label in
// it (by hypothesis), and every two distinct rigids in it are apart (by
// hypothesis). Hypotheses: { lacks: { R: [label] }, apart: [['R', 'S']] }.
export const isMeta = v => /^m/.test(v);
const isLab = a => /^[a-z]/.test(a);

export function denote(asg, row) {
  const out = [...row.fields];
  for (const t of row.tails) {
    if (isMeta(t)) out.push(...asg[t]); else out.push(t);
  }
  return out;
}

const apartByHypothesis = (hyp, r, s) => (hyp.apart || []).some(
  p => (p[0] === r && p[1] === s) || (p[0] === s && p[1] === r));

function wf(hyp, atoms) {
  const seen = new Set();
  for (const a of atoms) {
    if (seen.has(a)) return false;
    seen.add(a);
  }
  const rig = atoms.filter(a => !isLab(a)), lab = atoms.filter(isLab);
  for (const r of rig) {
    for (const l of lab) {
      if (!(hyp.lacks[r] || []).includes(l)) return false;
    }
    for (const s of rig) {
      if (r < s && !apartByHypothesis(hyp, r, s)) return false;
    }
  }
  return true;
}

const eqms = (a, b) => a.length === b.length
  && [...a].sort().join() === [...b].sort().join();

// Whether constraint c ('eq', 'dis' or 'lacks') holds under asg.
export function sat(hyp, asg, c) {
  if (c.k === 'eq') {
    const l = denote(asg, c.l), r = denote(asg, c.r);
    return wf(hyp, l) && wf(hyp, r) && eqms(l, r);
  }
  if (c.k === 'dis') {
    const l = denote(asg, c.l), r = denote(asg, c.r);
    return wf(hyp, [...l, ...r]);
  }
  if (c.k === 'lacks') {
    const v = denote(asg, { fields: [], tails: [c.v] });
    return !v.includes(c.l) && v.filter(a => !isLab(a))
      .every(r => (hyp.lacks[r] || []).includes(c.l));
  }
  throw new Error(c.k);
}

const metasIn = c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails]).filter(isMeta);

// Every assignment of `metas` to subsets of `universe` satisfying cs,
// depth first: a constraint is checked once all its metas are assigned.
export function allSolutions(metas, universe, hyp, cs) {
  const n = universe.length, out = [];
  const asg = {};
  const ready = metas.map((m, i) => cs.filter(c => metasIn(c).includes(m)
    && metasIn(c).every(x => metas.indexOf(x) <= i)));
  const ground = cs.filter(c => metasIn(c).length === 0);
  if (!ground.every(c => sat(hyp, {}, c))) return [];
  const rec = i => {
    if (i === metas.length) {
      out.push(Object.fromEntries(metas.map(m => [m, [...asg[m]]])));
      return;
    }
    for (let mask = 0; mask < (1 << n); mask++) {
      asg[metas[i]] = universe.filter((_, j) => mask & (1 << j));
      if (wf(hyp, asg[metas[i]]) && ready[i].every(c => sat(hyp, asg, c))) {
        rec(i + 1);
      }
    }
    delete asg[metas[i]];
  };
  rec(0);
  return out;
}

// The least solution: the meet of all solutions, if it is one; else null.
export function leastOf(metas, hyp, cs, sols) {
  if (!sols.length) return null;
  const meet = {};
  for (const m of metas) {
    meet[m] = sols[0][m].filter(a => sols.every(s => s[m].includes(a)));
  }
  return cs.every(c => sat(hyp, meet, c))
    && metas.every(m => wf(hyp, meet[m])) ? meet : null;
}
