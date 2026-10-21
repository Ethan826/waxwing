// Second pass of the typed term-witness oracle (dossier §18.8-18.9).
// Part A cross-checks the second-pass search against the first-pass
// engine on §18.7's named problems, at first-pass bounds. Part B runs
// the second pass (its grammar and bounds) on the five problems the
// first pass excluded, the nested challenges, and the P9s-certified
// named problems, classifying as typed-oracle.mjs does.
// Part C cross-checks the decomposed search against nested-brute.mjs.
// Run: node nested-oracle.mjs [A|B|C] [amended] [--shard=i/n]
import { sat, scan, rowsOver, product } from './semantics.mjs'
import { boundedValid, DEFAULT_BOUNDS, labelsOf, makeTheta }
  from './bounded.mjs'
import { p9s, patterns } from './p9s.mjs'
import { findTemplate, inFirstPass } from './templates.mjs'
import { findNested } from './nested-search.mjs'
import { bruteNested } from './nested-brute.mjs'
import { TYPED } from './typed-challenges.mjs'
import { CHALLENGES } from './challenges.mjs'
import { SOURCE } from './source-boundary.mjs'
import { NESTED, NESTED_BOUNDS } from './nested-challenges.mjs'

const SECOND = { ...DEFAULT_BOUNDS, rigidRowTypes: ['Int', '{q:Int}'],
  flexFieldTypes: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'],
  tyValues: ['Int', 'Bool', '{}', '(Int->Int)', '{q:Int}'] }

function groups(P, bounds) {
  const written = [...scan([...P.D, ...P.B]).labels]
  const rows = rowsOver(labelsOf(P, bounds), () => bounds.rigidRowTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  const all = [...product(keys, (k) => (k[0] === 'r' ? rows : bounds.tyValues))]
    .filter((rigid) => sat(makeTheta(rigid, new Map()), P.D))
  return { written, groups: [...patterns(P, written)].map((present) => ({
    present, rigids: all.filter((rigid) => P.rigidRows.every((r) =>
      written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l)))) })) }
}

function uniformWith(find, P, bounds) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) =>
    rigids.length === 0 || find(present, written, rigids))
}

const first = (P, bounds) => uniformWith((present, written, rs) =>
  findTemplate(P, present, written, bounds.unwritten, rs) !== null, P, bounds)
// The grammar: §18.8 as specified, or amended (`amended` argument).
const GRAMMAR = { tailWritten: process.argv.includes('amended') }
const second = (P, bounds) => uniformWith((present, written, rs) =>
  findNested(P, present, written, rs, GRAMMAR), P, bounds)

const named = [...TYPED.map(([n, P]) => [n, P]),
  ...CHALLENGES.filter(([, P]) => inFirstPass(P)),
  ...SOURCE.filter(({ P }) => inFirstPass(P)).map(({ name, P }) =>
    [`src-${name}`, P])]

// Part C: the decomposed search against brute force on nested problems
// small enough to enumerate whole.
const SMALL = ['nested-same', 'nested-two', 'tyvar-nested-rest',
  'function-from-rigid', 'record-from-rigid', 'nested-rigid-mismatch']
if (process.argv[2] === 'C') {
  const pool = [...CHALLENGES, ...NESTED.map(([n, P]) => [n, P])]
  let mismatch = 0
  for (const name of SMALL) {
    const P = pool.find(([n]) => n === name)[1]
    const bounds = { ...SECOND, ...(NESTED_BOUNDS[name] ?? {}) }
    const a = uniformWith((present, written, rs) =>
      bruteNested(P, present, written, rs, GRAMMAR), P, bounds)
    const b = second(P, bounds)
    if (a !== b) mismatch += 1
    console.log(`C ${name}: brute ${a ? 'found' : 'none'}, decomposed ` +
      `${b ? 'found' : 'none'}${a === b ? '' : '  MISMATCH'}`)
  }
  console.log(`C: ${SMALL.length} problems, ${mismatch} mismatches`)
}

if (process.argv[2] !== 'B' && process.argv[2] !== 'C') {
  let mismatch = 0
  for (const [name, P] of named) {
    const a = first(P, DEFAULT_BOUNDS)
    const b = second(P, DEFAULT_BOUNDS)
    if (a !== b) mismatch += 1
    console.log(`A ${name}: first ${a ? 'found' : 'none'}, second ` +
      `${b ? 'found' : 'none'}${a === b ? '' : '  MISMATCH'}`)
  }
  console.log(`A: ${named.length} problems, ${mismatch} mismatches`)
}

function perAssign(P, bounds) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) => rigids.every((rigid) =>
    findNested(P, present, written, [rigid], GRAMMAR)))
}

function classify(name, P, bounds) {
  const b = boundedValid(P, bounds)
  const bounded = b.verdict === 'valid'
  const p9 = p9s(P, bounds).verdict === 'valid'
  if (!bounded) {
    const rigid = new Map(Object.entries(b.witness))
    const written = [...scan([...P.D, ...P.B]).labels]
    const power = findNested(P, (r, l) => l in rigid.get(`r${r}`), written,
      [rigid], GRAMMAR)
    // A template at θ* says nothing about uniformity: unknown (null).
    return { bounded, uniform: power ? null : false, p9, kind: power ? 'POWER'
      : p9 ? 'BUG: P9s valid, bounded invalid' : 'agree' }
  }
  const uniform = second(P, bounds)
  let kind = 'agree'
  if (p9 && !uniform) {
    kind = 'FLAG: P9s witness outside the grammar, or a P9s defect'
  } else if (!uniform) {
    kind = perAssign(P, bounds) ? 'SEPARATION: type-dependent'
      : 'SEPARATION: beyond the grammar'
  }
  return { bounded, uniform, p9, kind }
}

if (process.argv[2] !== 'A' && process.argv[2] !== 'C') {
  const excluded = CHALLENGES.filter(([, P]) => !inFirstPass(P))
    .map(([n, P]) => [n, P, null])
  const certified = named.filter(([, P]) => p9s(P).verdict === 'valid')
    .map(([n, P]) => [n, P, ['valid', 'found']])
  const tally = {}
  // `--shard=i/n` runs every n-th problem from the i-th, for parallel runs.
  const shardArg = process.argv.find((a) => a.startsWith('--shard='))
  const [shard, shards] = shardArg
    ? shardArg.slice('--shard='.length).split('/').map(Number) : [0, 1]
  const all = [...excluded, ...NESTED, ...certified]
  for (const [name, P, expect] of all.filter((_, i) => i % shards === shard)) {
    const bounds = { ...SECOND, ...(NESTED_BOUNDS[name] ?? {}) }
    const c = classify(name, P, bounds)
    tally[c.kind] = (tally[c.kind] ?? 0) + 1
    const got = [c.bounded ? 'valid' : 'invalid', c.uniform ? 'found' : 'none']
    const wrong = expect && (expect[0] !== got[0] || expect[1] !== got[1])
    console.log(`B ${name}: bounded ${got[0]}, uniform ${got[1]}, P9s ` +
      `${c.p9 ? 'valid' : 'unresolved'}` +
      `${c.kind === 'agree' ? '' : `  [${c.kind}]`}` +
      `${wrong ? '  (CHECK prediction)' : ''}`)
  }
  console.log(`B (${GRAMMAR.tailWritten ? 'amended' : 'as specified'}): ` +
    JSON.stringify(tally))
}
