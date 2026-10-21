// Rewrites the body at θ*_π before solving (solve.mjs). A rigid type
// variable becomes its value at θ*_π, written as an expression (its
// constants as opaque base types). A flexible type variable equated with
// an expression that does not mention it is replaced by that expression
// everywhere; the atom stays as `t = t`, which keeps t's definedness.
// Both rewrites preserve the set of solutions on the remaining
// variables, so the solver's verdicts are about B at θ*_π itself.
import { T } from '../../composition-assessment/sig-oracle/semantics.mjs'

const { base, fn, rec } = T

export function toExpr(g) {
  switch (g.k) {
    case 'b': return base(g.b)
    case 'c': return base('#' + g.c.name)
    case 'f': return fn(toExpr(g.a), toExpr(g.c))
    case 'r': return rec([...g.row].map(([l, x]) => [l, toExpr(x)]), [])
  }
  throw new Error(`unknown term ${g.k}`)
}

function substT(t, sub) {
  if (t.k === 'v') return sub(t.n) ?? t
  if (t.k === 'f') return fn(substT(t.a, sub), substT(t.c, sub))
  if (t.k === 'r') {
    return rec(t.fields.map(([l, ft]) => [l, substT(ft, sub)]), t.tails)
  }
  return t
}

function substAtom(a, sub) {
  return a[0] === 'eq' ? ['eq', substT(a[1], sub), substT(a[2], sub)] : a
}

function mentions(t, n) {
  if (t.k === 'v') return t.n === n
  if (t.k === 'f') return mentions(t.a, n) || mentions(t.c, n)
  if (t.k === 'r') return t.fields.some(([, ft]) => mentions(ft, n))
  return false
}

function eliminable(flexTys, a) {
  if (a[0] !== 'eq') return null
  for (const [x, y] of [[a[1], a[2]], [a[2], a[1]]]) {
    if (x.k === 'v' && flexTys.includes(x.n) && !mentions(y, x.n)) {
      return { n: x.n, t: y }
    }
  }
  return null
}

export function normalize(P, theta) {
  const values = new Map([...theta.tys].map(([n, g]) => [n, toExpr(g)]))
  let B = P.B.map((a) => substAtom(a, (n) => values.get(n)))
  let flexTys = [...P.flexTys]
  for (;;) {
    const i = B.findIndex((a) => eliminable(flexTys, a) !== null)
    if (i < 0) break
    const { n, t } = eliminable(flexTys, B[i])
    B = B.map((a, j) => (j === i ? ['eq', t, t]
      : substAtom(a, (m) => (m === n ? t : undefined))))
    flexTys = flexTys.filter((m) => m !== n)
  }
  return { ...P, rigidTys: [], flexTys, B }
}
