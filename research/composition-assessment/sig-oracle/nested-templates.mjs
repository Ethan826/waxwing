// Second-pass templates (dossier §18.8): the grammar Temp₂ for flexible
// type variables and rows whose written fields come from Temp₁, built
// from the problem's own skeletons; exhaustive within that grammar.
// The search fixes each template's shape (constructors, leaves, written
// fields) first, checking the atoms on labels outside every Venn cell,
// then chooses each cell's map entries independently, checking the
// atoms projected onto that cell's labels. Projection applies to every
// record at every depth, rigid values included.
import { holds, recordString, scan } from './semantics.mjs'
import { makeTheta } from './bounded.mjs'
import { parse } from './interpret.mjs'
import { cellsOf } from './templates.mjs'

const json = (x) => JSON.stringify(x)

function skel(t) {
  if (t.k === 'b' || t.k === 'v') return { k: 'hole' }
  if (t.k === 'f') return { k: 'arr', a: skel(t.a), c: skel(t.c) }
  const fields = [...t.fields].sort(([a], [b]) => (a < b ? -1 : 1))
  return { k: 'rec', tails: t.tails.length > 0,
    fields: fields.map(([l, ft]) => [l, skel(ft)]) }
}

export function skeletons(P) {
  const out = new Map()
  const visit = (t) => {
    if (t.k === 'f') { visit(t.a); visit(t.c) }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
    const s = skel(t)
    if (s.k !== 'hole') out.set(json(s), s)
  }
  for (const a of [...P.D, ...P.B]) {
    if (a[0] === 'eq') { visit(a[1]); visit(a[2]) }
  }
  return [...out.values()]
}

function leaves(P, present, written) {
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

// `tailWritten` (the amended grammar, §18.9): a record node with tails
// also gets, at each written label its skeleton does not write, absent or
// a leaf, as a flexible row does. Without it, the grammar of §18.8.
function fill(s, pool, extra) {
  if (s.k === 'hole') return pool
  if (s.k === 'arr') {
    return fill(s.a, pool, extra).flatMap((a) =>
      fill(s.c, pool, extra).map((c) => ({ k: 'arr', a, c })))
  }
  let out = [{ k: 'rec', tails: s.tails, fields: {} }]
  for (const [l, fs] of s.fields) {
    out = out.flatMap((t) => fill(fs, pool, extra).map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  if (!s.tails || !extra) return out
  const own = new Set(s.fields.map(([l]) => l))
  for (const l of extra.written.filter((w) => !own.has(w))) {
    out = out.flatMap((t) => [null, ...extra.leaves].map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  return out
}

export function temps(P, present, written, k, grammar = {}) {
  const skels = skeletons(P)
  const base = leaves(P, present, written)
  const extra = grammar.tailWritten ? { written, leaves: base } : null
  let level = base
  for (let i = 0; i < k; i++) {
    const seen = new Map(level.map((t) => [json(t), t]))
    for (const s of skels) {
      for (const t of fill(s, level, extra)) seen.set(json(t), t)
    }
    level = [...seen.values()]
  }
  return level
}

function rowShapes(P, present, written, grammar = {}) {
  const pool = [null, ...temps(P, present, written, 1, grammar)]
  let out = [{ k: 'rec', tails: true, fields: {} }]
  for (const l of written) {
    out = out.flatMap((t) => pool.map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  return out
}

// Record nodes with tails in a shape, by path: the cell-map owners.
function nodes(shape, path, out) {
  if (!shape) return out
  if (shape.k === 'arr') {
    nodes(shape.a, `${path}<`, out)
    nodes(shape.c, `${path}>`, out)
  }
  if (shape.k === 'rec') {
    if (shape.tails) out.push(path)
    for (const [l, f] of Object.entries(shape.fields)) {
      nodes(f, `${path}.${l}`, out)
    }
  }
  return out
}

function project(g, keep) {
  const walk = (v) => {
    if (v.k === 'b') return v.b
    if (v.k === 'f') return `(${walk(v.a)}->${walk(v.c)})`
    const row = {}
    for (const [l, x] of v.fields) if (keep(l)) row[l] = walk(x)
    return recordString(row)
  }
  return g === undefined ? undefined : walk(parse(g))
}

function projectRow(row, keep) {
  const out = {}
  for (const [l, g] of Object.entries(row)) {
    if (keep(l)) out[l] = project(g, keep)
  }
  return out
}

export { nodes, project, projectRow, rowShapes }
