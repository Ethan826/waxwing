// Seeded generator of nested typed problems (frozen in frozen-grammar.md
// before any run). One written label `f`, used both as a field and as
// the nesting label. Rigid rows 0, 1 (and 2 with probability 0.15);
// flexible rows 3, 4 (and 5 with probability 0.25, never with three
// rigid rows); rigid type variable 0 and flexible type variable 1
// optional. Clauses: `disjoint`, `lacks f`, `r = s`, `r = s ⊎ t`,
// `{ f: { ...r } } = { f: { ...s } }`, `α = { ...r }`. Body (one to
// three atoms): splits and aliases of rigid rows, wrapped in a field, in
// a field of a field, or in an arrow's domain; `disjoint`, `lacks f`; a
// written field at Int, α or β beside a flexible tail; `β` equated with
// a wrapped flexible row or an arrow between flexible rows.
import { T, scan } from '../../composition-assessment/sig-oracle/semantics.mjs'

const { base, v, fn, rec, tails } = T

export function d3Generator(initialSeed) {
  let seed = initialSeed
  function random() {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (xs) => xs[Math.floor(random() * xs.length)]
  const chance = (p) => random() < p
  const wrappers = [
    (x) => x,
    (x) => rec([['f', x]], []),
    (x) => rec([['f', rec([['f', x]], [])]], []),
    (x) => fn(x, base('Int')),
  ]
  return function generate() {
    const three = chance(0.15)
    const rigid = three ? [0, 1, 2] : [0, 1]
    const flex = !three && chance(0.25) ? [3, 4, 5] : [3, 4]
    const alpha = !three && chance(0.3)
    const beta = chance(0.5)
    const D = []
    if (chance(0.3)) D.push(['disjoint', 0, 1])
    if (three && chance(0.4)) D.push(['disjoint', 1, 2])
    if (three && chance(0.2)) D.push(['disjoint', 0, 2])
    for (const r of rigid) if (chance(0.2)) D.push(['lacks', r, 'f'])
    if (chance(0.1)) D.push(['eq', tails(0), tails(1)])
    if (three && chance(0.2)) D.push(['eq', tails(0), tails(1, 2)])
    if (chance(0.08)) {
      D.push(['eq', rec([['f', tails(0)]], []), rec([['f', tails(1)]], [])])
    }
    if (alpha && chance(0.4)) D.push(['eq', v(0), tails(pick(rigid))])
    const any = [...rigid, ...flex]
    const other = (x) => pick(any.filter((y) => y !== x))
    const fieldTy = () => pick([base('Int'), ...(alpha ? [v(0)] : []),
      ...(beta ? [v(1)] : [])])
    const atom = () => {
      const kind = pick(['split', 'split', 'alias', 'disjoint', 'lacks',
        'field', 'beta'])
      const w = pick(wrappers)
      if (kind === 'split') {
        const x = pick(flex)
        const lhs = alpha && chance(0.3) ? v(0) : tails(pick(rigid))
        return ['eq', w(lhs), w(tails(x, other(x)))]
      }
      if (kind === 'alias') return ['eq', w(tails(pick(flex))), w(tails(pick(any)))]
      if (kind === 'disjoint') {
        const x = pick(flex)
        return ['disjoint', x, other(x)]
      }
      if (kind === 'lacks') return ['lacks', pick(flex), 'f']
      if (kind === 'field') {
        return ['eq', rec([['f', fieldTy()]], [pick(flex)]),
          tails(pick(rigid))]
      }
      if (beta && chance(0.5)) {
        return ['eq', v(1), fn(tails(pick(flex)), tails(pick(flex)))]
      }
      if (beta) return ['eq', v(1), w(tails(pick(flex)))]
      return ['disjoint', pick(flex), pick(rigid)]
    }
    const B = Array.from({ length: 1 + Math.floor(random() * 3) }, atom)
    return d3Shape(D, B)
  }
}

export function d3Shape(D, B) {
  const used = scan([...D, ...B])
  return {
    rigidRows: [0, 1, 2].filter((r) => used.rows.has(r)),
    flexRows: [3, 4, 5].filter((r) => used.rows.has(r)),
    rigidTys: [0].filter((n) => used.tys.has(n)),
    flexTys: [1].filter((n) => used.tys.has(n)),
    D, B,
  }
}

// Bounds for generated problems: the second pass's, with record values
// for rigid type variables (so `α = { ...r }` has instances).
export const GENERATED_BOUNDS = {
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}', '{z1:Int}',
    '{z1:Int,z2:{q:Int}}'],
}
