// Focused regression checks for star-v2 (dossier §18.51;
// sc-statements.md §10.4): the two corrected defects, the fragment
// guard, certificate validation (`certOkY`) and shadowing. Each check
// prints PASS or FAIL; the exit status is the number of failures.
// Run: node research/division-campaign/star/regress.mjs
//
// Modules are imported as namespaces, so the script also runs against
// star-v1 (commit 2ea79ef), where the missing exports make the checks
// that need them fail instead of stopping the run.
import { T } from '../../composition-assessment/sig-oracle/semantics.mjs'
import { patterns } from '../../composition-assessment/sig-oracle/p9s.mjs'
import * as region from './region.mjs'
import * as generic from './generic.mjs'
import * as schematic from './schematic.mjs'
import * as strategies from './strategies.mjs'

const { tails, v, base, fn } = T
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]

let failures = 0
function check(name, f) {
  let ok
  let detail = ''
  try {
    const out = f()
    ok = out === true || out?.ok === true
    if (out?.detail) detail = ` (${out.detail})`
  } catch (e) {
    ok = false
    detail = ` (threw ${e.constructor.name}: ${e.message})`
  }
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail}`)
}
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y)
const verdicts = (P) => ['runE', 'runA', 'runB']
  .map((k) => strategies[k](P)).map((r) => r.verdict +
    (r.cause ? ` (${r.cause})` : ''))
const allValid = (P) => {
  const vs = verdicts(P)
  return { ok: vs.every((x) => x === 'valid'), detail: vs.join('; ') }
}
const problem = (o) => ({ rigidRows: [], rigidTys: [], flexRows: [],
  flexTys: [], D: [], B: [], ...o })
const regionOf = (P, cube = []) => region.makeRegion(
  region.makeIndex(P, generic.writtenLabels(P)),
  new Map(cube.map(([r, l, b]) => [`${r}|${l}`, b])))
const p9sCount = (P) => {
  let n = 0
  for (const _ of patterns(P, generic.writtenLabels(P))) n += 1
  return n
}
const ourCount = (P) => {
  let n = 0
  for (const _ of generic.consistentPatterns(P, generic.writtenLabels(P))) {
    n += 1
  }
  return n
}

// ---- Defect 1: `disjoint r r` forces r empty (§10.1) -------------------

// §10.1's minimal example: the only consistent pattern is empty.
const self = problem({ rigidRows: [0], D: [dis(0, 0)], B: [lacks(0, 'a')] })

console.log('# Defect 1: disjoint r r')
check('d1 possible(0, a) and possibleBoth(0, 0, a) false', () => {
  const R = regionOf(self)
  const p = region.possible(R, 0, 'a')
  const b = region.possibleBoth(R, 0, 0, 'a')
  return { ok: !p && !b, detail: `possible ${p}, possibleBoth ${b}` }
})
check('d1 holderSets(a) = [[]]', () => {
  const hs = generic.holderSets(self, 'a')
  return { ok: same(hs, [[]]), detail: JSON.stringify(hs) }
})
check('d1 nonEmpty false when the cube forces (0, a); check vacuous', () => {
  const R = regionOf(self, [[0, 'a', true]])
  const ne = region.nonEmpty(R)
  const res = schematic.checkAtoms(self, ['a'], R, new Map(), self.B)
  return { ok: !ne && res.ok && res.vacuous === true,
    detail: `nonEmpty ${ne}, check ${JSON.stringify(res)}` }
})
// Two rows; row 0 is self-disjoint, so the pair (0, 1) no longer
// restricts label a and consistentCount takes its `free` path.
const selfPair = problem({ rigidRows: [0, 1], D: [dis(0, 0), dis(0, 1)],
  B: [lacks(0, 'a')] })
for (const [name, P, log2] of [['example', self, 0],
  ['two rows, free path', selfPair, 1]]) {
  check(`d1 consistentCount = enumeration = P9s count (${name})`, () => {
    const c = generic.consistentCount(P, generic.writtenLabels(P))
    const ours = ourCount(P)
    const p9s = p9sCount(P)
    return { ok: c === log2 && 2 ** c === ours && ours === p9s,
      detail: `log2 ${c}, enumerated ${ours}, P9s ${p9s}` }
  })
}
check('d1 E, A and B valid on the example', () => allValid(self))

// ---- Defect 2: a forced unwritten label empties the region (§10.2) -----

const plain = problem({ rigidRows: [0], B: [lacks(0, 'a')] })

console.log('\n# Defect 2: forced unwritten label')
check('d2 nonEmpty false when the cube forces (0, z), z unwritten', () => {
  const ne = region.nonEmpty(regionOf(plain, [[0, 'z', true]]))
  return { ok: !ne, detail: `nonEmpty ${ne}` }
})
check('d2 check vacuous on that region (B leaves no longer refuse)', () => {
  const R = regionOf(plain, [[0, 'z', true]])
  const res = schematic.checkAtoms(plain, ['a'], R, new Map(), plain.B)
  return { ok: res.ok && res.vacuous === true, detail: JSON.stringify(res) }
})
check('d2 control: without the forced z, lacks 0 a still refused', () => {
  const res = schematic.checkAtoms(plain, ['a'], regionOf(plain),
    new Map(), plain.B)
  return { ok: !res.ok, detail: JSON.stringify(res) }
})

// ---- The four queries against brute force (§10.4 item 5) ---------------

// Random small D over rigid rows 0-2 and flexible row 3, self-disjoint
// atoms included; random cubes over rows 0-3 and labels a, b and the
// unwritten z, with bits that contradict D. The region is P9s's
// consistent patterns agreeing with the cube; queries are compared in
// the form `possibleS`/`mustS` take (conjoined with non-emptiness).
console.log('\n# Region queries against brute force')
check('queries exact on 4000 random problems and cubes', () => {
  // mulberry32, fixed seed (a low-bit LCG cycles too soon here).
  let seed = 12345
  const rand = (n) => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296 * n) | 0
  }
  const rows = [0, 1, 2, 3]
  const labels = ['a', 'b', 'z']
  let cases = 0
  for (let trial = 0; trial < 4000; trial++) {
    const rigidRows = [0, 1, 2].slice(0, 1 + rand(3))
    const D = []
    for (let k = rand(4); k > 0; k--) {
      D.push(rand(2) ? lacks(rand(4), ['a', 'b'][rand(2)])
        : dis(rand(4), rand(4)))
    }
    const P = problem({ rigidRows, flexRows: [3], D,
      B: [lacks(3, 'a'), lacks(3, 'b')] })
    const cube = []
    for (let k = rand(4); k > 0; k--) {
      const bit = [rows[rand(4)], labels[rand(3)]]
      if (!cube.some(([r, l]) => r === bit[0] && l === bit[1])) {
        cube.push([...bit, rand(2) === 1])
      }
    }
    const R = regionOf(P, cube)
    const pats = [...patterns(P, ['a', 'b'])]
    const at = (p, r, l) => Boolean(p(r, l))
    const inRegion = pats.filter((p) =>
      cube.every(([r, l, b]) => at(p, r, l) === b))
    const ne = region.nonEmpty(R)
    const why = (q) => `${q} on D ${JSON.stringify(D)}, rigid ` +
      `${JSON.stringify(rigidRows)}, cube ${JSON.stringify(cube)}`
    if (ne !== inRegion.length > 0) {
      return { ok: false, detail: why('nonEmpty') }
    }
    for (const r of rows) {
      for (const l of labels) {
        cases += 1
        const some = inRegion.some((p) => at(p, r, l))
        const all = inRegion.every((p) => at(p, r, l))
        if ((ne && region.possible(R, r, l)) !== some) {
          return { ok: false, detail: why(`possible(${r}, ${l})`) }
        }
        if ((!ne || region.must(R, r, l)) !== all) {
          return { ok: false, detail: why(`must(${r}, ${l})`) }
        }
        for (const s of rows) {
          const both = inRegion.some((p) => at(p, r, l) && at(p, s, l))
          if ((ne && region.possibleBoth(R, r, s, l)) !== both) {
            return { ok: false, detail: why(`possibleBoth(${r}, ${s}, ${l})`) }
          }
        }
      }
    }
  }
  return { ok: true, detail: `${cases} (row, label) cases` }
})

// ---- Fragment guard (`fragmentS`, sc-statements.md §5) -----------------

console.log('\n# Fragment guard')
const outsideAll = (P) => {
  const vs = verdicts(P)
  return { ok: vs.every((x) => x === 'unresolved (outside fragment)'),
    detail: vs.join('; ') }
}
check('guard: D = [ff], B = [] unresolved in E, A, B', () =>
  outsideAll(problem({ D: [['ff']] })))
check('guard: D = [{...r0} = {}] unresolved in E, A, B', () =>
  outsideAll(problem({ rigidRows: [0], D: [eq(tails(0), tails())],
    B: [lacks(0, 'a')] })))
check('guard: lacks on a flexible row in D unresolved in E, A, B', () =>
  outsideAll(problem({ rigidRows: [0], flexRows: [1], D: [lacks(1, 'a')],
    B: [eq(tails(1), tails(1))] })))
check('guard: disjoint with an undeclared row unresolved in E, A, B', () =>
  outsideAll(problem({ rigidRows: [0], D: [dis(0, 7)],
    B: [lacks(0, 'a')], flexRows: [] })))
check('guard: checkAtoms refuses outside the fragment', () => {
  const P = problem({ D: [['ff']] })
  const res = schematic.checkAtoms(P, [], regionOf(P), new Map(), [])
  return { ok: !res.ok && res.reason === 'outside fragment',
    detail: JSON.stringify(res) }
})
check('guard: fragmentS true on the recorded families and examples',
  () => [self, selfPair, plain].every((P) => region.fragmentS(P)))

// ---- Certificate validation (`certOkY`) and shadowing ------------------

// Rigid rows 0, 1 (not declared disjoint), flexible rows 2, 3, type
// variable 1. B: { ...u2 } = { ...r0 }. Label a is written (D).
const C = problem({ rigidRows: [0, 1], flexRows: [2, 3], flexTys: [1],
  D: [lacks(1, 'a')], B: [eq(tails(2), tails(0))] })
const piece = (r, ex = []) => ({ r, ex })
const recV = (fields, pieces) => ({ k: 'r', fields, pieces })
const intV = { k: 'b', b: 'Int' }
const good = recV([], [piece(0)])
const checkC = (cert, cube = []) =>
  schematic.checkAtoms(C, ['a'], regionOf(C, cube), cert, C.B)
const accepts = (cert, cube) => {
  const res = checkC(cert, cube)
  return { ok: res.ok, detail: JSON.stringify(res) }
}
const refuses = (cert, cube) => {
  const res = checkC(cert, cube)
  return { ok: !res.ok, detail: JSON.stringify(res) }
}

console.log('\n# Certificate validation (certOkY)')
check('cert: u2 := r0 accepted', () => accepts(new Map([['r2', good]])))
check('cert: unused piece on a non-rigid row refused', () =>
  refuses(new Map([['r2', good], ['r3', recV([], [piece(2)])]])))
check('cert: used piece on a non-rigid row refused', () => {
  const P = problem({ rigidRows: [0], flexRows: [2, 3],
    D: [lacks(0, 'a')], B: [eq(tails(2), tails(2))] })
  const res = schematic.checkAtoms(P, ['a'], regionOf(P),
    new Map([['r2', recV([], [piece(3)])]]), P.B)
  return { ok: !res.ok, detail: JSON.stringify(res) }
})
check('cert: unused undeclared pieces {...r0, ...r1} refused (W3)', () =>
  refuses(new Map([['r2', good],
    ['t1', recV([], [piece(0), piece(1)])]])))
check('cert: non-rigid piece nested in an arrow and a field refused', () =>
  refuses(new Map([['r2', good],
    ['t1', fn(intV, recV([['a', recV([], [piece(3)])]], []))]])))
check('cert: unused row bound to a non-record refused', () =>
  refuses(new Map([['r2', good], ['r3', intV]])))
check('cert: unused written field clashing with a piece refused', () =>
  refuses(new Map([['r2', good],
    ['t1', recV([['a', intV]], [piece(0)])]])))
check('cert: duplicate field labels refused (composition)', () =>
  refuses(new Map([['r2', good],
    ['t1', recV([['a', intV], ['a', intV]], [])]])))

console.log('\n# Shadowing (first binding read, every binding checked)')
check('shadow: first binding read (u2 := r0 then u2 := r1) accepted', () =>
  accepts([['r2', good], ['r2', recV([], [piece(1)])]]))
check('shadow: first binding read (u2 := r1 then u2 := r0) refused', () =>
  refuses([['r2', recV([], [piece(1)])], ['r2', good]]))
check('shadow: ill-formed shadowed binding refused', () =>
  refuses([['r2', good], ['r2', recV([], [piece(3)])]]))

console.log('\n# certOkY on an empty region (cube forces unwritten z)')
const emptyCube = [[0, 'z', true]]
check('empty region: wrong but well-formed certificate passes', () =>
  accepts(new Map([['r2', recV([], [piece(1)])]]), emptyCube))
check('empty region: non-rigid piece still refused', () =>
  refuses(new Map([['r2', recV([], [piece(3)])]]), emptyCube))
check('empty region: undeclared pieces still refused', () =>
  refuses(new Map([['r2', recV([], [piece(0), piece(1)])]]), emptyCube))
check('empty region: field beside a piece passes (possibleS false)', () =>
  accepts(new Map([['r2', good],
    ['t1', recV([['a', intV]], [piece(0)])]]), emptyCube))

// ---- Controls (§10.4 item 6) -------------------------------------------

// E valid, A and B as recorded in results/crosscheck.txt (the families'
// predictions; §10.4 item 6 says divide3 2 is valid in A, but A has
// always answered Unresolved there, as predicted).
console.log('\n# Controls')
const { FAMILIES } = await import('./problems.mjs')
const family = (name) => FAMILIES.find((f) => f.name === name)
for (const [name, n] of [['star', 1], ['star', 2], ['divide3', 2],
  ['dep', 2]]) {
  const want = ['valid', ...family(name).expect.slice(1)]
  check(`control: ${name} ${n}: E, A, B ${want.join(', ')}`, () => {
    const vs = verdicts(family(name).make(n))
    return { ok: vs.every((x, i) => x.split(' ')[0] === want[i]),
      detail: vs.join('; ') }
  })
}
check('control: star-undeclared 2 unresolved in E, A, B', () => {
  const vs = verdicts(family('star-undeclared').make(2))
  return { ok: vs.every((x) => x.startsWith('unresolved')),
    detail: vs.join('; ') }
})
check('control: version recorded in outputs', () =>
  strategies.runA(self).version === 'star-v2')

console.log(`\n${failures} failed`)
process.exitCode = failures
