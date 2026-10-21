// The fixed problem set for the star measurements (protocol.md). Fixed
// before any strategy ran. Problems use sig-oracle's format: rows and
// type variables are numbers, `rigidRows`, `rigidTys`, `flexRows`,
// `flexTys`, `D`, `B` (sig-oracle/semantics.mjs).
//
// Each family maps a size to a problem and carries predictions: bounded
// validity, and the verdicts of the uniform strategy (A) and the
// refined strategy (B). A mismatch with a prediction is a finding to
// check, not a test failure.
import { T } from '../../composition-assessment/sig-oracle/semantics.mjs'

const { base, v, rec, tails } = T
const int = base('Int')
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]
const range = (n) => Array.from({ length: n }, (_, i) => i + 1)

// `star` n, translated by hand under dossier §17.1 from
// integration/apps/scale.mjs `starOf`:
//
//   fn star(hub: { ...h }, p1: { f1: Int, ...r1 }, ...): Int
//     where h disjoint r1, ..., h lacks { f1, ..., fn } = {
//     let j1 = join(p1, hub); ...; 0 };
//
// Rigid rows: h = 0, r_i = i. Each call join(p_i, hub) gets fresh
// flexible rows a_i = n + i and b_i = 2n + i (join's r and s), its
// clause `a_i disjoint b_i`, and the let's type variable v_i = i.
// D: the written clauses, plus `r_i lacks f_i` (tail beside a field).
// `read`: also `let k_i = j_i.f_i`, a field access: fresh flexible
// row c_i = 3n + i and type variable w_i = n + i. `cross` reads f2
// from j_1 only (invalid: r_1 may lack f2).
export function star(n, opts = {}) {
  const D = []
  for (const i of range(n)) {
    if (!(opts.undeclared && i === n)) D.push(dis(0, i))
    if (!(opts.unlacked && i === n)) D.push(lacks(0, `f${i}`))
    D.push(lacks(i, `f${i}`))
  }
  const B = []
  const flexRows = []
  const flexTys = []
  for (const i of range(n)) {
    const a = n + i
    const b = 2 * n + i
    flexRows.push(a, b)
    flexTys.push(i)
    B.push(eq(rec([[`f${i}`, int]], [i]), tails(a)))
    B.push(eq(tails(0), tails(b)))
    B.push(dis(a, b))
    B.push(eq(v(i), tails(a, b)))
    if (opts.read || (opts.cross && i === 1)) {
      const c = 3 * n + i
      const w = n + i
      const label = opts.cross ? 'f2' : `f${i}`
      flexRows.push(c)
      flexTys.push(w)
      B.push(eq(v(i), rec([[label, v(w)]], [c])))
      B.push(eq(v(w), int))
    }
  }
  return { rigidRows: [0, ...range(n)], rigidTys: [], flexRows, flexTys,
    D, B }
}

// `dep` k: k rigid rows, each divided by label between two flexible
// rows, `{ ...r_i } = { ...u_i, ...t_i }`, `u_i lacks a`, `t_i lacks b`.
// Valid: u_i takes r_i's b, t_i the rest. No single substitution with
// whole rigid tails works for every pattern (u_i := {} needs r_i
// lacking b; u_i := r_i needs r_i lacking a), so the witness depends on
// the pattern. Components are independent: rows r_i = i - 1, flexible
// u_i = k + 2i - 1, t_i = k + 2i.
export function dep(k) {
  const B = []
  const flexRows = []
  for (const i of range(k)) {
    const r = i - 1
    const u = k + 2 * i - 1
    const t = k + 2 * i
    flexRows.push(u, t)
    B.push(eq(tails(r), tails(u, t)), lacks(u, 'a'), lacks(t, 'b'))
  }
  return { rigidRows: range(k).map((i) => i - 1), rigidTys: [], flexRows,
    flexTys: [], D: [], B }
}

// `divide` m: one rigid row divided by m labels: `{ ...r } =
// { ...u, ...t }`, `t lacks a_j` for j = 1..m. Valid: u takes r's a_j
// fields. One component whose witness depends on m bits.
export function divide(m) {
  const B = [eq(tails(0), tails(1, 2))]
  for (const j of range(m)) B.push(lacks(2, `a${j}`))
  return { rigidRows: [0], rigidTys: [], flexRows: [1, 2], flexTys: [],
    D: [], B }
}

// AMENDMENT 1 (protocol.md): `divide` is uniformly valid (u := r,
// t := {}), against its prediction. `divide2` m constrains both parts:
// `u lacks c` as well, so u must take exactly r's a_j fields and t the
// rest. Added after a pilot at sizes 2 and 3; `divide` is kept.
export function divide2(m) {
  const P = divide(m)
  return { ...P, B: [...P.B, lacks(1, 'c')] }
}

// `route` (dossier §17.3; sig-oracle/source-boundary.mjs): valid, and
// P9s's semantic rule refuses it (routeSig_not_accepts). Every strategy
// here accepts only what that rule accepts, so it must stay Unresolved.
export const route = {
  rigidRows: [0, 1, 2], rigidTys: [], flexRows: [3, 4, 5, 6], flexTys: [],
  D: [dis(1, 2)],
  B: [eq(tails(0), tails(3, 4)), eq(tails(1), tails(5)),
    eq(tails(2), tails(6)), dis(3, 5), dis(4, 6), dis(3, 4)],
}

// Predictions: [bounded validity, strategy A, strategy B]. Sizes are in
// protocol.md.
export const FAMILIES = [
  { name: 'star', make: (n) => star(n),
    expect: ['valid', 'valid', 'valid'] },
  { name: 'star-read', make: (n) => star(n, { read: true }),
    expect: ['valid', 'valid', 'valid'] },
  { name: 'star-undeclared', make: (n) => star(n, { undeclared: true }),
    expect: ['invalid', 'unresolved', 'unresolved'] },
  { name: 'star-unlacked', make: (n) => star(n, { unlacked: true }),
    expect: ['invalid', 'unresolved', 'unresolved'] },
  { name: 'star-cross', make: (n) => star(n, { cross: true }), min: 2,
    expect: ['invalid', 'unresolved', 'unresolved'] },
  { name: 'dep', make: dep, expect: ['valid', 'unresolved', 'valid'] },
  { name: 'divide', make: divide,
    expect: ['valid', 'unresolved', 'valid'] },
  { name: 'divide2', make: divide2, amendment: 1,
    expect: ['valid', 'unresolved', 'valid'] },
  { name: 'route', make: () => route, fixed: true,
    expect: ['valid', 'unresolved', 'unresolved'] },
]
