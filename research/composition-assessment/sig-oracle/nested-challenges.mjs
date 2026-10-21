// Second-pass challenges (dossier §18.8): division combined with nested
// field types, record-valued rigid type variables and hypotheses that
// require nested types to agree; controls for template construction;
// broken controls. Rigid rows 0-2, flexible rows 3-5; rigid type
// variable 0, flexible 1. `expect`: bounded verdict, uniform template.
import { T } from './semantics.mjs'

const { base, v, fn, rec, tails } = T
const int = base('Int')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]
const split = [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2)]

export const NESTED = [
  ['division-in-field', sig([0, 1, 2], [], [3, 4], [1], [dis(1, 2)],
    [...split, eq(v(1), rec([['f', tails(3)]], []))]),
  ['valid', 'found'], 'x = { f: r outside s }'],
  ['division-in-function', sig([0, 1, 2], [], [3, 4], [1], [dis(1, 2)],
    [...split, eq(v(1), fn(tails(3), tails(4)))]),
  ['valid', 'found'], 'x = { ...u } -> { ...v }'],
  ['division-record-rigid-var', sig([0, 1, 2], [0], [3, 4], [],
    [dis(1, 2), eq(v(0), tails(0))],
    [eq(v(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
  ['valid', 'found'], 'α = { ...r } declared; divide α by s'],
  ['nested-agreement', sig([0, 1], [], [3, 4, 5], [],
    [eq(rec([['f', tails(0)]], []), rec([['f', tails(1)]], []))],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)), dis(4, 5)]),
  ['valid', 'found'], '{ f: r } = { f: s } declared, so u = r'],
  ['nested-agreement-missing', sig([0, 1], [], [3, 4, 5], [], [],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)), dis(4, 5)]),
  ['invalid', 'none'], 'without the hypothesis, types may differ'],
  ['function-from-rigid', sig([], [0], [], [1], [],
    [eq(v(1), fn(v(0), v(0)))]),
  ['valid', 'found'], 'β = α -> α'],
  ['record-from-rigid', sig([0], [0], [], [1], [lacks(0, 'g'), lacks(0, 'h')],
    [eq(v(1), rec([['g', v(0)], ['h', tails(0)]], []))]),
  ['valid', 'found'], 'x = { g: α, h: { ...r } }'],
  ['nested-rigid-mismatch', sig([], [0], [], [1], [],
    [eq(v(1), rec([['f', v(0)]], [])), eq(v(1), rec([['f', int]], []))]),
  ['invalid', 'none'], 'α need not be Int'],
]

// Rigid type variables must range over rows for the record-valued case.
export const NESTED_BOUNDS = {
  'division-record-rigid-var': { tyValues: ['Int', '{}', '{z1:Int}',
    '{z2:Int}', '{z1:Int,z2:{q:Int}}'] },
}
