// Exact refusal of one body equation at θ*_π (solve.mjs): `fixedClash`
// holds only if no flexible assignment makes both sides defined and
// equal. It compares values each side is forced to have, recursively:
//
// - different constructors, or different atomic base types (opaque
//   constants are atomic bases '#…');
// - functions whose argument or result types clash;
// - records at a label where each side's field is fixed: a written
//   field, or the field of a rigid tail at θ*_π (if the record is
//   defined, its field there is that one), or absent because every tail
//   is rigid and none holds the label. A clash of the two fields, or a
//   fixed field against a fixed absence, refutes the equation.
//
// A flexible type variable, a non-atomic base string, or a field a
// flexible tail may supply is never claimed to clash.
import { toExpr } from './normalize.mjs'

const atomic = (b) => /^[#A-Za-z0-9_:.@]+$/.test(b)

function rigidLabels(P, theta, t) {
  return t.tails.filter((r) => P.rigidRows.includes(r))
    .flatMap((r) => [...(theta.rows.get(r)?.keys() ?? [])])
}

// The value a defined record expression must have at label l, if it is
// fixed: { e } for a field expression, { absent: true }, or null.
function fieldAt(P, theta, t, l) {
  const written = t.fields.filter(([k]) => k === l)
  if (written.length === 1) return { e: written[0][1] }
  if (written.length > 1) return null
  const holder = t.tails.find((r) =>
    P.rigidRows.includes(r) && theta.rows.get(r)?.has(l))
  if (holder !== undefined) {
    return { e: toExpr(theta.rows.get(holder).get(l)) }
  }
  if (t.tails.every((r) => P.rigidRows.includes(r))) return { absent: true }
  return null
}

export function fixedClash(P, theta, x, y) {
  if (x.k === 'v' || y.k === 'v') return false
  if ((x.k === 'b' && !atomic(x.b)) || (y.k === 'b' && !atomic(y.b))) {
    return false
  }
  if (x.k !== y.k) return true
  if (x.k === 'b') return x.b !== y.b
  if (x.k === 'f') {
    return fixedClash(P, theta, x.a, y.a) || fixedClash(P, theta, x.c, y.c)
  }
  const labels = new Set([...x.fields.map(([l]) => l),
    ...y.fields.map(([l]) => l), ...rigidLabels(P, theta, x),
    ...rigidLabels(P, theta, y)])
  for (const l of labels) {
    const fx = fieldAt(P, theta, x, l)
    const fy = fieldAt(P, theta, y, l)
    if (fx === null || fy === null || (fx.absent && fy.absent)) continue
    if (fx.absent || fy.absent) return true
    if (fixedClash(P, theta, fx.e, fy.e)) return true
  }
  return false
}
