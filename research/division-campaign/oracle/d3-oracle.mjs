// Stream 4 confirmation run of the typed term-witness oracle under the
// grammar frozen in frozen-grammar.md (§18.9's amended grammar, §18.8's
// bounds). Classification as in sig-oracle/nested-oracle.mjs, which it
// reuses through its exported searches; nested-oracle.mjs itself runs at
// import, so its classify is restated here.
// Run (from this directory):
//   node d3-oracle.mjs named [--shard=i/n]
//   node d3-oracle.mjs gen <count> <seed> [--shard=i/n]
//   node d3-oracle.mjs brute named|gen <count> <seed> [--shard=i/n]
//   node d3-oracle.mjs list named|gen <count> <seed>
import { sat, scan, rowsOver, product }
  from '../../composition-assessment/sig-oracle/semantics.mjs'
import { boundedValid, labelsOf, makeTheta }
  from '../../composition-assessment/sig-oracle/bounded.mjs'
import { p9s, patterns } from '../../composition-assessment/sig-oracle/p9s.mjs'
import { findNested }
  from '../../composition-assessment/sig-oracle/nested-search.mjs'
import { bruteNested }
  from '../../composition-assessment/sig-oracle/nested-brute.mjs'
import { NAMED, GRAMMAR, SECOND, boundsFor, bruteSize } from './d3-set.mjs'
import { d3Generator, d3Shape, GENERATED_BOUNDS } from './d3-grammar.mjs'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const shardArg = process.argv.find((a) => a.startsWith('--shard='))
const [shard, shards] = shardArg
  ? shardArg.slice('--shard='.length).split('/').map(Number) : [0, 1]
const mine = (_, i) => i % shards === shard
const LARGER_EXTRA = { unwritten: ['z1', 'z2', 'z3'] }

function groups(P, bounds) {
  const written = [...scan([...P.D, ...P.B]).labels]
  const rows = rowsOver(labelsOf(P, bounds), () => bounds.rigidRowTypes)
  const keys = [...P.rigidRows.map((r) => `r${r}`),
    ...P.rigidTys.map((n) => `t${n}`)]
  const all = [...product(keys, (k) => (k[0] === 'r' ? rows : bounds.tyValues))]
    .filter((rigid) => sat(makeTheta(rigid, new Map()), P.D))
  return { written, all, groups: [...patterns(P, written)].map((present) => ({
    present, rigids: all.filter((rigid) => P.rigidRows.every((r) =>
      written.every((l) => (l in rigid.get(`r${r}`)) === present(r, l)))) })) }
}

function uniformWith(find, P, bounds) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) =>
    rigids.length === 0 || find(present, written, rigids))
}

const decomposed = (P, bounds, grammar = GRAMMAR) => uniformWith(
  (present, written, rs) => findNested(P, present, written, rs, grammar),
  P, bounds)

function perAssign(P, bounds) {
  const { written, groups: gs } = groups(P, bounds)
  return gs.every(({ present, rigids }) => rigids.every((rigid) =>
    findNested(P, present, written, [rigid], GRAMMAR)))
}

function classify(P, bounds) {
  const b = boundedValid(P, bounds)
  const bounded = b.verdict === 'valid'
  const p9 = p9s(P, bounds).verdict === 'valid'
  if (!bounded) {
    const rigid = new Map(Object.entries(b.witness))
    const written = [...scan([...P.D, ...P.B]).labels]
    const power = findNested(P, (r, l) => l in rigid.get(`r${r}`), written,
      [rigid], GRAMMAR)
    return { bounded, uniform: power ? null : false, p9, checked: b.checked,
      witness: b.witness, kind: power ? 'POWER: bounded domain'
        : p9 ? 'BUG: P9s valid, bounded invalid' : 'agree' }
  }
  const uniform = decomposed(P, bounds)
  let kind = 'agree'
  if (p9 && !uniform) {
    kind = 'FLAG: P9s witness outside the grammar, or a P9s defect'
  } else if (!uniform) {
    kind = perAssign(P, bounds) ? 'SEPARATION: type-dependent'
      : 'SEPARATION: beyond the grammar'
  }
  return { bounded, uniform, p9, checked: b.checked, kind }
}

// Shrink a flagged problem: drop atoms of B, then of D, while the kind
// persists; then try smaller bounds (one unwritten label, one rigid
// field type, fewer type values), keeping each that preserves the kind.
function minimize(P, bounds, kind) {
  let cur = P
  for (let shrunk = true; shrunk;) {
    shrunk = false
    for (const part of ['B', 'D']) {
      for (let i = 0; i < cur[part].length; i++) {
        const next = reshape(part === 'D'
          ? { ...cur, D: cur.D.filter((_, j) => j !== i) }
          : { ...cur, B: cur.B.filter((_, j) => j !== i) })
        if (next.B.length > 0 && classify(next, bounds).kind === kind) {
          cur = next
          shrunk = true
        }
      }
    }
  }
  let b = bounds
  const tries = [{ unwritten: ['z1'] }, { rigidRowTypes: ['Int'] },
    { tyValues: ['Int', '{}'] }, { flexFieldTypes: ['Int', '{}'] }]
  for (const t of tries) {
    const next = { ...b, ...t }
    if (classify(cur, next).kind === kind) b = next
  }
  return { problem: cur, bounds: b }
}

function reshape(P) {
  const used = scan([...P.D, ...P.B])
  return { ...P, rigidRows: P.rigidRows.filter((r) => used.rows.has(r)),
    flexRows: P.flexRows.filter((r) => used.rows.has(r)),
    rigidTys: P.rigidTys.filter((n) => used.tys.has(n)),
    flexTys: P.flexTys.filter((n) => used.tys.has(n)) }
}

function report(name, P, bounds, expect) {
  const start = Date.now()
  const c = classify(P, bounds)
  const secs = (Date.now() - start) / 1000
  const got = [c.bounded ? 'valid' : 'invalid',
    c.uniform === null ? 'unknown' : c.uniform ? 'found' : 'none',
    c.p9 ? 'valid' : 'unresolved']
  const wrong = expect && expect.some((x, i) => x !== null && x !== got[i])
  const out = { name, bounded: got[0], uniform: got[1], p9s: got[2],
    kind: c.kind, expect, predicted: expect ? !wrong : null,
    checked: c.checked, secs }
  if (c.kind !== 'agree') {
    out.minimized = minimize(P, bounds, c.kind)
    if (c.kind.startsWith('SEPARATION')) {
      out.largerBounded = boundedValid(out.minimized.problem,
        { ...out.minimized.bounds, ...LARGER_EXTRA }).verdict
    }
    out.problem = P
  }
  console.log(JSON.stringify(out))
}

function generated(count, seed) {
  const generate = d3Generator(seed)
  return Array.from({ length: count }, (_, i) =>
    [`gen${seed}-${i}`, generate()])
}

const genBounds = { ...SECOND, ...GENERATED_BOUNDS }

if (args[0] === 'named') {
  for (const [name, P, expect] of NAMED.filter(mine)) {
    report(name, P, boundsFor(name), expect)
  }
} else if (args[0] === 'gen') {
  for (const [name, P] of generated(Number(args[1]), Number(args[2]))
    .filter(mine)) {
    report(name, d3Shape(P.D, P.B), genBounds, null)
  }
} else if (args[0] === 'brute') {
  const pool = args[1] === 'named'
    ? NAMED.map(([name, P]) => [name, P, boundsFor(name)])
    : generated(Number(args[2]), Number(args[3]))
      .map(([name, P]) => [name, P, genBounds])
  for (const [name, P, bounds] of pool.filter(mine)) {
    const g = groups(P, bounds)
    const size = bruteSize(P, g)
    if (size > 5e7) {
      console.log(JSON.stringify({ name, brute: 'skipped', size }))
      continue
    }
    const start = Date.now()
    const a = uniformWith((present, written, rs) =>
      bruteNested(P, present, written, rs, GRAMMAR), P, bounds)
    const b = decomposed(P, bounds)
    console.log(JSON.stringify({ name, size, brute: a, decomposed: b,
      match: a === b, secs: (Date.now() - start) / 1000 }))
  }
} else if (args[0] === 'list') {
  // The problem set itself, without running anything (for the freeze).
  const pool = args[1] === 'named' ? NAMED
    : generated(Number(args[2]), Number(args[3]))
  for (const [name, P, expect] of pool) {
    console.log(JSON.stringify({ name, P, expect }))
  }
} else {
  console.log('usage: named | gen <count> <seed> | brute named|gen ...')
}

