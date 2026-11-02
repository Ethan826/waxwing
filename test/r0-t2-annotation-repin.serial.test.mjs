import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { healthyBuild, pinnedEffects, sourcesOf }
  from './r0-effects-pin-run.mjs';
import { contentsProblems, differences }
  from './r0-t2-annotation-places.mjs';

// Tranche 2 Task 3's effect re-pin, contents verified (§18.155 (1)):
// the generation correction (design §B.2) moved the effect pin of 31
// declarations. The fixture holds each one's canonical effect encoding
// as generation recorded it before the correction, with the digest the
// pin held for it at 823f628 (`git show 823f628:test/fixtures/r0/
// effects.json`, read here). test/r0-t2-annotation-places.mjs states
// what the old and current encodings may differ by and where; the
// effect pin holds the digest of the contents checked here.
const before = '823f6283635ccf8c2b37c1c04858e7e4a1d3ae1f';
const fixture = JSON.parse(readFileSync(join(repoRoot,
  'test/fixtures/r0/t2-annotation-row-before.json'), 'utf8')).entries;
const keys = Object.keys(fixture);
const sha = text => createHash('sha256').update(text).digest('hex');
const originOf = key => key.slice(0, key.lastIndexOf('#'));
const nameOf = key => key.slice(key.lastIndexOf('#') + 1);
const copy = value => JSON.parse(JSON.stringify(value));

const build = await healthyBuild();
const sources = new Map((await sourcesOf()).map(item =>
  [item.origin, item.source]));

const current = key => {
  const program = build.program(sources.get(originOf(key)));
  const { tables, signatures } = build.Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === nameOf(key));
  const result = build.Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right', key);
  return { implicit: decl.variables.length - 1,
    effects: build.encode(build.Recorded.fields(
      build.Elaborating.problem(result.value0)).effects) };
};

const problemsOf = (key, after) =>
  contentsProblems(fixture[key].effects, after.effects, after.implicit);

test('the fixture is the pre-correction encoding of 31 declarations',
  () => {
    const pinned = JSON.parse(execFileSync('git',
      ['show', `${before}:test/fixtures/r0/effects.json`],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 26 })).digests;
    assert.equal(keys.length, 31);
    for (const key of keys) {
      assert.equal(fixture[key].digest, pinned[key], key);
      assert.equal(sha(JSON.stringify(fixture[key].effects)),
        fixture[key].digest, key);
    }
  });

test('each moved declaration differs only by the implicit tail renamed',
  t => {
    const pinned = pinnedEffects().digests;
    const fields = {};
    for (const key of keys) {
      const after = current(key);
      const { renames, problems } = problemsOf(key, after);
      assert.deepEqual(problems, [], key);
      const counted = renames.map(item => item.trail[0]);
      assert.ok(counted.includes('annotations'), key);
      assert.ok(counted.includes('nodes'), key);
      assert.equal(pinned[key], sha(JSON.stringify(after.effects)),
        `${key}: the pin holds these contents`);
      for (const field of counted) fields[field] = (fields[field] ?? 0) + 1;
      t.diagnostic(`${key}: ${renames.length} tails renamed`);
    }
    t.diagnostic(`renamed tails by field: ${JSON.stringify(fields)}`);
  });

// The walk's near misses: another rigid, another role, or any other
// change is a difference the check refuses.
test('the walk refuses every other difference', () => {
  const p = { root: { InBody: [] }, steps: [] };
  const renamed = { EffFresh: [p, { EffectOf: [] }] };
  const other = (old, now) =>
    differences(old, now, 0).some(item => item.other);
  assert.ok(!other({ EffRigid: [0] }, renamed));
  assert.ok(other({ EffRigid: [1] }, renamed));
  assert.ok(other({ EffRigid: [0] }, { EffFresh: [p, { Stage: [0] }] }));
  assert.ok(other([{ EffRigid: [0] }], [renamed, renamed]));
  assert.ok(other({ a: 1 }, { a: 2 }));
});

// Planted defects in the current encoding (test data, not src) of a
// declaration with two annotated lambdas, one with an implicit row.
const planted = 'test/fixtures/r0/audit/expected-nofail.pinned.json#caller';
const replaceFirst = (value, from, to) => {
  const text = JSON.stringify(value);
  assert.ok(text.includes(JSON.stringify(from)), 'nothing to plant');
  return JSON.parse(text.replace(JSON.stringify(from), JSON.stringify(to)));
};

test('a rename planted in ambient is refused', () => {
  const after = current(planted);
  const [rename] = problemsOf(planted, after).renames;
  const effects = copy(after.effects);
  effects.ambient = replaceFirst(effects.ambient,
    { EffRigid: [after.implicit] },
    { EffFresh: [rename.path, { EffectOf: [] }] });
  assert.deepEqual(problemsOf(planted, { ...after, effects }).problems,
    ['a rename in ambient']);
});

test('an annotation renamed to the other lambda is refused', () => {
  const after = current(planted);
  const lambdas = after.effects.annotations.map(([key]) =>
    ({ ...key, steps: key.steps.slice(0, -3) }));
  assert.equal(lambdas.length, 2);
  const renamed = problemsOf(planted, after).renames
    .find(item => item.trail[0] === 'annotations');
  const index = renamed.trail[1];
  const effects = copy(after.effects);
  effects.annotations[index][1] = replaceFirst(effects.annotations[index][1],
    { EffFresh: [lambdas[index], { EffectOf: [] }] },
    { EffFresh: [lambdas[1 - index], { EffectOf: [] }] });
  // Its copies in the parameter's uses no longer match it, so they are
  // refused too.
  const { problems } = problemsOf(planted, { ...after, effects });
  assert.ok(problems.includes('an annotation renamed to another lambda'),
    JSON.stringify(problems));
});
