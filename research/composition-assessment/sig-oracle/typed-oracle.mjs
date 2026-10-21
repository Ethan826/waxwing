// The typed term-witness oracle (dossier §18.6). Three independent
// checks per problem, over the same bounded rigid assignments:
//   bounded   every rigid assignment has some flexible assignment in the
//             bounded domain (bounded.mjs, unrestricted witnesses);
//   uniform   per written-label pattern, one template (templates.mjs)
//             works for every rigid assignment of the pattern;
//   perAssign a template chosen after seeing each assignment.
// and P9s. When bounded validity fails at an assignment θ*, any uniform
// template would work at θ* too, so one search at θ* decides both "no
// uniform template" and the power check. Flags: P9s valid without a
// uniform template (a bug: P9s's witnesses are templates); a template at
// θ* (the bounded flexible domain too small); bounded valid without a
// uniform template (a separation: minimized, rechecked with larger
// bounds).
// Run: node typed-oracle.mjs [count] [seed]
import { writeFileSync } from 'node:fs'
import { sat, scan, rowsOver, product } from './semantics.mjs'
import { boundedValid, DEFAULT_BOUNDS, labelsOf, makeTheta }
  from './bounded.mjs'
import { p9s, patterns } from './p9s.mjs'
import { findTemplate, inFirstPass } from './templates.mjs'
import { typedGenerator, typedShape } from './typed-grammar.mjs'
import { TYPED } from './typed-challenges.mjs'
import { CHALLENGES } from './challenges.mjs'
import { SOURCE } from './source-boundary.mjs'

const count = Number(process.argv[2] ?? 200)
const seed = Number(process.argv[3] ?? 3)
const LARGER = { ...DEFAULT_BOUNDS, unwritten: ['z1', 'z2', 'z3'],
  rigidRowTypes: ['Int', 'Bool', '{}'] }

function rigidAssignments(P, bounds) {
  const rows = rowsOver(labelsOf(P, bounds), () => bounds.rigidRowTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  return [...product(keys, (k) => (k[0] === 'r' ? rows : bounds.tyValues))]
    .filter((rigid) => sat(makeTheta(rigid, new Map()), P.D))
}

function patternRigids(P, written, all) {
  return [...patterns(P, written)].map((present) => ({ present,
    rigids: all.filter((rigid) => P.rigidRows.every((r) =>
      written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l)))) }))
}

// Uniform templates per pattern; when one pattern has none, whether each
// of its assignments has its own (the weaker, per-assignment property).
export function terms(P, bounds = DEFAULT_BOUNDS) {
  const written = [...scan([...P.D, ...P.B]).labels]
  const find = (present, rs) =>
    findTemplate(P, present, written, bounds.unwritten, rs)
  for (const { present, rigids } of patternRigids(P, written,
    rigidAssignments(P, bounds))) {
    if (rigids.length === 0 || find(present, rigids) !== null) continue
    return { uniform: false,
      perAssign: rigids.every((rigid) => find(present, [rigid]) !== null) }
  }
  return { uniform: true, perAssign: true }
}

// A template for one assignment alone (it has no flexible solution in the
// bounded domain, so finding one shows that domain too small).
function templateAt(P, rigid, bounds) {
  const written = [...scan([...P.D, ...P.B]).labels]
  const present = (r, l) => l in rigid.get(`r${r}`)
  return findTemplate(P, present, written, bounds.unwritten, [rigid]) !== null
}

export function classify(P, bounds = DEFAULT_BOUNDS) {
  const b = boundedValid(P, bounds)
  const bounded = b.verdict === 'valid'
  const p9 = p9s(P, bounds).verdict === 'valid'
  if (!bounded) {
    const rigid = new Map(Object.entries(b.witness))
    const power = templateAt(P, rigid, bounds)
    const kind = power ? 'POWER: bounded domain'
      : p9 ? 'BUG: P9s valid, bounded invalid' : 'agree'
    // A template at θ* says nothing about uniformity: unknown (null).
    return { bounded, uniform: power ? null : false,
      perAssign: power ? null : false, p9, kind }
  }
  const { uniform, perAssign } = terms(P, bounds)
  let kind = 'agree'
  if (p9 && !uniform) {
    kind = 'FLAG: P9s witness outside the grammar, or a P9s defect'
  } else if (!uniform) {
    kind = perAssign ? 'SEPARATION: type-dependent' : 'SEPARATION: beyond terms'
  }
  return { bounded, uniform, perAssign, p9, kind }
}

function minimize(P, kind) {
  let cur = P
  for (let shrunk = true; shrunk;) {
    shrunk = false
    for (const part of ['B', 'D']) {
      for (let i = 0; i < cur[part].length; i++) {
        const next = typedShape(...(part === 'D'
          ? [cur.D.filter((_, j) => j !== i), cur.B]
          : [cur.D, cur.B.filter((_, j) => j !== i)]))
        if (next.B.length > 0 && classify(next).kind === kind) {
          cur = next
          shrunk = true
        }
      }
    }
  }
  return cur
}

const tally = {}
const shapes = {}
const found = []
function run(name, P, expect) {
  const c = classify(P)
  tally[c.kind] = (tally[c.kind] ?? 0) + 1
  const shape = `bounded ${c.bounded ? 'valid' : 'invalid'} / uniform ` +
    `${c.uniform ? 'found' : 'none'} / P9s ${c.p9 ? 'valid' : 'unresolved'}`
  shapes[shape] = (shapes[shape] ?? 0) + 1
  const verdict = `bounded ${c.bounded ? 'valid' : 'invalid'}, uniform ` +
    `${c.uniform ? 'found' : 'none'}, per-assignment ` +
    `${c.perAssign ? 'found' : 'none'}, P9s ${c.p9 ? 'valid' : 'unresolved'}`
  const wrong = expect && (expect[0] !== (c.bounded ? 'valid' : 'invalid') ||
    expect[1] !== (c.uniform ? 'found' : 'none'))
  if (!name.startsWith('gen') || c.kind !== 'agree') {
    const mark = c.kind === 'agree' ? '' : `  [${c.kind}]`
    console.log(`${name}: ${verdict}${mark}` +
      `${wrong ? '  (CHECK prediction)' : ''}`)
  }
  if (c.kind.startsWith('SEPARATION')) {
    const small = minimize(P, c.kind)
    found.push({ name, kind: c.kind, problem: small,
      largerBounded: boundedValid(small, LARGER).verdict })
  }
}

for (const [name, P, expect] of TYPED) run(name, P, expect)
const outside = []
for (const [name, P] of CHALLENGES) {
  if (inFirstPass(P)) run(name, P)
  else outside.push(name)
}
for (const { name, P } of SOURCE) {
  if (inFirstPass(P)) run(`src-${name}`, P)
  else outside.push(`src-${name}`)
}
console.log(`outside the first pass (records nested in fields): ${outside}`)
const generate = typedGenerator(seed)
for (let i = 0; i < count; i++) run(`gen${i}`, generate())
writeFileSync(new URL('./typed-discrepancies.json', import.meta.url),
  JSON.stringify({ count, seed, tally, shapes, outside, found }, null, 1) +
    '\n')
console.log(JSON.stringify(tally))
console.log(JSON.stringify(shapes, null, 1))
console.log(`separations: ${found.length}`)
