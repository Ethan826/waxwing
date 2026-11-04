import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { mulberry } from './row-merge-gen.mjs';
import { bounds, generatorOf, nodeCount } from './r0-holes-gen.mjs';
import { bodyChecks, droppingLabels, droppingRests, metasOf, missingMeta,
  modulesOf, productionWalks, tally, typeCheck } from './r0-holes-walks.mjs';

// Dossier §18.161 (6): do `numbering` (collection) and `holes`'s
// renaming visit the same metas? Over the grammar fixed in
// docs/plans/2026-11-04-holes-numbering-findings.md (bounds in
// test/r0-holes-gen.mjs), properties E, T, H1 and H2 hold on every
// sample; each planted walk fails its property. Evidence on that
// grammar, not a proof; the argument from the code is in the findings.
const M = await modulesOf(load);
const production = productionWalks(M);
const samples = bounds.seeds.map(seed => {
  const generator = generatorOf(M, mulberry(seed));
  return { bodies: Array.from({ length: bounds.bodies }, generator.body),
    types: Array.from({ length: bounds.types }, generator.type) };
});
const bodies = samples.flatMap(sample => sample.bodies);
const types = samples.flatMap(sample => sample.types);
const none = { E: 0, T: 0, H1: 0, H2: 0 };

test('the generated samples reach every node and many metas', () => {
  const nodes = new Set();
  const visit = value => {
    if (value === null || typeof value !== 'object') return;
    if (value instanceof M.Open.Expr) nodes.add(value.value0.node
      .constructor.name);
    Object.values(value).forEach(visit);
  };
  bodies.forEach(visit);
  assert.equal(nodes.size, nodeCount);
  const withMetas = bodies.filter(body => metasOf(M.Open, body).length > 1);
  assert.ok(withMetas.length > bodies.length * 0.8, `${withMetas.length}`);
});

test('collection and renaming agree on every generated body', () => {
  const found = tally(bodyChecks(M, production), bodies);
  assert.deepEqual(found.failures, none, JSON.stringify(found.first));
});

test('foldHoles, rename and the generic walk agree on every type', () => {
  const disagreeing = types.filter(ty =>
    typeCheck(M, production)(ty).length > 0);
  assert.equal(disagreeing.length, 0);
});

// Must-fail: a numbering missing meta 0, in a body where 0's raw number
// is also 5's hole number. H2 alone does not see it; H1 does.
test('planted: a missing meta that collides fails H1', () => {
  const hole = meta => new M.Core.TVar(new M.Open.Hole(meta));
  const pure = new M.Row.Row([], M.Maybe.Nothing.value);
  const body = new M.Open.Expr({ ty: new M.Core.TFun(hole(5), pure, hole(0)),
    span: generatorOf(M, mulberry(0)).span, node: M.Open.UnitValue.value });
  const found = bodyChecks(M, missingMeta(M, 0))(body);
  assert.deepEqual(found.H2, []);
  assert.deepEqual(found.H1, ['metas 0 are not in the numbering']);
  const generated = tally(bodyChecks(M, missingMeta(M, 0)), bodies);
  assert.ok(generated.failures.H1 > 0);
});

test('planted: foldHoles without label arguments fails T', () => {
  const disagreeing = types.filter(ty =>
    typeCheck(M, droppingLabels(M))(ty).length > 0);
  assert.ok(disagreeing.length > 0);
});

test('planted: foldTypes without named rests fails E', () => {
  const found = tally(bodyChecks(M, droppingRests(M)), bodies);
  assert.ok(found.failures.E > 0);
});
