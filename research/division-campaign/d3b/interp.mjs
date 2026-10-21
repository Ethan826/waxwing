// Rendering θ*_π in the oracle's ground semantics, and the
// interpretation `hv` (Lean: Composition/Typed/Defs.lean, `hv`,
// `Covers`). `hv` maps a generic value into one rigid assignment θR: a
// written label maps field by field; an unwritten label k reads the
// field at the label of k's cell in θR (the rigid rows holding k) and
// values a cell constant under it at k. The canonical valuation:
// T(n) is θR's n, A(r, l) is θR's r at l, X(r, S) under k is θR's r at
// k. `Covers` holds if hv(θ*_π) is θR on every rigid variable.
import { recordString }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { cellLabel } from './generic.mjs'

// A generic term as a ground string: constants become opaque atoms.
export function render(t) {
  switch (t.k) {
    case 'b': return t.b
    case 'c': return '#' + t.c.name
    case 'f': return `(${render(t.a)}->${render(t.c)})`
    case 'r': return recordString(renderRow(t.row))
  }
  throw new Error(`unknown term ${t.k}`)
}

export function renderRow(row) {
  return Object.fromEntries([...row].map(([l, g]) => [l, render(g)]))
}

// θ*_π as a rigid assignment for semantics.mjs (rigid keys only).
export function rigidOf(theta) {
  const rigid = new Map()
  for (const [r, row] of theta.rows) rigid.set(`r${r}`, renderRow(row))
  for (const [n, g] of theta.tys) rigid.set(`t${n}`, render(g))
  return rigid
}

// `nu` maps a constant and a context (a label or null) to a ground
// string; `contextFree` (a mutant) values every X at one fixed label.
export function canonicalNu(rigid, contextFree = false) {
  const row = (r) => rigid.get(`r${r}`)
  return (c, ctx) => {
    if (c.kind === 'T') return rigid.get(`t${c.n}`)
    if (c.kind === 'A') return row(c.r)[c.l] ?? '{}'
    const k = contextFree ? Object.keys(row(c.r)).sort()[0] : ctx
    return (k !== null && k !== undefined && row(c.r)[k]) || '{}'
  }
}

export function cellOfLabel(P, rigid, k) {
  return P.rigidRows.filter((r) => k in rigid.get(`r${r}`))
}

// hv on rows and values, under context `ctx`.
export function hvRow(env, row, ctx) {
  const out = {}
  for (const k of env.labels) {
    if (env.written.has(k)) {
      if (row.has(k)) out[k] = hv(env, row.get(k), ctx)
      continue
    }
    const S = cellOfLabel(env.P, env.rigid, k)
    if (S.length > 0 && row.has(cellLabel(S))) {
      out[k] = hv(env, row.get(cellLabel(S)), k)
    }
  }
  return out
}

export function hv(env, t, ctx) {
  switch (t.k) {
    case 'b': return t.b
    case 'c': return env.nu(t.c, ctx)
    case 'f': return `(${hv(env, t.a, ctx)}->${hv(env, t.c, ctx)})`
    case 'r': return recordString(hvRow(env, t.row, ctx))
  }
  throw new Error(`unknown term ${t.k}`)
}

// Does θ* cover θR under the canonical valuation? Returns null, or the
// first rigid variable whose image differs.
export function coversFails(P, written, labels, theta, rigid, opts = {}) {
  const env = { P, rigid, labels, written: new Set(written),
    nu: canonicalNu(rigid, opts.contextFree) }
  for (const [r, row] of theta.rows) {
    const got = recordString(hvRow(env, row, null))
    const want = recordString(rigid.get(`r${r}`))
    if (got !== want) return { at: `r${r}`, got, want }
  }
  for (const [n, g] of theta.tys) {
    const got = hv(env, g, null)
    if (got !== rigid.get(`t${n}`)) {
      return { at: `t${n}`, got, want: rigid.get(`t${n}`) }
    }
  }
  return null
}
