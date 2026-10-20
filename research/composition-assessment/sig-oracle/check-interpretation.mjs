// Claim-level check of the interpretation lemma behind P9s's soundness
// (dossier §14): for every pattern P9s solves, map its generic flexible
// solution σ by h (interpret.mjs) into every bounded rigid assignment θ
// with that pattern satisfying D, and check
//   L2  h is defined on σ's values (no label repeats after expansion),
//   L3  h(generic value of t) = ground value of t, for every
//       subexpression t of B the generic model defines,
//   L4  every atom of B holds at θ with flexible part h(σ).
// Patterns are checked even when another pattern fails (the lemma is
// per pattern). `mutant` drops P9s's side condition, to show the check
// can fail. Bounded evidence, not proof.
// Run: node check-interpretation.mjs [count] [seed] [mutant] [larger]
import { evalT, sat, rowsOver, product } from './semantics.mjs'
import { DEFAULT_BOUNDS, labelsOf, makeTheta } from './bounded.mjs'
import { witnesses } from './p9s.mjs'
import { interpretation, Clash } from './interpret.mjs'
import { generator } from './grammar.mjs'
import { CHALLENGES } from './challenges.mjs'

const count = Number(process.argv[2] ?? 300)
const seed = Number(process.argv[3] ?? 5)
const mutant = process.argv.includes('mutant')
const bounds = process.argv.includes('larger')
  ? { ...DEFAULT_BOUNDS, unwritten: ['z1', 'z2', 'z3'],
    rigidRowTypes: ['Int', 'Bool', '{}'] }
  : DEFAULT_BOUNDS
const REST_TYPES = ['Int', '(Int->Int)']
const tally = { problems: 0, patterns: 0, instances: 0, L2: 0, L3: 0, L4: 0 }
const failures = []

function subexpressions(B) {
  const out = []
  const visit = (t) => {
    out.push(t)
    if (t.k === 'f') {
      visit(t.a)
      visit(t.c)
    }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
  }
  for (const a of B) {
    if (a[0] === 'eq') {
      visit(a[1])
      visit(a[2])
    }
  }
  return out
}

function* rigidAssignments(P) {
  const rows = rowsOver(labelsOf(P, bounds), () => bounds.rigidRowTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  for (const rigid of product(keys,
    (k) => (k[0] === 'r' ? rows : bounds.tyValues))) {
    if (sat(makeTheta(rigid, new Map()), P.D)) yield rigid
  }
}

function matches(P, w, theta) {
  return P.rigidRows.every((r) => w.labels.every((l) =>
    (l in theta.row(r)) === w.present(r, l)))
}

function checkInstance(P, w, rigid, restType) {
  const theta = makeTheta(rigid, new Map())
  const h = interpretation(P, w.labels, theta, restType)
  const flex = new Map()
  try {
    for (const [k, g] of w.flex) {
      flex.set(k, k[0] === 'r' ? h.row(g) : h.value(g))
    }
  } catch (e) {
    if (e instanceof Clash) return 'L2'
    throw e
  }
  const generic = { ...makeTheta(w.rigid, w.flex), ...w.extend }
  const ground = makeTheta(rigid, flex)
  for (const t of subexpressions(P.B)) {
    const g = evalT(generic, t)
    if (g === null) continue
    let image
    try {
      image = h.value(g)
    } catch (e) {
      if (e instanceof Clash) return 'L2'
      throw e
    }
    if (evalT(ground, t) !== image) return 'L3'
  }
  return sat(ground, P.B) ? null : 'L4'
}

function checkProblem(name, P) {
  tally.problems += 1
  const solved = [...witnesses(P, bounds, !mutant)]
    .filter((w) => w.flex !== null)
  tally.patterns += solved.length
  if (solved.length === 0) return
  for (const rigid of rigidAssignments(P)) {
    const theta = makeTheta(rigid, new Map())
    for (const w of solved.filter((x) => matches(P, x, theta))) {
      for (const restType of REST_TYPES) checkOne(name, P, w, rigid, restType)
    }
  }
}

function checkOne(name, P, w, rigid, restType) {
  tally.instances += 1
  const failed = checkInstance(P, w, rigid, restType)
  if (failed === null) return
  tally[failed] += 1
  if (failures.length < 5) {
    failures.push({ name, failed, pattern: w.pattern,
      rigid: Object.fromEntries(rigid), flex: Object.fromEntries(w.flex) })
  }
}

for (const [name, P] of CHALLENGES) checkProblem(name, P)
for (const split of [false, true]) {
  const generate = generator(seed, split)
  for (let i = 0; i < count; i++) checkProblem(`gen${split ? 'S' : ''}${i}`,
    generate())
}
console.log(JSON.stringify({ mutant, bounds: bounds.unwritten.length, tally }))
for (const f of failures) console.log(JSON.stringify(f))
