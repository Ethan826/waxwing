// The second-pass search (dossier §18.8). Phase 1 chooses shapes for the
// flexible variables and checks atoms on the 'rest' block; phase 2
// solves each Venn cell's block independently, choosing the map entries
// of every record node with tails. Blocks partition positions by path:
// a position reached through non-cell labels only (written labels, and
// labels no rigid row holds) is in 'rest'; a cell label's whole subtree
// is in its region's block. Inputs are projected, and so are the values
// an equation's sides evaluate to. Exact for this grammar: values are
// equal, and compositions defined, iff they are in every block, and a
// block's projection depends only on the shapes and that block's
// entries.
import { evalT, holds, recordString, scan } from './semantics.mjs'
import { makeTheta } from './bounded.mjs'
import { cellsOf } from './templates.mjs'
import { parse } from './interpret.mjs'
import { temps, rowShapes, nodes } from './nested-templates.mjs'

function plan(P) {
  const order = []
  const flex = new Set([...P.flexRows.map((r) => `r${r}`),
    ...P.flexTys.map((n) => `t${n}`)])
  const keysOf = (a) => {
    const used = scan([a])
    return [...[...used.rows].map((r) => `r${r}`),
      ...[...used.tys].map((n) => `t${n}`)].filter((k) => flex.has(k))
  }
  const checks = P.B.map((a) => {
    for (const k of keysOf(a)) if (!order.includes(k)) order.push(k)
    return { a, at: order.length, vars: keysOf(a) }
  })
  for (const k of flex) if (!order.includes(k)) order.push(k)
  return { order, checks }
}

export function findNested(P, present, written, rigids, grammar = {},
  depth = 2) {
  const { order, checks } = plan(P)
  const domains = order.map((k) => (k[0] === 'r'
    ? rowShapes(P, present, written, grammar)
    : temps(P, present, written, depth, grammar)))
  const writtenSet = new Set(written)
  // A cell label is an unwritten label some rigid row holds; its region
  // is the set of rigid rows holding it ('' for no cell).
  const regionOf = rigids.map((rigid) => (l) => (writtenSet.has(l) ? ''
    : P.rigidRows.filter((r) => l in rigid.get(`r${r}`)).join(',')))
  // Blocks: 'rest' holds every position reached through non-cell labels
  // only; a cell label's whole subtree belongs to its region's block.
  const project = (g, i, block) => {
    const walk = (v) => {
      if (v.k === 'b') return v.b
      if (v.k === 'f') return `(${walk(v.a)}->${walk(v.c)})`
      const row = {}
      for (const [l, x] of v.fields) {
        const region = regionOf[i](l)
        if (region === '') row[l] = walk(x)
        else if (region === block) row[l] = full(x)
      }
      return recordString(row)
    }
    const full = (v) => (v.k === 'b' ? v.b : v.k === 'f'
      ? `(${full(v.a)}->${full(v.c)})`
      : recordString(Object.fromEntries(v.fields.map(([l, x]) =>
        [l, full(x)]))))
    return g === undefined || g === null ? g : walk(parse(g))
  }
  const projCache = new Map()
  const projRigid = (i, block) => {
    const key = `${i}|${block}`
    if (!projCache.has(key)) {
      const m = new Map()
      for (const [k, v] of rigids[i]) {
        if (k[0] === 't') { m.set(k, project(v, i, block)); continue }
        const row = {}
        for (const [l, g] of Object.entries(v)) {
          const region = regionOf[i](l)
          if (region === '') row[l] = project(g, i, block)
          else if (region === block) row[l] = g
        }
        m.set(k, row)
      }
      projCache.set(key, m)
    }
    return projCache.get(key)
  }
  const value = (s, i, block, entries, path) => {
    const rigid = rigids[i]
    if (s.k === 'A') return project(rigid.get(`r${s.r}`)[s.l], i, block)
    if (s.k === 'T') return project(rigid.get(`t${s.n}`), i, block)
    if (s.k === 'g') return s.g
    if (s.k === 'arr') {
      return `(${value(s.a, i, block, entries, `${path}<`)}->` +
        `${value(s.c, i, block, entries, `${path}>`)})`
    }
    return recordString(rowValue(s, i, block, entries, path))
  }
  // Written fields are shape-determined and kept in every block; a cell
  // block adds the source row's fields at that cell's labels, whole.
  const rowValue = (s, i, block, entries, path) => {
    const row = {}
    for (const [l, f] of Object.entries(s.fields)) {
      if (f) row[l] = value(f, i, block, entries, `${path}.${l}`)
    }
    const src = block === 'rest' ? null : entries.get(path)
    if (s.tails && src !== null && src !== undefined) {
      for (const [l, g] of Object.entries(rigids[i].get(`r${src}`))) {
        if (regionOf[i](l) === block) row[l] = g
      }
    }
    return row
  }
  const shapes = new Map()
  const holdsIn = (c, block, entries) => rigids.every((_, i) => {
    const flex = new Map()
    for (const k of c.vars) {
      const s = shapes.get(k)
      flex.set(k, k[0] === 'r' ? rowValue(s, i, block, entries, k)
        : value(s, i, block, entries, k))
    }
    const theta = makeTheta(projRigid(i, block), flex)
    if (c.a[0] !== 'eq') return holds(theta, c.a)
    // An expression's own written fields are not inputs: project the
    // values each side evaluates to, not only what flows in.
    const a = evalT(theta, c.a[1])
    const b = evalT(theta, c.a[2])
    return a !== null && b !== null &&
      project(a, i, block) === project(b, i, block)
  })
  const cells = cellsOf(P.rigidRows)
  const solveCell = (S) => {
    const block = S.join(',')
    const owners = order.flatMap((k) => nodes(shapes.get(k), k, []))
    const entries = new Map()
    const go = (j) => {
      if (j === owners.length) {
        return checks.every((c) => holdsIn(c, block, entries))
      }
      for (const src of [null, ...S]) {
        entries.set(owners[j], src)
        if (go(j + 1)) return true
      }
      entries.delete(owners[j])
      return false
    }
    return go(0)
  }
  const phase1 = (i) => {
    const ok = checks.filter((c) => c.at === i)
      .every((c) => holdsIn(c, 'rest', new Map()))
    if (!ok) return false
    if (i === order.length) return cells.every(solveCell)
    for (const s of domains[i]) {
      shapes.set(order[i], s)
      if (phase1(i + 1)) return true
    }
    shapes.delete(order[i])
    return false
  }
  return rigids.length === 0 || phase1(0)
}
