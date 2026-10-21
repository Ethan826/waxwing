// Research code (protocol.md). Proposed, not proved.
//
// Schematic values: closed generic values that may name a rigid row as
// a tail. A schematic value is
//
//   { k: 'b', b }              a base type or generic constant, named as
//                              p9s.mjs names them: A<r><l>, R<r>, T<n>
//   { k: 'f', a, c }           a function
//   { k: 'r', fields, pieces } a record: written fields [[l, value]] and
//                              pieces [{ r, ex: [labels] }]
//
// A piece { r, ex } stands for rigid row r's generic contents, without
// the written labels in ex: at a pattern π it denotes
// { l: A<r><l> | π(r, l), l ∉ ex } ∪ { ρ<r>: R<r> }. A certificate maps
// flexible rows (key `r<u>`) to record values and flexible type
// variables (key `t<n>`) to values; an unbound variable is the empty
// record, as in checkAll (dossier §15.2).
//
// `checkAtoms` decides, for one certificate and one region (region.mjs),
// whether every atom holds at every pattern of the region, with D1 and
// D2 (dossier §14.2). Every condition is a conjunction over atoms,
// labels and nested fields, and each conjunct is answered by a region
// query, so the quantifier over patterns is never enumerated. On a
// failure it reports a bit (r, l) when splitting on it might help.
import { possible, must, declared, nonEmpty } from './region.mjs'

export const empty = () => ({ k: 'r', fields: [], pieces: [] })
export const constA = (r, l) => `A${r}${l}`

class Fail extends Error {
  constructor(reason, bit = null) {
    super(reason)
    this.bit = bit
  }
}

const fail = (reason, bit) => { throw new Fail(reason, bit) }

// The value of an expression of B under a certificate, checked defined at
// every pattern of the region (D1: no label from two parts; every pair of
// distinct rests declared disjoint).
function evalT(ctx, t) {
  switch (t.k) {
    case 'b': return t
    case 'v':
      if (ctx.P.rigidTys.includes(t.n)) return { k: 'b', b: `T${t.n}` }
      return wf(ctx, ctx.cert.get(`t${t.n}`) ?? empty())
    case 'f': return { k: 'f', a: evalT(ctx, t.a), c: evalT(ctx, t.c) }
    case 'r': {
      const parts = [{ k: 'r', fields: t.fields.map(([l, ft]) =>
        [l, evalT(ctx, ft)]), pieces: [] }]
      for (const r of t.tails) parts.push(rowOf(ctx, r))
      return compose(ctx, parts)
    }
  }
  throw new Error(`unknown expression ${t.k}`)
}

function rowOf(ctx, r) {
  if (ctx.P.rigidRows.includes(r)) {
    return { k: 'r', fields: [], pieces: [{ r, ex: [] }] }
  }
  const value = ctx.cert.get(`r${r}`) ?? empty()
  if (value.k !== 'r') fail(`row ${r} bound to a non-record`)
  return wf(ctx, value)
}

// A certificate value is checked like a record expression, at any depth.
function wf(ctx, value) {
  if (value.k === 'f') return { k: 'f', a: wf(ctx, value.a),
    c: wf(ctx, value.c) }
  if (value.k !== 'r') return value
  return compose(ctx, [{ k: 'r', pieces: value.pieces,
    fields: value.fields.map(([l, ft]) => [l, wf(ctx, ft)]) }])
}

function compose(ctx, parts) {
  const fields = []
  const pieces = []
  const seen = new Set()
  for (const part of parts) {
    for (const [l, ft] of part.fields) {
      if (seen.has(l)) fail(`label ${l} twice`)
      seen.add(l)
      fields.push([l, ft])
    }
    for (const piece of part.pieces) {
      if (pieces.some((q) => q.r === piece.r)) fail(`rest ${piece.r} twice`)
      pieces.push(piece)
    }
  }
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (!declared(ctx.region.index, pieces[i].r, pieces[j].r)) {
        fail(`rests ${pieces[i].r}, ${pieces[j].r} not declared disjoint`)
      }
    }
  }
  for (const [l] of fields) {
    for (const p of pieces) {
      if (!p.ex.includes(l) && possible(ctx.region, p.r, l)) {
        fail(`written ${l} may clash with row ${p.r}`, [p.r, l])
      }
    }
  }
  return { k: 'r', fields, pieces }
}

const holds = (piece, l) => !piece.ex.includes(l)

function equal(ctx, x, y) {
  if (x.k !== y.k) fail('kinds differ')
  if (x.k === 'b') {
    if (x.b !== y.b) fail(`${x.b} differs from ${y.b}`)
    return
  }
  if (x.k === 'f') {
    equal(ctx, x.a, y.a)
    equal(ctx, x.c, y.c)
    return
  }
  const rx = x.pieces.map((p) => p.r).sort()
  const ry = y.pieces.map((p) => p.r).sort()
  if (rx.join() !== ry.join()) fail('rests differ')
  const fx = new Map(x.fields)
  const fy = new Map(y.fields)
  const labels = new Set([...fx.keys(), ...fy.keys(), ...ctx.labels])
  for (const l of labels) {
    if (fx.has(l) && fy.has(l)) equal(ctx, fx.get(l), fy.get(l))
    else if (fx.has(l)) writtenAgainst(ctx, fx.get(l), y.pieces, l)
    else if (fy.has(l)) writtenAgainst(ctx, fy.get(l), x.pieces, l)
    else {
      sameHolders(ctx, x.pieces, y.pieces, l)
      sameHolders(ctx, y.pieces, x.pieces, l)
    }
  }
}

// A written field against tails: some tail must hold l at every pattern,
// with exactly that constant.
function writtenAgainst(ctx, t, pieces, l) {
  for (const p of pieces) {
    if (holds(p, l) && t.k === 'b' && t.b === constA(p.r, l)) {
      if (must(ctx.region, p.r, l)) return
      fail(`row ${p.r} need not hold ${l}`, [p.r, l])
    }
  }
  fail(`written ${l} has no matching tail`)
}

// Every tail of xs that may hold l is matched by the same row in ys.
function sameHolders(ctx, xs, ys, l) {
  for (const p of xs) {
    if (!holds(p, l)) continue
    const q = ys.find((q) => q.r === p.r)
    if (q && holds(q, l)) continue
    if (possible(ctx.region, p.r, l)) {
      fail(`row ${p.r} may hold ${l} on one side only`, [p.r, l])
    }
  }
}

function lacking(ctx, row, l) {
  if (row.fields.some(([k]) => k === l)) fail(`row holds ${l}`)
  for (const p of row.pieces) {
    if (holds(p, l) && possible(ctx.region, p.r, l)) {
      fail(`row ${p.r} may hold ${l}`, [p.r, l])
    }
  }
}

function apart(ctx, x, y) {
  const fy = new Set(y.fields.map(([l]) => l))
  for (const [l] of x.fields) if (fy.has(l)) fail(`both hold ${l}`)
  for (const [l] of x.fields) lacking(ctx, { fields: [], pieces: y.pieces }, l)
  for (const [l] of y.fields) lacking(ctx, { fields: [], pieces: x.pieces }, l)
  for (const p of x.pieces) {
    for (const q of y.pieces) {
      if (p.r === q.r) fail(`rest ${p.r} on both sides`)
      if (!declared(ctx.region.index, p.r, q.r)) {
        fail(`rests ${p.r}, ${q.r} not declared disjoint`)
      }
    }
  }
}

function checkAtom(ctx, a) {
  switch (a[0]) {
    case 'eq': return equal(ctx, evalT(ctx, a[1]), evalT(ctx, a[2]))
    case 'lacks': return lacking(ctx, rowOf(ctx, a[1]), a[2])
    case 'disjoint': return apart(ctx, rowOf(ctx, a[1]), rowOf(ctx, a[2]))
    case 'ff': return fail('ff')
  }
  throw new Error(`unknown atom ${a[0]}`)
}

// { ok: true } or { ok: false, reason, atom, bit }. An empty region holds
// no pattern and passes.
export function checkAtoms(P, labels, region, cert, atoms) {
  if (!nonEmpty(region)) return { ok: true, vacuous: true }
  const ctx = { P, labels, region, cert }
  for (let i = 0; i < atoms.length; i++) {
    try {
      checkAtom(ctx, atoms[i])
    } catch (e) {
      if (!(e instanceof Fail)) throw e
      return { ok: false, reason: e.message, atom: i, bit: e.bit }
    }
  }
  return { ok: true }
}

// The ordinary generic value a schematic value denotes at pattern
// `present`, as sig-oracle's ground strings and row objects; null when
// two parts share a label.
export function instValue(value, labels, present) {
  if (value.k === 'b') return value.b
  if (value.k === 'f') {
    const a = instValue(value.a, labels, present)
    const c = instValue(value.c, labels, present)
    return a === null || c === null ? null : `(${a}->${c})`
  }
  const row = instRow(value, labels, present)
  return row === null ? null : recordString(row)
}

export function instRow(value, labels, present) {
  const row = {}
  const put = (l, g) => {
    if (g === null || l in row) return false
    row[l] = g
    return true
  }
  for (const [l, ft] of value.fields) {
    if (!put(l, instValue(ft, labels, present))) return null
  }
  for (const p of value.pieces) {
    for (const l of labels) {
      if (holds(p, l) && present(p.r, l) && !put(l, constA(p.r, l))) {
        return null
      }
    }
    if (!put(`ρ${p.r}`, `R${p.r}`)) return null
  }
  return row
}

function recordString(row) {
  const keys = Object.keys(row).sort()
  return '{' + keys.map((k) => `${k}:${row[k]}`).join(',') + '}'
}
