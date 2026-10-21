// Counterexample hunt for slicing (statements.md §5). For each named
// problem: the bounded verdict of the whole problem, the verdict each
// slicing gives (valid iff every slice, the ground slice included, is
// valid in the bounded model), S1's rule (the proposed slicing, with D
// impossible in the bounded model giving valid), P9s on the whole and on
// the proposed slices, and P9s with patterns restricted to relevant
// pairs (S2), under slice-level and under atom-level relevance.
// Run: node research/division-campaign/slicing/hunt.mjs
import { boundedValid, DEFAULT_BOUNDS } from
  '../../composition-assessment/sig-oracle/bounded.mjs'
import { p9s, witnesses } from
  '../../composition-assessment/sig-oracle/p9s.mjs'
import { proposed, naiveBy, nodesRows, nodesTop, dropGround, ignoreD,
  sliceRelevant, atomRelevant } from './slice.mjs'
import { measured, flexLinked } from './variants.mjs'
import { PROBLEMS } from './problems.mjs'

export const SLICINGS = {
  noVacuity: proposed,
  rowsOnly: naiveBy(nodesRows),
  topLevel: naiveBy(nodesTop),
  dropGround,
  ignoreD,
  measured,
  flexLinked,
}

const valid = (Q, bounds) => boundedValid(Q, bounds).verdict === 'valid'

export function slicedVerdict(slicing, P, bounds) {
  const { slices, ground } = slicing(P)
  const all = ground ? [...slices, ground] : slices
  return all.every((Q) => valid(Q, bounds)) ? 'valid' : 'invalid'
}

// D has no solution in the bounded rigid domain.
export function dImpossible(P, bounds) {
  return boundedValid({ ...P, B: [] }, bounds).checked === 0
}

export function s1Verdict(P, bounds) {
  if (dImpossible(P, bounds)) return 'valid'
  return slicedVerdict(proposed, P, bounds)
}

// P9s, asking only for the patterns that hold no pair outside `relevant`.
export function p9sOn(P, relevant, bounds) {
  for (const w of witnesses(P, bounds)) {
    const outside = P.rigidRows.some((r) =>
      w.labels.some((l) => w.present(r, l) && !relevant(r, l)))
    if (!outside && w.flex === null) return 'unresolved'
  }
  return 'valid'
}

export function p9sSliced(P, bounds) {
  const { slices, ground } = proposed(P)
  const all = [...slices, ground]
  return all.every((Q) => p9s(Q, bounds).verdict === 'valid')
    ? 'valid' : 'unresolved'
}

function run() {
  let flagged = 0
  let zeroChecked = 0
  for (const prob of PROBLEMS) {
    const bounds = { ...DEFAULT_BOUNDS, ...(prob.bounds ?? {}) }
    const P = prob.P
    const evaluated = boundedValid(P, bounds)
    const whole = evaluated.verdict
    if (evaluated.checked === 0) zeroChecked += 1
    const s1 = s1Verdict(P, bounds)
    const wrong = Object.entries(SLICINGS)
      .filter(([, f]) => slicedVerdict(f, P, bounds) !== whole)
      .map(([name]) => name)
    const p = {
      whole: p9s(P, bounds).verdict,
      sliced: p9sSliced(P, bounds),
      sliceRelevant: p9sOn(P, sliceRelevant(P), bounds),
      atomRelevant: p9sOn(P, atomRelevant(P), bounds),
    }
    const p9sWrong = ['sliced', 'sliceRelevant', 'atomRelevant']
      .filter((k) => p[k] !== p.whole)
    const expected = whole === prob.whole && s1 === whole &&
      same(wrong, prob.wrong) && p.whole === prob.p9s &&
      same(p9sWrong, prob.p9sWrong ?? [])
    if (!expected) flagged += 1
    console.log(`${prob.name}: whole ${whole}, S1 ${s1}` +
      `; rigid instances checked ${evaluated.checked}` +
      `; slicings wrong: ${wrong.join(', ') || 'none'}` +
      `; P9s ${p.whole}, changed by: ${p9sWrong.join(', ') || 'none'}` +
      ` (${expected ? 'as predicted' : 'CHECK'}; ${prob.why})`)
  }
  console.log(`${PROBLEMS.length} problems, ${flagged} flagged; ` +
    `${zeroChecked} with zero rigid instances (bounded vacuity)`)
}

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

if (import.meta.url === `file://${process.argv[1]}`) run()
