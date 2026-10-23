import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { armFrom } from './r0-hole-arm-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';
import { routeSource, witnessFrom } from './r0-witness-support.mjs';
import { readFileSync } from 'node:fs';

// The hole contract's lacks/disjoint amendment (author's ruling of
// 2026-10-23; docs/plans/r0-hole-contract-amendment.md, E1-E19): such an
// atom mentioning a hole is admitted only if G0's atom check
// establishes it at the defaults under D, definedness included; else
// NoWitness (HoleContract v), never anything else. Through the
// production `substitutionWitness`, on problems built directly.
const a = await armFrom(load);
const { int, rec, lacks, disjoint, equal, outcome, holeType } = a;
const admit = ['Witnessed'];
const broken = name => ['HoleContract', name];
const hole = rec([], ['h']);

const cases = [
  ['E1 lacks at a bare default', { b: [lacks('x', 'a')] },
    [['x', hole]], admit],
  ['E2 a bare default disjoint from a defined row',
    { b: [disjoint('x', 'y')] }, [['x', hole], ['y', rec([], ['r'])]],
    admit],
  ['E3 the other row undefined', { b: [disjoint('x', 'y')] },
    [['x', hole], ['y', rec([['b', int]], ['r'])]], broken('x')],
  ['E4 { a: Int, ...h } vs r, D lists r lacks a',
    { b: [disjoint('x', 'y')], d: [lacks('r', 'a')] },
    [['x', rec([['a', int]], ['h'])], ['y', rec([], ['r'])]], admit],
  ['E5 { a: Int, ...h } vs r, D lists nothing', { b: [disjoint('x', 'y')] },
    [['x', rec([['a', int]], ['h'])], ['y', rec([], ['r'])]], broken('x')],
  ['E6 undefined at the default', { b: [lacks('x', 'b')] },
    [['x', rec([['a', int]], ['r', 'h'])], ['y', rec([])]], broken('x')],
  ['E7 false at every value', { b: [lacks('x', 'a')] },
    [['x', rec([['a', int]], ['h'])], ['y', rec([])]], broken('x')],
  ['E8 two bare defaults disjoint', { b: [disjoint('x', 'y')] },
    [['x', hole], ['y', rec([], ['k'])]], admit],
  ['E10 an equation with equal sides, unchanged',
    { b: [equal(rec([['a', int]], ['x']), rec([['a', int]], ['x']))] },
    [['x', hole], ['y', rec([])]], admit],
  ['E10 equal sides undefined at every value pass, unchanged',
    { b: [equal(rec([['a', int]], ['x']), rec([['a', int]], ['x']))] },
    [['x', rec([], ['r', 'h'])], ['y', rec([])]], admit],
  ['E11 an atom with no hole is not judged', { b: [lacks('x', 'a')] },
    [['x', rec([], ['s'])], ['y', hole]], admit],
  ['E12 x disjoint x at a bare default', { b: [disjoint('x', 'x')] },
    [['x', hole], ['y', rec([])]], admit],
  ['E12 x disjoint x with a rigid tail', { b: [disjoint('x', 'x')] },
    [['x', rec([], ['r', 'h'])], ['y', rec([])]], broken('x')],
  ['E13 a non-empty row lacking another label', { b: [lacks('x', 'b')] },
    [['x', rec([['a', int]], ['h'])], ['y', rec([])]], admit],
  ['E14 two rigid tails not apart',
    { b: [lacks('x', 'a')], d: [lacks('r', 'a'), lacks('s', 'a')] },
    [['x', rec([], ['r', 's', 'h'])], ['y', rec([])]], broken('x')],
  ['E14 two rigid tails D keeps apart', { b: [lacks('x', 'a')],
    d: [lacks('r', 'a'), lacks('s', 'a'), disjoint('r', 's')] },
  [['x', rec([], ['r', 's', 'h'])], ['y', rec([])]], admit],
  ['E15 undefined at depth', { b: [lacks('x', 'c')] },
    [['x', rec([['a', rec([['b', int]], ['r', 'h'])]])], ['y', rec([])]],
    broken('x')],
  ['E15 defined at depth with r lacks b',
    { b: [lacks('x', 'c')], d: [lacks('r', 'b')] },
    [['x', rec([['a', rec([['b', int]], ['r', 'h'])]])], ['y', rec([])]],
    admit],
  ['E16 a type hole in a field', { b: [lacks('x', 'b')] },
    [['x', rec([['a', holeType(0)]])], ['y', rec([])]], admit],
  ['E17 two holes, one atom breaking both', { b: [disjoint('x', 'y')] },
    [['x', rec([['a', int]], ['h'])], ['y', rec([['a', int]], ['k'])]],
    broken('x')],
  ['E18 admitted by lacks, broken by an unequal equation',
    { b: [lacks('x', 'a'), equal(rec([], ['x']), rec([], ['r']))] },
    [['x', hole], ['y', rec([])]], broken('x')],
  ['E18 admitted by lacks, broken by a BQ atom', { b: [lacks('x', 'a')],
    bq: [new a.Atom.Printable(rec([['f', new a.Atom.Arrow(int, int)]],
      ['x']))] }, [['x', hole], ['y', rec([])]], broken('x')],
  ['E19 a variable σ omits, Free at {}', { b: [lacks('x', 'a')] },
    [['y', rec([])]], admit]
];

for (const [name, spec, pairs, expected] of cases)
  test(name, () => assert.deepEqual(outcome(spec, pairs), expected));

// The production path: render-quiet-annotated's `r disjoint s` holds
// with `s` at `{}`, so its witness stands; route's `u` (E9) stays
// refused by its unequal equation.
const online = await onlineFrom(load);
const compilationOf = (source, name) => {
  const [attempt] = online.decisionOf(online.programOf(source), name)
    .value0.attempts;
  assert.equal(attempt.constructor.name, 'Accepted', name);
  const made = attempt.value2;
  return made.constructor.name === 'Witnessed' ? ['Witnessed']
    : [made.value0.constructor.name];
};
const quiet = JSON.parse(readFileSync(new URL(
  './fixtures/r005b/render-quiet-annotated.json', import.meta.url))).source;
test('render-quiet-annotated main is witnessed through shadowDecisions',
  () => assert.deepEqual(compilationOf(quiet, 'main'), admit));
// W §1.5's example: u ↦ { ...hole 0 }, v, s, t at x, y, z's rows.
const w = await witnessFrom(load);
test('E9 route: u stays NoWitness (HoleContract u)', () => {
  const problem = online.problemOf(online.programOf(routeSource), 'route');
  const slot = index => w.variableAt(problem, { fresh: { path:
    { root: 'body', steps: [] }, role: { inst: index } } });
  const sigma = w.substitution([[slot(0), w.holeRow(0)],
    [slot(1), w.rigidRow(0)], [slot(2), w.rigidRow(1)],
    [slot(3), w.rigidRow(2)]]);
  assert.deepEqual(w.reason(w.witnessOf(problem, sigma)),
    ['HoleContract', w.key(slot(0))]);
});
