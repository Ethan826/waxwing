// Bounded validity by backtracking (attack.md (a)). The domains are
// bounded.mjs's, except that a flexible type variable's built values are
// computed under the partial assignment (every subexpression of `B`
// whose flexible variables are all assigned), which can only enlarge the
// domain. Atoms are checked as soon as their flexible variables are
// assigned. `rowFilter(key, row)` optionally restricts a flexible row's
// values (used to fix a presence choice).
import { sat, scan, evalT, rowsOver, product }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { labelsOf, makeTheta }
  from '../../composition-assessment/sig-oracle/bounded.mjs'

const keysIn = (x) => {
  const used = scan(x.k ? [['eq', x, x]] : [x])
  return [...[...used.rows].map((r) => `r${r}`),
    ...[...used.tys].map((n) => `t${n}`)]
}

function plan(P) {
  const flex = new Set([...P.flexRows.map((r) => `r${r}`),
    ...P.flexTys.map((n) => `t${n}`)])
  const order = []
  const checks = P.B.map((a) => {
    for (const k of keysIn(a)) {
      if (flex.has(k) && !order.includes(k)) order.push(k)
    }
    return { a, at: order.length }
  })
  for (const k of flex) if (!order.includes(k)) order.push(k)
  return { order, checks, flex }
}

function subexprs(P) {
  const out = []
  const visit = (t) => {
    out.push(t)
    if (t.k === 'f') { visit(t.a); visit(t.c) }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
  }
  for (const a of P.B) if (a[0] === 'eq') { visit(a[1]); visit(a[2]) }
  return out
}

export function findSolutionBT(P, rigid, bounds, rowFilter = () => true) {
  const { order, checks, flex } = plan(P)
  const labels = labelsOf(P, bounds)
  const rows = rowsOver(labels, () => bounds.flexFieldTypes)
  const subs = subexprs(P).map((t) => ({ t, keys: keysIn(t)
    .filter((k) => flex.has(k)) }))
  const chosen = new Map()
  const theta = () => makeTheta(rigid, chosen)
  const domain = (k) => {
    if (k[0] === 'r') return rows.filter((row) => rowFilter(k, row))
    const built = new Set(bounds.tyValues)
    for (const { t, keys } of subs) {
      if (!keys.every((j) => chosen.has(j))) continue
      const g = evalT(theta(), t)
      if (g !== null) built.add(g)
    }
    return [...built]
  }
  const go = (i) => {
    if (!checks.filter((c) => c.at === i)
      .every((c) => sat(theta(), [c.a]))) return false
    if (i === order.length) return true
    for (const x of domain(order[i])) {
      chosen.set(order[i], x)
      if (go(i + 1)) return true
    }
    chosen.delete(order[i])
    return false
  }
  return go(0) ? new Map(chosen) : null
}

export function rigidAssignments(P, bounds) {
  const rows = rowsOver(labelsOf(P, bounds), () => bounds.rigidRowTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  return [...product(keys, (k) => (k[0] === 'r' ? rows : bounds.tyValues))]
    .filter((rigid) => sat(makeTheta(rigid, new Map()), P.D))
}

export function boundedValidBT(P, bounds, rowFilter) {
  const all = rigidAssignments(P, bounds)
  for (const rigid of all) {
    if (!findSolutionBT(P, rigid, bounds, rowFilter)) {
      return { verdict: 'invalid', witness: Object.fromEntries(rigid),
        checked: all.length }
    }
  }
  return { verdict: 'valid', checked: all.length }
}
