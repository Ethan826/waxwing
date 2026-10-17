// The user's second D4 counterexample (2026-10-17 review of the
// diagnostics plan): three disjoint-row equations
//   a + b = { x },   b + c = { x },   a + c = { x }
// with a # b, b # c, a # c recorded where each row is made. Exactly one
// part of each pair holds x, which no assignment achieves for all three
// pairs (an odd cycle), so there is no solution; yet each equation alone
// has two homes for x, so nothing is forced and the solver ends with D4.
// D4 therefore means "the checker could not resolve the constraints",
// not "several solutions exist". Expected: zero solutions; D4.
import { verdict, row } from './drive.mjs';
import { allSolutions } from './oracle.mjs';

const H = { lacks: {}, apart: [] };
const sum = (p, q) => ({ k: 'eq', l: row([], [p, q]), r: row(['x']) });
const steps = [sum('m0', 'm1'), sum('m1', 'm2'), sum('m0', 'm2')];
const metas = ['m0', 'm1', 'm2'];
console.log('solutions:',
  JSON.stringify(allSolutions(metas, ['x'], H, steps)));
const v = verdict(H, steps);
console.log('verdict:', v.v, v.pending ? `pending=${v.pending}` : '');
