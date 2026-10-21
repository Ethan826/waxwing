// D3b's construction (construction.md; Lean: Composition/Typed/Defs.lean,
// `eta`, `thetaOf`, `allowedCells`, `thetaStar`). For a written-label
// pattern π: the pre-instance gives each rigid row its present written
// labels at constants A(r, l) and one label per Venn cell S ∋ r at
// constant X(r, S); a rigid type variable n is the constant T(n). D's
// equations, evaluated on the pre-instance, are unified (Robinson, with
// occurs check); D's `lacks` and `disjoint` atoms and the definedness of
// its compositions are checked on presence. A cell is allowed if D is
// unifiable with it as the only cell; θ*_π is the mgu applied to the
// pre-instance over all allowed cells.
//
// Generic terms: { k: 'b', b } base, { k: 'c', c } constant (c.name,
// c.kind 'T' | 'A' | 'X'), { k: 'f', a, c } function, { k: 'r', row }
// record (row: Map label -> term). Cell labels are '@' + rows joined
// by '.', constants render as '#' + name: neither collides with a
// written label.

export const cellLabel = (S) => '@' + S.join('.')
export const isCellLabel = (l) => l.startsWith('@')

const konst = (c) => ({ k: 'c', c })
export const T = (n) => konst({ kind: 'T', n, name: `T${n}` })
export const A = (r, l) => konst({ kind: 'A', r, l, name: `A${r}:${l}` })
export const X = (r, S) =>
  konst({ kind: 'X', r, S, name: `X${r}${cellLabel(S)}` })

// Nonempty subsets of the rigid rows, in the rows' order (Lean:
// `cellCands`, filters of `P.rigidRow`).
export function cellCands(rigidRows) {
  const out = []
  for (let m = 1; m < 1 << rigidRows.length; m++) {
    out.push(rigidRows.filter((_, i) => m & (1 << i)))
  }
  return out
}

// The pre-instance over cells C (Lean: `eta`).
export function eta(P, written, present, C) {
  const rows = new Map()
  for (const r of P.rigidRows) {
    const row = new Map()
    for (const l of written) if (present(r, l)) row.set(l, A(r, l))
    for (const S of C) if (S.includes(r)) row.set(cellLabel(S), X(r, S))
    rows.set(r, row)
  }
  const tys = new Map(P.rigidTys.map((n) => [n, T(n)]))
  return { rows, tys }
}

// A D-expression on the pre-instance; null if a composition repeats a
// label (undefined for every substitution: presence is fixed).
export function evalSym(env, t) {
  switch (t.k) {
    case 'b': return { k: 'b', b: t.b }
    case 'v': return env.tys.get(t.n)
    case 'f': {
      const a = evalSym(env, t.a)
      const c = evalSym(env, t.c)
      return a === null || c === null ? null : { k: 'f', a, c }
    }
    case 'r': {
      const row = new Map()
      for (const [l, ft] of t.fields) {
        const g = evalSym(env, ft)
        if (g === null || row.has(l)) return null
        row.set(l, g)
      }
      for (const r of t.tails) {
        for (const [l, g] of env.rows.get(r)) {
          if (row.has(l)) return null
          row.set(l, g)
        }
      }
      return { k: 'r', row }
    }
  }
  throw new Error(`unknown expression ${t.k}`)
}

function walk(s, t) {
  while (t.k === 'c' && s.has(t.c.name)) t = s.get(t.c.name)
  return t
}

function occurs(s, name, t) {
  t = walk(s, t)
  if (t.k === 'c') return t.c.name === name
  if (t.k === 'f') return occurs(s, name, t.a) || occurs(s, name, t.c)
  if (t.k === 'r') return [...t.row.values()].some((g) => occurs(s, name, g))
  return false
}

function unify(s, a, b) {
  a = walk(s, a)
  b = walk(s, b)
  if (a.k === 'c' && b.k === 'c' && a.c.name === b.c.name) return true
  if (a.k === 'c' || b.k === 'c') {
    const [v, t] = a.k === 'c' ? [a, b] : [b, a]
    if (occurs(s, v.c.name, t)) return false
    s.set(v.c.name, t)
    return true
  }
  if (a.k !== b.k) return false
  if (a.k === 'b') return a.b === b.b
  if (a.k === 'f') return unify(s, a.a, b.a) && unify(s, a.c, b.c)
  if (a.row.size !== b.row.size) return false
  for (const [l, g] of a.row) {
    if (!b.row.has(l) || !unify(s, g, b.row.get(l))) return false
  }
  return true
}

export function resolve(s, t) {
  t = walk(s, t)
  if (t.k === 'f') return { k: 'f', a: resolve(s, t.a), c: resolve(s, t.c) }
  if (t.k === 'r') {
    return { k: 'r', row: new Map([...t.row].map(([l, g]) =>
      [l, resolve(s, g)])) }
  }
  return t
}

// The mgu of D on the pre-instance, or null (Lean: `UnifiesD`, `IsMGU`).
// `noUnify` (a mutant) checks presence only and keeps every constant
// independent, as if D's equations were ignored.
export function mguD(P, env, noUnify = false) {
  const s = new Map()
  for (const a of P.D) {
    if (a[0] === 'ff') return null
    if (a[0] === 'lacks' && env.rows.get(a[1]).has(a[2])) return null
    if (a[0] === 'disjoint') {
      const x = env.rows.get(a[1])
      for (const l of env.rows.get(a[2]).keys()) if (x.has(l)) return null
    }
    if (a[0] === 'eq') {
      const t = evalSym(env, a[1])
      const u = evalSym(env, a[2])
      if (t === null || u === null) return null
      if (noUnify) {
        if (!samePresence(t, u)) return null
      } else if (!unify(s, t, u)) return null
    }
  }
  return s
}

// Presence agreement only (for the mutant): record label sets agree,
// recursively where both sides are structured.
function samePresence(t, u) {
  if (t.k === 'c' || u.k === 'c') return true
  if (t.k !== u.k) return false
  if (t.k === 'f') return samePresence(t.a, u.a) && samePresence(t.c, u.c)
  if (t.k === 'r') {
    if (t.row.size !== u.row.size) return false
    return [...t.row].every(([l, g]) => u.row.has(l) &&
      samePresence(g, u.row.get(l)))
  }
  return t.b === u.b
}

// θ*_π, or a report of why there is none. `instance`: D is unifiable
// with no cell (equivalent to π having an instance satisfying D).
export function thetaStar(P, written, present, opts = {}) {
  const at = (C) => {
    const env = eta(P, written, present, C)
    const s = mguD(P, env, opts.noUnify)
    return s === null ? null : { env, s }
  }
  if (at([]) === null) return { instance: false }
  const allowed = cellCands(P.rigidRows).filter((S) => at([S]) !== null)
  const cells = opts.allCells ? cellCands(P.rigidRows) : allowed
  const got = at(cells)
  if (got === null) return { instance: true, allowed, independent: false }
  const { env, s } = got
  const rows = new Map([...env.rows].map(([r, row]) =>
    [r, new Map([...row].map(([l, g]) => [l, resolve(s, g)]))]))
  const tys = new Map([...env.tys].map(([n, g]) => [n, resolve(s, g)]))
  return { instance: true, allowed, independent: true, cells,
    theta: { rows, tys } }
}
