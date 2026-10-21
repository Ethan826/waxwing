// Checks D3b's construction against bounded rigid assignments, and its
// verdicts against bounded validity (construction.md, "Oracle checks").
// Per problem and written-label pattern π:
//   instance     D unifiable with no cell iff some bounded assignment of
//                π satisfies D (one direction is checked: a bounded
//                instance with no unifier is a failure);
//   allowed      every cell a bounded instance occupies is allowed;
//   independent  D unifiable with all allowed cells at once;
//   inD          θ*_π satisfies D and has pattern π;
//   covers       hv maps θ*_π onto every bounded instance of π (canonical
//                valuation);
//   solve        B at θ*_π (exact for flat problems, else bounded).
// Verdicts: D3b valid if every pattern with an instance is solved, D3b
// invalid if one is unsolved exactly (θ*_π is then a counter-instance:
// fresh atoms and labels are values of the string semantics). Compared
// with bounded validity: D3b valid and bounded invalid is a failure.
// Run: node run.mjs [count] [seed] [mutant] (count 0: the named
// problems; otherwise that many generated ones). Optional fourth argument:
// comma-separated exact named problems, retaining all original bounds.
// Report mode (the default) prints and exits 0 whatever it finds. With
// --assert (anywhere in the arguments) the run exits 1 if a named
// verdict differs from its expectation or any invariant check fails.
// Mutants: noUnify (fresh constants, D's equations ignored),
// allCells (every cell, allowed or
// not), contextFree (cell constants valued at one fixed label).
import { sat, scan, rowsOver, product, builtValues }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { boundedValid, DEFAULT_BOUNDS, makeTheta }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { CHALLENGES }
  from '../../composition-assessment/sig-oracle/challenges.mjs'
import { TYPED }
  from '../../composition-assessment/sig-oracle/typed-challenges.mjs'
import { NESTED, NESTED_BOUNDS }
  from '../../composition-assessment/sig-oracle/nested-challenges.mjs'
import { SOURCE }
  from '../../composition-assessment/sig-oracle/source-boundary.mjs'
import { typedGenerator }
  from '../../composition-assessment/sig-oracle/typed-grammar.mjs'
import { thetaStar, cellLabel } from './generic.mjs'
import { rigidOf, render, coversFails, cellOfLabel } from './interp.mjs'
import { solveAt } from './solve.mjs'
import { D3B } from './challenges.mjs'

const assertMode = process.argv.includes('--assert')
const argv = process.argv.slice(2).filter((a) => a !== '--assert')
const count = Number(argv[0] ?? 0)
const seed = Number(argv[1] ?? 3)
const mutant = argv[2] ?? ''
const selected = new Set((argv[3] ?? '').split(',').filter(Boolean))
const RIGID_FIELDS = ['Int', 'Bool', '{q:Int}']

function named() {
  const out = []
  for (const [name, P, b] of CHALLENGES) out.push({ name, P, expect: b })
  for (const [name, P, [b]] of TYPED) out.push({ name, P, expect: b })
  for (const [name, P, [b]] of NESTED) {
    out.push({ name, P, expect: b, tys: NESTED_BOUNDS[name]?.tyValues })
  }
  for (const s of SOURCE) {
    out.push({ name: s.name, P: s.P, expect: s.expect[0] })
  }
  for (const [name, P, b] of D3B) out.push({ name, P, expect: b })
  return out
}

// Bounded rigid assignments satisfying D: rows first, then type
// variables over the bounded values and the values D's row expressions
// build (so `α = { ...r }` has instances).
function instances(P, labels, tys) {
  const rows = rowsOver(labels, () => RIGID_FIELDS)
  const rowKeys = P.rigidRows.map((r) => `r${r}`)
  const tyKeys = P.rigidTys.map((n) => `t${n}`)
  const out = []
  for (const rr of product(rowKeys, () => rows)) {
    const theta = makeTheta(rr, new Map())
    const built = builtValues(theta, P.D, new Set(P.rigidTys))
    const values = [...new Set([...tys, ...built])]
    for (const tt of product(tyKeys, () => values)) {
      const rigid = new Map([...rr, ...tt])
      if (sat(makeTheta(rigid, new Map()), P.D)) out.push(rigid)
    }
  }
  return out
}

function* allPatterns(P, written) {
  const pairs = P.rigidRows.flatMap((r) => written.map((l) => [r, l]))
  for (let m = 0; m < 1 << pairs.length; m++) {
    const on = new Set(pairs.filter((_, i) => m & (1 << i)).map(String))
    yield (r, l) => on.has(String([r, l]))
  }
}

function checkPattern(P, written, labels, present, insts, fail) {
  const mine = insts.filter((rigid) => P.rigidRows.every((r) =>
    written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l))))
  const opts = { noUnify: mutant === 'noUnify',
    allCells: mutant === 'allCells' }
  const st = thetaStar(P, written, present, opts)
  if (!st.instance) {
    if (mine.length > 0) fail('instance', `${mine.length} bounded instances`)
    return 'none'
  }
  if (!st.independent) { fail('independent', st.allowed); return 'none' }
  const theta = rigidOf(st.theta)
  if (!sat(makeTheta(theta, new Map()), P.D)) fail('inD', 'θ* violates D')
  for (const r of P.rigidRows) {
    for (const l of written) {
      if ((l in theta.get(`r${r}`)) !== present(r, l)) fail('inD', 'pattern')
    }
  }
  const allowed = new Set(st.allowed.map(cellLabel))
  const coverOpts = { contextFree: mutant === 'contextFree' }
  for (const rigid of mine) {
    for (const k of labels.filter((l) => !written.includes(l))) {
      const S = cellOfLabel(P, rigid, k)
      if (S.length > 0 && !allowed.has(cellLabel(S))) {
        fail('allowed', `cell ${cellLabel(S)}`)
      }
    }
    const bad = coversFails(P, written, labels, st.theta, rigid, coverOpts)
    if (bad !== null) { fail('covers', bad); break }
  }
  const consts = [...st.theta.tys.values()].map(render)
  const res = solveAt(P, st.theta, theta, consts)
  return res.solved ? 'solved' : res.exact ? 'unsolved' : 'unknown'
}

function check(item, stats) {
  const { P } = item
  const written = [...scan([...P.D, ...P.B]).labels]
  const labels = [...written, ...DEFAULT_BOUNDS.unwritten]
  const tys = item.tys ?? [...DEFAULT_BOUNDS.tyValues, '{q:Int}']
  const insts = instances(P, labels, tys)
  const fails = []
  const fail = (kind, info) => fails.push({ kind, info })
  const results = []
  for (const present of allPatterns(P, written)) {
    results.push(checkPattern(P, written, labels, present, insts, fail))
  }
  const d3b = results.includes('unsolved') ? 'invalid'
    : results.includes('unknown') ? 'unknown' : 'valid'
  const bounds = { ...DEFAULT_BOUNDS, tyValues: tys,
    flexFieldTypes: [...new Set([...DEFAULT_BOUNDS.flexFieldTypes,
      ...RIGID_FIELDS])] }
  const bounded = boundedValid(P, bounds).verdict
  if (d3b === 'valid' && bounded === 'invalid') fail('unsound', 'bounded')
  stats.total += 1
  stats[`${d3b}/${bounded}`] = (stats[`${d3b}/${bounded}`] ?? 0) + 1
  for (const f of fails) stats[f.kind] = (stats[f.kind] ?? 0) + 1
  return { d3b, bounded, fails }
}

function itemName(item) { return item.name }

function selectedItem(item) {
  return selected.size === 0 || selected.has(item.name)
}

function main() {
  const stats = { total: 0 }
  let mismatches = 0
  let failures = 0
  const items = count > 0 ? [] : named()
  const names = new Set(items.map(itemName))
  for (const name of selected) {
    if (!names.has(name)) {
      throw new Error(`unknown named problem: ${name}`)
    }
  }
  for (const item of items.filter(selectedItem)) {
    const out = check(item, stats)
    if (out.d3b !== item.expect) mismatches += 1
    failures += out.fails.length
    const mark = out.d3b === item.expect ? '' : '  (differs from expect)'
    console.log(`${item.name}: d3b ${out.d3b}, bounded ${out.bounded}` +
      `, expect ${item.expect}${mark}`)
    for (const f of out.fails.slice(0, 3)) {
      console.log(`  FAIL ${f.kind}: ${JSON.stringify(f.info)}`)
    }
  }
  const gen = typedGenerator(seed)
  for (let i = 0; i < count; i++) {
    const P = gen()
    const out = check({ P }, stats)
    failures += out.fails.length
    for (const f of out.fails.slice(0, 1)) {
      console.log(`generated ${i}: FAIL ${f.kind} ${JSON.stringify(P)}`)
    }
  }
  console.log(JSON.stringify(stats))
  if (!assertMode) return
  console.log(`assert: ${mismatches} verdict mismatches, ` +
    `${failures} invariant failures`)
  if (mismatches > 0 || failures > 0) process.exitCode = 1
}

main()
