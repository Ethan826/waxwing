// Slicings of a signature problem (statements.md §2), the proposed one
// and five naive variants kept to be refuted. Problems use sig-oracle's
// format: { rigidRows, rigidTys, flexRows, flexTys, D, B }. A slicing
// returns { slices, ground }: each slice a sub-problem (a list of D atoms,
// a list of B atoms, and the variables they mention, rigid or flexible as
// in the whole problem), and the ground slice of atoms that mention no
// variable (null when the variant drops them).
import { scan, T } from '../../composition-assessment/sig-oracle/semantics.mjs'

// Every variable an atom mentions, at any depth: `r<n>` rows, `t<n>`
// types.
export function nodesAll(atom) {
  const used = scan([atom])
  return [...[...used.rows].map((r) => `r${r}`),
    ...[...used.tys].map((n) => `t${n}`)]
}

// Row variables only, at any depth (naive: type variables do not link).
export function nodesRows(atom) {
  return [...scan([atom]).rows].map((r) => `r${r}`)
}

// Row variables written as top-level tails or as `lacks`/`disjoint`
// arguments (naive: rows nested in field types do not link).
export function nodesTop(atom) {
  if (atom[0] === 'lacks') return [`r${atom[1]}`]
  if (atom[0] === 'disjoint') return [`r${atom[1]}`, `r${atom[2]}`]
  if (atom[0] !== 'eq') return []
  const top = (t) => (t.k === 'r' ? t.tails.map((r) => `r${r}`) : [])
  return [...top(atom[1]), ...top(atom[2])]
}

// The sub-problem holding `D` and `B`; its variables keep their sort.
export function subproblem(P, D, B) {
  const used = scan([...D, ...B])
  const rows = [...used.rows]
  const tys = [...used.tys]
  return {
    rigidRows: rows.filter((r) => P.rigidRows.includes(r)),
    flexRows: rows.filter((r) => !P.rigidRows.includes(r)),
    rigidTys: tys.filter((n) => P.rigidTys.includes(n)),
    flexTys: tys.filter((n) => !P.rigidTys.includes(n)),
    D, B,
  }
}

class Parts {
  constructor() { this.up = new Map() }
  find(x) {
    if (!this.up.has(x)) this.up.set(x, x)
    const y = this.up.get(x)
    if (y === x) return x
    const top = this.find(y)
    this.up.set(x, top)
    return top
  }
  join(xs) {
    for (const x of xs.slice(1)) this.up.set(this.find(x), this.find(xs[0]))
  }
}

// Components of tagged atoms ({ side: 'D' | 'B', atom, nodes }) linked by
// shared nodes. Atoms without nodes are returned apart.
export function components(tagged) {
  const parts = new Parts()
  for (const t of tagged) if (t.nodes.length) parts.join(t.nodes)
  const groups = new Map()
  const free = []
  for (const t of tagged) {
    if (!t.nodes.length) { free.push(t); continue }
    const key = parts.find(t.nodes[0])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }
  return { groups: [...groups.values()], free }
}

function build(P, group) {
  const side = (s) => group.filter((t) => t.side === s).map((t) => t.atom)
  return subproblem(P, side('D'), side('B'))
}

function tag(P, nodesOf) {
  return [...P.D.map((atom) => ({ side: 'D', atom })),
    ...P.B.map((atom) => ({ side: 'B', atom }))]
    .map((t) => ({ ...t, nodes: nodesOf(t.atom) }))
}

// The proposed slicing: every variable links, at any depth, in D and B;
// variable-free atoms form the ground slice.
export function proposed(P) {
  const { groups, free } = components(tag(P, nodesAll))
  return { slices: groups.map((g) => build(P, g)), ground: build(P, free) }
}

// Naive: link by row variables only (or top-level rows only); each atom
// without a linking node is a slice of its own.
export function naiveBy(nodesOf) {
  return (P) => {
    const { groups, free } = components(tag(P, nodesOf))
    return { slices: [...groups, ...free.map((t) => [t])]
      .map((g) => build(P, g)), ground: null }
  }
}

// Naive: the proposed slicing with variable-free atoms dropped.
export function dropGround(P) {
  return { slices: proposed(P).slices, ground: null }
}

// Naive: components of B alone; a D atom goes to the slice holding all its
// variables, and is dropped otherwise (ground D atoms included).
export function ignoreD(P) {
  const { groups, free } = components(
    tag({ ...P, D: [] }, nodesAll))
  const all = [...groups, ...free.map((t) => [t])]
  const vars = all.map((g) => new Set(g.flatMap((t) => t.nodes)))
  for (const atom of P.D) {
    const nodes = nodesAll(atom)
    const at = vars.findIndex((vs) => nodes.length &&
      nodes.every((x) => vs.has(x)))
    if (at >= 0) all[at].push({ side: 'D', atom, nodes })
  }
  return { slices: all.map((g) => build(P, g)), ground: null }
}

// Pairs (rigid row, label) a slicing makes relevant: the rows of a slice
// with the labels written in it.
export function sliceRelevant(P) {
  const keep = new Set()
  for (const Q of proposed(P).slices) {
    const labels = scan([...Q.D, ...Q.B]).labels
    for (const r of Q.rigidRows) for (const l of labels) keep.add(`${r}|${l}`)
  }
  return (r, l) => keep.has(`${r}|${l}`)
}

// The finer, refuted notion: some single atom mentions r and writes l.
export function atomRelevant(P) {
  const keep = new Set()
  for (const a of [...P.D, ...P.B]) {
    const used = scan([a])
    for (const r of used.rows) {
      for (const l of used.labels) keep.add(`${r}|${l}`)
    }
  }
  return (r, l) => keep.has(`${r}|${l}`)
}

export { T }
