// Review F2's counterexample, `both(merge, merge)`, with
//   fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int
// merge#1: m0 # m1; ?p := {...m0}; ?q := {...m1}; {m0, m1} = {x}
// merge#2: m2 # m3; {...m0} ~ {...m2}; ?w := {...m3}; {m2, m3} = {y}
// Expected: accept, exactly one solution, which is the least.
import { verdict, row, tail } from './drive.mjs';
import { allSolutions, leastOf } from './oracle.mjs';

const H = { lacks: {}, apart: [] };
const steps = [
  { k: 'dis', l: tail('m0'), r: tail('m1') },
  { k: 'eq', l: row([], ['m0', 'm1']), r: row(['x']) },
  { k: 'dis', l: tail('m2'), r: tail('m3') },
  { k: 'eq', l: tail('m0'), r: tail('m2') },
  { k: 'eq', l: row([], ['m2', 'm3']), r: row(['y']) },
];
const v = verdict(H, steps);
const metas = ['m0', 'm1', 'm2', 'm3'];
const sols = allSolutions(metas, ['x', 'y'], H, steps);
console.log('design verdict:', v.v, v.pending ?? '');
console.log('brute-force solutions:', JSON.stringify(sols));
console.log('least:', JSON.stringify(leastOf(metas, H, steps, sols)));
// Same with an argument arriving afterwards (both is then applied):
const later = { k: 'eq', l: tail('m1'), r: row(['x']) };
console.log('with a later argument {x} for q:',
  verdict(H, [...steps, later]).v);
