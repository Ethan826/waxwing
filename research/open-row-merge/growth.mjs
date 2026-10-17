// Growth. First h(merge x n) (chain.mjs) with z = { a, b }: genuinely
// ambiguous (D4), then accepted once every r_i is fixed to { a }. Then
// 3,000 random large problems (40 metas, 12 equations, no oracle),
// measuring solver-made metas against program metas x constants, the
// largest flattened row and the slowest problem.
// Usage: node growth.mjs [random problems, default 3000]
import { verdict, row, tail } from './drive.mjs';
import * as S from './solver.mjs';
import { lcg, sampleWith } from './random.mjs';

const H = { lacks: {}, apart: [] };
const chainSteps = n => {
  const steps = [];
  for (let i = 0; i < n; i++) {
    const r = `m${2 * i}`, s = `m${2 * i + 1}`;
    steps.push({ k: 'dis', l: tail(r), r: tail(s) });
    if (i > 0) {
      steps.push({ k: 'eq', l: row([], ['m0', 'm1']), r: row([], [r, s]) });
    }
  }
  return steps;
};

for (const n of [5, 20, 60]) {
  const zab = [...chainSteps(n), { k: 'eq', l: tail('m0'), r: row(['a']) },
    { k: 'eq', l: tail('m1'), r: row(['b']) }];
  const t0 = Date.now();
  const v1 = verdict(H, zab);
  const fixed = [...zab];
  for (let i = 1; i < n; i++) {
    fixed.push({ k: 'eq', l: tail(`m${2 * i}`), r: row(['a']) });
  }
  const v2 = verdict(H, fixed);
  console.log(`n=${n} z={a,b}: ${v1.v} stuck=${v1.pending}; `
    + `every r_i={a}: ${v2.v} fresh=${v2.st.stats.fresh} `
    + `ms=${Date.now() - t0}`);
}

const rnd = lcg(5);
const sample = sampleWith(rnd);
const LAB = 'abcdefgh'.split('');
let worst = { ratio: 0 }, maxParts = 0, maxMs = 0, ok = 0;
const partsOf = r => r.fields.length + r.tails.length;
for (let t = 0; t < Number(process.argv[2] ?? 3000); t++) {
  const M = Array.from({ length: 40 }, (_, i) => `m${i}`);
  const steps = [];
  for (let i = 0; i < 12; i++) {
    steps.push({ k: 'eq', l: row([], sample(M, 1 + Math.floor(rnd() * 3))),
      r: row(sample(LAB, Math.floor(rnd() * 3)),
        sample(M, 1 + Math.floor(rnd() * 3))) });
  }
  const t0 = Date.now();
  const v = verdict(H, steps);
  const ms = Date.now() - t0;
  maxMs = Math.max(maxMs, ms);
  const used = new Set(steps.flatMap(s => [...s.l.tails, ...s.r.tails]));
  const consts = new Set(steps.flatMap(s => [...s.l.fields, ...s.r.fields]));
  const ratio = v.st.stats.fresh / (used.size * consts.size || 1);
  if (ratio > worst.ratio) {
    worst = { ratio, fresh: v.st.stats.fresh, P: used.size, C: consts.size };
  }
  for (const m of used) {
    maxParts = Math.max(maxParts, partsOf(S.flatten(v.st, tail(m))));
  }
  if (v.v !== 'refuse') ok++;
}
console.log('random large:',
  JSON.stringify({ worst, maxParts, maxMs, notRefused: ok }));
