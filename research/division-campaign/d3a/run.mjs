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
function report({ name, P, bounds, expect, witness }, flat) {
  const t0 = Date.now()
  const valid = witness ? witnessCheck(P, bounds, witness)
    : `bt ${JSON.stringify(boundedValidBT(P, bounds))}`
  const ga = uniform(P, bounds, nested)
  const ga2 = uniform(P, bounds, withGA)
  const gw = uniform(P, bounds, withGW)
  let extra = ''
  if (flat) {
    const g1 = uniform(P, bounds, first(bounds))
    extra = `, G-1 ${found(g1)}` + (g1 ? ''
      : `, G-1 per-assignment ${found(perAssign(P, bounds, first(bounds)))}`)
  }
  console.log(`${name}: ${valid}; G-A ${found(ga)} (copy ${found(ga2)}), ` +
    `G-W ${found(gw)}${extra}; predicted ${expect.join('/')}; ` +
    `${Date.now() - t0} ms`)
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

if (['R1', 'R2', 'R3', 'R5'].includes(mode)) {
  for (const p of PROBLEMS.filter((x) => x.run === mode)) {
    report(p, mode === 'R3')
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
