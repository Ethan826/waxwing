// Does the body B have a flexible solution at θ*_π? θ*_π is a ground
// rigid assignment (constants are opaque atoms, cells are labels), so
// this is a call-site question. B is first rewritten (normalize.mjs).
//
// Exact, for flat problems: every equation is flat (records whose fields
// are base types), a self-equation `t = t` (only t's definedness
// matters) or ground (no flexible variable; evaluated once), and no
// flexible type variable is left; or some equation is a clash (two
// sides of different constructors, neither a type variable, which no
// assignment makes equal). Every other atom is a conjunction
// over labels, and at a label outside θ*'s rows and B's fields
// everything is absent, so B is solvable iff each label of θ* and of B
// has its own choice of flexible fields. A choice gives each flexible
// row, at that label, absent or a candidate: a value some rigid row or
// written field has there, or Int (an unconstrained field). Otherwise:
// the bounded search of bounded.mjs over the labels of θ* and B, with
// the same candidates per label; a failure there is not exact.
import { evalT, holds, scan, rowsOver }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { DEFAULT_BOUNDS, findSolution, makeTheta }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { normalize } from './normalize.mjs'

const BIG = 2e6

// Mentions a flexible type variable or a flexible row, at any depth.
function mentionsFlex(P, t) {
  if (t.k === 'v') return P.flexTys.includes(t.n)
  if (t.k === 'f') return mentionsFlex(P, t.a) || mentionsFlex(P, t.c)
  if (t.k === 'r') {
    return t.tails.some((r) => P.flexRows.includes(r)) ||
      t.fields.some(([, ft]) => mentionsFlex(P, ft))
  }
  return false
}

export function kindOf(P, a) {
  if (a[0] !== 'eq') return 'atom'
  if (!mentionsFlex(P, a[1]) && !mentionsFlex(P, a[2])) return 'ground'
  if (JSON.stringify(a[1]) === JSON.stringify(a[2])) return 'self'
  const shape = (t) => (t.k === 'v' ? null : t.k)
  const [x, y] = [shape(a[1]), shape(a[2])]
  if (x !== null && y !== null && x !== y) return 'clash'
  const flatRec = (t) => t.k === 'r' &&
    t.fields.every(([, ft]) => ft.k === 'b')
  return flatRec(a[1]) && flatRec(a[2]) ? 'flat' : 'other'
}

export function isFlat(P) {
  const kinds = P.B.map((a) => kindOf(P, a))
  return kinds.includes('clash') ||
    (P.flexTys.length === 0 && !kinds.includes('other'))
}

function candidates(P, rigid, labels) {
  const theta = makeTheta(rigid, new Map())
  const at = new Map(labels.map((l) => [l, new Set(['Int'])]))
  for (const r of P.rigidRows) {
    for (const [l, g] of Object.entries(rigid.get(`r${r}`))) at.get(l).add(g)
  }
  const visit = (t) => {
    if (t.k === 'f') { visit(t.a); visit(t.c) }
    if (t.k !== 'r') return
    for (const [l, ft] of t.fields) {
      const g = mentionsFlex(P, ft) ? null : evalT(theta, ft)
      if (g !== null) at.get(l).add(g)
      visit(ft)
    }
  }
  for (const a of P.B) if (a[0] === 'eq') { visit(a[1]); visit(a[2]) }
  return at
}

export function labelsAt(P, rigid) {
  const out = new Set(scan(P.B).labels)
  for (const r of P.rigidRows) {
    for (const l of Object.keys(rigid.get(`r${r}`))) out.add(l)
  }
  return [...out]
}

// The value at label k of a record expression, given each row's field
// at k: undefined if absent, 'UNDEF' if two parts hold k. Only base
// fields are evaluated (flat equations have no others; a self-equation
// needs only the count).
function project(theta, t, k, at) {
  let out
  let count = 0
  for (const [l, ft] of t.fields) {
    if (l === k) {
      out = ft.k === 'b' ? evalT(theta, ft) : 'FIELD'
      count += 1
    }
  }
  for (const r of t.tails) {
    if (at(r) !== undefined) { out = at(r); count += 1 }
  }
  return count > 1 ? 'UNDEF' : out
}

// Every composition inside t is defined at label k.
function definedAt(theta, t, k, at) {
  if (t.k === 'f') {
    return definedAt(theta, t.a, k, at) && definedAt(theta, t.c, k, at)
  }
  if (t.k !== 'r') return true
  if (project(theta, t, k, at) === 'UNDEF') return false
  return t.fields.every(([, ft]) => definedAt(theta, ft, k, at))
}

function holdsAt(theta, a, k, at, kind) {
  if (kind === 'ground') return true
  if (kind === 'self') return definedAt(theta, a[1], k, at)
  if (a[0] === 'eq') {
    const x = project(theta, a[1], k, at)
    const y = project(theta, a[2], k, at)
    return x !== 'UNDEF' && y !== 'UNDEF' && x === y
  }
  if (a[0] === 'lacks') return a[2] !== k || at(a[1]) === undefined
  if (a[0] === 'disjoint') {
    return at(a[1]) === undefined || at(a[2]) === undefined
  }
  return false
}

function* choices(flex, opts) {
  if (flex.length === 0) { yield new Map(); return }
  const [r, ...rest] = flex
  for (const tail of choices(rest, opts)) {
    yield new Map(tail).set(r, undefined)
    for (const g of opts) yield new Map(tail).set(r, g)
  }
}

function solveFlat(P, rigid) {
  const theta = makeTheta(rigid, new Map())
  const kinds = P.B.map((a) => kindOf(P, a))
  for (let i = 0; i < P.B.length; i++) {
    if (kinds[i] === 'clash') return { solved: false, exact: true, atom: i }
    if (kinds[i] === 'ground' && !holds(theta, P.B[i])) {
      return { solved: false, exact: true, atom: i }
    }
  }
  const labels = labelsAt(P, rigid)
  const cand = candidates(P, rigid, labels)
  for (const k of labels) {
    const fixed = (r) => rigid.get(`r${r}`)[k]
    let found = false
    for (const pick of choices(P.flexRows, [...cand.get(k)])) {
      const at = (r) => (pick.has(r) ? pick.get(r) : fixed(r))
      if (P.B.every((a, i) => holdsAt(theta, a, k, at, kinds[i]))) {
        found = true
        break
      }
    }
    if (!found) return { solved: false, exact: true, label: k }
  }
  return { solved: true, exact: true }
}

function solveBounded(P, rigid, extraTys) {
  const labels = labelsAt(P, rigid)
  const cand = candidates(P, rigid, labels)
  const typesAt = (l) => [...new Set([...cand.get(l), '{}'])]
  const size = labels.reduce((n, l) => n * (typesAt(l).length + 1), 1)
  if (size ** Math.max(1, P.flexRows.length) > BIG) {
    return { solved: false, exact: false, skipped: true }
  }
  const flexRows = rowsOver(labels, typesAt)
  const tyValues = [...new Set([...DEFAULT_BOUNDS.tyValues, ...extraTys])]
  const flex = findSolution(P, rigid, flexRows, tyValues)
  return { solved: flex !== null, exact: false }
}

// `theta`: θ*_π symbolically (for rigid type variables); `rigid`: the
// same rendered; `extraTys`: further candidates for flexible type
// variables (the rendered values of θ*'s type variables).
export function solveAt(P0, theta, rigid, extraTys = []) {
  const P = normalize(P0, theta)
  return isFlat(P) ? solveFlat(P, rigid) : solveBounded(P, rigid, extraTys)
}
