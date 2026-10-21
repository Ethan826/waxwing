// Runs every hand-written challenge through bounded validity and P9s.
// Prints each verdict beside its prediction. A P9s answer of valid where
// the bounded model says invalid is a candidate unsoundness and is
// marked; any other mismatch with a prediction is marked for checking.
// Run: node research/composition-assessment/sig-oracle/run-challenges.mjs
import { CHALLENGES, BOUNDS_OVERRIDE } from './challenges.mjs'
import { boundedValid, DEFAULT_BOUNDS } from './bounded.mjs'
import { p9s } from './p9s.mjs'

let flagged = 0
for (const [name, P, expectB, expectP, why] of CHALLENGES) {
  const bounds = { ...DEFAULT_BOUNDS, ...(BOUNDS_OVERRIDE[name] ?? {}) }
  const b = boundedValid(P, bounds)
  const p = p9s(P, bounds)
  const unsound = p.verdict === 'valid' && b.verdict === 'invalid'
  const mismatch = b.verdict !== expectB || p.verdict !== expectP
  if (unsound || mismatch) flagged += 1
  const mark = unsound ? 'UNSOUND?' : mismatch ? 'CHECK' : 'as predicted'
  console.log(`${name}: bounded ${b.verdict}, P9s ${p.verdict}` +
    ` (${mark}; ${why})`)
  if (b.witness && (unsound || mismatch)) {
    console.log(`  bounded witness: ${JSON.stringify(b.witness)}`)
  }
  if (p.pattern && mismatch) console.log(`  P9s failing pattern: ${p.pattern}`)
}
console.log(`${CHALLENGES.length} challenges, ${flagged} flagged`)
