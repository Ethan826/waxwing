// The families of tr-run.mjs as problem lists, so the compiler's tests
// (test/row-merge-typed.test.mjs) judge the same problems. Each problem:
// `meaning` (the steps the oracle reads), `programs` (lists of steps
// meaning the same thing, each a list of orders) and, for `nested`,
// `mirror` (every row's tails reversed).
//   nested <seed> <n>  random problems over labels a, b: fields typed
//                      Int, Bool, a type unknown or a record whose row
//                      may itself have unknown tails; two to four steps;
//                      up to 24 orders
//   assoc <seed> <n>   three typed arguments A, B, C and a result T over
//                      labels a, b, c, merged as merge(merge(X, Y), Z)
//                      and merge(X, merge(Y, Z)) for every order X, Y, Z
//                      of A, B, C (12 programs), every program in two
//                      orders
const mulberry = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));

function gen(rand, labels, nested) {
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const ty = depth => {
    const r = rand();
    if (r < 0.3) return 'Int';
    if (r < 0.45) return 'Bool';
    if (r < 0.75 || depth > 0 || !nested.length) {
      return { v: pick(['t0', 't1']) };
    }
    return { rec: row(depth + 1, nested) };
  };
  const row = (depth, ms) => {
    const fields = labels.filter(() => rand() < 0.35).map(k => [k, ty(depth)]);
    const n = Math.floor(rand() * 3);
    const tails = [...new Set([...Array(n)].map(() => pick(ms)))];
    return { fields, tails };
  };
  return { row, ty };
}

const reverse = steps => steps.map(c => (c.k === 'lacks' ? c
  : { ...c, l: flipRow(c.l), r: flipRow(c.r) }));
const flipRow = r => ({ fields: r.fields.map(([k, t]) => [k, t.rec
  ? { rec: flipRow(t.rec) } : t]), tails: [...r.tails].reverse() });

export function nestedProblems(seed, n) {
  const problems = [];
  const rand = mulberry(seed);
  const g = gen(rand, ['a', 'b'], ['m3', 'm4']);
  for (let i = 0; i < n; i++) {
    const steps = i % 2 ? planted(rand) : [...Array(2 + Math.floor(rand()
      * 3))].map(() => ({ k: rand() < 0.25 ? 'dis' : 'eq',
      l: g.row(0, ['m0', 'm1', 'm2']), r: g.row(0, ['m0', 'm1', 'm2']) }));
    problems.push({ meaning: steps, programs: [perms(steps).slice(0, 24)],
      mirror: reverse(steps) });
  }
  return problems;
}

// A problem with a planted solution: each unknown gets labels with Int or
// Bool, each type unknown a type; equations rewrite a row by expanding
// some unknowns into their planted fields, writing a type as its type
// unknown at random, at both depths.
function planted(rand) {
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const val = ms => Object.fromEntries(ms.map(m => [m, ['a', 'b']
    .filter(() => rand() < 0.4).map(k => [k, pick(['Int', 'Bool'])])]));
  const plant = { ...val(['m0', 'm1', 'm2']), ...val(['m3', 'm4']) };
  const tv = { t0: pick(['Int', 'Bool']), t1: pick(['Int', 'Bool']) };
  const write = t => {
    const vs = Object.keys(tv).filter(v => tv[v] === t);
    return vs.length && rand() < 0.5 ? { v: pick(vs) } : t;
  };
  const row = (ms, depth) => {
    const tails = [], used = new Set();
    for (const m of ms) {
      if (rand() < 0.45 && plant[m].every(([k]) => !used.has(k))) {
        tails.push(m);
        plant[m].forEach(([k]) => used.add(k));
      }
    }
    const fields = ['a', 'b'].filter(k => !used.has(k) && rand() < 0.4)
      .map(k => [k, depth === 0 && rand() < 0.3
        ? { rec: row(['m3', 'm4'], 1) } : pick(['Int', 'Bool'])]);
    return { fields, tails };
  };
  const rewrite = r => {
    const fields = r.fields.map(([k, t]) => [k, t.rec
      ? { rec: rewrite(t.rec) } : write(t)]);
    const tails = [];
    for (const m of r.tails) {
      if (rand() < 0.5) tails.push(m);
      else fields.push(...plant[m].map(([k, t]) => [k, write(t)]));
    }
    return { fields, tails };
  };
  return [...Array(2 + Math.floor(rand() * 3))].map(() => {
    const l = row(['m0', 'm1', 'm2'], 0);
    if (rand() < 0.2) return { k: 'dis', l, r: { fields: [], tails: [] } };
    return rand() < 0.5 ? { k: 'eq', l, r: rewrite(l) }
      : { k: 'eq', l: rewrite(l), r: l };
  });
}

export function assocProblems(seed, n) {
  const problems = [];
  const rand = mulberry(seed);
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const both = (x, y) => ({ fields: [...x.fields, ...y.fields],
    tails: [...x.tails, ...y.tails] });
  const v = { fields: [], tails: ['m9'] };
  for (let i = 0; i < n; i++) {
    const args = [0, 1, 2].map(j => ({ fields: [],
      tails: rand() < 0.7 ? [`m${j}`] : [] }));
    const T = { fields: [], tails: [] };
    for (const k of ['a', 'b', 'c']) {
      const t = pick(['Int', 'Bool', { v: pick(['t0', 't1']) },
        { rec: { fields: [['a', 'Int']], tails: rand() < 0.5
          ? ['m5', 'm6'] : ['m5'] } }]);
      const owner = Math.floor(rand() * 5);
      if (owner < 3) args[owner].fields.push([k, t]);
      if (owner < 4 && rand() < 0.6) T.fields.push([k, rand() < 0.1
        ? 'Bool' : t]);
      else if (owner < 4 || rand() < 0.2) T.tails = ['m3'];
    }
    if (rand() < 0.3) T.tails = ['m3'];
    const [A, B, C] = args;
    const meaning = [{ k: 'dis', l: A, r: B }, { k: 'dis', l: A, r: C },
      { k: 'dis', l: B, r: C }, { k: 'eq', l: T, r: both(both(A, B), C) }];
    const programs = perms([A, B, C]).flatMap(([X, Y, Z]) => [
      [{ k: 'dis', l: X, r: Y }, { k: 'eq', l: v, r: both(X, Y) },
        { k: 'dis', l: v, r: Z }, { k: 'eq', l: T, r: both(v, Z) }],
      [{ k: 'dis', l: Y, r: Z }, { k: 'eq', l: v, r: both(Y, Z) },
        { k: 'dis', l: X, r: v }, { k: 'eq', l: T, r: both(X, v) }]]);
    problems.push({ meaning,
      programs: programs.map(p => [p, [...p].reverse()]) });
  }
  return problems;
}

