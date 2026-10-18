// The independent brute-force oracle for row merge (R005 Tranche B plan,
// Task 4), ported from research/open-row-merge/oracle.mjs, which the
// adversarial review wrote without reading the solver; it shares no code
// with the compiler. Universe: labels (lowercase) and rigids
// (uppercase). A meta ('m…') denotes a subset of the universe. A row is a
// multiset union; it is well formed iff no atom occurs twice, every rigid
// in it lacks every label in it (by hypothesis), and every two distinct
// rigids in it are apart (by hypothesis). Hypotheses: { lacks: { R:
// [label] }, apart: [['R', 'S']] }. Constraints: 'eq', 'dis', 'lacks',
// and 'within' (an upper bound, for reading a solver state back).
export const isMeta = v => /^m/.test(v);
export const isLabel = a => /^[a-z]/.test(a) && !isMeta(a);

export function denote(asg, row) {
  const out = [...row.fields];
  for (const t of row.tails) {
    if (isMeta(t)) out.push(...asg[t]); else out.push(t);
  }
  return out;
}

const apartByHypothesis = (hyp, r, s) => (hyp.apart || []).some(
  p => (p[0] === r && p[1] === s) || (p[0] === s && p[1] === r));

export function wellFormed(hyp, atoms) {
  const seen = new Set();
  for (const a of atoms) {
    if (seen.has(a)) return false;
    seen.add(a);
  }
  const rig = atoms.filter(a => !isLabel(a)), lab = atoms.filter(isLabel);
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

const sameMultiset = (a, b) => a.length === b.length
  && [...a].sort().join() === [...b].sort().join();
const tail = t => ({ fields: [], tails: [t] });

// Whether constraint c holds under asg.
export function sat(hyp, asg, c) {
  if (c.k === 'eq') {
    const l = denote(asg, c.l), r = denote(asg, c.r);
    return wellFormed(hyp, l) && wellFormed(hyp, r) && sameMultiset(l, r);
  }
  if (c.k === 'dis') {
    return wellFormed(hyp, [...denote(asg, c.l), ...denote(asg, c.r)]);
  }
  if (c.k === 'lacks') {
    const v = denote(asg, tail(c.v));
    return !v.includes(c.l) && v.filter(a => !isLabel(a))
      .every(r => (hyp.lacks[r] || []).includes(c.l));
  }
  if (c.k === 'within') {
    return denote(asg, tail(c.v)).every(a => c.atoms.includes(a));
  }
  throw new Error(c.k);
}

export const metasIn = c => (c.k === 'lacks' || c.k === 'within' ? [c.v]
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
      if (wellFormed(hyp, asg[metas[i]])
        && ready[i].every(c => sat(hyp, asg, c))) rec(i + 1);
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
    && metas.every(m => wellFormed(hyp, meet[m])) ? meet : null;
}

// One key per solution: each meta's atoms, sorted.
export const keyOf = (metas, value) =>
  metas.map(m => `${m}=${[...value(m)].sort().join(',')}`).join(';');
