// Generators for programs.mjs. Each takes the seeded `rand` and returns
// { metas, rigids, hyp, constraints }, hyp in the solver's encoding
// (apart: ['R|S']).
export const LABELS = ['a', 'b', 'c'];
const pickWith = rand => xs => xs[Math.floor(rand() * xs.length)];
const subsetWith = rand => (xs, max) => xs.filter(() => rand() < max);

const randomHyp = (rand, rigids) => ({
  lacks: Object.fromEntries(rigids.map(r =>
    [r, subsetWith(rand)(LABELS, 0.5)])),
  apart: rigids.length === 2 && rand() < 0.5 ? ['R|S'] : [],
});

const randomRow = (rand, vars) => ({ fields: subsetWith(rand)(LABELS, 0.3),
  tails: Array.from({ length: Math.floor(rand() * 3) },
    () => pickWith(rand)(vars)) });

export const rawProblem = rand => {
  const metas = ['m0', 'm1', 'm2'].slice(0, 2 + Math.floor(rand() * 2));
  const rigids = ['R', 'S'].slice(0, Math.floor(rand() * 3));
  const vars = [...metas, ...rigids];
  const constraints = Array.from({ length: 1 + Math.floor(rand() * 3) },
    () => {
      const r = rand();
      if (r < 0.6) {
        return { k: 'eq', l: randomRow(rand, vars), r: randomRow(rand, vars) };
      }
      if (r < 0.85) {
        return { k: 'dis', l: randomRow(rand, vars),
          r: randomRow(rand, vars) };
      }
      return { k: 'lacks', v: pickWith(rand)(metas),
        l: pickWith(rand)(LABELS) };
    });
  return { metas, rigids, hyp: randomHyp(rand, rigids), constraints };
};

const bareTail = t => ({ fields: [], tails: [t] });

// Program-shaped: an expression tree of merges over leaves, each merge
// instantiating fresh metas r, s with r disjoint s; some merges are used
// as a higher-order value whose result is fixed before its arguments.
export const shapedProblem = rand => {
  const pick = pickWith(rand), subset = subsetWith(rand);
  const rigids = ['R', 'S'].slice(0, Math.floor(rand() * 3));
  const hyp = randomHyp(rand, rigids);
  const metas = [];
  const constraints = [];
  const fresh = () => {
    const m = `m${metas.length}`;
    metas.push(m);
    return m;
  };
  const leaf = () => {
    const k = rand();
    if (k < 0.4) return { fields: subset(LABELS, 0.4), tails: [] };
    if (k < 0.7 && rigids.length) {
      const r = pick(rigids);
      const fields = subset(LABELS, 0.3);
      hyp.lacks[r] = [...new Set([...hyp.lacks[r], ...fields])];
      return { fields, tails: [r] };
    }
    return { fields: [], tails: [fresh()] };
  };
  const expr = depth => {
    if (depth === 0 || rand() < 0.3) return leaf();
    const r = fresh();
    const s = fresh();
    const result = { fields: [], tails: [r, s] };
    if (process.env.SHARE && metas.length > 2 && rand() < 0.4) {
      constraints.push({ k: 'eq', l: bareTail(r), r: bareTail(metas[0]) });
    }
    constraints.push({ k: 'dis', l: bareTail(r), r: bareTail(s) });
    if (rand() < 0.25) constraints.push({ k: 'eq', l: result, r: leaf() });
    const left = expr(depth - 1);
    const right = expr(depth - 1);
    if (rand() < 0.15) {
      constraints.push({ k: 'eq', l: bareTail(s), r: right });
      constraints.push({ k: 'eq', l: bareTail(r), r: left });
    } else {
      constraints.push({ k: 'eq', l: bareTail(r), r: left });
      constraints.push({ k: 'eq', l: bareTail(s), r: right });
    }
    return result;
  };
  const top = expr(2);
  if (rand() < 0.5) constraints.push({ k: 'eq', l: top, r: leaf() });
  return { metas, rigids, hyp, constraints };
};
