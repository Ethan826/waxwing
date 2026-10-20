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
import { T, scan } from './semantics.mjs'
import { boundedValid, DEFAULT_BOUNDS } from './bounded.mjs'
import { p9s } from './p9s.mjs'

const count = Number(process.argv[2] ?? 2000)
let seed = Number(process.argv[3] ?? 1)
const splitMode = process.argv[4] === 'split'

function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (xs) => xs[Math.floor(random() * xs.length)]
const chance = (p) => random() < p

function generateSplit() {
  const rows = [0, 1, 2, 3, 4]
  const clauses = [['disjoint', 0, 1], ['disjoint', 1, 2], ['disjoint', 0, 2]]
  const D = clauses.filter(() => chance(0.4))
  const dis = () => {
    const x = pick(rows)
    return ['disjoint', x, pick(rows.filter((y) => y !== x))]
  }
  const B = [['eq', T.rec([], [0]), T.rec([], [3, 4])],
    ...Array.from({ length: 1 + Math.floor(random() * 3) }, dis)]
  return shape(D, B)
}

function generate() {
  if (splitMode) return generateSplit()
  const rigidTy = chance(0.3)
  const flexTy = chance(0.3)
  const three = chance(0.33)
  const rows = three ? [0, 1, 2, 3, 4] : [0, 1, 3, 4]
  const fieldTys = [T.base('Int'), T.base('Bool')]
  if (rigidTy) fieldTys.push(T.v(0))
  if (flexTy) fieldTys.push(T.v(1))
  const record = () => T.rec(chance(0.3) ? [['a', pick(fieldTys)]] : [],
    rows.filter(() => chance(0.35)).slice(0, 2))
  const clauses = [['disjoint', 0, 1], ['lacks', 0, 'a'], ['lacks', 1, 'a']]
  if (three) clauses.push(['disjoint', 1, 2], ['disjoint', 0, 2])
  const D = clauses.filter(() => chance(0.3))
  const atom = () => {
    const kind = pick(['eq', 'eq', 'var', 'disjoint', 'lacks'])
    if (kind === 'eq') return ['eq', record(), record()]
    if (kind === 'var' && (flexTy || rigidTy)) {
      return ['eq', T.v(flexTy ? 1 : 0), record()]
    }
    if (kind === 'disjoint') {
      const x = pick(rows)
      return ['disjoint', x, pick(rows.filter((y) => y !== x))]
    }
    return ['lacks', pick([3, 4]), 'a']
  }
  const B = Array.from({ length: 1 + Math.floor(random() * 3) }, atom)
  return shape(D, B)
}

function shape(D, B) {
  const used = scan([...D, ...B])
  return {
    rigidRows: [0, 1, 2].filter((r) => used.rows.has(r)),
    flexRows: [3, 4].filter((r) => used.rows.has(r)),
    rigidTys: used.tys.has(0) ? [0] : [],
    flexTys: used.tys.has(1) ? [1] : [],
    D, B,
  }
}

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
