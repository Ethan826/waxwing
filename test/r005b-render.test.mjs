import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spanAt } from './support.mjs';
import { checkRejectedAt } from './phases.mjs';
import { mustBe } from '../output/Format.Diagnostic.Merge/index.js';
import { typeName } from '../output/Format.Diagnostic/index.js';
import * as Merge from '../output/Domain.Problem.Merge/index.js';
import * as Names from '../output/Domain.Problem.Names/index.js';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';

// R005 Tranche B B5 (plan §2.10, Task B5): R11's tie-break, the boundary
// between solving and the renderers' metadata, and D6's `none of` wording.

// R11 (approved with a stable tie-break, plan §10 decision 3): two
// occurrences at one location, `two` passed on. Desugaring makes the nested
// row's predicate first (inner rows first), but R11 orders by source
// data, never by when predicates were made: the location, then the field
// path (the outer row's is empty), then where `two` writes the row. Both
// have a field two parts may hold; the outer one is reported.
test('R11: predicates at one location are ordered by source data', () => {
  const source = 'fn two(p: { m: { ...a, ...b }, ...r, ...s }): Int '
    + 'where a disjoint b, r disjoint s = 0; '
    + 'fn apply0(g: ({ m: { x: Int, y: Int }, w: Int, z: Int }) -> Int): '
    + 'Int = 0; fn main(): Int = apply0(two);';
  const found = checkRejectedAt(source, 'E_TYPE', 'two', 1);
  assert.equal(found.message, 'Cannot tell whether two\'s r or s has field '
    + 'w; pass a lambda with annotated parameters in place of two');
  assert.deepEqual(found.related.map(note => note.message), [
    'r and s are written here',
    '{ m: { x: Int, y: Int }, w: Int, z: Int } is required here']);
  assert.deepEqual(found.related[0].span,
    spanAt(source, '{ m: { ...a, ...b }, ...r, ...s }'));
});

// Decision 5 of 2026-10-17: the renderers' metadata is kept apart from
// every satisfiability decision. No solving module imports it or a
// renderer; only where rows and predicates are made writes it.
const makers = ['Desugar.purs', 'Occurrence.purs', 'Use.purs'];
const metadata = ['Features.Check.PartOrigin', 'Features.Check.OriginStore',
  'Features.Check.MergeParts', 'Features.Check.Unresolved',
  'Features.Check.Contradicted', 'Features.Check.Exclusion',
  'Features.Check.Fault', 'Features.Check.Required'];
const solving = [
  ...readdirSync('src/Features/Check/RowMerge')
    .filter(name => !makers.includes(name))
    .map(name => `src/Features/Check/RowMerge/${name}`),
  ...readdirSync('src/Features/Check')
    .filter(name => /^(Unify|Settle|Row(Store|Settle|Finish|Entry))/
      .test(name) || ['RecordTail.purs', 'Homes.purs', 'Lacks.purs',
      'Disjoint.purs', 'Subst.purs'].includes(name))
    .map(name => `src/Features/Check/${name}`)];

test('no solving module imports the part metadata or a renderer', () => {
  assert.ok(solving.length > 15);
  for (const file of solving) {
    const imports = readFileSync(file, 'utf8').split('\n')
      .filter(line => line.startsWith('import '));
    for (const module of metadata) {
      const reads = imports.some(line => line.startsWith(`import ${module} `)
        || line === `import ${module}`);
      // Subst holds the metadata (so it reverts with it) but never reads it.
      if (file.endsWith('Subst.purs') && module.endsWith('PartOrigin')) {
        continue;
      }
      assert.ok(!reads, `${file} imports ${module}`);
    }
  }
});

// Plan §2.2: a predicate's `site` is diagnostic metadata. No case reads
// it, and the rescan reads it only to locate a failure (the L2 rule).
test('no solving step reads a predicate\'s site', () => {
  const module = name => readFileSync(
    `src/Features/Check/RowMerge/${name}.purs`, 'utf8');
  assert.ok(!/site/.test(module('Cases')));
  const improve = module('Improve');
  const located = improve.slice(improve.indexOf('located ∷'),
    improve.indexOf('latest ∷'));
  assert.ok(located.includes('merge.site'));
  assert.equal(improve.split('.site').length - 1,
    located.split('.site').length - 1);
});

// Plan §10 decision 21: the adopted design reaches D6's `none of` form
// from no source yet (render-none-control); this exercises the wording
// alone, at the renderer, not a program's diagnostic.
test('renderer level only: D6\'s none-of wording for three parts', () => {
  const row = new Names.RecordName([], ['r', 's', 't']);
  const other = new Names.RecordName(
    [new Tuple('x', Names.IntName.value), new Tuple('y', Names.IntName.value)],
    []);
  const text = mustBe(typeName)({
    owner: new Just('merge3'), row, path: [], other,
    fault: Merge.NoPart.value, parts: ['r', 's', 't'],
    atom: new Merge.FieldAtom('x') });
  assert.equal(text, 'merge3\'s { ...r, ...s, ...t } must be '
    + '{ x: Int, y: Int }, but none of r, s or t can have field x');
  const nested = mustBe(typeName)({
    owner: Nothing.value, row, path: ['inner'], other,
    fault: Merge.NoPart.value, parts: ['r', 's', 't'],
    atom: new Merge.TailAtom('u') });
  assert.equal(nested, '{ ...r, ...s, ...t } (in field inner) must be '
    + '{ x: Int, y: Int }, but none of r, s or t can hold u');
});
