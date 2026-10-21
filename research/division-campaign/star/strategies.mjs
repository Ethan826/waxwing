// Research code (protocol.md): the exhaustive baseline E and the
// strategies A and B, each reporting search, certificate size, checking
// and coverage separately. Verdicts are 'valid' or 'unresolved' (with a
// cause); nothing here answers Contradiction.
import { rowsOver } from '../../composition-assessment/sig-oracle/semantics.mjs'
import { findSolution }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { makeIndex, makeRegion, newStats, extend, isFixed }
  from './region.mjs'
import { checkAtoms, empty, instRow, instValue } from './schematic.mjs'
import { unifyProblem, expander } from './unify.mjs'
import { writtenLabels, consistentPatterns, consistentCount, patternKey,
  presentOf, checkPattern, sideCondition, genericRigid } from './generic.mjs'

export const LIMITS = { patternsLog2: 22, leaves: 2 ** 16,
  candidates: 2 ** 20 }

const now = () => process.hrtime.bigint()
const ms = (ns) => Number(ns) / 1e6

const certJson = (cert) => JSON.stringify([...cert])

// ---- E: one certificate per consistent pattern -------------------------

// Search at one pattern: unification on the whole problem; failing
// that, per component, unification and then the bounded generic search
// (P9s's search, restricted to the component) at that exact pattern.
function searchAt(P, labels, comps, index, side, present) {
  const expand = expander(labels, present)
  const whole = unifyProblem(P, P.B, expand)
  if (whole.ok && checkPattern(P, labels, present, whole.cert, side)) {
    return whole.cert
  }
  const cube = new Map()
  for (const r of P.rigidRows) {
    for (const l of labels) cube.set(`${r}|${l}`, present(r, l))
  }
  const region = makeRegion(index, cube)
  const cert = new Map()
  for (const comp of comps) {
    const sub = subProblem(P, comp)
    const u = unifyProblem(sub, sub.B, expand)
    let found = u.ok && checkPattern(sub, labels, present, u.cert, side)
      ? u.cert : null
    if (!found) {
      const g = genericSearch(P, sub, labels, region, LIMITS.candidates)
      found = g.ok ? g.cert : null
    }
    if (!found) return null
    for (const [k, v] of found) cert.set(k, v)
  }
  return cert
}

export function runE(P) {
  const labels = writtenLabels(P)
  const log2 = consistentCount(P, labels)
  const out = { strategy: 'E', consistentLog2: log2,
    rawLog2: P.rigidRows.length * labels.length }
  if (log2 === null || log2 > LIMITS.patternsLog2) {
    return { ...out, verdict: 'unresolved', cause: 'budget: patterns' }
  }
  const side = sideCondition(P)
  const index = makeIndex(P, labels)
  const comps = components(P)
  const table = new Map()
  let searchNs = 0n
  let checkNs = 0n
  let bytes = 0
  let failed = null
  for (const pairs of consistentPatterns(P, labels)) {
    const present = presentOf(pairs)
    let t = now()
    const cert = searchAt(P, labels, comps, index, side, present)
    searchNs += now() - t
    if (!cert) {
      failed = failed ?? { cause: 'no certificate' }
      continue
    }
    t = now()
    const ok = checkPattern(P, labels, present, cert, side)
    checkNs += now() - t
    if (!ok) {
      failed = failed ?? { cause: 'failed check' }
      continue
    }
    const key = patternKey(pairs)
    const json = certJson(cert)
    bytes += key.length + json.length
    table.set(key, json)
  }
  let t = now()
  let covered = 0
  let missing = 0
  for (const pairs of consistentPatterns(P, labels)) {
    if (table.has(patternKey(pairs))) covered += 1
    else missing += 1
  }
  const coverNs = now() - t
  const verdict = failed || missing ? 'unresolved' : 'valid'
  return { ...out, verdict, cause: failed?.cause, entries: table.size,
    bytes, searchMs: ms(searchNs), checkMs: ms(checkNs),
    coverMs: ms(coverNs), coverLookups: covered + missing }
}

// ---- A: one schematic certificate --------------------------------------

export function runA(P) {
  const labels = writtenLabels(P)
  const out = { strategy: 'A', consistentLog2: consistentCount(P, labels) }
  let t = now()
  const index = makeIndex(P, labels)
  const indexNs = now() - t
  t = now()
  const found = unifyProblem(P, P.B)
  const searchNs = now() - t
  if (!found.ok) {
    return { ...out, verdict: 'unresolved', cause: `search: ${found.reason}`,
      searchMs: ms(searchNs), steps: found.steps }
  }
  const json = certJson(found.cert)
  const stats = newStats()
  t = now()
  const res = checkAtoms(P, labels, makeRegion(index, new Map(), stats),
    found.cert, P.B)
  const checkNs = now() - t
  return { ...out, verdict: res.ok ? 'valid' : 'unresolved',
    cause: res.ok ? undefined : `check: ${res.reason}`, cert: found.cert,
    steps: found.steps, bytes: json.length, searchMs: ms(searchNs),
    checkMs: ms(checkNs - stats.queryNs),
    coverMs: ms(indexNs + stats.queryNs), coverQueries: stats.queries }
}

// ---- B: per-component lazy refinement ----------------------------------

function varsOf(t, out) {
  if (t.k === 'v') out.push(`t${t.n}`)
  if (t.k === 'f') { varsOf(t.a, out); varsOf(t.c, out) }
  if (t.k === 'r') {
    t.fields.forEach(([, ft]) => varsOf(ft, out))
    t.tails.forEach((r) => out.push(`r${r}`))
  }
  return out
}

function flexVarsOfAtom(P, a) {
  const vs = []
  if (a[0] === 'eq') { varsOf(a[1], vs); varsOf(a[2], vs) }
  if (a[0] === 'lacks') vs.push(`r${a[1]}`)
  if (a[0] === 'disjoint') vs.push(`r${a[1]}`, `r${a[2]}`)
  const flex = new Set([...P.flexRows.map((r) => `r${r}`),
    ...P.flexTys.map((n) => `t${n}`)])
  return [...new Set(vs.filter((v) => flex.has(v)))]
}

// Connected components of flexible variables; an atom with none is its
// own component.
export function components(P) {
  const parent = new Map()
  const find = (x) => {
    while (parent.get(x) !== x) x = parent.get(x)
    return x
  }
  const vars = P.B.map((a) => flexVarsOfAtom(P, a))
  for (const vs of vars) {
    for (const v of vs) if (!parent.has(v)) parent.set(v, v)
    for (const v of vs.slice(1)) parent.set(find(v), find(vs[0]))
  }
  const groups = new Map()
  P.B.forEach((a, i) => {
    const key = vars[i].length ? find(vars[i][0]) : `ground${i}`
    if (!groups.has(key)) groups.set(key, { atoms: [], vars: new Set() })
    groups.get(key).atoms.push(a)
    vars[i].forEach((v) => groups.get(key).vars.add(v))
  })
  return [...groups.values()]
}

function subProblem(P, comp) {
  const rows = [...comp.vars].filter((v) => v[0] === 'r')
    .map((v) => Number(v.slice(1)))
  const tys = [...comp.vars].filter((v) => v[0] === 't')
    .map((v) => Number(v.slice(1)))
  return { ...P, flexRows: rows, flexTys: tys, B: comp.atoms }
}

function parseGround(s) {
  if (s === '{}') return empty()
  if (/[{(]/.test(s)) return null
  return { k: 'b', b: s }
}

// Lift a generic solution at the representative pattern: a rest ρ<r>
// becomes a piece of r, excluding r's present labels the row omits.
function liftRow(row, labels, present) {
  const out = { k: 'r', fields: [], pieces: [] }
  const rests = Object.keys(row).filter((l) => l.startsWith('ρ'))
    .map((l) => Number(l.slice(1)))
  for (const r of rests) {
    out.pieces.push({ r, ex: labels.filter((l) => present(r, l) &&
      row[l] !== `A${r}${l}`) })
  }
  for (const [l, g] of Object.entries(row)) {
    if (l.startsWith('ρ')) continue
    const absorbed = rests.some((r) => g === `A${r}${l}` && present(r, l))
    if (absorbed) continue
    const value = parseGround(g)
    if (value === null) return null
    out.fields.push([l, value])
  }
  return out
}

const FIELD_TYPES = ['Int', 'Bool', '{}', '(Int->Int)']

// Bounded generic search at the region's representative pattern (forced
// holders only), then lifted. Untrusted, like everything in search.
function genericSearch(P, sub, labels, region, budget) {
  const present = (r, l) => region.cube.get(`${r}|${l}`) === true
  const compLabels = new Set(writtenLabels({ D: [], B: sub.B }))
  for (const [key, v] of region.cube) {
    if (v) compLabels.add(key.slice(key.indexOf('|') + 1))
  }
  // Rigid rows the component mentions, and those the cube forces.
  const mentioned = new Set()
  const mark = (t) => {
    if (t.k === 'f') { mark(t.a); mark(t.c) }
    if (t.k === 'r') {
      t.fields.forEach(([, ft]) => mark(ft))
      t.tails.forEach((r) => mentioned.add(r))
    }
  }
  for (const a of sub.B) {
    if (a[0] === 'eq') { mark(a[1]); mark(a[2]) }
    if (a[0] === 'lacks') mentioned.add(a[1])
    if (a[0] === 'disjoint') { mentioned.add(a[1]); mentioned.add(a[2]) }
  }
  const rigidHere = P.rigidRows.filter((r) => mentioned.has(r))
  const consts = [...rigidHere.flatMap((r) => [...compLabels]
    .map((l) => `A${r}${l}`)), ...rigidHere.map((r) => `R${r}`),
  ...P.rigidTys.map((n) => `T${n}`)]
  const side = sideCondition(P)
  const restLabels = rigidHere.map((r) => `ρ${r}`)
  const typesAt = (l) => (l.startsWith('ρ') ? [`R${l.slice(1)}`]
    : [...FIELD_TYPES, ...consts])
  const perRow = (FIELD_TYPES.length + consts.length + 1) **
    compLabels.size * 2 ** restLabels.length
  const tyValues = [...FIELD_TYPES, ...consts]
  const candidates = perRow ** sub.flexRows.length *
    tyValues.length ** sub.flexTys.length
  if (candidates > budget) return { ok: false, reason: 'budget: search' }
  const flexRows = rowsOver([...compLabels, ...restLabels], typesAt)
    .filter((row) => side.check(row))
  const rigid = genericRigid(P, labels, present)
  const flex = findSolution(sub, rigid, flexRows, tyValues, side)
  if (flex === null) return { ok: false, reason: 'no generic solution' }
  const cert = new Map()
  for (const [key, g] of flex) {
    const value = key[0] === 'r' ? liftRow(g, labels, present)
      : parseGround(g)
    if (value === null) return { ok: false, reason: 'lift' }
    cert.set(key, value)
  }
  return { ok: true, cert }
}

// AMENDMENT 2 (protocol.md): unification at the representative pattern,
// rigid rows expanded to their generic fields, then lifted as above.
function expandedSearch(sub, labels, region) {
  const present = (r, l) => region.cube.get(`${r}|${l}`) === true
  const found = unifyProblem(sub, sub.B, expander(labels, present))
  if (!found.ok) return null
  const cert = new Map()
  for (const [key, value] of found.cert) {
    const g = key[0] === 'r' ? instRow(value, labels, present)
      : instValue(value, labels, present)
    if (g === null) return null
    const lifted = key[0] === 'r' ? liftRow(g, labels, present)
      : parseGround(g)
    if (lifted === null) return null
    cert.set(key, lifted)
  }
  return cert
}

class Budget extends Error {}

function refine(P, sub, labels, region, uniform, acc) {
  acc.nodes += 1
  let failure = null
  const attempt = (cert) => {
    const c0 = now()
    const res = checkAtoms(P, labels, region, cert, sub.B)
    acc.checkNs += now() - c0
    if (res.ok) return true
    const free = Boolean(res.bit) && !isFixed(region, ...res.bit)
    if (!failure || (free && !failure.free)) failure = { ...res, free }
    return false
  }
  const leaf = (cert) => {
    acc.leaves += 1
    if (acc.leaves > LIMITS.leaves) throw new Budget('budget: leaves')
    return { cube: [...region.cube], cert }
  }
  if (uniform.ok && attempt(uniform.cert)) return leaf(uniform.cert)
  const e0 = now()
  const ex = expandedSearch(sub, labels, region)
  acc.searchNs += now() - e0
  if (ex && attempt(ex)) return leaf(ex)
  const s0 = now()
  const g = genericSearch(P, sub, labels, region, LIMITS.candidates)
  acc.searchNs += now() - s0
  if (g.ok && attempt(g.cert)) return leaf(g.cert)
  if (!failure?.free) {
    throw new Budget(`no certificate: ${failure?.reason ?? g.reason}`)
  }
  const bit = failure.bit
  return { bit, cube: [...region.cube],
    no: refine(P, sub, labels, extend(region, ...bit, false), uniform, acc),
    yes: refine(P, sub, labels, extend(region, ...bit, true), uniform, acc) }
}

export function runB(P) {
  const labels = writtenLabels(P)
  const out = { strategy: 'B', consistentLog2: consistentCount(P, labels) }
  let t = now()
  const index = makeIndex(P, labels)
  const comps = components(P)
  const prepNs = now() - t
  const stats = newStats()
  const acc = { nodes: 0, leaves: 0, searchNs: 0n, checkNs: 0n }
  const trees = []
  try {
    for (const comp of comps) {
      const sub = subProblem(P, comp)
      const s0 = now()
      const uniform = unifyProblem(sub, sub.B)
      acc.searchNs += now() - s0
      const root = makeRegion(index, new Map(), stats)
      trees.push({ comp, sub, tree: refine(P, sub, labels, root, uniform,
        acc) })
    }
  } catch (e) {
    if (!(e instanceof Budget)) throw e
    return { ...out, verdict: 'unresolved', cause: e.message,
      nodes: acc.nodes, leaves: acc.leaves, searchMs: ms(acc.searchNs),
      checkMs: ms(acc.checkNs - stats.queryNs) }
  }
  const bytes = JSON.stringify(trees.map((x) => serial(x.tree))).length
  t = now()
  const cover = verifyCoverage(P, trees)
  const coverNs = now() - t + prepNs
  return { ...out, verdict: cover.ok ? 'valid' : 'unresolved',
    cause: cover.ok ? undefined : `coverage: ${cover.reason}`, trees,
    components: comps.length, nodes: acc.nodes, leaves: acc.leaves, bytes,
    searchMs: ms(acc.searchNs), checkMs: ms(acc.checkNs - stats.queryNs),
    coverMs: ms(coverNs + stats.queryNs), coverQueries: stats.queries,
    coverNodes: cover.visited }
}

function serial(tree) {
  if (!tree.bit) return { cube: tree.cube, cert: [...tree.cert] }
  return { bit: tree.bit, no: serial(tree.no), yes: serial(tree.yes) }
}

// Coverage, checked apart from search (protocol.md): components
// partition B's atoms and own their variables; each tree's root cube is
// empty; each split is on a free bit and its children extend the cube
// by that bit false and true; each leaf has a certificate.
export function verifyCoverage(P, trees) {
  let visited = 0
  const seen = new Map()
  for (const { comp } of trees) {
    for (const a of comp.atoms) seen.set(a, (seen.get(a) ?? 0) + 1)
  }
  if (P.B.some((a) => seen.get(a) !== 1)) {
    return { ok: false, reason: 'atoms not partitioned', visited }
  }
  const walk = (node, cube, vars) => {
    visited += 1
    const key = (c) => JSON.stringify([...c].sort())
    if (key(new Map(node.cube)) !== key(cube)) return 'cube mismatch'
    if (!node.bit) {
      for (const k of node.cert.keys()) {
        if (!vars.has(k)) return `binds ${k} outside its component`
      }
      return null
    }
    const bitKey = `${node.bit[0]}|${node.bit[1]}`
    if (cube.has(bitKey)) return 'split on a fixed bit'
    return walk(node.no, new Map(cube).set(bitKey, false), vars) ??
      walk(node.yes, new Map(cube).set(bitKey, true), vars)
  }
  for (const { comp, tree } of trees) {
    const why = walk(tree, new Map(), comp.vars)
    if (why) return { ok: false, reason: why, visited }
  }
  return { ok: true, visited }
}

// B's certificate at one pattern: the leaf of each tree the pattern
// reaches, merged.
export function certAt(trees, present) {
  const cert = new Map()
  for (const { tree } of trees) {
    let node = tree
    while (node.bit) node = present(...node.bit) ? node.yes : node.no
    for (const [k, v] of node.cert) cert.set(k, v)
  }
  return cert
}
