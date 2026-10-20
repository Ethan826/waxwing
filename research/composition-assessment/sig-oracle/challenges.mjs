// Hand-written challenges (dossier §13.7): P9s soundness challenges,
// completeness gaps, and challenges for a future region representation.
// Rigid rows 0-2, flexible rows 3-6; rigid type variable 0, flexible
// type variables 1-2. `expect` is the predicted bounded verdict and P9s
// verdict, each with its argument in `why`; a mismatch is a finding to
// check, not a test failure.
import { T } from './semantics.mjs'

const { base, v, fn, rec, tails } = T
const int = base('Int')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]

export const CHALLENGES = [
  ['alias', sig([0, 1], [], [3, 4], [], [],
    [eq(tails(3), tails(0)), eq(tails(4), tails(1)), dis(3, 4)]),
    'invalid', 'unresolved', 'disjointness through aliases, undeclared'],
  ['alias-declared', sig([0, 1], [], [3, 4], [], [dis(0, 1)],
    [eq(tails(3), tails(0)), eq(tails(4), tails(1)), dis(3, 4)]),
    'valid', 'valid', 'the same, declared'],
  ['alias-chain', sig([0, 1], [], [3, 4, 5], [], [],
    [eq(tails(3), tails(0)), eq(tails(4), tails(3)),
      eq(tails(5), tails(1)), dis(4, 5)]),
    'invalid', 'unresolved', 'disjointness two aliases away'],
  ['compose-undeclared', sig([0, 1], [], [3], [], [],
    [eq(tails(3), tails(0, 1))]),
    'invalid', 'unresolved', 'r ⊎ s needs r, s disjoint'],
  ['equal-rests', sig([0, 1], [], [3], [], [],
    [eq(tails(3), tails(0)), eq(tails(3), tails(1))]),
    'invalid', 'unresolved', 'r and s need not be equal'],
  ['self-disjoint', sig([0], [], [3], [], [],
    [eq(tails(3), tails(0)), dis(3, 0)]),
    'invalid', 'unresolved', 'r may be non-empty'],
  ['rigid-type-eq', sig([], [0], [], [], [], [eq(v(0), int)]),
    'invalid', 'unresolved', 'α need not be Int'],
  ['rigid-type-free', sig([], [0], [], [1], [], [eq(v(1), v(0))]),
    'valid', 'valid', 'x = α'],
  ['rec-sig', sig([], [0], [3], [], [], [eq(v(0), tails(3))]),
    'invalid', 'unresolved', 'α may be a function (recSig)'],
  ['arrow-sig', sig([], [0], [], [1, 2], [], [eq(v(0), fn(v(1), v(2)))]),
    'invalid', 'unresolved', 'α may be a record'],
  ['lacks-declared', sig([0], [], [3], [], [lacks(0, 'a')],
    [eq(rec([['a', int]], [0]), rec([['a', int]], [3]))]),
    'valid', 'valid', 'u = r'],
  ['lacks-missing', sig([0], [], [3], [], [],
    [eq(rec([['a', int]], [0]), tails(3))]),
    'invalid', 'unresolved', 'r may hold a'],
  ['split', sig([0, 1, 2], [], [3, 4], [], [dis(1, 2)],
    [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
    'valid', 'unresolved', 'splitSig: divide r by membership in s'],
  ['types-differ', sig([0, 1], [], [3, 4, 5], [], [],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(5, 4)), dis(3, 1),
      dis(5, 0)]),
    'invalid', 'unresolved', 'shared part needs equal field types'],
  ['types-independent', sig([0, 1], [], [3, 4, 5, 6], [], [],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(5, 6)), dis(3, 1),
      dis(5, 0)]),
    'valid', 'valid',
    'weak challenge: trivially valid (u = w = {}); see types-differ'],
  ['empty-split', sig([0, 1], [], [3, 4], [], [dis(0, 1)],
    [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 1)]),
    'valid', 'valid', 'u = r, v = {}'],
  ['forced-empty', sig([0], [], [3, 4], [], [],
    [eq(tails(0), tails(3, 4)), eq(tails(3), tails(4))]),
    'invalid', 'unresolved', 'u = v disjoint, so r would be empty'],
  ['nested-same', sig([0], [], [3], [1], [],
    [eq(v(1), rec([['f', tails(0)]], [])),
      eq(v(1), rec([['f', tails(3)]], []))]),
    'valid', 'valid', 'u = r inside a field'],
  ['nested-two', sig([0, 1], [], [], [1], [],
    [eq(v(1), rec([['f', tails(0)]], [])),
      eq(v(1), rec([['f', tails(1)]], []))]),
    'invalid', 'unresolved', 'r and s need not be equal'],
  ['tyvar-field', sig([0], [0], [3], [], [lacks(0, 'a')],
    [eq(rec([['a', v(0)]], [0]), tails(3))]),
    'valid', 'valid', 'u holds a: α'],
  ['nested-alias', sig([0, 1], [], [3], [1], [dis(0, 1)],
    [eq(tails(3), tails(0)),
      eq(v(1), rec([['f', tails(3, 1)]], [])),
      eq(rec([['g', v(1)]], []), rec([['g', rec([['f', tails(0, 1)]], [])]],
        []))]),
    'valid', 'valid', 'two rests composed inside a field, through u = r'],
  ['nested-alias-undeclared', sig([0, 1], [], [3], [1], [],
    [eq(tails(3), tails(0)),
      eq(v(1), rec([['f', tails(3, 1)]], []))]),
    'invalid', 'unresolved', 'the same without the clause: r, s may overlap'],
  ['tyvar-nested-rest', sig([0], [0], [], [1], [lacks(0, 'a')],
    [eq(v(1), rec([['a', v(0)]], [0])),
      eq(rec([['g', v(1)]], []), rec([['g', rec([['a', v(0)]], [0])]], []))]),
    'valid', 'valid', 'x = { a: α, ...r }, nested once more'],
]

// Smaller flexible field domains where four flexible rows would be slow.
export const BOUNDS_OVERRIDE = {
  'types-independent': { flexFieldTypes: ['Int', 'Bool'] },
}
