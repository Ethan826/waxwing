// Two more slicings (statements.md §2.4, §4): the cut stream 7b measured
// (integration/measurements.md §2.3), and the refinement S1r in which
// only flexible variables link B atoms and every slice keeps all of D.
import { scan, T } from '../../composition-assessment/sig-oracle/semantics.mjs'
import { components, subproblem, nodesAll } from './slice.mjs'

const FRESH = 100

// measurements.md §2.3: an equation is cut into groups. Two records form
// one group of their tails and one-sided fields; a field both hold is cut
// one level down (here it keeps a fresh flexible type variable on both
// sides, so the group stays an equation); arrows part by part; equal base
// types give nothing; any other pair is one coarse group. A group's nodes
// are the problem's own variables, never the fresh ones.
export function cut(t, u, out, fresh) {
  if (t.k === 'r' && u.k === 'r') {
    const nodes = []
    const shared = new Map(t.fields.filter(([l]) =>
      u.fields.some(([k]) => k === l)).map(([l]) => [l, fresh.at()]))
    const side = (mine) => mine.fields.map(([l, ft]) => {
      if (shared.has(l)) return [l, T.v(shared.get(l))]
      nodes.push(...nodesAll(['eq', ft, ft]))
      return [l, ft]
    })
    const left = side(t)
    const right = side(u)
    for (const [l, ft] of t.fields) {
      const other = u.fields.find(([k]) => k === l)
      if (other) cut(ft, other[1], out, fresh)
    }
    nodes.push(...[...t.tails, ...u.tails].map((r) => `r${r}`))
    out.push({ atom: ['eq', T.rec(left, t.tails), T.rec(right, u.tails)],
      nodes: [...new Set(nodes)] })
  } else if (t.k === 'f' && u.k === 'f') {
    cut(t.a, u.a, out, fresh)
    cut(t.c, u.c, out, fresh)
  } else if (!(t.k === 'b' && u.k === 'b' && t.b === u.b)) {
    out.push({ atom: ['eq', t, u], nodes: nodesAll(['eq', t, u]) })
  }
}

function freshCounter() {
  let next = FRESH
  return { at: () => next++ }
}

// The measured slicing: groups as above, components by shared nodes,
// variable-free groups dropped (measurements.md: "belong to no slice").
export function measured(P) {
  const fresh = freshCounter()
  const tagged = []
  for (const [side, atoms] of [['D', P.D], ['B', P.B]]) {
    for (const atom of atoms) {
      const out = []
      if (atom[0] === 'eq') cut(atom[1], atom[2], out, fresh)
      else out.push({ atom, nodes: nodesAll(atom) })
      for (const g of out) tagged.push({ side, ...g })
    }
  }
  const { groups } = components(tagged)
  return { slices: groups.map((g) => subproblem(P,
    g.filter((t) => t.side === 'D').map((t) => t.atom),
    g.filter((t) => t.side === 'B').map((t) => t.atom))), ground: null }
}

// S1r: B atoms linked by flexible variables only; every slice keeps all
// of D; B atoms with no flexible variable are slices of their own.
export function flexLinked(P) {
  const flex = (atom) => {
    const used = scan([atom])
    return [...[...used.rows].filter((r) => !P.rigidRows.includes(r))
      .map((r) => `r${r}`),
    ...[...used.tys].filter((n) => !P.rigidTys.includes(n))
      .map((n) => `t${n}`)]
  }
  const tagged = P.B.map((atom) => ({ side: 'B', atom, nodes: flex(atom) }))
  const { groups, free } = components(tagged)
  return { slices: [...groups, ...free.map((t) => [t])].map((g) =>
    subproblem(P, P.D, g.map((t) => t.atom))), ground: null }
}
