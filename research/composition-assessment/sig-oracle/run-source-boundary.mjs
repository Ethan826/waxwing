// Runs the source-level boundary programs (source-boundary.mjs) through
// bounded validity and P9s, against their predictions.
// Run: node run-source-boundary.mjs
import { SOURCE } from './source-boundary.mjs'
import { boundedValid } from './bounded.mjs'
import { p9s } from './p9s.mjs'

let flagged = 0
for (const { name, P, expect } of SOURCE) {
  const b = boundedValid(P).verdict
  const p = p9s(P).verdict
  const ok = b === expect[0] && p === expect[1]
  if (!ok) flagged += 1
  console.log(`${name}: bounded ${b}, P9s ${p}` +
    (ok ? '' : `  (CHECK: predicted ${expect.join(', ')})`))
}
console.log(`${SOURCE.length} programs, ${flagged} flagged`)
