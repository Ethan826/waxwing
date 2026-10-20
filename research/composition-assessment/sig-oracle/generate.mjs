// Generated comparison of P9s with bounded validity (dossier §13.7).
// Grammar (README.md): rigid rows 0 and 1 (and 2, in a third of the
// problems), flexible rows 3 and 4, one
// written label `a`; an optional rigid type variable 0 and flexible type
// variable 1. D: each of `0 disjoint 1`, `0 lacks a`, `1 lacks a` with
// probability 0.3. B: one to three atoms, each an equation between
// record types (an optional field `a` at Int, Bool or a type variable,
// and up to two tails), an equation between a type variable and a
// record type, a `disjoint` between two rows, or a flexible `lacks a`.
// A P9s answer of valid where the bounded model says invalid is a
// candidate unsoundness: minimized, rechecked with larger bounds, and
// saved to discrepancies.json. Bounded valid with P9s unresolved is
// expected incompleteness; the smallest instances are saved too.
// Mode `split` (third argument) biases the grammar toward completeness
// gaps: three rigid rows, B always splits rigid row 0 into flexible rows
// 3 and 4, plus one to three random `disjoint` atoms.
// Run: node generate.mjs [count] [seed] [split]
import { writeFileSync } from 'node:fs'
import { boundedValid, DEFAULT_BOUNDS } from './bounded.mjs'
import { p9s } from './p9s.mjs'
import { generator, shape } from './grammar.mjs'

const count = Number(process.argv[2] ?? 2000)
const generate = generator(Number(process.argv[3] ?? 1),
  process.argv[4] === 'split')

const verdicts = {}

export function classify(P, bounds = DEFAULT_BOUNDS, p9 = p9s) {
  const b = boundedValid(P, bounds).verdict
  const p = p9(P, bounds).verdict
  verdicts[`${b}/${p}`] = (verdicts[`${b}/${p}`] ?? 0) + 1
  if (p === 'valid' && b === 'invalid') return 'unsound?'
  if (p === 'unresolved' && b === 'valid') return 'incomplete'
  return 'agree'
}

function minimize(P, kind) {
  let cur = P
  let shrunk = true
  while (shrunk) {
    shrunk = false
    for (const part of ['B', 'D']) {
      for (let i = 0; i < cur[part].length; i++) {
        const smaller = { ...cur, [part]: cur[part].filter((_, j) => j !== i) }
        const next = shape(smaller.D, smaller.B)
        if (next.B.length > 0 && classify(next) === kind) {
          cur = next
          shrunk = true
        }
      }
    }
  }
  return cur
}

const LARGER = { ...DEFAULT_BOUNDS, unwritten: ['z1', 'z2', 'z3'],
  rigidRowTypes: ['Int', 'Bool', '{}'] }
const tally = { agree: 0, incomplete: 0, 'unsound?': 0 }
const unsound = []
const incomplete = new Map()
for (let i = 0; i < count; i++) {
  const P = generate()
  const kind = classify(P)
  tally[kind] += 1
  if (kind === 'unsound?') {
    const small = minimize(P, kind)
    unsound.push({ problem: small,
      largerBounds: boundedValid(small, LARGER).verdict })
  } else if (kind === 'incomplete') {
    const small = minimize(P, kind)
    incomplete.set(JSON.stringify(small), small)
  }
}
const smallest = [...incomplete.values()]
  .sort((x, y) => JSON.stringify(x).length - JSON.stringify(y).length)
  .slice(0, 10)
writeFileSync(new URL('./discrepancies.json', import.meta.url),
  JSON.stringify({ count, seed: process.argv[3] ?? 1, tally,
    unsound, incomplete: smallest }, null, 1) + '\n')
console.log(JSON.stringify(tally))
console.log(`bounded/P9s verdicts: ${JSON.stringify(verdicts)}`)
console.log(`candidate unsoundness: ${unsound.length};` +
  ` distinct minimized incompleteness: ${incomplete.size}`)
