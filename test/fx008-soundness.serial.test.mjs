import test from 'node:test';
import assert from 'node:assert/strict';
import { same, saveEvidence } from './fx-diff-support.mjs';
import { generate } from './fx-programs.mjs';
import { outcome } from './fx-oracle.mjs';
import { runGoBatch } from './go-batch.mjs';
import {
  atCall, atDefer, escaped, isHeadline, isStrictText, verdict
} from './fx008-soundness-support.mjs';

// FX008 Task 11: the one-way soundness differential. Programs whose cleanup
// ignores the frames that may fail (`unconstrained`) either are rejected
// at a `defer`, or are accepted and then the reference interpreter never
// reports a typed abort escaping a cleanup and Go agrees with it exactly.
// The compiler may reject more than the oracle shows (a conservative
// rule); it may never accept an escape. Program `i` is
// generate(SEED + 100000 + i, i, { unconstrained: true }). A program has at
// most one designed failing frame (test/fx-gen-failing.mjs), so each
// witnessed escape is classified by that shape, or `random` when it comes
// from a random clause. Every shape must witness `shapeMinimum` escapes.
const seed = Number(process.env.WAXWING_FX_SEED ?? 20261010);
const total = 300;
const chunkSize = 100;
const directory = '.build/fx008-soundness';

const programs = Array.from({ length: total }, (_, index) =>
  generate(seed + 100000 + index, index, { unconstrained: true }));
const verdicts = programs.map(({ source }) => verdict(source));
const expected = programs.map(({ source }) => outcome(source));
const label = (found, index) => `seed ${found.seed} index ${index}`;
const indices = Array.from({ length: total }, (_, index) => index);
const accepted = indices.filter(index => verdicts[index].accepted);
const witnessed = indices.filter(index => expected[index].stderr === escaped);

const save = (index, extra) =>
  saveEvidence(`seed-${programs[index].seed}-index-${index}`,
  { '.wxw': programs[index].source, '.json': JSON.stringify(extra, null, 2) },
    directory);

const shapeOf = index => programs[index].shapes[0] ?? 'random';
const shapeNames = ['lexical', 'forward', 'callee-plain', 'callee-nofail',
  'value-passed', 'value-returned', 'ambient', 'random'];
const shapeMinimum = 5;
const counts = list => Object.fromEntries(shapeNames.map(name =>
  [name, list.filter(index => shapeOf(index) === name).length]));

test('the corpus meets the soundness minimums', t => {
  const cleaning =
    accepted.filter(index => expected[index].events.has('cleanup-operation'));
  const beside =
    cleaning.filter(index => expected[index].events.has('clause-abort:w'));
  const headlined = indices.filter(index => verdicts[index].diagnostic
    && isHeadline(verdicts[index].diagnostic.message));
  const byShape = counts(witnessed);
  t.diagnostic(`seeds ${seed + 100000}..${seed + 100000 + total - 1}: `
    + `${accepted.length} accepted, ${cleaning.length} accepted with a cleanup `
    + `performing a user operation (${beside.length} that also ran a failing `
    + `clause), ${headlined.length} rejected by an FX008 headline, `
    + `${witnessed.length} escapes witnessed`);
  t.diagnostic(`escapes by shape: ${JSON.stringify(byShape)}`);
  assert.ok(cleaning.length
    >= 50, `accepted with a user operation in cleanup: ${cleaning.length}`);
  assert.ok(headlined.length
    >= 50, `rejected by an FX008 headline: ${headlined.length}`);
  assert.ok(witnessed.length >= 25, `escapes witnessed: ${witnessed.length}`);
  const thin = shapeNames.filter(name => byShape[name] < shapeMinimum);
  assert.deepEqual(thin, [],
    `shapes with fewer than ${shapeMinimum} escapes: `
    + JSON.stringify(byShape));
});

test('every escape the interpreter witnesses is rejected by an FX008 '
  + 'headline', () => {
  const holes = witnessed.filter(index => verdicts[index].accepted);
  const strayText = witnessed.filter(index => verdicts[index].diagnostic
    && !isHeadline(verdicts[index].diagnostic.message));
  assert.deepEqual(strayText.map(index => label(programs[index], index)), [],
    'an escape rejected by something other than an FX008 headline');
  for (const index of holes) save(index, { expected: expected[index] });
  assert.deepEqual(holes.map(index => label(programs[index], index)), [],
    'SOUNDNESS HOLE: accepted programs whose cleanup ends in a typed abort; '
    + `see ${directory}`);
});

test('every rejection is an FX008 headline (defer or call) or a strict text ' +
  '(defer)', () => {
  const stray = [];
  for (const index of indices) {
    const { diagnostic } = verdicts[index];
    if (!diagnostic) continue;
    const { source } = programs[index];
    const headline = isHeadline(diagnostic.message)
      && (atDefer(source, diagnostic.span) || atCall(source, diagnostic.span));
    const strict =
      isStrictText(diagnostic.message) && atDefer(source, diagnostic.span);
    const good = diagnostic.code === 'E_EFFECT' && (headline || strict);
    if (!good) {
      save(index, { diagnostic });
      stray.push(`${label(programs[index],
        index)}: ${diagnostic.code} ${diagnostic.message}`);
    }
  }
  assert.deepEqual(stray, []);
});

const chunks = Array.from({ length: Math.ceil(accepted.length / chunkSize) },
  (_, chunk) => chunk);
for (const chunk of chunks) {
  const slice = accepted.slice(chunk * chunkSize, (chunk + 1) * chunkSize);
  const first = chunk * chunkSize;
  test(`accepted programs ${first}-${first + slice.length
    - 1} agree with the interpreter`, () => {
    const batch = runGoBatch(import.meta.url,
      slice.map(index => [`p${index}`, programs[index].source]),
        `chunk${chunk}`);
    const differences = [];
    for (const index of slice) {
      const { events, ...want } = expected[index];
      const seen = batch.result(`p${index}`);
      const actual = {
        stdout: seen.stdout, stderr: seen.stderr, status: seen.status };
      if (!same(want, actual)) {
        save(index, { expected: want, actual });
        differences.push(label(programs[index], index));
      }
    }
    assert.deepEqual(differences, [], `differences saved in ${directory}`);
  });
}
