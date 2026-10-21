// The frozen problem set, grammar and bounds of the confirmation run
// (frozen-grammar.md). Every named problem carries a prediction
// [bounded verdict, uniform template, P9s verdict].
import { TYPED }
  from '../../composition-assessment/sig-oracle/typed-challenges.mjs'
import { CHALLENGES }
  from '../../composition-assessment/sig-oracle/challenges.mjs'
import { SOURCE }
  from '../../composition-assessment/sig-oracle/source-boundary.mjs'
import { NESTED, NESTED_BOUNDS }
  from '../../composition-assessment/sig-oracle/nested-challenges.mjs'
import { DEFAULT_BOUNDS }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { cellsOf } from '../../composition-assessment/sig-oracle/templates.mjs'
import { temps, rowShapes, nodes }
  from '../../composition-assessment/sig-oracle/nested-templates.mjs'
import { D3, D3_BOUNDS } from './d3-challenges.mjs'

// §18.9's amended grammar: record nodes with tails also get written
// labels their skeleton does not write (absent or a leaf).
export const GRAMMAR = { tailWritten: true }

// §18.8's bounds, as nested-oracle.mjs's SECOND.
export const SECOND = { ...DEFAULT_BOUNDS, rigidRowTypes: ['Int', '{q:Int}'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'] }

export function boundsFor(name) {
  return { ...SECOND, ...(NESTED_BOUNDS[name] ?? {}),
    ...(D3_BOUNDS[name] ?? {}) }
}

const valid = (v) => (v === 'valid' ? 'found' : 'none')
// P9s predictions for the typed and nested challenges, which record only
// bounded and template verdicts: from §18.7 (the five valid, P9s
// unresolved) and §18.9 (the eight nested challenges).
const TYPED_P9S = { 'shared-part-no-disjoint': 'valid' }
const NESTED_P9S = { 'function-from-rigid': 'valid',
  'record-from-rigid': 'valid' }

export const NAMED = [
  ...TYPED.map(([n, P, e]) => [n, P, [e[0], e[1],
    TYPED_P9S[n] ?? 'unresolved']]),
  ...CHALLENGES.map(([n, P, b, p]) => [n, P, [b, valid(b), p]]),
  ...SOURCE.map(({ name, P, expect }) => [`src-${name}`, P,
    [expect[0], valid(expect[0]), expect[1]]]),
  ...NESTED.map(([n, P, e]) => [n, P, [e[0], e[1],
    NESTED_P9S[n] ?? 'unresolved']]),
  ...D3.map(([n, P, e]) => [n, P, e]),
]

// An upper bound on brute force's work: for each pattern, the number of
// (shapes, cell-map entries) combinations times its rigid assignments.
export function bruteSize(P, { written, groups }) {
  const cells = cellsOf(P.rigidRows)
  const perNode = cells.reduce((m, S) => m * (S.length + 1), 1)
  let total = 0
  for (const { present, rigids } of groups) {
    if (rigids.length === 0) continue
    let combos = 1
    for (const k of [...P.flexRows.map((r) => `r${r}`),
      ...P.flexTys.map((n) => `t${n}`)]) {
      const shapes = k[0] === 'r'
        ? rowShapes(P, present, written, GRAMMAR)
        : temps(P, present, written, 2, GRAMMAR)
      combos *= shapes.reduce((s, sh) =>
        s + perNode ** nodes(sh, k, []).length, 0)
    }
    total += combos * rigids.length
  }
  return total
}
