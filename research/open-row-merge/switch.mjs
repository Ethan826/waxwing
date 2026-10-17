// The hardness construction of the design (§2.7): a positive one-in-three
// formula phi plus a switch meta mz in every clause,
// { ...x, ...y, ...w, ...mz } = { t }. Claim, checked by the oracle on
// 400 random formulas: a least solution exists iff phi is unsatisfiable.
// Expected: disagree 0.
import { allSolutions, leastOf } from './oracle.mjs';
import { mulberry, clausesWith, oneInThree } from './random.mjs';

const rnd = mulberry(3);
const H = { lacks: {}, apart: [] };
let agree = 0, disagree = 0, sat = 0, unsat = 0;
for (let i = 0; i < 400; i++) {
  const n = 3 + Math.floor(rnd() * 3), m = 1 + Math.floor(rnd() * 5);
  const cls = clausesWith(rnd, n, m);
  const phiSat = oneInThree(n, cls);
  const metas = [...Array(n).keys()].map(v => `m${v}`).concat(['mz']);
  const cs = cls.map(c => ({ k: 'eq',
    l: { fields: [], tails: [...c.map(v => `m${v}`), 'mz'] },
    r: { fields: ['t'], tails: [] } }));
  const sols = allSolutions(metas, ['t'], H, cs);
  const least = leastOf(metas, H, cs, sols) !== null;
  if (phiSat) sat++; else unsat++;
  if (least === !phiSat) agree++; else disagree++;
}
console.log(JSON.stringify({ instances: 400, phiSat: sat, phiUnsat: unsat,
  agree, disagree }));
