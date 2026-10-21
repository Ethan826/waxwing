// D3a attack problems (attack.md), written before any run. Each entry:
// name, problem, bounds, predicted [validity, G-A template], and where
// given a hand witness: a function from the rigid assignment (a Map of
// `r<n>` rows and `t<n>` type values, as bounded.mjs) to a flexible one.
import { T, recordString }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { parse }
  from '../../composition-assessment/sig-oracle/interpret.mjs'

const { base, v, fn, rec, tails } = T
const int = base('Int')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]
const one = (l, t) => rec([[l, t]], [])

const show = (x) => (x.k === 'b' ? x.b : x.k === 'f'
  ? `(${show(x.a)}->${show(x.c)})`
  : recordString(Object.fromEntries(x.fields.map(([l, y]) => [l, show(y)]))))
const rowOf = (g) => Object.fromEntries(parse(g).fields.map(([l, y]) =>
  [l, show(y)]))
const arrow = (a) => `(${a}->${a})`

export const SECOND = { unwritten: ['z1', 'z2'],
  rigidRowTypes: ['Int', '{q:Int}'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'] }
export const FIRST = { unwritten: ['z1', 'z2'], rigidRowTypes: ['Int', 'Bool'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)'] }

// R1. u_i holds `f` iff α has the i-th shape: Int, Bool, arrow, record.
// Rows: u1-u4 = 1-4, m1-m4 = 5-8, w = 9; type variables β1, β2 = 1, 2.
const shapeSplit = sig([], [0], [1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2], [], [
  eq(tails(1, 2, 3, 4), one('f', v(0))),
  eq(tails(1, 5), one('f', int)),
  eq(tails(2, 6), one('f', base('Bool'))),
  eq(tails(3, 7), one('f', fn(v(1), v(2)))),
  eq(tails(4, 8), one('f', tails(9)))])
const R1 = { ...SECOND, unwritten: ['q'] }
function shapeWitness(rigid) {
  const a = rigid.get('t0')
  const x = parse(a)
  const i = a === 'Int' ? 1 : a === 'Bool' ? 2 : x.k === 'f' ? 3 : 4
  const flex = new Map([['t1', 'Int'], ['t2', 'Int'], ['r9', {}]])
  const filler = [null, 'Int', 'Bool', '(Int->Int)', '{}']
  for (let j = 1; j <= 4; j++) {
    flex.set(`r${j}`, j === i ? { f: a } : {})
    flex.set(`r${j + 4}`, j === i ? {} : { f: filler[j] })
  }
  if (i === 3) { flex.set('t1', show(x.a)); flex.set('t2', show(x.c)) }
  if (i === 4) flex.set('r9', rowOf(a))
  return flex
}

// R2. Gaps of G-A: depth of rows' written fields, depth of type
// variables, and tail nodes' written fields limited to leaves.
const depthRow = sig([], [0], [1], [1], [],
  [eq(tails(1), one('f', fn(v(1), v(1)))), eq(v(1), fn(v(0), v(0)))])
const depthTy = sig([], [0], [], [1, 2, 3], [],
  [eq(v(1), fn(v(2), v(2))), eq(v(2), fn(v(3), v(3))),
    eq(v(3), fn(v(0), v(0)))])
const tailWritten = sig([0], [], [1, 2], [1], [lacks(0, 'g')],
  [eq(v(1), tails(1)), eq(tails(1), tails(2, 0)),
    eq(tails(2), one('g', fn(int, int)))])
function tailWitness(rigid) {
  const u = { ...rigid.get('r0'), g: '(Int->Int)' }
  return new Map([['r1', u], ['r2', { g: '(Int->Int)' }],
    ['t1', recordString(u)]])
}

// R3. Three rigid rows; a label in all three needs one agreeing pair
// (x1: r = s, x2: r = t, x3: s = t); x3 and x4 are escapes for labels
// outside s or outside t. Rows: x1-x4 = 3-6, y1 = 7, y2 = 8, x3' = 9,
// m = 10, y3 = 11. Valid exactly when rigid fields cannot be pairwise
// distinct: an artifact of two field types, not semantic validity.
// Amendment after a run (speed only): the atoms are listed with the
// four-part equation last, so the searches, which assign variables in the
// order atoms mention them, prune before it. The conjunction is unchanged.
const pigeonhole = sig([0, 1, 2], [], [3, 4, 5, 6, 7, 8, 9, 10, 11], [], [], [
  eq(tails(3, 7), tails(1)), eq(tails(4, 8), tails(2)),
  eq(tails(9, 10), tails(1)), dis(5, 10), eq(tails(9, 11), tails(2)),
  dis(6, 2), eq(tails(0), tails(3, 4, 5, 6))])

// R5. Ties between a row's labels and a nested field's labels (§18.10),
// vacuity through type equations, record-valued rigid type variables.
const nestedTy = { ...SECOND, tyValues: ['Int', '{f:{}}', '{f:{z1:Int}}',
  '{f:{z1:Int,z2:Int}}', '{f:{z2:{q:Int}}}'] }
const recTy = { ...SECOND, tyValues: ['Int', '{}', '{z1:Int}',
  '{z1:Int,z2:{q:Int}}', '(Int->Int)'] }
// Explicit G-W templates for R2 (checked for membership in G-W, then
// instantiated by the search with these as the only shapes).
const T0 = { k: 'T', n: 0 }
const IntG = { k: 'g', g: 'Int' }
const arr = (a, c) => ({ k: 'arr', a, c })
const sq = (a) => arr(a, a)
const row = (fields) => ({ k: 'rec', tails: true, fields })
const GW_TEMPLATES = {
  'depth-row': { rows: [row({ f: sq(sq(T0)) })], tys: [sq(T0)] },
  'depth-ty': { rows: [], tys: [sq(sq(sq(T0))), sq(sq(T0)), sq(T0)] },
  'tail-written': { rows: [row({ g: sq(IntG) })], tys: [row({ g: sq(IntG) })] },
}

// Amendment after a run (attack.md (b), R5): with rigid fields `Int` and
// `{q:Int}` no rigid assignment satisfies the tie problems' `D` (a
// field must be the record of another rigid row over z1, z2), so the
// frozen bounds were vacuous for them. Rerun with record fields.
const tieBounds = { ...SECOND, rigidRowTypes: ['Int', '{}', '{z1:Int}'] }

const copy = (pairs) => (rigid) => new Map(pairs.map(([k, from]) =>
  [k, rigid.get(from)]))

export const PROBLEMS = [
  { run: 'R1', name: 'shape-split', P: shapeSplit, bounds: R1,
    expect: ['valid', 'none'], witness: shapeWitness },
  { run: 'R1', name: 'shape-split-Str', P: shapeSplit,
    bounds: { ...R1, tyValues: [...R1.tyValues, 'Str'],
      flexFieldTypes: [...R1.flexFieldTypes, 'Str'] },
    expect: ['invalid', 'none'] },
  { run: 'R2', name: 'depth-row', P: depthRow, bounds: SECOND,
    expect: ['valid', 'none'], witness: (rigid) => {
      const g = arrow(rigid.get('t0'))
      return new Map([['t1', g], ['r1', { f: arrow(g) }]])
    } },
  { run: 'R2', name: 'depth-ty', P: depthTy, bounds: SECOND,
    expect: ['valid', 'none'], witness: (rigid) => {
      const d = arrow(rigid.get('t0'))
      return new Map([['t3', d], ['t2', arrow(d)], ['t1', arrow(arrow(d))]])
    } },
  { run: 'R2', name: 'tail-written', P: tailWritten, bounds: SECOND,
    expect: ['valid', 'none'], witness: tailWitness },
  ...Object.entries(GW_TEMPLATES).map(([name, gw]) => ({ run: 'R2W', name,
    gw })),
  // R3a diagnostic amendment: one label and two flexible field types.
  { run: 'R3', name: 'pigeonhole', P: pigeonhole,
    bounds: { ...FIRST, unwritten: ['z1'],
      flexFieldTypes: ['Int', 'Bool'] },
    expect: ['valid', 'none'] },
  { run: 'R3', name: 'pigeonhole-3types', P: pigeonhole,
    bounds: { ...FIRST, unwritten: ['z1'],
      rigidRowTypes: ['Int', 'Bool', '{}'],
      flexFieldTypes: ['Int', 'Bool', '{}'] },
    expect: ['invalid', 'none'] },
  { run: 'R5', name: 'tie-decomposed', P: sig([0, 1], [], [2], [],
    [eq(tails(0), one('f', tails(1)))], [eq(one('f', tails(2)), tails(0))]),
  bounds: SECOND, expect: ['valid', 'found'], witness: copy([['r2', 'r1']]) },
  { run: 'R5', name: 'tie-two-level', P: sig([0, 1, 2], [], [3, 4], [],
    [eq(tails(0), rec([['f', tails(1)]], [2]))],
    [eq(tails(0), rec([['f', tails(3)]], [4]))]),
  bounds: SECOND, expect: ['valid', 'found'],
  witness: copy([['r3', 'r1'], ['r4', 'r2']]) },
  { run: 'R5a', name: 'tie-decomposed-a', P: sig([0, 1], [], [2], [],
    [eq(tails(0), one('f', tails(1)))], [eq(one('f', tails(2)), tails(0))]),
  bounds: tieBounds, expect: ['valid', 'found'],
  witness: copy([['r2', 'r1']]) },
  { run: 'R5a', name: 'tie-two-level-a', P: sig([0, 1, 2], [], [3, 4], [],
    [eq(tails(0), rec([['f', tails(1)]], [2]))],
    [eq(tails(0), rec([['f', tails(3)]], [4]))]),
  bounds: tieBounds, expect: ['valid', 'found'],
  witness: copy([['r3', 'r1'], ['r4', 'r2']]) },
  { run: 'R5', name: 'tie-nested-division', P: sig([0, 1, 2], [0], [3, 4], [],
    [eq(v(0), one('f', tails(0))), dis(1, 2)],
    [eq(v(0), one('f', tails(3, 4))), dis(3, 1), dis(4, 2)]),
  bounds: nestedTy, expect: ['valid', 'found'] },
  { run: 'R5', name: 'vacuity-type', P: sig([0], [0], [], [],
    [eq(v(0), tails(0)), eq(v(0), int)], [['ff']]),
  bounds: SECOND, expect: ['valid', 'found'] },
  { run: 'R5', name: 'rigid-tyvar-record', P: sig([0], [0], [1], [],
    [eq(v(0), tails(0))], [eq(v(0), tails(1))]),
  bounds: recTy, expect: ['valid', 'found'], witness: copy([['r1', 'r0']]) },
  { run: 'R5', name: 'rigid-tyvar-undeclared', P: sig([], [0], [1], [], [],
    [eq(v(0), tails(1))]), bounds: recTy, expect: ['invalid', 'none'] },
]
