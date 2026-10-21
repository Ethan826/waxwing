// P9s (dossier §13.4, §13.7), bounded: the candidate sound, incomplete
// checker. For each rigid presence pattern over the written labels
// consistent with D, it builds the generic rigid assignment: rigid row r
// holds its present written labels at atoms `A{r}{l}` and one rest
// label `ρ{r}` at atom `R{r}`; a rigid type variable n is the atom
// `T{n}`. It then searches flexible assignments in which a rest is held
// wholly (label `ρ{r}` at `R{r}`) or not at all, under the side
// condition that any requirement that two different rests be disjoint
// (inside one row, in a composition, or by a `disjoint` atom) needs a
// declared `disjoint` between their rigid rows. Valid iff every pattern
// has a flexible solution; otherwise Unresolved, never Contradiction.
// The flexible search is bounded (README.md).
import { scan, rowsOver, product } from './semantics.mjs'
import { DEFAULT_BOUNDS, findSolution } from './bounded.mjs'

const rest = (r) => `ρ${r}`

function declaredPairs(D) {
  const pairs = new Set()
  for (const a of D) {
    if (a[0] === 'disjoint') {
      pairs.add(`${a[1]}|${a[2]}`)
      pairs.add(`${a[2]}|${a[1]}`)
    }
  }
  return pairs
}

function restsIn(row) {
  return Object.keys(row).filter((l) => l.startsWith('ρ'))
    .map((l) => Number(l.slice(1)))
}

function restsOk(declared, xs, ys) {
  for (const r of xs) {
    for (const s of ys) {
      if (r !== s && !declared.has(`${r}|${s}`)) return false
    }
  }
  return true
}

export function* patterns(P, labels) {
  const pairs = P.rigidRows.flatMap((r) => labels.map((l) => [r, l]))
  for (const choice of product(pairs.map(String), () => [false, true])) {
    const present = (r, l) => choice.get(String([r, l]))
    if (consistent(P.D, present, labels)) yield present
  }
}

function consistent(D, present, labels) {
  for (const a of D) {
    if (a[0] === 'lacks' && present(a[1], a[2])) return false
    if (a[0] === 'disjoint') {
      for (const l of labels) {
        if (present(a[1], l) && present(a[2], l)) return false
      }
    }
  }
  return true
}

function genericRigid(P, labels, present) {
  const rigid = new Map()
  for (const r of P.rigidRows) {
    const row = { [rest(r)]: `R${r}` }
    for (const l of labels) if (present(r, l)) row[l] = `A${r}${l}`
    rigid.set(`r${r}`, row)
  }
  for (const n of P.rigidTys) rigid.set(`t${n}`, `T${n}`)
  return rigid
}

function atomsOf(P, labels) {
  const atoms = P.rigidRows.map((r) => `R${r}`)
  for (const r of P.rigidRows) for (const l of labels) atoms.push(`A${r}${l}`)
  return [...atoms, ...P.rigidTys.map((n) => `T${n}`)]
}

export function p9s(P, bounds = DEFAULT_BOUNDS) {
  for (const w of witnesses(P, bounds)) {
    if (w.flex === null) return { verdict: 'unresolved', pattern: w.pattern }
  }
  return { verdict: 'valid' }
}

// One entry per pattern: the generic rigid assignment and the flexible
// solution found for it (null if none). `sideCondition: false` drops the
// side condition (a mutant, for power checks only).
export function* witnesses(P, bounds = DEFAULT_BOUNDS, sideCondition = true) {
  const labels = [...scan([...P.D, ...P.B]).labels]
  const declared = declaredPairs(P.D)
  const ok = (xs, ys) => !sideCondition || restsOk(declared, xs, ys)
  const atoms = atomsOf(P, labels)
  const fieldTypes = [...bounds.flexFieldTypes, ...atoms]
  const restLabels = P.rigidRows.map(rest)
  const typesAt = (l) => (l.startsWith('ρ') ? [`R${l.slice(1)}`] : fieldTypes)
  const flexRows = rowsOver([...labels, ...restLabels], typesAt)
    .filter((row) => ok(restsIn(row), restsIn(row)))
  const tyValues = [...bounds.tyValues, ...atoms]
  const extend = {
    check: (row) => ok(restsIn(row), restsIn(row)),
    disjointOk: (x, y) => ok(restsIn(x), restsIn(y)),
  }
  for (const present of patterns(P, labels)) {
    const rigid = genericRigid(P, labels, present)
    const flex = findSolution(P, rigid, flexRows, tyValues, extend)
    yield { present, labels, rigid, flex, extend,
      pattern: describe(P, labels, present) }
  }
}

function describe(P, labels, present) {
  return P.rigidRows.map((r) =>
    `${r}:{${labels.filter((l) => present(r, l)).join(',')}}`).join(' ')
}
