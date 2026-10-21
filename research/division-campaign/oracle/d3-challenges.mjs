// Stream 4 challenges for the typed term-witness oracle (frozen in
// frozen-grammar.md before any run): partial agreement hypotheses,
// record-valued rigid type variables divided by another row, division at
// depth 2, function types around divided rows, field types shared by
// three rigid rows, vacuous hypotheses, and written labels inside nested
// tails. Rigid rows 0, 1, 2, 7; flexible rows 3-6; rigid type variable
// 0, flexible 1. `expect`: bounded verdict, uniform template, P9s.
import { T } from '../../composition-assessment/sig-oracle/semantics.mjs'

const { base, v, fn, rec, tails } = T
const int = base('Int')
const bool = base('Bool')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]
const f = (x) => rec([['f', x]], [])
const split = [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2)]
const shared = [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)),
  dis(4, 5)]
const three = [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)),
  eq(tails(2), tails(4, 6)), dis(4, 5), dis(3, 6)]
const threeEq = [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)),
  eq(tails(2), tails(3, 6)), dis(4, 5), dis(4, 6), dis(5, 6)]
const V = 'valid'
const I = 'invalid'
const F = 'found'
const N = 'none'
const P = 'valid'
const U = 'unresolved'

export const D3 = [
  // Hypotheses forcing agreement on some cells only.
  ['agree-some-cells', sig([0, 1, 2, 7], [], [3, 4, 5], [],
    [eq(tails(0), tails(1, 2)), dis(1, 7)], [...shared, dis(3, 7)]),
  [V, F, U], 'r = s ⊎ t forces r, s to agree on s; u = s, v = t, w = {}'],
  ['agree-some-cells-bad', sig([0, 1, 2, 7], [], [3, 4, 5], [],
    [eq(tails(0), tails(1, 2))], [...shared, dis(3, 7)]),
  [I, N, U], 'a label of s and q must be in u (shared) and not in u'],
  ['agree-unforced-pair', sig([0, 1, 2, 7], [], [3, 4, 5], [],
    [eq(tails(0), tails(1, 2))],
    [eq(tails(1), tails(3, 4)), eq(tails(7), tails(3, 5)), dis(4, 5)]),
  [I, N, U], 'D forces agreement on r cells, not between s and q'],
  ['agree-nested-hyp', sig([0, 1, 2], [], [3, 4, 5], [],
    [eq(f(tails(0)), f(tails(1, 2)))], shared),
  [V, F, U], '{ f: r } = { f: s ⊎ t } declared; u = s, v = t'],
  // Record-valued rigid type variables divided by another row.
  ['tyvar-nested-hyp-divided', sig([0, 1, 2], [0], [3, 4], [],
    [dis(1, 2), eq(f(v(0)), f(tails(0)))],
    [eq(v(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
  [V, F, U], '{ f: α } = { f: r } declared; divide α by s'],
  ['tyvar-divided-undeclared', sig([0, 1, 2], [0], [3, 4], [],
    [dis(1, 2)], [eq(v(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
  [I, N, U], 'α may be Int'],
  ['tyvar-two-rows-hyp', sig([0, 1], [0], [3, 4], [],
    [dis(0, 1), eq(v(0), tails(0, 1))],
    [eq(v(0), tails(3, 4)), dis(3, 1), dis(4, 0)]),
  [V, F, U], 'α = r ⊎ s declared; u = α outside s = r, v = s'],
  // Division at depth 2.
  ['division-depth2', sig([0, 1, 2], [], [3, 4], [], [dis(1, 2)],
    [eq(f(f(tails(0))), f(f(tails(3, 4)))), dis(3, 1), dis(4, 2)]),
  [V, F, U], 'split inside { f: { f: _ } }'],
  ['division-depth2-undeclared', sig([0, 1, 2], [], [3, 4], [], [],
    [eq(f(f(tails(0))), f(f(tails(3, 4)))), dis(3, 1), dis(4, 2)]),
  [I, N, U], 'a label in r, s and t has nowhere to go'],
  ['division-depth2-tyvar', sig([0, 1, 2], [], [3, 4], [1], [dis(1, 2)],
    [...split, eq(v(1), f(f(tails(3))))]),
  [V, F, U], 'x = { f: { f: r outside s } }'],
  // Function types around divided rows.
  ['fn-around-divided', sig([0, 1, 2], [], [3, 4], [1], [dis(1, 2)],
    [eq(fn(tails(0), v(1)), fn(tails(3, 4), tails(3))), dis(3, 1),
      dis(4, 2)]),
  [V, F, U], 'x = { ...u } with u = r outside s'],
  ['fn-around-divided-bad', sig([0, 1, 2], [], [3, 4], [], [dis(1, 2)],
    [eq(fn(tails(0), tails(3)), fn(tails(3, 4), tails(1))), dis(4, 2)]),
  [I, N, U], 'u = s and r = u ⊎ v need s inside r'],
  ['fn-codomain-divided', sig([0, 1, 2], [0], [3, 4], [], [dis(1, 2)],
    [eq(fn(v(0), tails(0)), fn(v(0), tails(3, 4))), dis(3, 1),
      dis(4, 2)]),
  [V, F, U], 'α -> { ...r } split in the codomain'],
  // Field types shared across three rigid rows (four flexible rows).
  ['three-rows-shared', sig([0, 1, 2], [], [3, 4, 5, 6], [],
    [eq(tails(0), tails(1, 2))], three),
  [V, F, U], 'r = s ⊎ t: u = s, v = t, w = x = {}'],
  ['three-rows-shared-undeclared', sig([0, 1, 2], [], [3, 4, 5, 6], [], [],
    three),
  [I, N, U], 'without the hypothesis, shared labels may differ in type'],
  ['three-rows-all-equal', sig([0, 1, 2], [], [3, 4, 5, 6], [],
    [eq(tails(0), tails(1)), eq(tails(1), tails(2))], threeEq),
  [V, F, U], 'r = s = t: u = r, the rest empty'],
  ['three-rows-partial-hyp', sig([0, 1, 2], [], [3, 4, 5, 6], [],
    [eq(tails(0), tails(1))], threeEq),
  [I, N, U], 'r = s forced, t not'],
  ['three-compose', sig([0, 1, 2], [], [3, 4], [],
    [dis(0, 1), dis(1, 2), dis(0, 2)],
    [eq(tails(3), tails(0, 1)), eq(tails(4), tails(3, 2))]),
  [V, F, P], 'P9s-certified: u = r ⊎ s, v = u ⊎ t'],
  // Vacuous hypotheses.
  ['vacuous-D', sig([0], [], [], [],
    [eq(tails(0), rec([['a', int]], [])), eq(tails(0), rec([['a', bool]], []))],
    [['ff']]),
  [V, F, U], 'no rigid assignment satisfies D'],
  ['vacuous-pattern', sig([0], [], [3], [],
    [eq(tails(0), rec([['a', int]], []))],
    [eq(tails(3), tails(0)), eq(tails(3), rec([['a', int]], []))]),
  [V, F, U], 'patterns without a are empty; u = r'],
  ['vacuous-tyvar', sig([], [0], [], [], [eq(v(0), int), eq(v(0), bool)],
    [eq(v(0), base('Text'))]),
  [V, F, U], 'α = Int and α = Bool: vacuous'],
  // Written labels inside nested tails.
  ['written-in-nested-tail', sig([0], [], [3], [], [lacks(0, 'a')],
    [eq(f(rec([['a', int]], [0])), f(tails(3)))]),
  [V, F, P], 'P9s-certified: u = { a: Int, ...r }'],
  ['written-in-nested-tail-undeclared', sig([0], [], [3], [], [],
    [eq(f(rec([['a', int]], [0])), f(tails(3)))]),
  [I, N, U], 'r may hold a'],
  ['written-label-in-nested-tail-of-flex', sig([0], [], [3, 4], [1], [],
    [eq(v(1), f(tails(0))), eq(v(1), f(tails(3))),
      eq(tails(4), rec([['a', int]], []))]),
  [V, F, P], 'x = { f: { ...r } } with r holding written a, f'],
  ['written-in-nested-tail-forced', sig([0, 1], [0], [3], [1],
    [eq(tails(0), rec([['a', v(0)]], [1]))],
    [eq(rec([['g', tails(0)]], []), rec([['g', rec([['a', v(1)]], [3])]],
      []))]),
  [V, F, U], 'r = { a: α, ...s } declared: x = α, u = s'],
  ['written-in-nested-tail-forced-bad', sig([0, 1], [0], [3], [1], [],
    [eq(rec([['g', tails(0)]], []), rec([['g', rec([['a', v(1)]], [3])]],
      []))]),
  [I, N, U], 'r may lack a'],
]

// Bounds overrides, fixed with the problems (frozen-grammar.md).
const recordTys = ['Int', '{}', '{z1:Int}', '{z2:Int}',
  '{z1:Int,z2:{q:Int}}']
const fourFlex = { flexFieldTypes: ['Int', '{q:Int}'] }
export const D3_BOUNDS = {
  'tyvar-nested-hyp-divided': { tyValues: recordTys },
  'tyvar-divided-undeclared': { tyValues: recordTys },
  'tyvar-two-rows-hyp': { tyValues: [...recordTys, '{z1:Int,z2:Int}'] },
  'three-rows-shared': fourFlex,
  'three-rows-shared-undeclared': fourFlex,
  'three-rows-all-equal': fourFlex,
  'three-rows-partial-hyp': fourFlex,
}
