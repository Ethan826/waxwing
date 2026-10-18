import test from 'node:test';
import { assertDiagnostic, fixture } from './r005b-support.mjs';

// R005 Tranche B Task 3: the provenance precedence of design §1.3 (user
// decision 5): a written `lacks`, then a written `disjoint`, then an
// implied fact, then a spread fact; source order breaks ties. P1-P7 of
// design §1.6 change from the shape text to D1; the three controls keep
// their text. Each fixture's `before` is Tranche A's diagnostic: run with
// R005B_EXPECT=before against main's build, this file asserts those
// instead (the red log of Task 3 records both runs).
const expectBefore = process.env.R005B_EXPECT === 'before';

for (const name of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
  'control-no-clause', 'control-two-clauses', 'control-hole-base']) {
  test(`precedence ${name}`, () => {
    const found = fixture(`precedence-${name}`);
    assertDiagnostic(found.source,
      expectBefore ? found.before : found.diagnostic);
  });
}

// A pair's reason: the written clause wins over a type implying the same
// pair, whichever is met first; between two implying types the earlier,
// whose variables D2 names as that type writes them.
const d2 = (source, required, names = 'r disjoint s') =>
  assertDiagnostic(source, {
  code: 'E_TYPE',
  message: `Field x is in both records: ${names}`,
  at: { text: '{ x: 2 }', nth: 0 },
  notes: [
    { message: 'first written here', at: { text: '{ x: 1 }', nth: 0 } },
    { message: 'required here', at: required }
  ]
});
const call = ' fn main(): Int = { let h = g({ x: 1 }, { x: 2 }); 0 };';

if (!expectBefore) {
  test('a written disjoint clause is cited over an implying type', () => {
    d2('fn g(a: { ...r }, b: { ...s }, w: { ...r, ...s }): Int '
      + `where r disjoint s = 0;${call}`,
    { text: 'r disjoint s', nth: 0 });
  });

  test('an implied pair is noted at the implying type\'s later tail', () => {
    d2(`fn g(a: { ...r }, b: { ...s }, w: { ...r, ...s }): Int = 0;${call}`,
      { text: '...s', nth: 1 });
  });

  test('of two implying types the earlier is cited', () => {
    d2('fn g(a: { ...r }, b: { ...s }, w: { ...s, ...r }, '
      + `v: { ...r, ...s }): Int = 0;${call}`,
    { text: '...r', nth: 1 }, 's disjoint r');
  });
}
