// Review F2's program family: fn k(f1: (p, q1) -> R1, ..., fk: (p, qk) ->
// Rk) called k(merge, ..., merge), each Ri a non-empty closed label set
// over { a, b, c }, k = 2 or 3: 392 programs. Expected: total 392, least
// 186, d4Least 0 (no D4 where a least solution exists), unsound 0.
// Draft 1's column (all 186 D4) was dropped with draft 1's solver.
import { verdict, row, tail } from './drive.mjs';
import { allSolutions, leastOf } from './oracle.mjs';

const LAB = ['a', 'b', 'c'];
const subsetsOf = xs => [...Array(1 << xs.length).keys()]
  .map(m => xs.filter((_, i) => m & (1 << i)));
const H = { lacks: {}, apart: [] };
const t = { total: 0, least: 0, d4Least: 0, unsound: 0 };
const stepsOf = R => {
  const steps = [];
  R.forEach((Ri, i) => {
    const r = `m${2 * i}`, s = `m${2 * i + 1}`;
    steps.push({ k: 'dis', l: tail(r), r: tail(s) });
    if (i > 0) steps.push({ k: 'eq', l: tail('m0'), r: tail(r) });
    steps.push({ k: 'eq', l: row([], [r, s]), r: row(Ri) });
  });
  return steps;
};
for (const k of [2, 3]) {
  const rs = subsetsOf(LAB).filter(s => s.length);
  const combos = k === 2 ? rs.flatMap(a => rs.map(b => [a, b]))
    : rs.flatMap(a => rs.flatMap(b => rs.map(c => [a, b, c])));
  for (const R of combos) {
    const steps = stepsOf(R);
    const metas = R.flatMap((_, i) => [`m${2 * i}`, `m${2 * i + 1}`]);
    const sols = allSolutions(metas, LAB, H, steps);
    const lst = leastOf(metas, H, steps, sols);
    const v = verdict(H, steps).v;
    t.total++;
    if (lst) t.least++;
    if (lst && v === 'D4') t.d4Least++;
    if (!lst && v === 'accept') t.unsound++;
  }
}
console.log(JSON.stringify(t));
