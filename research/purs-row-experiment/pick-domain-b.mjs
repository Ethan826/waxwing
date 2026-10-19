// Lists QT's order-dependent problems in research/open-row-merge's
// exhaustive domain B (QT = research/row-merge-qt's strict mode) and
// writes the ones named on the command line (1-based, in enumeration
// order) to cases/domain-b-<n>.json. Without arguments it only lists.
// Usage: node pick-domain-b.mjs [n ...]
import { writeFileSync } from 'node:fs';
import { problems } from '../open-row-merge/exhaustive-run.mjs';
import { verdictQT } from '../row-merge-qt/qt-drive.mjs';

const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const wanted = new Set(process.argv.slice(2).map(Number));
let n = 0;
for (const p of problems('B', 0, 1)) {
  const vs = perms(p.cs).map(o => verdictQT(p.hyp, o, {}).v);
  if (new Set(vs).size < 2) continue;
  n++;
  console.log(n, vs.join(','));
  if (!wanted.has(n)) continue;
  const name = `domain-b-${n}`;
  writeFileSync(new URL(`cases/${name}.json`, import.meta.url),
    JSON.stringify({ name, from: `node pick-domain-b.mjs ${n}: QT's`
      + ` order difference ${n} of domain B`, hyp: p.hyp, steps: p.cs },
    null, 1) + '\n');
}
console.log(`${n} order-dependent problems under QT`);
