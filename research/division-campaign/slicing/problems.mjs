// Named problems for the counterexample hunt (statements.md §5). Rigid
// rows 0-2, flexible rows 3-6, rigid type variable 0, flexible type
// variables 1-2. `whole` is the predicted bounded verdict of the whole
// problem; `wrong` lists the slicings predicted to disagree with it;
// `p9s` is the predicted P9s verdict, the same whole and sliced unless
// `p9sWrong` lists relevance notions predicted to change it. A mismatch
// with a prediction is a finding to check, not a test failure.
import { T } from './slice.mjs'
import { shape } from '../../composition-assessment/sig-oracle/grammar.mjs'

const { base, v, rec, tails } = T
const int = base('Int')
const bool = base('Bool')
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]
const ff = ['ff']

// shape() knows rows 0-4 and type variables 0-1 only; widen it.
function sig(D, B, rigidTys = []) {
  const P = shape(D, B)
  const tys = new Set()
  const rows = new Set()
  const walk = (t) => {
    if (t.k === 'v') tys.add(t.n)
    if (t.k === 'f') { walk(t.a); walk(t.c) }
    if (t.k === 'r') {
      t.fields.forEach(([, ft]) => walk(ft))
      t.tails.forEach((r) => rows.add(r))
    }
  }
  for (const a of [...D, ...B]) {
    if (a[0] === 'eq') { walk(a[1]); walk(a[2]) }
    if (a[0] === 'lacks') rows.add(a[1])
    if (a[0] === 'disjoint') { rows.add(a[1]); rows.add(a[2]) }
  }
  return { ...P,
    rigidRows: [...rows].filter((r) => r <= 2).sort(),
    flexRows: [...rows].filter((r) => r > 2).sort(),
    rigidTys: [...tys].filter((n) => rigidTys.includes(n)),
    flexTys: [...tys].filter((n) => !rigidTys.includes(n)) }
}

export const SMALL = { unwritten: ['z1'], rigidRowTypes: ['Int', 'Bool'],
  flexFieldTypes: ['Int', 'Bool'], tyValues: ['Int', 'Bool', '{}'] }

export const PROBLEMS = [
  { name: 'shared-flex-tyvar', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(v(1), tails(0)), eq(v(1), tails(1))]),
    wrong: ['rowsOnly', 'topLevel'],
    why: 'x = {..r}, x = {..s}: x links r and s; rows alone do not' },
  { name: 'nested-shared-row', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(rec([['f', tails(3)]], []), rec([['f', tails(0)]], [])),
      eq(rec([['f', tails(3)]], []), rec([['f', tails(1)]], []))]),
    wrong: ['topLevel'],
    why: 'u = r and u = s, each inside a field' },
  { name: 'rigid-tyvar-hyp', whole: 'valid', p9s: 'unresolved',
    P: sig([eq(v(0), int)], [eq(v(0), int)], [0]),
    wrong: ['rowsOnly', 'topLevel'],
    why: 'D: α = Int links to B through α only; P9s ignores eq in D' },
  { name: 'hyp-links', whole: 'valid', p9s: 'unresolved',
    P: sig([eq(rec([['a', int]], [1]), tails(0))],
      [eq(rec([['a', int]], [3]), tails(0)), eq(tails(4), tails(1))]),
    wrong: ['ignoreD'],
    why: 'D: r = {a: Int | s}; without it r may lack a',
    bounds: SMALL },
  { name: 'hyp-disjoint-only', whole: 'valid', p9s: 'valid',
    P: sig([dis(0, 1), lacks(0, 'a')],
      [eq(rec([['a', int]], [0]), tails(3)), eq(tails(4), tails(1))]),
    wrong: [],
    why: 'a source-form D link (disjoint) projects to nothing',
    bounds: SMALL },
  { name: 'ground-ff-B', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(tails(3), tails(0)), ff]),
    wrong: ['dropGround', 'measured'],
    why: 'ff mentions no variable' },
  { name: 'ground-eq-B', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(tails(3), tails(0)), eq(int, bool)]),
    wrong: ['dropGround', 'measured'],
    why: 'Int = Bool mentions no variable' },
  { name: 'ground-undefined-B', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(tails(3), tails(0)),
      eq(rec([['a', int], ['a', int]], []), rec([['a', int]], []))]),
    wrong: ['dropGround', 'measured'],
    why: 'a record repeating a label is undefined' },
  { name: 'ground-level-mismatch', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(rec([['f', tails(3)], ['g', int]], []),
      rec([['f', tails(0)]], []))]),
    wrong: ['measured'],
    why: 'labels differ at the top; the top group has no variable' },
  { name: 'field-clash', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(rec([['a', bool]], []), rec([['a', int]], [3]))]),
    wrong: ['measured'],
    why: 'found by generated.mjs plain 300 7: Bool = Int one level down' },
  { name: 'vacuity-one-slice', whole: 'valid', p9s: 'unresolved',
    P: sig([eq(tails(0), rec([['a', int]], [])), lacks(0, 'a')],
      [eq(tails(4), tails(1)), lacks(4, 'b')]),
    wrong: ['noVacuity', 'rowsOnly', 'topLevel', 'dropGround', 'ignoreD',
      'measured'], p9sWrong: ['atomRelevant'],
    why: 'D impossible in slice {0} only; slice {1, 4} invalid alone',
    bounds: SMALL },
  { name: 'vacuity-ground-D', whole: 'valid', p9s: 'unresolved',
    P: sig([ff], [lacks(0, 'a')]),
    wrong: ['noVacuity', 'rowsOnly', 'topLevel', 'dropGround', 'ignoreD',
      'measured'],
    why: 'D = ff is ground; the problem is vacuously valid' },
  { name: 'ground-D-true', whole: 'invalid', p9s: 'unresolved',
    P: sig([eq(int, int)], [lacks(0, 'a')]), wrong: [],
    why: 'a true ground clause changes nothing' },
  { name: 'shared-label', whole: 'valid', p9s: 'valid',
    P: sig([lacks(0, 'a'), lacks(1, 'a'), lacks(1, 'b')],
      [eq(rec([['a', int]], [0]), tails(3)),
        eq(rec([['a', bool], ['b', int]], [1]), tails(4))]),
    wrong: [], why: 'a in both slices; (0, b) irrelevant',
    bounds: SMALL },
  { name: 'atom-relevance', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(tails(3), tails(0)), lacks(3, 'a')]),
    wrong: [], p9sWrong: ['atomRelevant'],
    why: 'u = r, u lacks a: no atom names r and a together' },
  { name: 'irrelevant-pair', whole: 'valid', p9s: 'valid',
    P: sig([lacks(1, 'b')],
      [eq(tails(3), tails(0)), eq(rec([['b', int]], [1]), tails(4))]),
    wrong: [], why: '(0, b) irrelevant: b only in slice {1, 4}',
    bounds: SMALL },
  { name: 'split-plus', whole: 'valid', p9s: 'unresolved',
    P: sig([dis(1, 2)], [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2),
      eq(v(1), v(0))], [0]),
    wrong: [], why: 'split beside an unrelated slice; P9s stays incomplete',
    bounds: SMALL },
  { name: 'rigid-shared-row', whole: 'valid', p9s: 'valid',
    P: sig([lacks(0, 'a')],
      [eq(rec([['a', int]], [0]), tails(3)), eq(tails(4), tails(0))]),
    wrong: [], why: 'S1r: r shared by two flexible components',
    bounds: SMALL },
  { name: 'rigid-shared-row-bad', whole: 'invalid', p9s: 'unresolved',
    P: sig([], [eq(tails(3), tails(0)), eq(tails(4), tails(0)),
      lacks(4, 'a')]),
    wrong: [], p9sWrong: ['atomRelevant'],
    why: 'S1r: the second component fails alone',
    bounds: SMALL },
  { name: 'rigid-tyvar-shared', whole: 'valid', p9s: 'valid',
    P: sig([], [eq(v(1), v(0)), eq(rec([['a', v(0)]], []),
      rec([['a', v(2)]], []))], [0]),
    wrong: [], why: 'S1r: α shared by two flexible components' },
]
