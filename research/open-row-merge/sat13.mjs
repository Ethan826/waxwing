// Positive one-in-three SAT as row equations {...X, ...Y, ...Z} = { t }.
// Finds five uniquely satisfiable instances (a least solution exists)
// and prints the solver's verdict on each: D4, the intended, pinned
// incompleteness. Also checks review F12's observation over every
// instance tried: the meet of two distinct solutions (distinct on the
// covered variables) is never a solution. Draft 1's verdict column was
// dropped with draft 1's solver.
import { verdict, row } from './drive.mjs';
import { lcg, clausesWith } from './random.mjs';

const rnd = lcg(7);
const H = { lacks: {}, apart: [] };
const exactlyOne = (cls, a) =>
  cls.every(c => c.filter(v => a & (1 << v)).length === 1);
let found = 0, meetOk = 0, pairs = 0, tried = 0;
while (found < 5 && tried < 200000) {
  tried++;
  const n = 6, m = 4 + Math.floor(rnd() * 3);
  const cls = clausesWith(rnd, n, m);
  const sols = [];
  for (let a = 0; a < 1 << n; a++) if (exactlyOne(cls, a)) sols.push(a);
  const cov = cls.flat().reduce((x, v) => x | (1 << v), 0);
  for (let i = 0; i < sols.length; i++) {
    for (let j = i + 1; j < sols.length; j++) {
      pairs++;
      const meet = sols[i] & sols[j];
      if ((sols[i] & cov) !== (sols[j] & cov) && exactlyOne(cls, meet)) {
        meetOk++;
      }
    }
  }
  if (sols.length !== 1) continue;
  const steps = cls.map(c =>
    ({ k: 'eq', l: row([], c.map(v => `m${v}`)), r: row(['t']) }));
  console.log('unique instance', JSON.stringify(cls),
    'verdict:', verdict(H, steps).v);
  found++;
}
console.log(`pairs of distinct solutions: ${pairs}, `
  + `whose meet is a solution: ${meetOk}`);
