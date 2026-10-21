// Research code (protocol.md): untrusted search. Row unification with
// rigid tails in the style of Wand (LICS 1987) and Rémy (POPL 1989),
// as presented for scoped labels by Leijen (TFP 2005) and for lacks
// predicates by Gaster and Jones (1996): a record is written fields,
// rigid pieces and at most one open flexible tail per side; unifying two
// records matches common labels and gives each flexible tail the other
// side's leftovers plus a shared fresh tail. Only equations are solved;
// lacks and disjoint atoms are left to the checker. A record with two
// open flexible tails (a split, {...r} = {...u, ...t}) is deferred and,
// if still stuck, guessed: the first tail takes everything. Whatever
// this returns is only a candidate; schematic.mjs decides.
//
// `expand` (for the exhaustive baseline) replaces each rigid tail by the
// explicit fields of a pattern's generic row, so the same unifier
// searches one pattern at a time.
import { empty, constA } from './schematic.mjs'

class Clash extends Error {}

export function unifyProblem(P, atoms, expand = null) {
  const st = { P, expand, rows: new Map(), tys: new Map(), fresh: 0,
    steps: 0, lacks: new Map() }
  const avoid = (row, label) => {
    const u = `r${row}`
    if (!st.lacks.has(u)) st.lacks.set(u, new Set())
    st.lacks.get(u).add(label)
  }
  const rigid = (r) => P.rigidRows.includes(r)
  const declared = (r, s) => P.D.some((d) => d[0] === 'disjoint' &&
    ((d[1] === r && d[2] === s) || (d[1] === s && d[2] === r)))
  for (const a of atoms) {
    if (a[0] === 'lacks' && !rigid(a[1])) avoid(a[1], a[2])
    // `u disjoint s`, s rigid: u may not hold the rest of a rigid row
    // that is not declared disjoint from s.
    if (a[0] === 'disjoint') {
      for (const [u, s] of [[a[1], a[2]], [a[2], a[1]]]) {
        if (rigid(u) || !rigid(s)) continue
        for (const r of P.rigidRows) {
          if (r === s || !declared(r, s)) avoid(u, `ρ${r}`)
        }
      }
    }
  }
  let queue = atoms.filter((a) => a[0] === 'eq').map((a) =>
    [term(st, a[1]), term(st, a[2])])
  try {
    for (let guessing = false; queue.length > 0;) {
      const stuck = []
      for (const [x, y] of queue) {
        if (!unify(st, x, y, guessing)) stuck.push([x, y])
      }
      if (stuck.length === queue.length) {
        if (guessing) return { ok: false, reason: 'stuck', steps: st.steps }
        guessing = true
      }
      queue = stuck
    }
  } catch (e) {
    if (!(e instanceof Clash)) throw e
    return { ok: false, reason: e.message, steps: st.steps }
  }
  return { ok: true, cert: certificate(st), steps: st.steps }
}

// Terms: { k: 'b' }, { k: 'f' }, { k: 'v', n } (flexible type variable),
// { k: 'r', fields, pieces, open: [flexible row ids] }.
function term(st, t) {
  const { P } = st
  switch (t.k) {
    case 'b': return t
    case 'v':
      return P.rigidTys.includes(t.n) ? { k: 'b', b: `T${t.n}` } : t
    case 'f': return { k: 'f', a: term(st, t.a), c: term(st, t.c) }
    case 'r': {
      const out = { k: 'r', fields: t.fields.map(([l, ft]) =>
        [l, term(st, ft)]), pieces: [], open: [] }
      for (const r of t.tails) {
        if (!P.rigidRows.includes(r)) out.open.push(`r${r}`)
        else if (st.expand) {
          for (const [l, g] of st.expand(r)) out.fields.push([l, g])
        } else out.pieces.push({ r, ex: [] })
      }
      return out
    }
  }
  throw new Error(`unknown expression ${t.k}`)
}

function resolve(st, t) {
  while (t.k === 'v' && st.tys.has(t.n)) t = st.tys.get(t.n)
  return t
}

// A record with bound flexible tails expanded.
function norm(st, t) {
  const out = { k: 'r', fields: [...t.fields], pieces: [...t.pieces],
    open: [] }
  for (const u of t.open) {
    if (st.rows.has(u)) {
      const inner = norm(st, st.rows.get(u))
      out.fields.push(...inner.fields)
      out.pieces.push(...inner.pieces)
      out.open.push(...inner.open)
    } else out.open.push(u)
  }
  return out
}

const pieceKey = (p) => `${p.r}/${[...p.ex].sort().join(',')}`

function occurs(st, name, t) {
  t = resolve(st, t)
  if (t.k === 'v') return `t${t.n}` === name
  if (t.k === 'f') return occurs(st, name, t.a) || occurs(st, name, t.c)
  if (t.k === 'r') {
    const n = norm(st, t)
    return n.open.includes(name) || n.fields.some(([, ft]) =>
      occurs(st, name, ft))
  }
  return false
}

function bindRow(st, u, value) {
  if (occurs(st, u, value)) throw new Clash(`occurs ${u}`)
  st.rows.set(u, value)
}

// true if solved, false if deferred (two open tails on one side).
function unify(st, x, y, guessing) {
  st.steps += 1
  x = resolve(st, x)
  y = resolve(st, y)
  if (x.k === 'v' || y.k === 'v') {
    if (x.k === 'v' && y.k === 'v' && x.n === y.n) return true
    const [v, other] = x.k === 'v' ? [x, y] : [y, x]
    if (occurs(st, `t${v.n}`, other)) throw new Clash(`occurs t${v.n}`)
    st.tys.set(v.n, other)
    return true
  }
  if (x.k !== y.k) throw new Clash('kinds differ')
  if (x.k === 'b') {
    if (x.b !== y.b) throw new Clash(`${x.b} against ${y.b}`)
    return true
  }
  if (x.k === 'f') {
    return unify(st, x.a, y.a, guessing) && unify(st, x.c, y.c, guessing)
  }
  const a = norm(st, x)
  const b = norm(st, y)
  if (!guessing && (a.open.length > 1 || b.open.length > 1)) return false
  const fa = new Map(a.fields)
  const fb = new Map(b.fields)
  for (const [l, t] of fa) {
    if (fb.has(l) && !unify(st, t, fb.get(l), guessing)) return false
  }
  const onlyA = a.fields.filter(([l]) => !fb.has(l))
  const onlyB = b.fields.filter(([l]) => !fa.has(l))
  const ka = new Set(a.pieces.map(pieceKey))
  const kb = new Set(b.pieces.map(pieceKey))
  const pa = a.pieces.filter((p) => !kb.has(pieceKey(p)))
  const pb = b.pieces.filter((p) => !ka.has(pieceKey(p)))
  const leftA = { k: 'r', fields: onlyA, pieces: pa, open: [] }
  const leftB = { k: 'r', fields: onlyB, pieces: pb, open: [] }
  const openA = a.open.filter((u) => !b.open.includes(u))
  const openB = b.open.filter((u) => !a.open.includes(u))
  // A split guess (AMENDMENT 2, protocol.md): open tails on one side
  // only, several of them: each leftover field goes to the first tail
  // not required to lack its label (B's lacks atoms on flexible rows),
  // pieces to the first tail. A per-label choice, as in the presence
  // fragment's witnesses (dossier §18.14).
  const several = (opens, others) => opens.length > 1 && others.length === 0
  if (several(openA, openB) || several(openB, openA)) {
    const [opens, extra, left] = openA.length > 1
      ? [openA, onlyA.length + pa.length, leftB]
      : [openB, onlyB.length + pb.length, leftA]
    if (extra) throw new Clash('extra on open side')
    const parts = new Map(opens.map((u) => [u, emptyTerm()]))
    const lacking = (u, l) => st.lacks.get(u)?.has(l)
    for (const [l, t] of left.fields) {
      const u = opens.find((w) => !lacking(w, l)) ?? opens[0]
      parts.get(u).fields.push([l, t])
    }
    for (const p of left.pieces) {
      const u = opens.find((w) => !lacking(w, `ρ${p.r}`)) ?? opens[0]
      parts.get(u).pieces.push(p)
    }
    for (const [u, value] of parts) bindRow(st, u, value)
    return true
  }
  // Otherwise: the first open tail takes the leftovers, the others {}.
  for (const u of openA.slice(1)) bindRow(st, u, emptyTerm())
  for (const u of openB.slice(1)) bindRow(st, u, emptyTerm())
  const [ua] = openA
  const [ub] = openB
  if (!ua && !ub) {
    if (onlyA.length || onlyB.length || pa.length || pb.length) {
      throw new Clash('records differ')
    }
  } else if (ua && !ub) {
    if (onlyA.length || pa.length) throw new Clash('extra on open side')
    bindRow(st, ua, leftB)
  } else if (!ua && ub) {
    if (onlyB.length || pb.length) throw new Clash('extra on open side')
    bindRow(st, ub, leftA)
  } else {
    const z = `r_fresh${st.fresh++}`
    bindRow(st, ua, { ...leftB, open: [z] })
    bindRow(st, ub, { ...leftA, open: [z] })
  }
  return true
}

const emptyTerm = () => ({ k: 'r', fields: [], pieces: [], open: [] })

// Close every value: unbound tails and type variables become {}.
function close(st, t) {
  t = resolve(st, t)
  if (t.k === 'v') return empty()
  if (t.k === 'b') return t
  if (t.k === 'f') return { k: 'f', a: close(st, t.a), c: close(st, t.c) }
  const n = norm(st, t)
  return { k: 'r', fields: n.fields.map(([l, ft]) => [l, close(st, ft)]),
    pieces: n.pieces }
}

function certificate(st) {
  const cert = new Map()
  for (const r of st.P.flexRows) {
    const key = `r${r}`
    cert.set(key, st.rows.has(key) ? close(st, st.rows.get(key)) : empty())
  }
  for (const n of st.P.flexTys) {
    cert.set(`t${n}`, st.tys.has(n) ? close(st, st.tys.get(n)) : empty())
  }
  return cert
}

// The explicit generic row of rigid row r at a pattern, for `expand`.
export function expander(labels, present) {
  return (r) => {
    const out = labels.filter((l) => present(r, l))
      .map((l) => [l, { k: 'b', b: constA(r, l) }])
    out.push([`ρ${r}`, { k: 'b', b: `R${r}` }])
    return out
  }
}
