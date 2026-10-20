// R005 Tranche B Task 4: the compiler's row solver against the research
// prototype (research/open-row-merge/drive.mjs) on the same problems in
// the same orders. Forced moves only: where the prototype never waited
// (no deferral, no quiet equation), the compiler must give its verdict;
// where it waited, the compiler must reach Task 5's placeholder or give
// the same verdict. Prints the pairs counted (`prototype->compiler`, a
// `+wait` mark where the prototype waited). Not part of verify. Needs a
// built output/. Exit 1 on any pair outside those rules.
// Usage: node scripts/row-merge-cross.mjs <raw|dense|praw|shaped|share>
//   [problems] [seed]
import { verdict } from '../research/open-row-merge/drive.mjs';
import { run } from '../test/row-merge-entry.mjs';
import { fiveOrders, mulberry, permProblem, rawProblem, shapedProblem }
  from '../test/row-merge-gen.mjs';

const GENERATORS = {
  raw: rnd => permProblem(rnd, false),
  dense: rnd => permProblem(rnd, true),
  praw: rnd => rawProblem(rnd),
  shaped: rnd => shapedProblem(rnd, false),
  share: rnd => shapedProblem(rnd, true),
};
const [kind = 'raw', count = '2000', seed = '21'] = process.argv.slice(2);
const rnd = mulberry(Number(seed));
const pairs = {};
const wrong = [];
for (let i = 0; i < Number(count); i++) {
  const p = GENERATORS[kind](rnd);
  for (const order of fiveOrders(rnd, p.cs)) {
    const proto = verdict(p.hyp, order);
    const waited = proto.st.stats.defers + proto.st.stats.quiet > 0;
    const mine = run(p.hyp, order);
    const key = `${proto.v}${waited ? '+wait' : ''}->${mine.v}`;
    pairs[key] = (pairs[key] ?? 0) + 1;
    const agrees = mine.v === proto.v || (waited && mine.v === 'unresolved');
    if (!agrees && wrong.length < 5) wrong.push({ key, p, order });
  }
}
console.log(JSON.stringify({ kind, count: Number(count), seed: Number(seed),
  pairs }));
wrong.forEach(entry => console.log(JSON.stringify(entry)));
process.exitCode = wrong.length ? 1 : 0;
