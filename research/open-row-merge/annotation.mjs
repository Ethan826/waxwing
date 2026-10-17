// User decision 1's example (design §8), labels only:
//   type Both(...r, ...s) = Both({ ...r, ...s });
//   fn example(): Both({ x: Int }, { y: Int }) = Both({ x: 1, y: 2 });
// The constructor's metas m0, m1 (m0 # m1 from the payload's type); the
// argument meets the payload, the result annotation meets the record-row
// arguments, in either order. Expected: accept in both orders, with
// m0 = { x }, m1 = { y }; without the annotation, D4.
import { verdict, row, tail } from './drive.mjs';
import * as S from './solver.mjs';

const H = { lacks: {}, apart: [] };
const apart = { k: 'dis', l: tail('m0'), r: tail('m1') };
const argument = { k: 'eq', l: row([], ['m0', 'm1']), r: row(['x', 'y']) };
const result = [{ k: 'eq', l: tail('m0'), r: row(['x']) },
  { k: 'eq', l: tail('m1'), r: row(['y']) }];
const show = (name, steps) => {
  const v = verdict(H, steps);
  console.log(name, v.v, v.v === 'accept'
    ? JSON.stringify(S.solution(v.st, ['m0', 'm1'])) : '');
};
show('argument first:', [apart, argument, ...result]);
show('result first:', [apart, ...result, argument]);
show('no annotation:', [apart, argument]);
