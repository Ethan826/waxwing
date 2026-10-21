// Cross-checks fixed in protocol.md: the regression set, the bounded
// oracle on small sizes, instantiation of every accepted certificate at
// every consistent pattern, and P9s's pattern count against E's.
// Run: node research/division-campaign/star/crosscheck.mjs
import { scan, sat, product, rowsOver }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { boundedValid, findSolution, labelsOf, makeTheta }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { patterns } from '../../composition-assessment/sig-oracle/p9s.mjs'
import { CHALLENGES }
  from '../../composition-assessment/sig-oracle/challenges.mjs'
import { SOURCE }
  from '../../composition-assessment/sig-oracle/source-boundary.mjs'
import { FAMILIES } from './problems.mjs'
import { runE, runA, runB, components, certAt } from './strategies.mjs'
import { writtenLabels, consistentPatterns, consistentCount, presentOf,
  checkPattern, sideCondition } from './generic.mjs'

const SMALL = { unwritten: ['z1'], rigidRowTypes: ['Int', 'Bool'],
  flexFieldTypes: ['Int', 'Bool'], tyValues: ['Int', 'Bool', '{}'] }
let flagged = 0
const flag = (msg) => { flagged += 1; console.log(`  FLAG ${msg}`) }

// Bounded validity with the existential split over flexible components
// (protocol.md, cross-check 1). Same domains as boundedValid.
function boundedSplit(P, bounds, deadline) {
  const labels = labelsOf(P, bounds)
  const rigidRows = rowsOver(labels, () => bounds.rigidRowTypes)
  const flexRows = rowsOver(labels, () => bounds.flexFieldTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  const values = (k) => (k[0] === 'r' ? rigidRows : bounds.tyValues)
  const comps = components(P).map((c) => ({ ...P, B: c.atoms,
    flexRows: [...c.vars].filter((v) => v[0] === 'r')
      .map((v) => Number(v.slice(1))),
    flexTys: [...c.vars].filter((v) => v[0] === 't')
      .map((v) => Number(v.slice(1))) }))
  let checked = 0
  for (const rigid of product(keys, values)) {
    if (Date.now() > deadline) return { verdict: 'timeout', checked }
    if (!sat(makeTheta(rigid, new Map()), P.D)) continue
    checked += 1
    for (const sub of comps) {
      const none = sub.flexRows.length === 0 && sub.flexTys.length === 0
      const ok = none ? sat(makeTheta(rigid, new Map()), sub.B)
        : findSolution(sub, rigid, flexRows, bounds.tyValues) !== null
      if (!ok) {
        return { verdict: 'invalid', checked,
          witness: Object.fromEntries(rigid) }
      }
    }
  }
  return { verdict: 'valid', checked }
}

// Every consistent pattern's instantiation of an accepted certificate.
function instantiate(P, certFor) {
  const labels = writtenLabels(P)
  const side = sideCondition(P)
  let n = 0
  let bad = 0
  for (const pairs of consistentPatterns(P, labels)) {
    n += 1
    const present = presentOf(pairs)
    if (!checkPattern(P, labels, present, certFor(present), side)) bad += 1
  }
  return { n, bad }
}

function crossInstantiate(name, P, a, b) {
  const labels = writtenLabels(P)
  if (consistentCount(P, labels) > 16) return 'skipped (> 2^16)'
  const parts = []
  if (a.cert) {
    const r = instantiate(P, () => a.cert)
    parts.push(`A ${r.n - r.bad}/${r.n}`)
    if (a.verdict === 'valid' && r.bad) flag(`${name}: A accepted, ` +
      `${r.bad} instantiations fail (symbolic check unsound)`)
    if (a.verdict !== 'valid' && !r.bad) flag(`${name}: A's check ` +
      'failed but every instantiation passes (check incomplete)')
  }
  if (b.verdict === 'valid') {
    const r = instantiate(P, (present) => certAt(b.trees, present))
    parts.push(`B ${r.n - r.bad}/${r.n}`)
    if (r.bad) flag(`${name}: B accepted, ${r.bad} instantiations fail`)
  }
  return parts.join(', ') || 'no certificate'
}

console.log('# Regression set (recorded bounded and P9s verdicts)')
const regression = [
  ...CHALLENGES.map(([name, P, bounded, p9s]) => ({ name, P, bounded, p9s })),
  ...SOURCE.map(({ name, P, expect }) =>
    ({ name: `source:${name}`, P, bounded: expect[0], p9s: expect[1] })),
]
for (const { name, P, bounded, p9s } of regression) {
  const e = runE(P)
  const a = runA(P)
  const b = runB(P)
  const inst = crossInstantiate(name, P, a, b)
  console.log(`${name}: recorded bounded ${bounded}, P9s ${p9s}; ` +
    `E ${e.verdict}, A ${a.verdict}, B ${b.verdict}; inst ${inst}`)
  for (const r of [e, a, b]) {
    if (r.verdict === 'valid' && bounded === 'invalid') {
      flag(`${name}: ${r.strategy} accepts a bounded-invalid problem`)
    }
  }
  if (e.verdict === 'valid' && p9s !== 'valid') {
    console.log(`  note: E accepts where recorded P9s is ${p9s}`)
  }
}

console.log('\n# Families at oracle sizes')
const ORACLE = { star: [1, 2, 3], 'star-read': [1, 2, 3],
  'star-undeclared': [1, 2, 3], 'star-unlacked': [1, 2, 3],
  'star-cross': [2, 3], dep: [1, 2], divide: [1, 2], divide2: [1, 2],
  divide3: [1, 2],
  route: [0] }
for (const f of FAMILIES) {
  for (const n of ORACLE[f.name]) {
    const P = f.make(n)
    const name = `${f.name} ${n}`
    const t0 = Date.now()
    const o = boundedSplit(P, SMALL, t0 + 120000)
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    const e = runE(P)
    const a = runA(P)
    const b = runB(P)
    const inst = crossInstantiate(name, P, a, b)
    console.log(`${name}: bounded ${o.verdict} (${o.checked} rigid, ` +
      `${secs}s), E ${e.verdict}, A ${a.verdict}, B ${b.verdict}; ` +
      `inst ${inst}`)
    const [pb, pa, pB] = f.expect
    if (o.verdict !== 'timeout' && o.verdict !== pb) {
      console.log(`  CHECK bounded predicted ${pb}`)
    }
    if (a.verdict !== pa) console.log(`  CHECK A predicted ${pa}`)
    if (b.verdict !== pB) console.log(`  CHECK B predicted ${pB}`)
    for (const r of [e, a, b]) {
      if (r.verdict === 'valid' && o.verdict === 'invalid') {
        flag(`${name}: ${r.strategy} accepts, bounded invalid ` +
          JSON.stringify(o.witness))
      }
    }
    if (f.name === 'star' && n === 1) {
      const whole = boundedValid(P, SMALL)
      console.log(`  control: boundedValid unsplit ${whole.verdict} ` +
        `(${whole.checked} rigid)`)
      if (whole.verdict !== o.verdict) flag('split and unsplit disagree')
    }
  }
}

console.log('\n# P9s pattern count against E\'s enumeration')
for (const f of FAMILIES.filter((f) => f.name.startsWith('star'))) {
  for (const n of [1, 2, 3, 4]) {
    if (f.min && n < f.min) continue
    const P = f.make(n)
    const labels = [...scan([...P.D, ...P.B]).labels]
    if (P.rigidRows.length * labels.length > 20) continue
    let p9s = 0
    for (const _ of patterns(P, labels)) p9s += 1
    let ours = 0
    for (const _ of consistentPatterns(P, writtenLabels(P))) ours += 1
    console.log(`${f.name} ${n}: P9s ${p9s}, consistentPatterns ${ours}`)
    if (p9s !== ours) flag(`${f.name} ${n}: pattern counts differ`)
  }
}
console.log(`\n${flagged} flagged`)
