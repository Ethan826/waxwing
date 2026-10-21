// Research code (protocol.md), not a checker anyone relies on.
//
// A region is the set of presence patterns consistent with D (dossier
// §14.1) that also agree with a cube: a partial map from bits (r, l) to
// true or false. D's lacks and disjoint atoms constrain each label
// separately (consistentPatterns in Sig/SlicePatterns.lean is their
// product), and each label's family of allowed holder sets is closed
// under removing a holder. A cube adds forced holders and forced
// absences per label. So, for one label l with forced holders T_l:
//
//   the region is empty      iff  T_l is not allowed, for some l;
//   some pattern has r at l  iff  T_l ∪ {r} is allowed;
//   every pattern has r at l iff  r ∈ T_l (if the region is non-empty);
//   some pattern has r and s iff  T_l ∪ {r, s} is allowed.
//
// These four queries are how the symbolic check quantifies over every
// pattern of the region. Their exactness is obligation SC2 in
// report.md; nothing here proves it. The counters measure coverage
// work (protocol.md, "Costs").

export function makeIndex(P, labels) {
  const rigid = new Set(P.rigidRows)
  const lacks = new Map()
  const apart = new Set()
  for (const a of P.D) {
    if (a[0] === 'lacks' && rigid.has(a[1])) {
      if (!lacks.has(a[2])) lacks.set(a[2], new Set())
      lacks.get(a[2]).add(a[1])
    }
    if (a[0] === 'disjoint' && rigid.has(a[1]) && rigid.has(a[2])) {
      apart.add(`${a[1]}|${a[2]}`)
      apart.add(`${a[2]}|${a[1]}`)
    }
  }
  return { rigid, labels: new Set(labels), lacks, apart }
}

export const declared = (index, r, s) => index.apart.has(`${r}|${s}`)

const bitKey = (r, l) => `${r}|${l}`

// A region: the index, a cube (Map from bitKey to Boolean) and counters.
export function makeRegion(index, cube = new Map(), stats = newStats()) {
  const forced = new Map()
  for (const [key, value] of cube) {
    if (!value) continue
    const bar = key.indexOf('|')
    const r = Number(key.slice(0, bar))
    const l = key.slice(bar + 1)
    if (!forced.has(l)) forced.set(l, [])
    forced.get(l).push(r)
  }
  return { index, cube, forced, stats }
}

export function newStats() {
  return { queries: 0, queryNs: 0n }
}

function allowed(region, l, holders) {
  const { index, cube } = region
  const lacking = index.lacks.get(l)
  for (const r of holders) {
    if (!index.rigid.has(r)) return false
    if (lacking && lacking.has(r)) return false
    if (cube.get(bitKey(r, l)) === false) return false
  }
  for (let i = 0; i < holders.length; i++) {
    for (let j = i + 1; j < holders.length; j++) {
      if (holders[i] === holders[j]) continue
      if (declared(index, holders[i], holders[j])) return false
    }
  }
  return true
}

function timed(region, f) {
  const start = process.hrtime.bigint()
  const out = f()
  region.stats.queries += 1
  region.stats.queryNs += process.hrtime.bigint() - start
  return out
}

const forcedAt = (region, l) => region.forced.get(l) ?? []

// Labels outside the problem's written labels are never held by a
// generic rigid row (only written labels and rests are).
export function possible(region, r, l) {
  return timed(region, () => region.index.labels.has(l) &&
    allowed(region, l, [...forcedAt(region, l), r]))
}

export function must(region, r, l) {
  return timed(region, () => forcedAt(region, l).includes(r))
}

export function possibleBoth(region, r, s, l) {
  return timed(region, () => region.index.labels.has(l) &&
    allowed(region, l, [...forcedAt(region, l), r, s]))
}

export function nonEmpty(region) {
  return timed(region, () => [...region.forced.keys()].every((l) =>
    allowed(region, l, forcedAt(region, l))))
}

export function isFixed(region, r, l) {
  return region.cube.has(bitKey(r, l))
}

export function extend(region, r, l, value) {
  const cube = new Map(region.cube).set(bitKey(r, l), value)
  return makeRegion(region.index, cube, region.stats)
}
