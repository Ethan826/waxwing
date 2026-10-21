// Generated agreement runs for slicing (statements.md §5.3). Per problem:
// the whole problem's bounded verdict against S1's rule, and P9s on the
// whole against P9s on the proposed slices and with patterns restricted
// to slice-relevant pairs. A disagreement is a candidate counterexample to
// S1, S1-acc or S2; each is printed with the problem. The naive slicings'
// and atom-level relevance's disagreements are only counted.
// Modes, grammar fixed before running (statements.md §5.3):
//   challenges  sig-oracle's 23 challenges, default bounds;
//   plain       sig-oracle's plain grammar (grammar.mjs), default bounds;
//   pair        two parts, rows {0, 3} and {1, 4}, labels a and b, with
//               ground atoms, a part-only impossible D and links added at
//               random (below), SMALL bounds.
// Run: node generated.mjs <mode> [count] [seed]
import { boundedValid, DEFAULT_BOUNDS } from
  '../../composition-assessment/sig-oracle/bounded.mjs'
import { p9s } from '../../composition-assessment/sig-oracle/p9s.mjs'
import { generator } from '../../composition-assessment/sig-oracle/grammar.mjs'
import { CHALLENGES, BOUNDS_OVERRIDE } from
  '../../composition-assessment/sig-oracle/challenges.mjs'
import { sliceRelevant, atomRelevant, proposed, T } from './slice.mjs'
import { SLICINGS, slicedVerdict, s1Verdict, p9sOn, p9sSliced } from
  './hunt.mjs'
import { SMALL } from './problems.mjs'

const [mode = 'plain', countArg = '200', seedArg = '1'] = process.argv.slice(2)

function rng(seed) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Each part: B one or two of an equation between records over its own
// rows (optional field a or b at Int, Bool or α), `u lacks l`, `u disjoint
// r`; D each `r lacks l` with probability 0.3. Added with probability
// 0.15 each: a ground B atom (ff, Int = Bool, Int = Int), a ground D atom
// (ff, Int = Int), D `{...0} = { a: Int }` (part 0 only); with 0.2, one
// link (`{...3} = {...1}`, `3 disjoint 4`, or x = {...0} and x = {...4}).
function pairGenerator(seed) {
  const random = rng(seed)
  const pick = (xs) => xs[Math.floor(random() * xs.length)]
  const chance = (p) => random() < p
  const { base, v, rec } = T
  const fieldTys = [base('Int'), base('Bool'), v(0)]
  const part = (r, u) => {
    const record = () => rec(chance(0.4) ? [[pick(['a', 'b']),
      pick(fieldTys)]] : [], [r, u].filter(() => chance(0.5)))
    const atom = () => pick([
      () => ['eq', record(), record()], () => ['eq', record(), record()],
      () => ['lacks', u, pick(['a', 'b'])], () => ['disjoint', u, r]])()
    const B = Array.from({ length: 1 + Math.floor(random() * 2) }, atom)
    const D = ['a', 'b'].filter(() => chance(0.3)).map((l) => ['lacks', r, l])
    return { D, B }
  }
  return () => {
    const one = part(0, 3)
    const two = part(1, 4)
    const D = [...one.D, ...two.D]
    const B = [...one.B, ...two.B]
    if (chance(0.15)) B.push(pick([['ff'], ['eq', base('Int'), base('Bool')],
      ['eq', base('Int'), base('Int')]]))
    if (chance(0.15)) D.push(pick([['ff'], ['eq', base('Int'), base('Int')]]))
    if (chance(0.15)) D.push(['eq', T.tails(0), rec([['a', base('Int')]], [])])
    if (chance(0.2)) {
      B.push(...pick([[['eq', T.tails(3), T.tails(1)]], [['disjoint', 3, 4]],
        [['eq', v(1), T.tails(0)], ['eq', v(1), T.tails(4)]]]))
    }
    return withLists(D, B)
  }
}

function withLists(D, B) {
  const rows = new Set()
  const tys = new Set()
  JSON.stringify([D, B], (k, x) => {
    if (x && x.k === 'v') tys.add(x.n)
    if (x && x.k === 'r') x.tails.forEach((r) => rows.add(r))
    if (Array.isArray(x) && (x[0] === 'lacks')) rows.add(x[1])
    if (Array.isArray(x) && x[0] === 'disjoint') {
      rows.add(x[1])
      rows.add(x[2])
    }
    return x
  })
  return { D, B, rigidRows: [0, 1].filter((r) => rows.has(r)),
    flexRows: [3, 4].filter((r) => rows.has(r)),
    rigidTys: tys.has(0) ? [0] : [], flexTys: tys.has(1) ? [1] : [] }
}

function problems() {
  const count = Number(countArg)
  if (mode === 'challenges') {
    return CHALLENGES.map(([name, P]) =>
      ({ name, P,
        bounds: { ...DEFAULT_BOUNDS, ...(BOUNDS_OVERRIDE[name] ?? {}) } }))
  }
  const next = mode === 'pair' ? pairGenerator(Number(seedArg))
    : generator(Number(seedArg), false)
  const bounds = mode === 'pair' ? { ...DEFAULT_BOUNDS, ...SMALL }
    : DEFAULT_BOUNDS
  return Array.from({ length: count }, (_, i) =>
    ({ name: `${mode}#${i}`, P: next(), bounds }))
}

const tally = { problems: 0, multiSlice: 0, s1: 0, p9sSliced: 0, s2: 0,
  atomRelevant: 0, wholeValid: 0, p9sValid: 0, zeroChecked: 0,
  nonVacuous: 0, rigidInstancesChecked: 0 }
for (const name of Object.keys(SLICINGS)) tally[name] = 0
for (const { name, P, bounds } of problems()) {
  tally.problems += 1
  const cut = proposed(P)
  if (cut.slices.length + (cut.ground.D.length + cut.ground.B.length > 0)
    > 1) tally.multiSlice += 1
  const evaluated = boundedValid(P, bounds)
  const whole = evaluated.verdict
  tally.rigidInstancesChecked += evaluated.checked
  if (evaluated.checked === 0) {
    tally.zeroChecked += 1
    console.log(`zero rigid instances on ${name}: bounded vacuity only`)
  } else tally.nonVacuous += 1
  if (whole === 'valid') tally.wholeValid += 1
  const report = (what) => {
    tally[what] += 1
    console.log(`${what} disagrees on ${name}: ${JSON.stringify(P)}`)
  }
  if (s1Verdict(P, bounds) !== whole) report('s1')
  for (const [n, f] of Object.entries(SLICINGS)) {
    if (slicedVerdict(f, P, bounds) !== whole) tally[n] += 1
  }
  const pw = p9s(P, bounds).verdict
  if (pw === 'valid') tally.p9sValid += 1
  if (p9sSliced(P, bounds) !== pw) report('p9sSliced')
  if (p9sOn(P, sliceRelevant(P), bounds) !== pw) report('s2')
  if (p9sOn(P, atomRelevant(P), bounds) !== pw) tally.atomRelevant += 1
}
console.log(JSON.stringify(tally))
