// Hand-computed sizes for three small points of the scaling families,
// checked by measure-apps.mjs before it prints anything. Each `why` is
// the hand computation; counts are log2.
export const expectations = [
  {
    family: 'stages',
    size: 1,
    why: 'stages(p1: { f1: Int, ...r1 }) reads f1 and builds { a1, b1, ' +
      'c1 }: R = 1, L = 4, 2^4 patterns; r1 lacks f1 (implied), the ' +
      'other three are free: 2^3 consistent; every slicing keeps only ' +
      '{r1} with f1: 2^1',
    sizes: { R: 1, L: 4, 'log2.patterns': 4, 'log2.consistent': 3,
      'sliced.rows.patterns': 1, 'sliced.joined.patterns': 1,
      'sliced.solved.patterns': 1 }
  },
  {
    family: 'tied',
    size: 2,
    why: 'tied(p1: { f1: Int, ...r1 }, p2: { f2: Int, ...r2 }) builds ' +
      '{ a1: p1.f1, a2: p2.f2 }: R = 2, L = 4, 2^8 patterns; f1 and f2 ' +
      'free in one row each, a1 and a2 in both: 2 x 2 x 4 x 4 = 2^6 ' +
      'consistent; (i) two slices of 2^1: 2^2; (ii) the access type ' +
      'metas join both rows to the literal: 2^8; after the substitution ' +
      'they are Int: 2^2 again',
    sizes: { R: 2, L: 4, 'log2.patterns': 8, 'log2.consistent': 6,
      'sliced.rows.patterns': 2, 'sliced.joined.patterns': 8,
      'sliced.solved.patterns': 2 }
  },
  {
    family: 'star',
    size: 2,
    why: 'star(hub: { ...h }, p1: { f1: Int, ...r1 }, p2: ...) with h ' +
      'joined to each: R = 3, L = 2, 2^6 patterns; f1 is lacked by h and ' +
      'r1, free in r2, and f2 the other way round: 2^2 consistent; one ' +
      'slice through h in every variant',
    sizes: { R: 3, L: 2, 'log2.patterns': 6, 'log2.consistent': 2,
      'sliced.rows.slices': 1, 'sliced.joined.patterns': 6,
      'sliced.solved.patterns': 6 }
  }
];
