// The interpretation h of dossier §14 (P9s soundness, statements): it
// maps a value of P9s's generic model into the ground model of one rigid
// assignment θ whose presence pattern on the written labels is the
// pattern the generic value was built for. Constants become θ's values
// (`A{r}{l}` the field type of rigid row r at written label l, `T{n}`
// rigid type variable n); a rest label `ρ{r}` becomes θ's row r at every
// label outside the written ones; `R{r}` used as a type on its own,
// and `A{r}{l}` for a label the pattern marks absent, become
// `restType`, an arbitrary choice (the check runs it twice).
// h throws `clash` if expanding rests makes a label repeat in one row:
// the side condition is meant to make that impossible.
import { recordString } from './semantics.mjs'

export class Clash extends Error {}

export function interpretation(P, labels, theta, restType) {
  const constants = new Map()
  for (const r of P.rigidRows) {
    for (const l of labels) {
      constants.set(`A${r}${l}`,
        l in theta.row(r) ? theta.row(r)[l] : restType)
    }
    constants.set(`R${r}`, restType)
  }
  for (const n of P.rigidTys) constants.set(`T${n}`, theta.ty(n))
  const restOf = (r) => Object.entries(theta.row(r))
    .filter(([l]) => !labels.includes(l))
  const value = (g) => mapValue(parse(g))
  const row = (generic) => mapRow(Object.entries(generic)
    .map(([l, g]) => [l, parse(g)]))
  return { value, row }

  function mapValue(v) {
    if (v.k === 'b') return constants.get(v.b) ?? v.b
    if (v.k === 'f') return `(${mapValue(v.a)}->${mapValue(v.c)})`
    return recordString(mapRow(v.fields))
  }

  function mapRow(fields) {
    const out = {}
    for (const [l, v] of fields) {
      if (l.startsWith('ρ') && v.b !== `R${l.slice(1)}`) {
        throw new Error(`rest label ${l} at a type other than R`)
      }
      const entries = l.startsWith('ρ')
        ? restOf(Number(l.slice(1)))
        : [[l, mapValue(v)]]
      for (const [k, g] of entries) {
        if (k in out) throw new Clash(`label ${k} twice`)
        out[k] = g
      }
    }
    return out
  }
}

// Parses a canonical ground string (semantics.mjs) back into a tree:
// { k: 'b', b }, { k: 'f', a, c } or { k: 'r', fields: [[l, v]] }.
export function parse(s) {
  let i = 0
  const value = () => {
    if (s[i] === '(') {
      i += 1
      const a = value()
      i += 2
      const c = value()
      i += 1
      return { k: 'f', a, c }
    }
    if (s[i] === '{') return record()
    const start = i
    while (i < s.length && !',}):-'.includes(s[i])) i += 1
    return { k: 'b', b: s.slice(start, i) }
  }
  const record = () => {
    const fields = []
    i += 1
    while (s[i] !== '}') {
      const colon = s.indexOf(':', i)
      const l = s.slice(i, colon)
      i = colon + 1
      fields.push([l, value()])
      if (s[i] === ',') i += 1
    }
    i += 1
    return { k: 'r', fields }
  }
  const v = value()
  if (i !== s.length) throw new Error(`unparsed ground string ${s}`)
  return v
}
