export const prelude =
  'type List(a) = Nil | Cons(a, List(a)); type Box(a) = Box(a); '
  + 'fn id(x: a): a = x; fn keep(x: a): Int = 0; ';

// Two 5,000-parameter function types differing only in the last parameter,
// as generic arguments of a function (`id`, `keep`, `probe`) and of a type
// (`Box`). `probe` then refers to `keep` and `Box` at its variable
// `references` times, so each lookup of a key whose argument is an arrow
// compares two such types: by interned numbers that is constant time; by
// walking or spelling the types it is 5,000 steps each. Measured on a 2026
// laptop (scratchpad mutants of Specialize.Keys, not committed): 0.23 s
// interned; 5.5 s with keys of whole IR types (compared by the spine loop);
// 12.6 s with keys spelled as strings.
export const width = 5000;

export const references = 2000;

export const parameters = last => Array.from({ length: width }, (_, index) =>
  `p${index}: ${index === width - 1 ? last : 'Int'}`).join(', ');

export const repeated = text => Array(references).fill(text).join(', ');

export const wide = prelude
  + `fn sink(${Array.from({ length: references }, (_, index) =>
    `q${index}: Int`).join(', ')}): Int = 0; `
  + `fn probe(x: a): Int = sink(${repeated('keep(x)')})`
  + ` + sink(${repeated('keep(Box(x))')}); `
  + `fn wide(${parameters('Int')}): Int = 0; `
  + `fn other(${parameters('Bool')}): Int = 0; `
  + 'fn main(): Int = probe(wide) + probe(other) + keep(id(wide))'
  + ' + keep(id(other)) + keep(Box(wide)) + keep(Box(other));';
