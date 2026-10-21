// R4 (attack.md (a)): seeded flat problems aimed at type-agreement
// placement, with hypotheses that force agreement on some cells.
// node agreement.mjs [count] [seed]
import { T, scan }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { patterns } from '../../composition-assessment/sig-oracle/p9s.mjs'
import { findTemplate }
  from '../../composition-assessment/sig-oracle/templates.mjs'
import { boundedValidBT, rigidAssignments } from './bt.mjs'

const count = Number(process.argv[2] ?? 500)
const seed0 = Number(process.argv[3] ?? 5)
const BOUNDS = { unwritten: ['z1', 'z2'], rigidRowTypes: ['Int', 'Bool', '{}'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)'] }
const LARGER = { ...BOUNDS, unwritten: ['z1', 'z2', 'z3'],
  rigidRowTypes: ['Int', 'Bool', '{}', '(Int->Int)'] }

function generator(initial) {
  let seed = initial
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (xs) => xs[Math.floor(random() * xs.length)]
  const chance = (p) => random() < p
  const two = (xs) => {
    const a = pick(xs)
    return [a, pick(xs.filter((x) => x !== a))]
  }
  const rigidEq = () => {
    const [x, y] = two([0, 1, 2])
    const z = [0, 1, 2].find((w) => w !== x && w !== y)
    return chance(0.5) ? ['eq', T.tails(x), T.tails(y)]
      : ['eq', T.tails(x), T.tails(y, z)]
  }
  const flex = [3, 4, 5, 6]
  const rigid = [0, 1, 2]
  const atom = () => {
    const [f, g] = two(flex)
    const [r, s] = two(rigid)
    return pick([['eq', T.tails(r), T.tails(f, g)],
      ['eq', T.tails(f), T.tails(r)], ['eq', T.tails(f, g), T.tails(r, s)],
      ['eq', T.tails(f), T.tails(g)], ['eq', T.tails(f, r), T.tails(g, s)],
      ['disjoint', f, g], ['disjoint', f, r]])
  }
  return () => {
    const D = []
    for (const [x, y] of [[0, 1], [0, 2], [1, 2]]) {
      if (chance(0.2)) D.push(['disjoint', x, y])
    }
    if (chance(0.6)) {
      D.push(rigidEq())
      if (chance(0.3)) D.push(rigidEq())
    }
    const B = Array.from({ length: 2 + Math.floor(random() * 4) }, atom)
    return shape(D, B)
  }
}

function shape(D, B) {
  const used = scan([...D, ...B])
  return { rigidRows: [0, 1, 2].filter((r) => used.rows.has(r)),
    flexRows: [3, 4, 5, 6].filter((r) => used.rows.has(r)),
    rigidTys: [], flexTys: [], D, B }
}

function classify(P, bounds) {
  if (boundedValidBT(P, bounds).verdict !== 'valid') return 'invalid'
  const written = [...scan([...P.D, ...P.B]).labels]
  const all = rigidAssignments(P, bounds)
  const find = (present, rs) =>
    findTemplate(P, present, written, bounds.unwritten, rs) !== null
  for (const present of patterns(P, written)) {
    const rigids = all.filter((rigid) => P.rigidRows.every((r) =>
      written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l))))
    if (rigids.length === 0 || find(present, rigids)) continue
    return rigids.every((rigid) => find(present, [rigid]))
      ? 'SEPARATION: type-dependent' : 'SEPARATION: beyond the grammar'
  }
  return 'valid, uniform'
}

function minimize(P, kind) {
  let cur = P
  for (let shrunk = true; shrunk;) {
    shrunk = false
    for (const part of ['B', 'D']) {
      for (let i = 0; i < cur[part].length; i++) {
        const next = part === 'D'
          ? shape(cur.D.filter((_, j) => j !== i), cur.B)
          : shape(cur.D, cur.B.filter((_, j) => j !== i))
        if (next.B.length > 0 && classify(next, BOUNDS) === kind) {
          cur = next
          shrunk = true
        }
      }
    }
  }
  return cur
}

const tally = {}
const generate = generator(seed0)
const t0 = Date.now()
for (let i = 0; i < count; i++) {
  const P = generate()
  const kind = classify(P, BOUNDS)
  tally[kind] = (tally[kind] ?? 0) + 1
  if (kind.startsWith('SEPARATION')) {
    const small = minimize(P, kind)
    console.log(`gen${i}: ${kind}; minimized ${JSON.stringify(small)}; ` +
      `larger bounds: ${classify(small, LARGER)}`)
  }
}
console.log(`seed ${seed0}, ${count} problems, ${Date.now() - t0} ms: ` +
  JSON.stringify(tally))
