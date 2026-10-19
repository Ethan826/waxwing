// Programs the strict formulation QT rejects (D4) and QS accepts, in
// Waxwing surface (the design's section 4.5), as labels-only rows. Each
// `merge` use instantiates its own r and s; a parameter type shared by
// two callbacks equates their metas.
//   fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
//     where r disjoint s = { ...a, ...b };
const t = v => ({ fields: [], tails: [v] });
const two = (a, b) => ({ fields: [], tails: [a, b] });
const H = { lacks: {}, apart: [] };

export const EXAMPLES = [
  // Q1. fn relate(f: (p, s) -> { ...u },
  //         g: (q, s) -> { b: Int, c: Int, ...u }): Int = 0;
  //     fn main(): Int = relate(merge, merge);
  // merge 1 is (m0, m1), merge 2 is (m2, m3); s shares m1 = m3; u is
  // m4. The second result must be the first plus b and c: m2 = { b, c }
  // ⊎ m0 after cancelling the shared s, which QT cannot see through the
  // opaque union of merge 1.
  { name: 'Q1 relate(merge, merge)', hyp: H,
    steps: [
      { k: 'dis', l: t('m0'), r: t('m1') },
      { k: 'dis', l: t('m2'), r: t('m3') },
      { k: 'eq', l: t('m1'), r: t('m3') },
      { k: 'eq', l: two('m0', 'm1'), r: t('m4') },
      { k: 'eq', l: two('m2', 'm3'), r: { fields: ['b', 'c'],
        tails: ['m4'] } },
    ],
    annotation: [{ k: 'eq', l: t('m0'), r: { fields: [], tails: [] } }],
    annotationText: 'relate(fn(p: {}, s) => merge(p, s), merge)' },
  // Q2. fn nest(f: (p, w) -> { a: Int, b: Int }, g: (p, q) -> w): Int
  //       = 0;
  //     fn main(): Int = nest(merge, merge);
  // merge 1 is (m0, m1), merge 2 is (m2, m3); p shares m0 = m2; w is
  // merge 2's result, m1 = m2 ⊎ m3. Then m0 # m1 includes m0 # m0, so
  // m0 = {}: QT keeps m1 opaque and never decomposes the pair.
  { name: 'Q2 nest(merge, merge)', hyp: H,
    steps: [
      { k: 'dis', l: t('m0'), r: t('m1') },
      { k: 'dis', l: t('m2'), r: t('m3') },
      { k: 'eq', l: t('m0'), r: t('m2') },
      { k: 'eq', l: t('m1'), r: two('m2', 'm3') },
      { k: 'eq', l: two('m0', 'm1'), r: { fields: ['a', 'b'],
        tails: [] } },
    ],
    annotation: [{ k: 'eq', l: t('m0'), r: { fields: [], tails: [] } }],
    annotationText: 'nest(fn(p: {}, w) => merge(p, w), merge)' },
];
