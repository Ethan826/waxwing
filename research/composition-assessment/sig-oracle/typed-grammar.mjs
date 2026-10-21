// Seeded random typed problems for the term-witness oracle (dossier
// §18.6): rigid rows 0, 1 (and 2), flexible rows 3-5, an optional
// written label `a`. Clauses: `disjoint`, `lacks a`, and hypotheses that
// force agreement (`r = s`, `r = s ⊎ t`). Body: splits of a rigid row
// into flexible parts (sharing parts across rigid rows), aliases,
// `disjoint`, `lacks a`, and a written field at a base type.
import { T, scan } from './semantics.mjs'

export function typedGenerator(initialSeed) {
  let seed = initialSeed
  function random() {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (xs) => xs[Math.floor(random() * xs.length)]
  const chance = (p) => random() < p
  return function generate() {
    const three = chance(0.3)
    const written = !three && chance(0.4)
    const rigid = three ? [0, 1, 2] : [0, 1]
    const flex = [3, 4, 5]
    const D = []
    if (chance(0.3)) D.push(['disjoint', 0, 1])
    if (three && chance(0.4)) D.push(['disjoint', 1, 2])
    if (three && chance(0.2)) D.push(['disjoint', 0, 2])
    if (written && chance(0.3)) D.push(['lacks', 0, 'a'])
    if (written && chance(0.3)) D.push(['lacks', 1, 'a'])
    if (chance(0.1)) D.push(['eq', T.tails(0), T.tails(1)])
    if (three && chance(0.15)) D.push(['eq', T.tails(0), T.tails(1, 2)])
    const any = [...rigid, ...flex]
    const other = (x) => pick(any.filter((y) => y !== x))
    const atom = () => {
      const kind = pick(['split', 'split', 'alias', 'disjoint', 'field',
        'lacks'])
      if (kind === 'split') {
        const f = pick(flex)
        return ['eq', T.tails(pick(rigid)), T.tails(f, other(f))]
      }
      if (kind === 'alias') {
        return ['eq', T.tails(pick(flex)), T.tails(pick(any))]
      }
      if (kind === 'disjoint') {
        const f = pick(flex)
        return ['disjoint', f, other(f)]
      }
      if (kind === 'field' && written) {
        return ['eq', T.rec([['a', T.base(pick(['Int', 'Bool']))]],
          [pick(flex)]), T.tails(pick(rigid))]
      }
      if (written) return ['lacks', pick(flex), 'a']
      return ['disjoint', pick(flex), pick(rigid)]
    }
    const B = Array.from({ length: 1 + Math.floor(random() * 4) }, atom)
    return typedShape(D, B)
  }
}

export function typedShape(D, B) {
  const used = scan([...D, ...B])
  return {
    rigidRows: [0, 1, 2].filter((r) => used.rows.has(r)),
    flexRows: [3, 4, 5].filter((r) => used.rows.has(r)),
    rigidTys: [], flexTys: [], D, B,
  }
}
