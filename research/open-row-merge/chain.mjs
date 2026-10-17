// h(merge, ..., merge) with fn h(f1: (a1, b1) -> z, ..., fn: (an, bn) -> z):
// each merge's result row meets z's binding with metas on both sides and
// no constants (review F5). Expected for every n up to 40: accept, no
// fresh meta, n apart pairs, n - 1 quiet pending equations, a few ms.
// Usage: node chain.mjs [maximum n, default 40]
import { verdict, row, tail } from './drive.mjs';
import * as S from './solver.mjs';

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

const most = Number(process.argv[2] ?? 40);
for (let n = 1; n <= most; n++) {
  const t0 = Date.now();
  const v = verdict(H, chainSteps(n));
  const parts = S.flatten(v.st, row([], ['m0', 'm1'])).tails.length;
  console.log(`n=${n} verdict=${v.v} parts(z)=${parts} `
    + `apart=${v.st.apart.size} pending=${v.st.pending.size} `
    + `fresh=${v.st.stats.fresh} ms=${Date.now() - t0}`);
}
