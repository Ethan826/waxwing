// Typed term-witness templates (dossier §18.6). On unwritten labels a
// typed term witness for a flexible row is, for each Venn cell of the
// rigid rows (a nonempty set S of rigid rows holding the label), either
// absent or one source row r ∈ S whose field type it copies; on a written
// label it is absent or a field template. A field template is a rigid
// row's field there (`A`), a rigid type variable (`T`), or a ground type
// (the problem's base types, Int, Bool); a flexible type variable may
// also be a record template, when it is equated with a record. The space
// is finite and searched exhaustively, with no depth limit. Problems with
// records nested in fields are outside this first pass (`inFirstPass`).
//
// `uniform`: one template per pattern for every rigid assignment in it
// (term-witness sufficiency). `perAssignment`: a template chosen after
// seeing each assignment (weaker; kept to show what uniformity costs).
import { holds, recordString, scan } from './semantics.mjs'
import { makeTheta } from './bounded.mjs'

export function inFirstPass(P) {
  const deep = (t) => t.k === 'r' && t.fields.some(([, ft]) => nested(ft))
  const nested = (t) => t.k === 'r' || (t.k === 'f' && (nested(t.a) ||
    nested(t.c))) || deep(t)
  return [...P.D, ...P.B].every((a) => a[0] !== 'eq' ||
    (!deep(a[1]) && !deep(a[2])))
}

export function cellsOf(rigidRows) {
  const out = []
  for (let m = 1; m < 1 << rigidRows.length; m++) {
    out.push(rigidRows.filter((_, i) => m & (1 << i)))
  }
  return out
}

function fieldTemplates(P, present, written) {
  const out = []
  for (const r of P.rigidRows) {
    for (const l of written) if (present(r, l)) out.push({ k: 'A', r, l })
  }
  for (const n of P.rigidTys) out.push({ k: 'T', n })
  const bases = new Set(['Int', 'Bool'])
  const visit = (t) => {
    if (t.k === 'b') bases.add(t.b)
    if (t.k === 'f') { visit(t.a); visit(t.c) }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
  }
  for (const a of [...P.D, ...P.B]) {
    if (a[0] === 'eq') { visit(a[1]); visit(a[2]) }
  }
  for (const g of bases) out.push({ k: 'g', g })
  return out
}

// Every row template: per written label absent or a field template, per
// cell absent or a source in the cell.
export function rowTemplates(P, present, written) {
  const fts = [null, ...fieldTemplates(P, present, written)]
  const cells = cellsOf(P.rigidRows)
  let out = [{ fields: {}, cells: {} }]
  for (const l of written) {
    out = out.flatMap((t) => fts.map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  for (const S of cells) {
    out = out.flatMap((t) => [null, ...S].map((src) =>
      ({ ...t, cells: { ...t.cells, [S.join(',')]: src } })))
  }
  return out
}

// A flexible type variable equated with a record expression, directly
// or through equations between type variables, may be a record
// template; otherwise only field templates.
function needsRecord(P, n) {
  const eqs = P.B.filter((a) => a[0] === 'eq')
  const linked = new Set([n])
  let grew = true
  while (grew) {
    grew = false
    for (const [, x, y] of eqs) {
      if (x.k !== 'v' || y.k !== 'v') continue
      for (const [p, q] of [[x.n, y.n], [y.n, x.n]]) {
        if (linked.has(p) && !linked.has(q)) { linked.add(q); grew = true }
      }
    }
  }
  return eqs.some(([, x, y]) => (x.k === 'v' && linked.has(x.n) &&
    y.k === 'r') || (y.k === 'v' && linked.has(y.n) && x.k === 'r'))
}

export function tyTemplates(P, n, present, written) {
  const fts = fieldTemplates(P, present, written)
  if (!needsRecord(P, n)) return fts
  return [...fts, ...rowTemplates(P, present, written)
    .map((rt) => ({ k: 'rec', rt }))]
}

export function instValue(t, theta, ctx) {
  if (t.k === 'A') return theta.row(t.r)[t.l]
  if (t.k === 'T') return theta.ty(t.n)
  if (t.k === 'g') return t.g
  return recordString(instRow(t.rt, theta, ctx))
}

export function instRow(rt, theta, { P, written, unwritten }) {
  const row = {}
  for (const l of written) {
    const f = rt.fields[l]
    if (f) row[l] = instValue(f, theta, { P, written, unwritten })
  }
  for (const k of unwritten) {
    const S = P.rigidRows.filter((r) => k in theta.row(r))
    if (S.length === 0) continue
    const src = rt.cells[S.join(',')]
    if (src !== null && src !== undefined) row[k] = theta.row(src)[k]
  }
  return row
}

// The flexible variables in the order atoms first mention them, and for
// each atom the number of variables assigned when it becomes checkable.
function plan(P) {
  const order = []
  const flex = new Set([...P.flexRows.map((r) => `r${r}`),
    ...P.flexTys.map((n) => `t${n}`)])
  const checks = P.B.map((a) => {
    const used = scan([a])
    for (const k of [...[...used.rows].map((r) => `r${r}`),
      ...[...used.tys].map((n) => `t${n}`)]) {
      if (flex.has(k) && !order.includes(k)) order.push(k)
    }
    return { a, at: order.length }
  })
  for (const k of flex) if (!order.includes(k)) order.push(k)
  return { order, checks }
}

// Some template, uniform over `rigids` (the rigid assignments of one
// pattern), satisfying every atom of B; null if none. Instantiations are
// cached per template and assignment; the assignment that failed last is
// tried first. Both only change speed, not the answer.
export function findTemplate(P, present, written, unwritten, rigids) {
  const { order, checks } = plan(P)
  const ctx = { P, written, unwritten }
  const rows = rowTemplates(P, present, written)
  const domains = order.map((k) => (k[0] === 'r'
    ? rows
    : tyTemplates(P, Number(k.slice(1)), present, written)))
  const thetas = rigids.map((rigid) => makeTheta(rigid, new Map()))
  const cache = new Map()
  const inst = (k, t, i) => {
    let byTheta = cache.get(t)
    if (!byTheta) cache.set(t, (byTheta = []))
    if (!(i in byTheta)) {
      byTheta[i] = k[0] === 'r'
        ? instRow(t, thetas[i], ctx)
        : instValue(t, thetas[i], ctx)
    }
    return byTheta[i]
  }
  const chosen = []
  let firstTry = 0
  const holdsAt = (c, i) => {
    const flex = new Map(chosen.map((t, j) => [order[j], inst(order[j], t, i)]))
    return holds(makeTheta(rigids[i], flex), c.a)
  }
  const ok = (depth) => checks.filter((c) => c.at === depth).every((c) => {
    if (!holdsAt(c, firstTry)) return false
    for (let i = 0; i < rigids.length; i++) {
      if (!holdsAt(c, i)) { firstTry = i; return false }
    }
    return true
  })
  const go = (i) => {
    if (!ok(i)) return false
    if (i === order.length) return true
    for (const t of domains[i]) {
      chosen.push(t)
      if (go(i + 1)) return true
      chosen.pop()
    }
    return false
  }
  return rigids.length === 0 || go(0) ? [...chosen] : null
}
