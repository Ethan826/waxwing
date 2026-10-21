// The template grammars of attack.md (a), as domains for search.mjs.
// G-A uses nested-templates.mjs unchanged (amended: `tailWritten`).
// G-W (an amendment, frozen before running): type variables over Temp₃,
// rows' written fields over Temp₂, and a tail node's extra written labels
// from the level being filled from, not only from the leaves.
import { temps, rowShapes, skeletons }
  from '../../composition-assessment/sig-oracle/nested-templates.mjs'

const json = (x) => JSON.stringify(x)

export const GA = {
  rows: (P, present, written) =>
    rowShapes(P, present, written, { tailWritten: true }),
  tys: (P, present, written) =>
    temps(P, present, written, 2, { tailWritten: true }),
}

// The leaves, as nested-templates.mjs builds them (not exported there).
function leaves(P, present, written) {
  const out = []
  for (const r of P.rigidRows) {
    for (const l of written) if (present(r, l)) out.push({ k: 'A', r, l })
  }
  for (const n of P.rigidTys) out.push({ k: 'T', n })
  const bases = new Set(['Int', 'Bool'])
  const visit = (t) => {
    if (t.k === 'b') bases.add(t.b)
    if (t.k === 'f') { visit(t.a); visit(t.c) }
    if (t.k === 'r') for (const [, ft] of t.fields) visit(ft)
  }
  for (const a of [...P.D, ...P.B]) {
    if (a[0] === 'eq') { visit(a[1]); visit(a[2]) }
  }
  for (const g of bases) out.push({ k: 'g', g })
  return out
}

// nested-templates.mjs's `fill`, with the tail node's extra written
// labels drawn from `pool` (the level being filled from).
function fillW(s, pool, written) {
  if (s.k === 'hole') return pool
  if (s.k === 'arr') {
    return fillW(s.a, pool, written).flatMap((a) =>
      fillW(s.c, pool, written).map((c) => ({ k: 'arr', a, c })))
  }
  let out = [{ k: 'rec', tails: s.tails, fields: {} }]
  for (const [l, fs] of s.fields) {
    out = out.flatMap((t) => fillW(fs, pool, written).map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  if (!s.tails) return out
  const own = new Set(s.fields.map(([l]) => l))
  for (const l of written.filter((w) => !own.has(w))) {
    out = out.flatMap((t) => [null, ...pool].map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  return out
}

export function tempsW(P, present, written, k) {
  const skels = skeletons(P)
  let level = leaves(P, present, written)
  for (let i = 0; i < k; i++) {
    const seen = new Map(level.map((t) => [json(t), t]))
    for (const s of skels) {
      for (const t of fillW(s, level, written)) seen.set(json(t), t)
    }
    level = [...seen.values()]
  }
  return level
}

function rowShapesW(P, present, written) {
  const pool = [null, ...tempsW(P, present, written, 2)]
  let out = [{ k: 'rec', tails: true, fields: {} }]
  for (const l of written) {
    out = out.flatMap((t) => pool.map((f) =>
      ({ ...t, fields: { ...t.fields, [l]: f } })))
  }
  return out
}

export const GW = {
  rows: rowShapesW,
  tys: (P, present, written) => tempsW(P, present, written, 3),
}
