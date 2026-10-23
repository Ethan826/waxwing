import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus } from './r0-corpus.mjs';
import { generatedOrThrow, load, resolved } from './r0-generate-support.mjs';
import { keyOf } from './r0-rules-support.mjs';

// Task 5.1 over the pinned corpus: `toSig` is defined on every generated
// problem (T-R0b's `d` holds lacks and disjoint over rigid variables and
// `q` is empty, so CX §4.1's condition 2 never bites from source) and
// keeps every `D` and `B` id in order. No `D` id is also a `B` id, so
// `checkDerivation`'s refusal of a premise found in `D` never refuses a
// `B` atom (docs/findings.md, "Rules and the projection").
const corpus = await loadCorpus();
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const { toSig } = await load('Features.Check.Refute.Project');
const { fields } = await load('Domain.Recorded');
const { Just } = await load('Data.Maybe');

// A program Resolve refuses has no problem (T-R0b §8).
const programs = corpus.flatMap(({ source }) => {
  try { return [resolved(source)]; } catch { return []; }
});
const problems = programs.flatMap(program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.map(decl => generatedOrThrow(
    Generate.generate(tables)(signatures)(decl), decl.name));
});
const recordedIds = entries => entries.map(entry => keyOf(entry.origin.atom));

test('toSig is defined on every corpus problem and keeps its ids', () => {
  assert.ok(problems.length > 2500, `${problems.length} problems`);
  for (const problem of problems) {
    const view = fields(problem);
    const found = toSig(problem);
    assert.ok(found instanceof Just);
    assert.deepEqual(found.value0.d.map(entry => keyOf(entry.id)),
      recordedIds(view.d));
    assert.deepEqual(found.value0.b.map(entry => keyOf(entry.id)),
      recordedIds(view.b));
    const body = new Set(recordedIds(view.b));
    assert.ok(recordedIds(view.d).every(id => !body.has(id)));
  }
});
