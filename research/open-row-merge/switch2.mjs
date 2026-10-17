// The solver's verdict on switch systems (switch.mjs) whose formula is
// unsatisfiable, so a least solution exists: the hard side. Expected:
// every one D4, the intended incompleteness (pinned fixtures).
import { verdict, row } from './drive.mjs';
import { mulberry, clausesWith, oneInThree } from './random.mjs';

const rnd = mulberry(3);
const H = { lacks: {}, apart: [] };
const tally = {};
for (let i = 0; i < 4000; i++) {
  const n = 3 + Math.floor(rnd() * 3), m = 1 + Math.floor(rnd() * 6);
  const cls = clausesWith(rnd, n, m);
  if (oneInThree(n, cls)) continue;
  const v = verdict(H, cls.map(c => ({ k: 'eq',
    l: row([], [...c.map(x => `m${x}`), 'mz']), r: row(['t']) })));
  tally[v.v] = (tally[v.v] || 0) + 1;
}
console.log('unsatisfiable formulas, draft 2 verdicts:',
  JSON.stringify(tally));
