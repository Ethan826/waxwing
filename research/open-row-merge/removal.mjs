// `without { x }` (or a rest binder) over a multi-tail receiver
// { ...m0, ...m1 } with m0 # m1: the result is the fresh rest row m9 of
// { x: a, ...m9 }, never a subtraction from the resolved type (design
// §5.2). Expected: D4 while waiting; m9 = { y } with x in either part;
// `.x` on the rest refused at once (m9 lacks x); no part with x refused.
import { verdict, row, tail } from './drive.mjs';
import * as S from './solver.mjs';

const H = { lacks: {}, apart: [] };
const base = [
  { k: 'dis', l: tail('m0'), r: tail('m1') }, // merge's r # s
  { k: 'eq', l: row([], ['m0', 'm1']), r: row(['x'], ['m9']) }, // select
];
const show = (name, steps) => {
  const v = verdict(H, steps);
  console.log(name, v.v, v.why ?? '', v.st
    ? JSON.stringify(S.solution(v.st, ['m0', 'm1', 'm9'])) : '');
};
const eq = (m, fields, tails = []) =>
  ({ k: 'eq', l: tail(m), r: row(fields, tails) });
show('pending after select:', base);
show('then p={x}, q={y}:', [...base, eq('m0', ['x']), eq('m1', ['y'])]);
show('then .x on the rest:', [...base, eq('m9', ['x'], ['m8'])]);
show('then p={y}, q={x}:', [...base, eq('m0', ['y']), eq('m1', ['x'])]);
show('then p={y}, q={z}:', [...base, eq('m0', ['y']), eq('m1', ['z'])]);
