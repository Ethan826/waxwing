// Research code (protocol.md). The per-pattern reference: the generic
// rigid assignment of a pattern and P9s's side condition, copied from
// sig-oracle/p9s.mjs (not exported there), checked with sig-oracle's
// semantics. Plus the consistent-pattern enumerator: the product of
// per-label allowed holder sets (Sig/SlicePatterns.lean,
// `consistentPatterns`), written as a generator so nothing is held.
import { sat, scan }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { instRow, instValue } from './schematic.mjs'

export const writtenLabels = (P) => [...scan([...P.D, ...P.B]).labels]

function declaredPairs(D) {
  const pairs = new Set()
  for (const a of D) {
    if (a[0] === 'disjoint') {
      pairs.add(`${a[1]}|${a[2]}`)
      pairs.add(`${a[2]}|${a[1]}`)
    }
  }
  return pairs
}

const restsIn = (row) => Object.keys(row).filter((l) => l.startsWith('ρ'))
  .map((l) => Number(l.slice(1)))

function restsOk(declared, xs, ys) {
  for (const r of xs) {
    for (const s of ys) {
      if (r !== s && !declared.has(`${r}|${s}`)) return false
    }
  }
  return true
}

export function sideCondition(P) {
  const declared = declaredPairs(P.D)
  const ok = (xs, ys) => restsOk(declared, xs, ys)
  return {
    check: (row) => ok(restsIn(row), restsIn(row)),
    disjointOk: (x, y) => ok(restsIn(x), restsIn(y)),
  }
}

export function genericRigid(P, labels, present) {
  const rigid = new Map()
  for (const r of P.rigidRows) {
    const row = { [`ρ${r}`]: `R${r}` }
    for (const l of labels) if (present(r, l)) row[l] = `A${r}${l}`
    rigid.set(`r${r}`, row)
  }
  for (const n of P.rigidTys) rigid.set(`t${n}`, `T${n}`)
  return rigid
}

// Does a schematic certificate, instantiated at `present`, satisfy B in
// the generic model? null instantiation (a clash) fails.
export function checkPattern(P, labels, present, cert, side) {
  const rigid = genericRigid(P, labels, present)
  const flex = new Map()
  for (const r of P.flexRows) {
    const v = cert.get(`r${r}`)
    const row = v ? instRow(v, labels, present) : {}
    if (row === null) return false
    flex.set(`r${r}`, row)
  }
  for (const n of P.flexTys) {
    const v = cert.get(`t${n}`)
    const g = v ? instValue(v, labels, present) : '{}'
    if (g === null) return false
    flex.set(`t${n}`, g)
  }
  const theta = {
    ty: (n) => (rigid.has(`t${n}`) ? rigid : flex).get(`t${n}`),
    row: (r) => (rigid.has(`r${r}`) ? rigid : flex).get(`r${r}`),
    ...side,
  }
  return sat(theta, P.B)
}

// Allowed holder sets of one label: subsets of rigid rows avoiding rows
// that lack it and declared disjoint pairs. Listed by extension, so the
// count is the factor's size, not 2^|R|, when D restricts it.
export function holderSets(P, l) {
  const lacking = new Set(P.D.filter((a) => a[0] === 'lacks' && a[2] === l)
    .map((a) => a[1]))
  const pairs = declaredPairs(P.D)
  const rows = P.rigidRows.filter((r) => !lacking.has(r))
  let sets = [[]]
  for (const r of rows) {
    const next = []
    for (const s of sets) {
      next.push(s)
      if (s.every((q) => !pairs.has(`${q}|${r}`))) next.push([...s, r])
    }
    sets = next
  }
  return sets
}

// log2 of the number of consistent patterns, without listing them when a
// label's candidate holders carry no declared disjoint pair (then every
// subset is allowed). Otherwise the factor is listed if it has at most
// 20 candidates, and the count is null (not computed) beyond that.
export function consistentCount(P, labels) {
  const rigid = new Set(P.rigidRows)
  const lacksOf = new Map()
  for (const a of P.D) {
    if (a[0] !== 'lacks' || !rigid.has(a[1])) continue
    if (!lacksOf.has(a[2])) lacksOf.set(a[2], new Set())
    lacksOf.get(a[2]).add(a[1])
  }
  const apart = P.D.filter((a) => a[0] === 'disjoint' && a[1] !== a[2] &&
    rigid.has(a[1]) && rigid.has(a[2]))
  let log2 = 0
  for (const l of labels) {
    const lacking = lacksOf.get(l) ?? new Set()
    const rows = P.rigidRows.filter((r) => !lacking.has(r))
    const free = apart.every((a) => lacking.has(a[1]) || lacking.has(a[2]))
    if (free) log2 += rows.length
    else if (rows.length <= 20) log2 += Math.log2(holderSets(P, l).length)
    else return null
  }
  return log2
}

// Every consistent pattern, as a list of [r, l] pairs.
export function* consistentPatterns(P, labels) {
  const factors = labels.map((l) => holderSets(P, l))
  const choice = factors.map(() => 0)
  if (factors.some((f) => f.length === 0)) return
  while (true) {
    const pairs = []
    labels.forEach((l, i) => {
      for (const r of factors[i][choice[i]]) pairs.push([r, l])
    })
    yield pairs
    let i = 0
    while (i < factors.length && ++choice[i] === factors[i].length) {
      choice[i] = 0
      i += 1
    }
    if (i === factors.length) return
  }
}

export const patternKey = (pairs) =>
  pairs.map(([r, l]) => `${r}|${l}`).sort().join(',')

export function presentOf(pairs) {
  const set = new Set(pairs.map(([r, l]) => `${r}|${l}`))
  return (r, l) => set.has(`${r}|${l}`)
}
