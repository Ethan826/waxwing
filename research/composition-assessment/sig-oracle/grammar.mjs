// Seeded random signature problems for the oracles (README.md,
// "Grammar of generated problems"). `generator(seed, split)` returns a
// function producing one problem per call; the same seed gives the same
// sequence.
import { T, scan } from './semantics.mjs'

export function generator(initialSeed, splitMode) {
  let seed = initialSeed
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
  return generate
}

export function shape(D, B) {
  const used = scan([...D, ...B])
  return {
    rigidRows: [0, 1, 2].filter((r) => used.rows.has(r)),
    flexRows: [3, 4].filter((r) => used.rows.has(r)),
    rigidTys: used.tys.has(0) ? [0] : [],
    flexTys: used.tys.has(1) ? [1] : [],
    D, B,
  }
}
