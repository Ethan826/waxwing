// Unresolved (D4) makes no claim about the number of solutions. The
// permanent fixtures cover all three cases (user review, 2026-10-17):
//   zero:  the odd cycle of odd-cycle.mjs, a+b = b+c = a+c = { x };
//   one:   the quiet-beside-waiting system of determinate.mjs;
//   many:  one two-part sum, a+b = { x, y } (four splits).
// Each must end Unresolved with the stated count; exits 1 otherwise.
import { verdict, row } from './drive.mjs';
import { allSolutions } from './oracle.mjs';

const H = { lacks: {}, apart: [] };
const eq = (l, r) => ({ k: 'eq', l, r });
const sum = (p, q, ls) => eq(row([], [p, q]), row(ls));
const cases = [
  { name: 'zero (odd-cycle.mjs)', count: 0, universe: ['x'],
    steps: [sum('m0', 'm1', ['x']), sum('m1', 'm2', ['x']),
      sum('m0', 'm2', ['x'])] },
  { name: 'one (determinate.mjs)', count: 1, universe: ['a'],
    steps: [eq(row([], ['m3', 'm0']), row([], ['m2', 'm1'])),
      eq(row([], ['m0', 'm1']), row(['a'], ['m2']))] },
  { name: 'many (a two-part sum)', count: 4, universe: ['x', 'y'],
    steps: [sum('m0', 'm1', ['x', 'y'])] },
];
let failed = 0;
for (const c of cases) {
  const metas = [...new Set(c.steps.flatMap(s => [...s.l.tails,
    ...s.r.tails]))].sort();
  const n = allSolutions(metas, c.universe, H, c.steps).length;
  const v = verdict(H, c.steps).v;
  const ok = v === 'D4' && n === c.count;
  if (!ok) failed++;
  console.log(`${c.name}: ${v}, ${n} solutions${ok ? '' : ' UNEXPECTED'}`);
}
process.exit(failed ? 1 : 0);
