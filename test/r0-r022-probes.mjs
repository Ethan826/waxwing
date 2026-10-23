// R022's probes (BACKLOG; Task 4.3/4.4 follow-up, 2026-10-23), inline so
// the pinned corpus and the first-diagnostic snapshot stay as they are.
// A row-sorted `inst` slot whose checked type is a hole, under a
// `disjoint` and under a `lacks` atom; today accepts both. RT8 counts
// them as rows of their own (test/r0-rt8-run.mjs).
const probe = atom => 'fn d2(whole: { ...u }, left: { ...s }): Int '
  + `where ${atom} = 0;\n`
  + 'fn g(y: { ...s }): Int = { let k = fn(x) => d2(x, y); 0 };\n'
  + 'fn main(): Int = 0;\n';

export const r022Probes = [
  { origin: 'inline:r022-disjoint', kind: 'Disjoint',
    source: probe('u disjoint s') },
  { origin: 'inline:r022-lacks', kind: 'Lacks',
    source: probe('u lacks { a }') }
];
