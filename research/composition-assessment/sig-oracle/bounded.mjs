// Bounded ∀∃ evaluation of signature validity (dossier §13.1): every
// rigid assignment in the bounded domain that satisfies D must extend,
// by some flexible assignment in the bounded domain, to a solution of B.
//
// The bounded domains (documented in README.md): labels are those
// written in the problem plus `bounds.unwritten`; rigid rows map those
// labels to `bounds.rigidRowTypes`; flexible rows to
// `bounds.flexFieldTypes`; every type variable, rigid or flexible,
// ranges over `bounds.tyValues`, and a flexible one also over the values
// of B's subexpressions free of flexible type variables (`builtValues`)
// under the rows being tried. "Invalid" here means invalid in the
// bounded model: a found rigid assignment with no flexible solution in
// the bounded flexible domain. It is a candidate counter-instance until
// checked; a found solution is checked directly.
import { sat, scan, rowsOver, product, builtValues } from './semantics.mjs'

export const DEFAULT_BOUNDS = {
  unwritten: ['z1', 'z2'],
  rigidRowTypes: ['Int', 'Bool'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)'],
}

export function labelsOf(P, bounds) {
  const written = scan([...P.D, ...P.B]).labels
  return [...written, ...bounds.unwritten]
}

export function makeTheta(rigid, flex) {
  return {
    ty: (n) => (rigid.has(`t${n}`) ? rigid : flex).get(`t${n}`),
    row: (r) => (rigid.has(`r${r}`) ? rigid : flex).get(`r${r}`),
  }
}

function keysOf(rows, tys) {
  return [...rows.map((r) => `r${r}`), ...tys.map((n) => `t${n}`)]
}

export function boundedValid(P, bounds = DEFAULT_BOUNDS) {
  const labels = labelsOf(P, bounds)
  const rigidRows = rowsOver(labels, () => bounds.rigidRowTypes)
  const flexRows = rowsOver(labels, () => bounds.flexFieldTypes)
  const rigidKeys = keysOf(P.rigidRows, P.rigidTys)
  const rigidValues = (k) => (k[0] === 'r' ? rigidRows : bounds.tyValues)
  let checked = 0
  for (const rigid of product(rigidKeys, rigidValues)) {
    if (!sat(makeTheta(rigid, new Map()), P.D)) continue
    checked += 1
    if (!hasSolution(P, rigid, flexRows, bounds.tyValues)) {
      return { verdict: 'invalid', witness: show(rigid), checked }
    }
  }
  return { verdict: 'valid', checked }
}

export function hasSolution(P, rigid, flexRows, tyValues, extend = {}) {
  const rowKeys = P.flexRows.map((r) => `r${r}`)
  const tyKeys = P.flexTys.map((n) => `t${n}`)
  const flexTys = new Set(P.flexTys)
  for (const rows of product(rowKeys, () => flexRows)) {
    const partial = { ...makeTheta(rigid, rows), ...extend }
    const built = builtValues(partial, P.B, flexTys)
    const values = [...new Set([...tyValues, ...built])]
    for (const tys of product(tyKeys, () => values)) {
      const flex = new Map([...rows, ...tys])
      if (sat({ ...makeTheta(rigid, flex), ...extend }, P.B)) return true
    }
  }
  return false
}

function show(map) {
  return Object.fromEntries([...map].map(([k, v]) => [k, v]))
}
