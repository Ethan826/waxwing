import test from 'node:test';
import assert from 'node:assert/strict';
import { refusalOf } from './r0-probe-support.mjs';
import { generated, resolved } from './r0-generate-support.mjs';
import { firingSources, inferredRow } from './r0-erased-criterion.mjs';
import { erasedSources, inferredRows } from './r0-census-erased.mjs';
import { classifyProgram } from './r0-census-classify.mjs';
import { stableStringify } from './r0-canonical.mjs';

// The author's counterexample behind G-erased's item 2
// (docs/plans/r0-erased-rows.md §7.1), a regression challenge (Task
// 3.5, controller ruling): today's compiler rejects `g`; neither
// detector (C-erased, P-ii) fires on it; and its recorded problem holds
// only `Unit = Unit` and `Int = Int`, which a records-only strategy
// could satisfy without establishing the purity promise. So the absence
// of an erased-row marker and of inferred rows does not show that no
// effect obligation remains. The program is inline here, not a
// test/fixtures JSON or a docs block, so the pinned corpus and the
// first-diagnostic snapshot are unchanged (ruling R1).
const source = 'effect Log { fn log(n: Int): Unit; };\n\n'
  + 'fn g(): Unit with pure = Log.log(1);\n\nfn main(): Int = 0;\n';

test('today\'s compiler rejects g, with this first diagnostic', () => {
  assert.deepEqual(refusalOf(source), {
    phase: 'check', code: 'E_EFFECT',
    text: 'g performs Log, which its signature does not allow',
    at: 'Log.log(1)',
    notes: [['with pure', 'the signature of g does not allow Log']] });
});

test('neither C-erased nor P-ii fires on g', () => {
  const program = resolved(source);
  const g = program.functions.find(decl => decl.name === 'g');
  assert.deepEqual(erasedSources(program, g), []);
  assert.equal(inferredRows(program, g), false);
  // Task 0.7's reference reading agrees.
  assert.deepEqual(firingSources(program, g), []);
  assert.equal(inferredRow(program, g), false);
  // The census's classifier: no blocking category would hold g.
  const found = classifyProgram(source).declarations
    .find(decl => decl.name === 'g');
  assert.deepEqual([found.compiles, found.categories], [false, []]);
});

test('g\'s recorded problem holds only Unit = Unit and Int = Int', () => {
  const { problem } = generated(source, 'g');
  for (const list of ['d', 'q', 'bq', 'outside', 'adm', 'split'])
    assert.deepEqual(problem[list], [], list);
  assert.deepEqual(problem.vars, []);
  const atoms = problem.b.map(entry =>
    [entry.origin.rule, stableStringify(entry.value)]);
  const ground = name => stableStringify({ eq: [{ base: name },
    { base: name }] });
  assert.deepEqual(atoms, [['Sig3', ground('Unit')], ['E17', ground('Int')]]);
});
