// The oracle's detection power, reproducible: six wrong
// implementations are constructed and injected into the same families
// and cases run.mjs uses; each must produce at least one disagreement.
//   ground       `holds` reading every rigid mark as N (one valuation);
//   unnormalized `holds` without `norm` (J ∅ not identified with N);
//   perPosition  least terms per position, ignoring equality classes
//                (review 3's T1-a);
//   noClauseEq   `handlerEquality` without C ≡ C (§R5 F1);
//   rMarksIgnored `handlerEquality` ignoring R's marks when neither type
//                owns a C (revision 3.2's E1 on that branch);
//   withdrawnRigid E2's rigid case as revision 3.4 wrote it ("ρ ends in
//                ϱ"), withdrawn by §18.84 and replaced by K1 (§18.85).
import { classesOf, constantOf, holds, leastTerms, leastVerdictWith,
  reaching, atoms } from './oracle.mjs';
import { oneFamily, pairsFamily, randomFamily, twoFamily }
  from './families.mjs';
import { real, runCases } from './cases.mjs';
import { markEquality, sameHead, structural } from './handlers.mjs';
import { rowEquality, withdrawnRigid } from './rows.mjs';

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

// handlerEquality's two branches, rebuilt with one part wrong each.
const heads = (l, r) => [structural(sameHead(l, r)),
  markEquality(l.mark, r.mark)];
const rows = (l, r, marks) => rowEquality({ left: l.inference,
  right: r.inference, marks, args: true });
const ownsNone = (l, r) => l.clauses === null && r.clauses === null;
const noClauseEq = (l, r) => [...heads(l, r), rows(l, r, ownsNone(l, r))];
const rMarksIgnored = (l, r) => [...heads(l, r), rows(l, r, false),
  ...(ownsNone(l, r) ? [] : [rowEquality({ left: l.clauses ?? l.inference,
    right: r.clauses ?? r.inference, marks: true, args: false })])];

const mutants = [
  { name: 'ground', runs: () => [pairsFamily(ground),
    oneFamily(leastVerdictWith(leastTerms, ground))],
  cases: ground },
  { name: 'unnormalized', runs: () => [pairsFamily(unnormalized)] },
  { name: 'perPosition', runs: () => [
    twoFamily(leastVerdictWith(perPosition, holds)),
    randomFamily(leastVerdictWith(perPosition, holds), 50000)] },
  { name: 'noClauseEq', runs: () => [], cases: holds,
    deps: { ...real, handlerEquality: noClauseEq } },
  { name: 'rMarksIgnored', runs: () => [], cases: holds,
    deps: { ...real, handlerEquality: rMarksIgnored } },
  { name: 'withdrawnRigid', runs: () => [], cases: holds,
    deps: { ...real, rigidRule: withdrawnRigid } }
];
let undetected = 0;
for (const mutant of mutants) {
  const results = mutant.runs();
  const total = results.reduce((n, r) => n + r.found.length, 0);
  const caseFailures = mutant.cases ? runCases(mutant.cases, mutant.deps)
    : 0;
  const parts = [...results.map(r => `${r.name} ${r.found.length}`),
    ...(mutant.cases ? [`cases ${caseFailures}`] : [])];
  console.log(`${mutant.name}: ${parts.join(', ')}`
    + (total + caseFailures > 0 ? ' (detected)' : ' UNDETECTED'));
  if (total + caseFailures === 0) undetected += 1;
}
process.exit(undetected === 0 ? 0 : 1);
