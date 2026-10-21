// An independent check of nested-search.mjs (dossier §18.9): the same
// grammar searched without decomposition. Every combination of shapes
// and of cell-map entries for every record node is instantiated on whole
// values and checked on the full rigid assignments. Feasible only for
// small problems; used to cross-check the decomposed search on nested
// positions.
import { holds, recordString, scan } from './semantics.mjs'
import { makeTheta } from './bounded.mjs'
import { cellsOf } from './templates.mjs'
import { temps, rowShapes, nodes } from './nested-templates.mjs'

function* product(lists) {
  if (lists.length === 0) { yield []; return }
  const [first, ...rest] = lists
  for (const tail of product(rest)) for (const x of first) yield [x, ...tail]
}

export function bruteNested(P, present, written, rigids, grammar = {},
  depth = 2) {
  const keys = [...P.flexRows.map((r) => `r${r}`),
    ...P.flexTys.map((n) => `t${n}`)]
  const domains = keys.map((k) => (k[0] === 'r'
    ? rowShapes(P, present, written, grammar)
    : temps(P, present, written, depth, grammar)))
  const cells = cellsOf(P.rigidRows)
  const regionKey = (rigid, l) => P.rigidRows
    .filter((r) => l in rigid.get(`r${r}`)).join(',')
  const value = (s, rigid, entries, path) => {
    if (s.k === 'A') return rigid.get(`r${s.r}`)[s.l]
    if (s.k === 'T') return rigid.get(`t${s.n}`)
    if (s.k === 'g') return s.g
    if (s.k === 'arr') {
      return `(${value(s.a, rigid, entries, `${path}<`)}->` +
        `${value(s.c, rigid, entries, `${path}>`)})`
    }
    return recordString(row(s, rigid, entries, path))
  }
  const row = (s, rigid, entries, path) => {
    const out = {}
    for (const [l, f] of Object.entries(s.fields)) {
      if (f) out[l] = value(f, rigid, entries, `${path}.${l}`)
    }
    if (!s.tails) return out
    for (const r of P.rigidRows) {
      for (const [l, g] of Object.entries(rigid.get(`r${r}`))) {
        if (written.includes(l)) continue
        const src = entries.get(`${path}|${regionKey(rigid, l)}`)
        if (src === r) out[l] = g
      }
    }
    return out
  }
  for (const shapes of product(domains)) {
    const owners = keys.flatMap((k, i) => nodes(shapes[i], k, []))
    const slots = owners.flatMap((o) => cells.map((S) => [`${o}|${S.join(',')}`,
      [null, ...S]]))
    for (const choice of product(slots.map(([, opts]) => opts))) {
      const entries = new Map(slots.map(([k], i) => [k, choice[i]]))
      const ok = rigids.every((rigid) => {
        const flex = new Map(keys.map((k, i) => [k, k[0] === 'r'
          ? row(shapes[i], rigid, entries, k)
          : value(shapes[i], rigid, entries, k)]))
        return P.B.every((a) => holds(makeTheta(rigid, flex), a))
      })
      if (ok) return true
    }
  }
  return rigids.length === 0
}
