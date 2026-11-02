import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { healthyBuild, pinnedEffects, sourcesOf }
  from './r0-effects-pin-run.mjs';

// Tranche 2 Task 3's effect re-pin, contents verified (§18.155 (1)):
// the generation correction (design §B.2) moved the effect pin of 31
// declarations. The fixture holds each one's canonical effect encoding
// as generation recorded it before the correction, with the digest the
// pin held for it then. Walking the old and the current encoding
// together, the only difference allowed is the declaration's implicit
// row tail `EffRigid ι` become `EffFresh p EffectOf`, p the lambda whose
// parameter that annotation is; `flexEff` and `positions` are equal. The
// effect pin holds the digest of the contents checked here.
const fixture = JSON.parse(readFileSync(join(repoRoot,
  'test/fixtures/r0/t2-annotation-row-before.json'), 'utf8')).entries;
const keys = Object.keys(fixture);
const sha = text => createHash('sha256').update(text).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const originOf = key => key.slice(0, key.lastIndexOf('#'));
const nameOf = key => key.slice(key.lastIndexOf('#') + 1);

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

const isPlain = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);

// Every place the two encodings differ: a rename `{ path, trail }`, or
// an `other` difference that fails the check.
const differences = (before, after, implicit, trail = []) => {
  if (same(before, after)) return [];
  if (same(before, { EffRigid: [implicit] })
    && same(after?.EffFresh?.[1], { EffectOf: [] }))
    return [{ path: after.EffFresh[0], trail }];
  const both = Array.isArray(before) && Array.isArray(after)
    && before.length === after.length;
  const objects = isPlain(before) && isPlain(after)
    && same(Object.keys(before), Object.keys(after));
  if (!both && !objects) return [{ other: true, trail }];
  return Object.keys(before).flatMap(name => differences(before[name],
    after[name], implicit, [...trail, name]));
};

const lambdaOf = annotationKey =>
  ({ ...annotationKey, steps: annotationKey.steps.slice(0, -3) });

const checked = key => {
  const before = fixture[key].effects;
  const { implicit, effects } = current(key);
  const found = differences(before, effects, implicit);
  assert.deepEqual(found.filter(item => item.other), [], key);
  assert.deepEqual(effects.flexEff, before.flexEff, key);
  assert.deepEqual(effects.positions, before.positions, key);
  const lambdas = before.annotations.map(([path]) => lambdaOf(path));
  for (const item of found) {
    assert.ok(lambdas.some(lambda => same(lambda, item.path)), key);
    assert.ok(before.flexEff.some(variable => same(variable,
      { EffFresh: [item.path, { EffectOf: [] }] })), key);
    if (item.trail[0] === 'annotations') assert.deepEqual(item.path,
      lambdaOf(before.annotations[item.trail[1]][0]), key);
  }
  return { found, digest: sha(JSON.stringify(effects)) };
};

test('the fixture is the pre-correction encoding of 31 declarations',
  () => {
    assert.equal(keys.length, 31);
    for (const key of keys)
      assert.equal(sha(JSON.stringify(fixture[key].effects)),
        fixture[key].digest, key);
  });

test('each moved declaration differs only by the implicit tail renamed',
  t => {
    const pinned = pinnedEffects().digests;
    const fields = {};
    for (const key of keys) {
      const { found, digest } = checked(key);
      const counted = found.map(item => item.trail[0]);
      assert.ok(counted.includes('annotations'), key);
      assert.ok(counted.includes('nodes'), key);
      assert.equal(pinned[key], digest, `${key}: the pin holds these contents`);
      for (const field of counted) fields[field] = (fields[field] ?? 0) + 1;
      t.diagnostic(`${key}: ${found.length} tails renamed`);
    }
    t.diagnostic(`renamed tails by field: ${JSON.stringify(fields)}`);
  });

// The walk's near misses: another rigid, another role, or any other
// change is a difference the check refuses.
test('the walk refuses every other difference', () => {
  const p = { root: { InBody: [] }, steps: [] };
  const renamed = { EffFresh: [p, { EffectOf: [] }] };
  const other = (before, after) =>
    differences(before, after, 0).some(item => item.other);
  assert.ok(!other({ EffRigid: [0] }, renamed));
  assert.ok(other({ EffRigid: [1] }, renamed));
  assert.ok(other({ EffRigid: [0] }, { EffFresh: [p, { Stage: [0] }] }));
  assert.ok(other([{ EffRigid: [0] }], [renamed, renamed]));
  assert.ok(other({ a: 1 }, { a: 2 }));
});
