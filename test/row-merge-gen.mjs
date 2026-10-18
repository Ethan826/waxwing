// Seeded generators of labels-only row problems (R005 Tranche B plan,
// Task 4), ported from research/open-row-merge/perm.mjs (raw and dense),
// programs-gen.mjs (raw and program-shaped) and exhaustive-run.mjs
// (domains A and B). A problem is { hyp, cs, universe }: hypotheses in
// the oracle's encoding, constraints, and the atoms to enumerate.
export const mulberry = start => {
  let seed = start;
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sampleWith = next => (xs, k) => {
  const pool = [...xs];
  const out = [];
  while (out.length < k && pool.length) {
    out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  }
  return out;
};

const row = (fields, tails = []) => ({ fields, tails });
const LABELS = ['a', 'b', 'c'];
const RIGIDS = ['R', 'S'];

// perm.mjs: raw rows over four metas and two rigids, or dense two-meta
// sums against labels.
export function permProblem(rnd, dense) {
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  const sample = sampleWith(rnd);
  const META = ['m0', 'm1', 'm2', 'm3'];
  const useRig = rnd() < 0.5;
  const randRow = () => row(sample(LABELS, Math.floor(rnd() * 3)),
    sample([...META, ...(useRig ? RIGIDS : [])], Math.floor(rnd() * 3)));
  const denseEquation = () => ({ k: 'eq', l: row([], sample(META, 2)),
    r: row(sample(LABELS, 1 + Math.floor(rnd() * 2)),
      rnd() < 0.3 ? [pick(META)] : []) });
  const hyp = { lacks: {}, apart: [] };
  if (useRig) {
    for (const r of RIGIDS) hyp.lacks[r] = LABELS.filter(() => rnd() < 0.6);
    if (rnd() < 0.6) hyp.apart.push(['R', 'S']);
  }
  const cs = [];
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = rnd();
    if (dense && x < 0.65) cs.push(denseEquation());
    else if (x < 0.65) cs.push({ k: 'eq', l: randRow(), r: randRow() });
    else if (x < 0.85) {
      cs.push({ k: 'dis', l: row([], [pick(META)]),
        r: row([], [pick(META)]) });
    } else cs.push({ k: 'lacks', v: pick(META), l: pick(LABELS) });
  }
  return { hyp, cs, universe: [...LABELS, ...(useRig ? RIGIDS : [])] };
}

const subsetWith = rand => (xs, max) => xs.filter(() => rand() < max);
const pickWith = rand => xs => xs[Math.floor(rand() * xs.length)];
const hypWith = (rand, rigids) => ({
  lacks: Object.fromEntries(rigids.map(r =>
    [r, subsetWith(rand)(LABELS, 0.5)])),
  apart: rigids.length === 2 && rand() < 0.5 ? [['R', 'S']] : [],
});

// programs-gen.mjs `rawProblem`.
export function rawProblem(rand) {
  const metas = ['m0', 'm1', 'm2'].slice(0, 2 + Math.floor(rand() * 2));
  const rigids = RIGIDS.slice(0, Math.floor(rand() * 3));
  const vars = [...metas, ...rigids];
  const randomRow = () => row(subsetWith(rand)(LABELS, 0.3),
    Array.from({ length: Math.floor(rand() * 3) }, () => pickWith(rand)(vars)));
  const cs = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
    const r = rand();
    if (r < 0.6) return { k: 'eq', l: randomRow(), r: randomRow() };
    if (r < 0.85) return { k: 'dis', l: randomRow(), r: randomRow() };
    return { k: 'lacks', v: pickWith(rand)(metas), l: pickWith(rand)(LABELS) };
  });
  return { hyp: hypWith(rand, rigids), cs, universe: [...LABELS, ...rigids] };
}

// programs-gen.mjs `shapedProblem` (`share` for SHARE=1): a tree of merges
// over leaves, each merge's metas r, s with r disjoint s.
export function shapedProblem(rand, share) {
  const pick = pickWith(rand), subset = subsetWith(rand);
  const rigids = RIGIDS.slice(0, Math.floor(rand() * 3));
  const hyp = hypWith(rand, rigids);
  const metas = [];
  const cs = [];
  const fresh = () => {
    const m = `m${metas.length}`;
    metas.push(m);
    return m;
  };
  const leaf = () => {
    const k = rand();
    if (k < 0.4) return row(subset(LABELS, 0.4));
    if (k < 0.7 && rigids.length) {
      const r = pick(rigids);
      const fields = subset(LABELS, 0.3);
      hyp.lacks[r] = [...new Set([...hyp.lacks[r], ...fields])];
      return row(fields, [r]);
    }
    return row([], [fresh()]);
  };
  const bare = t => row([], [t]);
  const expr = depth => {
    if (depth === 0 || rand() < 0.3) return leaf();
    const r = fresh();
    const s = fresh();
    const result = row([], [r, s]);
    if (share && metas.length > 2 && rand() < 0.4) {
      cs.push({ k: 'eq', l: bare(r), r: bare(metas[0]) });
    }
    cs.push({ k: 'dis', l: bare(r), r: bare(s) });
    if (rand() < 0.25) cs.push({ k: 'eq', l: result, r: leaf() });
    const left = expr(depth - 1);
    const right = expr(depth - 1);
    if (rand() < 0.15) {
      cs.push({ k: 'eq', l: bare(s), r: right });
      cs.push({ k: 'eq', l: bare(r), r: left });
    } else {
      cs.push({ k: 'eq', l: bare(r), r: left });
      cs.push({ k: 'eq', l: bare(s), r: right });
    }
    return result;
  };
  const top = expr(2);
  if (rand() < 0.5) cs.push({ k: 'eq', l: top, r: leaf() });
  return { hyp, cs, universe: [...LABELS, ...rigids] };
}

// The given order, its reverse, and three seeded shuffles (perm.mjs).
export const fiveOrders = (rnd, cs) => {
  const sample = sampleWith(rnd);
  const out = [cs, [...cs].reverse()];
  for (let i = 0; i < 3; i++) out.push(sample(cs, cs.length));
  return out;
};

export const allOrders = xs => (xs.length <= 1 ? [xs]
  : xs.flatMap((x, i) => allOrders([...xs.slice(0, i), ...xs.slice(i + 1)])
    .map(p => [x, ...p])));
