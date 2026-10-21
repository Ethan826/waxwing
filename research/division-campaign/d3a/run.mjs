// Runs R1, R2, R3 and R5 of attack.md, and the cross-checks.
// node run.mjs R1|R2|R3|R5|check
import { sat, scan }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { boundedValid, makeTheta, DEFAULT_BOUNDS }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { patterns } from '../../composition-assessment/sig-oracle/p9s.mjs'
import { findTemplate }
  from '../../composition-assessment/sig-oracle/templates.mjs'
import { findNested }
  from '../../composition-assessment/sig-oracle/nested-search.mjs'
import { TYPED }
  from '../../composition-assessment/sig-oracle/typed-challenges.mjs'
import { CHALLENGES }
  from '../../composition-assessment/sig-oracle/challenges.mjs'
import { NESTED, NESTED_BOUNDS }
  from '../../composition-assessment/sig-oracle/nested-challenges.mjs'
import { boundedValidBT, findSolutionBT, rigidAssignments } from './bt.mjs'
import { findWith } from './search.mjs'
import { GA, GW } from './grammars.mjs'
import { PROBLEMS, SECOND } from './problems.mjs'

const mode = process.argv[2]

function groups(P, bounds) {
  const written = [...scan([...P.D, ...P.B]).labels]
  const all = rigidAssignments(P, bounds)
  return { written, all, groups: [...patterns(P, written)].map((present) =>
    ({ present, rigids: all.filter((rigid) => P.rigidRows.every((r) =>
      written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l)))) })) }
}

// One template per pattern, for every rigid assignment of the pattern.
function uniform(P, bounds, find) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) =>
    rigids.length === 0 || find(P, present, written, rigids))
}
function perAssign(P, bounds, find) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) => rigids.every((rigid) =>
    find(P, present, written, [rigid])))
}

const nested = (P, present, written, rs) =>
  findNested(P, present, written, rs, { tailWritten: true })
const withGA = (P, present, written, rs) =>
  findWith(P, present, written, rs, GA)
const withGW = (P, present, written, rs) =>
  findWith(P, present, written, rs, GW)
const first = (bounds) => (P, present, written, rs) =>
  findTemplate(P, present, written, bounds.unwritten, rs) !== null

function witnessCheck(P, bounds, witness) {
  const all = rigidAssignments(P, bounds)
  const bad = all.filter((rigid) =>
    !sat(makeTheta(rigid, witness(rigid)), P.B))
  return `hand witness holds at ${all.length - bad.length}/${all.length}`
}

const found = (b) => (b ? 'found' : 'none')
// Which grammars each run searches (amended after the first R1-R3
// attempt, attack.md (b): G-W's spaces at Temp₃ are too large to
// enumerate for R1-R3; G-W is needed only for R2, where explicit
// templates are checked instead, run R2W). Second amendment: R1's G-A
// search did not finish in 7 minutes (two type variables over Temp₂ are
// enumerated for every failing row choice); R1 rests on the
// grammar-independent presence check and the Lean proof instead.
const SEARCH = { R1: [], R2: ['GA'], R3: ['G1'],
  R5: ['GA', 'copy', 'GW'], R5a: ['GA', 'copy', 'GW'] }
function report({ name, P, bounds, expect, witness }, which) {
  const t0 = Date.now()
  const valid = witness ? witnessCheck(P, bounds, witness)
    : `bt ${JSON.stringify(boundedValidBT(P, bounds))}`
  const out = []
  const add = (label, find) =>
    out.push(`${label} ${found(uniform(P, bounds, find))}`)
  if (which.includes('GA')) add('G-A', nested)
  if (which.includes('copy')) add('G-A copy', withGA)
  if (which.includes('GW')) add('G-W', withGW)
  if (which.includes('G1')) {
    const g1 = uniform(P, bounds, first(bounds))
    out.push(`G-1 ${found(g1)}` + (g1 ? '' : ', G-1 per-assignment ' +
      found(perAssign(P, bounds, first(bounds)))))
  }
  console.log(`${name}: ${valid}; ${out.join(', ')}; predicted ` +
    `${expect.join('/')}; ${Date.now() - t0} ms`)
}

// R2W: an explicit template, each part checked to be in G-W, then
// searched with those parts as the only shapes (cell maps still
// searched).
function explicitGW({ name, gw }) {
  const { P, bounds } = PROBLEMS.find((x) => x.name === name && x.P)
  const { written, groups: gs } = groups(P, bounds)
  const json = JSON.stringify
  const inW = (xs, all) =>
    xs.every((x) => all.some((y) => json(y) === json(x)))
  const ok = gs.every(({ present, rigids }) => {
    if (!inW(gw.rows, GW.rows(P, present, written)) ||
      !inW(gw.tys, GW.tys(P, present, written))) {
      throw new Error(`${name}: template not in G-W`)
    }
    return rigids.length === 0 || findWith(P, present, written, rigids,
      { rows: () => gw.rows, tys: () => gw.tys })
  })
  console.log(`${name}: explicit template, in G-W; uniform: ${ok}`)
}

// R1's grammar-independent check: which presence choices of `f` in u1-u4
// have a bounded solution, per value of α.
function presence(P, bounds) {
  for (const rigid of rigidAssignments(P, bounds)) {
    const ok = [1, 2, 3, 4].filter((i) => findSolutionBT(P, rigid, bounds,
      (k, row) => !['r1', 'r2', 'r3', 'r4'].includes(k) ||
        ('f' in row) === (k === `r${i}`)))
    console.log(`  α = ${rigid.get('t0')}: f may sit in u${ok.join(', u')}`)
  }
}

if (mode === 'R2W') {
  for (const p of PROBLEMS.filter((x) => x.run === mode)) explicitGW(p)
}
if (Object.keys(SEARCH).includes(mode)) {
  for (const p of PROBLEMS.filter((x) => x.run === mode)) {
    report(p, SEARCH[mode])
    if (mode === 'R1') presence(p.P, p.bounds)
    if (mode === 'R1' || mode === 'R3') {
      console.log(`  bt: ${JSON.stringify(boundedValidBT(p.P, p.bounds))}`)
    }
  }
}

if (mode === 'check') {
  let n = 0
  let off = 0
  const cmp = (name, P, bounds) => {
    const a = boundedValid(P, bounds).verdict
    const b = boundedValidBT(P, bounds).verdict
    n += 1
    if (a !== b) {
      off += 1
      console.log(`bt ${name}: bounded ${a}, bt ${b}`)
    }
  }
  for (const [name, P] of TYPED) cmp(name, P, DEFAULT_BOUNDS)
  for (const [name, P] of CHALLENGES) cmp(name, P, DEFAULT_BOUNDS)
  for (const [name, P] of NESTED) {
    cmp(name, P, { ...SECOND, ...(NESTED_BOUNDS[name] ?? {}) })
  }
  console.log(`bt vs bounded.mjs: ${n} problems, ${off} differ`)
  let m = 0
  const pool = [...NESTED.map(([name, P]) =>
    ({ name, P, bounds: { ...SECOND, ...(NESTED_BOUNDS[name] ?? {}) } })),
  ...PROBLEMS.filter((x) => x.run === 'R5' || x.run === 'R2')]
  for (const { name, P, bounds } of pool) {
    const a = uniform(P, bounds, nested)
    const b = uniform(P, bounds, withGA)
    if (a !== b) { m += 1; console.log(`copy ${name}: ${a} vs ${b}`) }
  }
  console.log(`search.mjs (G-A) vs findNested: ${pool.length} problems, ` +
    `${m} differ`)
}
