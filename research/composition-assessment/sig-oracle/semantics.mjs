// Ground semantics of the call-site constraint language (dossier §10),
// mirroring research/composition-proofs/Composition/Syntax.lean. Ground
// values are canonical strings, so equality is string equality: a base
// type or atom is its name, a function `(A->B)`, a record `{l:T,...}`
// with labels sorted. Rows are plain objects from label to ground string.
//
// Type expressions: { k: 'b', b } base or atom, { k: 'v', n } type
// variable, { k: 'f', a, c } function, { k: 'r', fields: [[l, t]],
// tails: [row ids] } record. Atoms: ['eq', t, u], ['lacks', r, l],
// ['disjoint', r, s], ['ff'].

export function recordString(row) {
  const keys = Object.keys(row).sort()
  return '{' + keys.map((k) => `${k}:${row[k]}`).join(',') + '}'
}

// The row a record expression denotes, or null when two of its parts
// share a label (disjoint composition undefined) or a field is undefined.
export function recordRow(theta, t) {
  const row = {}
  for (const [l, ft] of t.fields) {
    const g = evalT(theta, ft)
    if (g === null || l in row) return null
    row[l] = g
  }
  for (const r of t.tails) {
    const part = theta.row(r)
    for (const l of Object.keys(part)) {
      if (l in row) return null
      row[l] = part[l]
    }
  }
  return row
}

export function evalT(theta, t) {
  switch (t.k) {
    case 'b': return t.b
    case 'v': return theta.ty(t.n)
    case 'f': {
      const a = evalT(theta, t.a)
      const c = evalT(theta, t.c)
      return a === null || c === null ? null : `(${a}->${c})`
    }
    case 'r': {
      const row = recordRow(theta, t)
      if (row === null) return null
      if (theta.check && !theta.check(row)) return null
      return recordString(row)
    }
  }
  throw new Error(`unknown expression ${t.k}`)
}

export function holds(theta, atom) {
  switch (atom[0]) {
    case 'eq': {
      const a = evalT(theta, atom[1])
      return a !== null && a === evalT(theta, atom[2])
    }
    case 'lacks': return !(atom[2] in theta.row(atom[1]))
    case 'disjoint': {
      const r = theta.row(atom[1])
      const s = theta.row(atom[2])
      if (Object.keys(r).some((l) => l in s)) return false
      return theta.disjointOk ? theta.disjointOk(r, s) : true
    }
    case 'ff': return false
  }
  throw new Error(`unknown atom ${atom[0]}`)
}

export function sat(theta, atoms) {
  return atoms.every((a) => holds(theta, a))
}

// Variables and labels a problem mentions.
export function scan(atoms) {
  const out = { labels: new Set(), rows: new Set(), tys: new Set() }
  for (const a of atoms) scanAtom(a, out)
  return out
}

function scanAtom(a, out) {
  if (a[0] === 'eq') {
    scanExpr(a[1], out)
    scanExpr(a[2], out)
  } else if (a[0] === 'lacks') {
    out.rows.add(a[1])
    out.labels.add(a[2])
  } else if (a[0] === 'disjoint') {
    out.rows.add(a[1])
    out.rows.add(a[2])
  }
}

function scanExpr(t, out) {
  if (t.k === 'v') out.tys.add(t.n)
  if (t.k === 'f') {
    scanExpr(t.a, out)
    scanExpr(t.c, out)
  }
  if (t.k === 'r') {
    for (const [l, ft] of t.fields) {
      out.labels.add(l)
      scanExpr(ft, out)
    }
    for (const r of t.tails) out.rows.add(r)
  }
}

// Every row over `labels`, each label absent or one of `types`.
export function rowsOver(labels, typesAt) {
  let rows = [{}]
  for (const l of labels) {
    const next = []
    for (const row of rows) {
      next.push(row)
      for (const ty of typesAt(l)) next.push({ ...row, [l]: ty })
    }
    rows = next
  }
  return rows
}

// Every combination of one value per key.
export function* product(keys, valuesOf) {
  if (keys.length === 0) {
    yield new Map()
    return
  }
  const [first, ...rest] = keys
  for (const tail of product(rest, valuesOf)) {
    for (const v of valuesOf(first)) yield new Map(tail).set(first, v)
  }
}

// Values of the subexpressions of `atoms` that mention no type variable
// in `flexTys`, under `theta`: candidates for flexible type variables
// beyond the fixed bounded domain (nested records the problem builds).
export function builtValues(theta, atoms, flexTys) {
  const out = new Set()
  const visit = (t) => {
    if (t.k === 'f') {
      visit(t.a)
      visit(t.c)
    }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
    if (mentionsAny(t, flexTys)) return
    const g = evalT(theta, t)
    if (g !== null) out.add(g)
  }
  for (const a of atoms) {
    if (a[0] === 'eq') {
      visit(a[1])
      visit(a[2])
    }
  }
  return out
}

function mentionsAny(t, tys) {
  if (t.k === 'v') return tys.has(t.n)
  if (t.k === 'f') return mentionsAny(t.a, tys) || mentionsAny(t.c, tys)
  if (t.k === 'r') return t.fields.some(([, ft]) => mentionsAny(ft, tys))
  return false
}

// Shorthands for writing problems.
export const T = {
  base: (b) => ({ k: 'b', b }),
  v: (n) => ({ k: 'v', n }),
  fn: (a, c) => ({ k: 'f', a, c }),
  rec: (fields, tails) => ({ k: 'r', fields, tails }),
  tails: (...rs) => ({ k: 'r', fields: [], tails: rs }),
}
