// Hand-computed sizes for small programs, checked before the corpus runs
// (measure.mjs). Each `why` is the hand computation.
export const read = (row, key) => key.split('.').reduce(
  (value, part) => value?.[part], row);

const labels = (count, suffix) => Array.from({ length: count },
  (_, index) => `l${index + 1}${suffix}`).join(', ');

export const expectations = [
  {
    name: 'g',
    source: 'fn g(): Int = 1;\nfn main(): Int = 0;',
    why: 'monomorphic: no rigid row, no label, one pattern, no slice',
    sizes: { R: 0, L: 0, flexRows: 0, 'log2.patterns': 0, slices: 0 }
  },
  {
    name: 'get',
    source: 'fn get(x: { a: Int, ...r }): Int = x.a;\nfn main(): Int = 0;',
    why: 'R = {r}, L = {a}: 2^1 patterns; r lacks a (implied), so the ' +
      'only consistent pattern is empty; access makes one row meta ' +
      '(Check/Record.purs:59)',
    sizes: { R: 1, L: 1, flexRows: 1, 'log2.patterns': 1,
      'log2.consistent': 0 }
  },
  {
    name: 'h',
    source: 'fn h(x: { ...r }, y: { ...s }): Int\n' +
      '  where r disjoint s, r lacks { b } = 0;\nfn main(): Int = 0;',
    why: 'R = {r, s}, L = {b} (from D): 2^2 patterns; consistent for b: ' +
      '{} and {s}; one slice joined by the disjoint pair',
    sizes: { R: 2, L: 1, 'atoms.D': 2, 'log2.patterns': 2,
      'log2.consistent': 1, slices: 1, 'log2.slicedPatterns': 2 }
  },
  {
    name: 'k',
    source: 'fn k(x: { a: Int, ...r }, y: { b: Int, ...s }): Int = 0;\n' +
      'fn main(): Int = 0;',
    why: 'R = {r, s}, L = {a, b}: 2^4 patterns; consistent: a only in s, ' +
      'b only in r, 2 x 2; nothing joins r and s, so two slices of ' +
      '2^1 each: log2 4 = 2',
    sizes: { R: 2, L: 2, 'log2.patterns': 4, 'log2.consistent': 2,
      slices: 2, 'log2.slicedPatterns': 2 }
  },
  {
    name: 'wide',
    source: `fn config(c: { ${labels(20, ': Int')} }): Int = 0;
fn wide(x: { a: Int, ...r }, y: { ...s }): Int
  where r disjoint s = config({ ${labels(20, ': 1')} });
fn main(): Int = 0;`,
    why: 'synthetic: a ground 20-field record beside two rigid rows. ' +
      'L = {a, l1..l20}: 2^(2 x 21) = 2^42 patterns; the record holds ' +
      'no variable, so the only slice is {r, s} with {a}: 2^2',
    sizes: { R: 2, L: 21, 'log2.patterns': 42, slices: 1,
      'log2.slicedPatterns': 2 }
  },
  {
    name: 'route',
    source: 'fn divide(whole: { ...u, ...v }, left: { ...s },\n' +
      '  right: { ...t }): Int where u disjoint s, v disjoint t = 0;\n' +
      'fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int\n' +
      '  where s disjoint t = divide(x, y, z);\nfn main(): Int = 0;',
    why: 'dossier §17.3: three rigid rows, no label: one pattern; the ' +
      'call desugars { ...u, ...v } into one Merge (Desugar.purs:39)',
    sizes: { R: 3, Rm: 3, L: 0, 'atoms.merge': 1, 'log2.patterns': 0 }
  }
];
