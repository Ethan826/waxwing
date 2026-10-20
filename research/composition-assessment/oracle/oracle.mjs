// Bounded oracle for the record composition dossier
// (docs/plans/2026-10-20-record-composition-dossier.md). It enumerates
// every row over a small label set and small base types and checks the
// dossier's claims C1, C2, C7, C10 and the §5 table by counting
// solutions. Evidence on finite cases only, not a proof, and not a
// complete reference (dossier C4). Run: node oracle.mjs
const labels = ['a', 'admin', 'x', 'y', 'extra']
const types = ['Int', 'Bool', 'Text']
const absent = null

// Every row over the given labels: a map from label to type or absent.
function rowsOver(ls) {
  if (ls.length === 0) return [{}]
  const [first, ...rest] = ls
  const tails = rowsOver(rest)
  const out = []
  for (const choice of [absent, ...types]) {
    for (const tail of tails) out.push(withField(tail, first, choice))
  }
  return out
}

function withField(row, label, choice) {
  const copy = { ...row }
  if (choice !== absent) copy[label] = choice
  return copy
}

const has = (row, l) => Object.hasOwn(row, l)
const lacks = (row, l) => !has(row, l)
const key = (row) => JSON.stringify(Object.entries(row).sort())
const same = (r1, r2) => key(r1) === key(r2)

// D3: defined only for disjoint rows.
function disjointUnion(r1, r2) {
  if (Object.keys(r1).some(isIn(r2))) return undefined
  return { ...r1, ...r2 }
}

function isIn(row) {
  return (l) => has(row, l)
}

// D4: the right operand wins.
const biased = (r1, r2) => ({ ...r1, ...r2 })

const results = []
function claim(name, ok, detail) {
  results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`)
}

const rows = rowsOver(labels)
const pairs = rows.flatMap(pairWith)
function pairWith(r) {
  return rows.map(pairOf(r))
}
function pairOf(r) {
  return (s) => [r, s]
}

// C1: where disjoint, ⊎ equals biased composition either way round.
claim('C1 disjoint = biased (both orders)', pairs.every(c1Holds),
  `${pairs.length} pairs`)
function c1Holds([r, s]) {
  const u = disjointUnion(r, s)
  return u === undefined || (same(u, biased(r, s)) && same(u, biased(s, r)))
}

// C2: D8's per-label constraint holds iff the parts are disjoint and the
// result is their union, for every ground presence triple.
const presences = [absent, ...types]
let c2 = true
for (const f of presences) for (const g of presences) {
  for (const h of presences) {
    const d8 = (g !== absent && f === absent && h === g) ||
      (g === absent && h === f)
    const union = !(f !== absent && g !== absent) && h === (g ?? f)
    if (d8 !== union) c2 = false
  }
}
claim('C2 D8 encodes disjoint union per label', c2, '64 triples')

// Solutions of a call-site problem over (r, s).
const solutions = (pred) => pairs.filter(pred)
const target = (fields) => ([r, s]) => {
  const u = disjointUnion(r, s)
  return u !== undefined && same(u, fields)
}

function verdict(name, pred, expected) {
  const n = solutions(pred).length
  const got = n === 0 ? 'Contradiction' : `Solved (${n} solutions)`
  claim(`§5 ${name}`, got.startsWith(expected), got)
  return solutions(pred)
}

// C7: placement forced iff C ⊨ l ∈ part iff C ∧ part lacks l has none.
function forced(name, pred, part, l, type) {
  const sols = solutions(pred)
  const entailed = sols.every(([r, s]) => [r, s][part][l] === type)
  const refuted = solutions(both(pred, partLacks(part, l))).length === 0
  claim(`C7 ${name}`, entailed === refuted,
    `entailed ${entailed}, refutation ${refuted}`)
  return entailed
}
function both(p, q) {
  return (x) => p(x) && q(x)
}
function partLacks(part, l) {
  return (pair) => lacks(pair[part], l)
}

const admin = { admin: 'Bool' }
const p4 = both(target(admin), partLacks(1, 'admin'))
verdict('4', p4, 'Solved (1')
claim('C7 4 forced into r', forced('4 admin in r', p4, 0, 'admin', 'Bool'))
verdict('4 negative', both(p4, partLacks(0, 'admin')), 'Contradiction')
verdict('4 without lacks', target(admin), 'Solved (2')
claim('C7 4 without lacks: not forced',
  !forced('4 without lacks', target(admin), 0, 'admin', 'Bool'))

const xy = { x: 'Int', y: 'Int' }
const p5 = both(target(xy), both(partLacks(0, 'y'), partLacks(1, 'x')))
verdict('5', p5, 'Solved (1')
claim('C7 5 forced', forced('5 x in u', p5, 0, 'x', 'Int') &&
  forced('5 y in v', p5, 1, 'y', 'Int'))
verdict('5 both lack y',
  both(target(xy), both(partLacks(0, 'y'), partLacks(1, 'y'))),
  'Contradiction')

// Program 3's overlap: ⊎ refuses it; biased composition accepts it.
const one = { a: 'Int' }
claim('§5 3 overlap: Contradiction under ⊎, accepted biased',
  disjointUnion(one, one) === undefined && same(biased(one, one), one))

// Program 11: q lacks a; both extensions exist, at independent types.
const q11 = rows.filter((q) => lacks(q, 'a'))
claim('§5 11: every q lacking a extends at Int and at Bool',
  q11.every(extendsBoth), `${q11.length} rows`)
function extendsBoth(q) {
  const m1 = disjointUnion(q, { a: 'Int' })
  const m2 = disjointUnion(q, { a: 'Bool' })
  return m1 !== undefined && m2 !== undefined && m1.a !== m2.a
}
const q11neg = { name: 'Text', a: 'Int' }
claim('§5 11 negative: q = { name, a } contradicts q lacks a',
  !lacks(q11neg, 'a'))

// C10: program 6's negative control. Declared D: r disjoint s, both
// lacking extra (the wrapper's promise names it). Every θR satisfying D
// is a counter-instance: { extra } ⊎ r ⊎ s never equals r ⊎ s.
const d6 = pairs.filter(([r, s]) => disjointUnion(r, s) !== undefined &&
  lacks(r, 'extra') && lacks(s, 'extra'))
claim('C10 6 negative: every θR is a counter-instance',
  d6.every(counterInstance), `${d6.length} instances`)
function counterInstance([r, s]) {
  const body = disjointUnion(r, s)
  const promised = disjointUnion({ extra: 'Bool' }, body)
  return promised !== undefined && !same(promised, body)
}

console.log(results.join('\n'))
const failed = results.filter((line) => line.startsWith('FAIL')).length
console.log(`${results.length - failed} of ${results.length} checks hold`)
process.exitCode = failed === 0 ? 0 : 1
