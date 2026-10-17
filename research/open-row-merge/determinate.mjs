// A determinate system the solver rejects (design §2.2, §11): a quiet
// equation beside a waiting one that shares a meta,
//   m3 + m0 = m2 + m1   and   m0 + m1 = { a } + m2.
// Only the k x l basis's pieces show that a must be in m1. Expected:
// the oracle finds a least solution; the solver gives D4 (the stated
// incompleteness, inside C3); with EXPAND it accepts that solution.
import { verdict, row } from './drive.mjs';
import { allSolutions, leastOf } from './oracle.mjs';
import * as S from './solver.mjs';

const H = { lacks: {}, apart: [] };
const steps = [
  { k: 'eq', l: row([], ['m3', 'm0']), r: row([], ['m2', 'm1']) },
  { k: 'eq', l: row([], ['m0', 'm1']), r: row(['a'], ['m2']) },
];
const metas = ['m0', 'm1', 'm2', 'm3'];
const sols = allSolutions(metas, ['a'], H, steps);
console.log('solutions:', JSON.stringify(sols));
console.log('least:', JSON.stringify(leastOf(metas, H, steps, sols)));
for (const expand of [false, true]) {
  const v = verdict(H, steps, { expand });
  console.log(`expand=${expand}:`, v.v,
    v.v === 'accept' ? JSON.stringify(S.solution(v.st, metas)) : '');
}
