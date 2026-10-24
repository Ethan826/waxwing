// The oracle's detection power, reproducible: three wrong
// implementations are constructed and injected into the same families
// run.mjs uses; each must produce at least one disagreement.
//   ground       `holds` reading every rigid mark as N (one valuation);
//   unnormalized `holds` without `norm` (J ∅ not identified with N);
//   perPosition  least terms per position, ignoring equality classes
//                (review 3's T1-a).
import { classesOf, constantOf, holds, leastTerms, leastVerdictWith,
  reaching, atoms } from './oracle.mjs';
import { oneFamily, pairsFamily, randomFamily, twoFamily }
  from './families.mjs';
import { runCases } from './cases.mjs';

const ground = (x, y) => {
  const g = t => (t === 'M' ? 'M' : 'N');
  return g(x) === 'N' || g(y) === 'M';
};
const unnormalized = (x, y) => x === 'N' || y === 'M'
  || (x !== 'M' && y !== 'N' && (x & ~y) === 0);
// Reachability and terms per position; constants from the classes.
const perPosition = (size, edges, equalities) => {
  const find = classesOf(size, equalities);
  const fixed = constantOf(find, size);
  if (fixed === null) return null;
  const own = classesOf(size, []);
  const reach = reaching(own, size, edges);
  const term = i => {
    if (fixed.has(find(i))) return fixed.get(find(i));
    const from = [...reach.get(i)].map(a => atoms[a]);
    if (from.includes('M')) return 'M';
    const join = from.filter(t => t !== 'N').reduce((j, t) => j | t, 0);
    return join === 0 ? 'N' : join;
  };
  return { find: own, term };
};

const mutants = [
  { name: 'ground', runs: () => [pairsFamily(ground),
    oneFamily(leastVerdictWith(leastTerms, ground))],
  cases: ground },
  { name: 'unnormalized', runs: () => [pairsFamily(unnormalized)] },
  { name: 'perPosition', runs: () => [
    twoFamily(leastVerdictWith(perPosition, holds)),
    randomFamily(leastVerdictWith(perPosition, holds), 50000)] }
];
let undetected = 0;
for (const mutant of mutants) {
  const results = mutant.runs();
  const total = results.reduce((n, r) => n + r.found.length, 0);
  const caseFailures = mutant.cases ? runCases(mutant.cases) : 0;
  console.log(`${mutant.name}: ${results.map(r =>
    `${r.name} ${r.found.length}`).join(', ')}`
    + (mutant.cases ? `, cases ${caseFailures}` : '')
    + (total + caseFailures > 0 ? ' (detected)' : ' UNDETECTED'));
  if (total + caseFailures === 0) undetected += 1;
}
process.exit(undetected === 0 ? 0 : 1);
