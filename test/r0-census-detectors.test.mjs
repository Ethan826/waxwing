import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixturesIn } from './r0-probe-support.mjs';
import { resolved } from './r0-generate-support.mjs';
import { erasedSources, inferredRows } from './r0-census-erased.mjs';
import { classifyProgram } from './r0-census-classify.mjs';

// Task 3.5's detectors, each checked against existing fixtures whose
// expected classification is asserted. The erased-row detector
// (r0-census-erased.mjs, test-only, ruling R11) is written apart from
// Task 0.7's reference reading (r0-erased-criterion.mjs) and must give
// the 34 fixtures' hand-derived `sources`, `marked` and `inferredRow`
// (docs/plans/r0-erased-rows.md §8). Every other category is read
// through `classifyProgram`, the census's own classifier, on one
// fixture each.
const erased = fixturesIn('r0/erased');
const isG = decl => decl.name === 'g';

test('the erased-row detector gives every fixture its answers', () => {
  assert.equal(erased.length, 34);
  for (const f of erased) {
    const program = resolved(f.source);
    const g = program.functions.find(isG);
    assert.deepEqual(erasedSources(program, g), f.sources, f.name);
    assert.equal(erasedSources(program, g).length > 0, f.marked, f.name);
    assert.equal(inferredRows(program, g), f.inferredRow, f.name);
  }
});

const sourceOf = path => (path.endsWith('.json')
  ? JSON.parse(readFileSync(path, 'utf8')).source
  : readFileSync(path, 'utf8'));
const named = (found, name) => found.declarations.find(decl =>
  decl.name === name);

// [file, declaration, whether its body checks today, its blocking
// categories]. Where no compiling declaration of the corpus has a
// category (BQPendingValidR, and DataOverRecords in an accepted
// program), a refused one is used. LocalGeneralization is produced by
// no resolved construct (T-R0b §3.5; ruling R11), so it has none.
const erasedDir = 'test/fixtures/r0/erased';
const cases = [
  [`${erasedDir}/form.perform-parameterized.json`, 'g', true,
    ['EffectArgument', 'ErasedRow']],
  ['test/fixtures/r005b/precedence-p5.json', 'k', true,
    ['DataOverRecords']],
  ['test/fixtures/r0/audit/redundant-arm.pinned.json', 'f', true,
    ['DataApplication']],
  [`${erasedDir}/form.handler-plain.json`, 'g', true, ['HandlerType']],
  [`${erasedDir}/form.fail-unwritten.json`, 'g', true,
    ['FailFamily', 'ErasedRow']],
  ['test/fixtures/r0/audit/defer-handler-variable.selected.json', 'f', true,
    ['Deferred']],
  ['research/division-campaign/r0/probes/f01-compare-rigid.wxw', 'same',
    false, ['BQPendingValidR']],
  [`${erasedDir}/form.own-signature.json`, 'g', true, ['ErasedRow']],
  ['examples/records.wxw', 'details', true, ['BQAtTypeVariable']],
  // Its `BQ` atom lies outside the one-tail fragment (G0's other
  // decline).
  ['research/division-campaign/r0/probes/f03-compare-split.wxw', 'main',
    false, ['BQAtTypeVariable']]
];

test('each blocking category is detected on its fixture', () => {
  for (const [path, name, compiles, categories] of cases) {
    const found = named(classifyProgram(sourceOf(path)), name);
    assert.equal(found.compiles, compiles, path);
    assert.deepEqual(found.categories, categories, path);
  }
});

test('G0\'s guard declines for a rigid variable or outside the fragment',
  () => {
    const guard = (path, name) =>
      named(classifyProgram(sourceOf(path)), name).guard;
    assert.deepEqual(guard('examples/records.wxw', 'details'), ['rigid']);
    assert.deepEqual(guard(
      'research/division-campaign/r0/probes/f03-compare-split.wxw', 'main'),
    ['fragment']);
  });

test('a second spread is refused at Resolve, so it has no problem', () => {
  const found = classifyProgram(
    sourceOf('test/fixtures/r005b/design-composition.json'));
  assert.equal(found.accepted, false);
  assert.equal(found.secondSpread, true);
  assert.deepEqual(found.declarations, []);
});

// Found by Task 4.5: the walk reversed a node's own child array in place
// (`childrenOf(next).reverse()`), so each walk of a body reversed its
// calls' and constructions' arguments; after an odd number of walks a
// later check of the same program refused what today accepts
// (a3-fixed-carriers `main` after `classifyProgram`). The census read
// each declaration before walking it; Task 4.5's window reads after.
test('walking a body leaves the program unchanged', async () => {
  const { load } = await import('./r0-generate-support.mjs');
  const { checkProgram } = await load('Features.Check.Outcomes');
  const { expressionsOf } = await import('./r0-census-walk.mjs');
  const program = resolved('type Pair(a, b) = Pair(a, b);\n'
    + 'fn main(): Pair(Int, Bool) = Pair(1, true);\n');
  expressionsOf(program.functions[0].body);
  assert.deepEqual(checkProgram(program).outcomes.map(outcome =>
    outcome.today.constructor.name), ['Right']);
});
