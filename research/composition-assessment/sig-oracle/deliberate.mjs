// Hand-built certificates for the cases the search never produces
// (dossier §14.8): constants used as types on their own (`R{r}` outside a
// rest, `A{r}{l}` for a label the pattern marks absent), and certificates
// meant to meet rigid type variables that are labeled records and rigid
// rows with nested fields (run with `rich`). Each entry: name, problem,
// the pattern (as p9s.mjs describes it), and a flexible assignment that
// must satisfy the body in the generic model; check-interpretation.mjs
// verifies that first, then maps it into every rigid assignment of the
// pattern.
import { T } from './semantics.mjs'

const { v, rec, tails } = T
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const lacks = (r, l) => ['lacks', r, l]

export const DELIBERATE = [
  ['standalone-R', sig([0], [], [3], [1, 2], [],
    [eq(tails(3), tails(0)), eq(v(2), rec([['g', v(1)]], [3])),
      eq(rec([['f', v(1)]], []), rec([['f', v(1)]], []))]),
  '0:{}', { r3: { ρ0: 'R0' }, t1: 'R0', t2: '{g:R0,ρ0:R0}' }],
  ['absent-A', sig([0], [], [3], [1], [lacks(0, 'a')],
    [eq(tails(3), rec([['a', v(1)]], [])),
      eq(rec([['a', v(1)]], [0]), tails(3, 0))]),
  '0:{}', { r3: { a: 'A0a' }, t1: 'A0a' }],
  ['rigid-record-ty', sig([0], [0], [3], [1], [lacks(0, 'a')],
    [eq(v(1), rec([['a', v(0)]], [0])), eq(tails(3), rec([['a', v(0)]], [])),
      eq(v(1), tails(3, 0))]),
  '0:{}', { r3: { a: 'T0' }, t1: '{a:T0,ρ0:R0}' }],
  ['nested-rigid-field', sig([0], [], [3], [1], [],
    [eq(tails(3), tails(0)), eq(v(1), rec([['h', tails(3)]], []))]),
  '0:{h}', { r3: { h: 'A0h', ρ0: 'R0' }, t1: '{h:{h:A0h,ρ0:R0}}' }],
  ['nested-rigid-field-absent', sig([0], [], [3], [1], [],
    [eq(tails(3), tails(0)), eq(v(1), rec([['h', tails(3)]], []))]),
  '0:{}', { r3: { ρ0: 'R0' }, t1: '{h:{ρ0:R0}}' }],
]
