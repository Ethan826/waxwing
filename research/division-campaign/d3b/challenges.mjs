// D3b challenges (construction.md, "Worked examples"): hypotheses tying
// rigid type variables to rows, nested hypotheses, hypotheses forcing
// agreement or emptiness, an impossible D, and controls without the
// hypotheses. Rigid rows 0-2, flexible rows 3-5; rigid type variables
// 0 (α) and 1 (β), flexible 2 (γ). `expect`: predicted validity.
import { T } from '../../composition-assessment/sig-oracle/semantics.mjs'

const { base, v, fn, rec, tails } = T
const int = base('Int')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const split = [eq(v(0), tails(3, 4)), dis(3, 1), dis(4, 2)]
const fieldOf = (t) => rec([['f', t]], [])

export const D3B = [
  ['alpha-field-tied', sig([0, 1, 2], [0], [3, 4], [],
    [dis(1, 2), eq(fieldOf(tails(0)), fieldOf(v(0)))], split),
  'valid', '{ f: { ...r } } = { f: α } declared: α is r, divided'],
  ['alpha-field-untied', sig([0, 1, 2], [0], [3, 4], [], [dis(1, 2)],
    split), 'invalid', 'α may be Int'],
  ['alpha-equal-rows', sig([0, 1], [0], [3, 4, 5], [],
    [eq(v(0), tails(0)), eq(v(0), tails(1))],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)), dis(4, 5)]),
  'valid', 'α = { ...r } = { ...s }: r and s share one type per cell'],
  ['alpha-empties-row', sig([0, 1], [0], [], [],
    [eq(v(0), tails(0)), eq(v(0), tails(0, 1))],
    [eq(tails(1), rec([], []))]),
  'valid', 'α = r = r ⊎ s forces s empty: no cell holds s'],
  ['alpha-empties-row-missing', sig([0, 1], [0], [], [],
    [eq(v(0), tails(0))], [eq(tails(1), rec([], []))]),
  'invalid', 's may be non-empty'],
  ['arrow-hypothesis', sig([], [0, 1], [], [2],
    [eq(v(0), fn(v(1), v(1)))], [eq(v(0), fn(v(2), v(2)))]),
  'valid', 'α = β -> β declared: γ = β'],
  ['arrow-hypothesis-missing', sig([], [0, 1], [], [2], [],
    [eq(v(0), fn(v(2), v(2)))]), 'invalid', 'α may be Int'],
  ['impossible-cycle', sig([0], [], [], [],
    [eq(tails(0), rec([['f', tails(0)]], []))],
    [eq(tails(0), rec([['g', int]], []))]),
  'valid', 'r = { f: { ...r } } has no finite solution: vacuous'],
  ['record-constant', sig([0], [], [3, 4], [], [],
    [eq(rec([['f', tails(3)]], [4]), tails(0))]),
  'invalid', "r's field at f may be Int: constants must be opaque"],
  ['nested-field-row', sig([0, 1, 2], [], [3, 4], [],
    [dis(1, 2), eq(tails(0), rec([['f', tails(1, 2)]], []))],
    [eq(rec([['f', tails(3, 4)]], []), tails(0)), eq(tails(3), tails(1))]),
  'valid', 'r = { f: { ...s, ...t } } declared: u = s, v = t'],
]
