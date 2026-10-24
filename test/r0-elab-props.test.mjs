import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';
import { handles, termsFrom } from './r0-elab-terms.mjs';
import { rng } from './fx-gen-rng.mjs';

// R0 Task 7.1a, D1 spec §4 Tr and Def (T4) and §3.2's applicative laws
// (T9), over the seeded grammar of test/r0-elab-terms.mjs.
const output = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)),
  '..', 'output')).href;
const t = await elabFrom(name => import(`${output}/${name}/index.js`));
const { sealedTerm, imageOf, termOf, mint } = termsFrom(t);
const seeds = Array.from({ length: 300 }, (_, i) => 7100 + i);
const isRow = (variables, variable) =>
  variables.indexOf(variable) >= handles;
const has = (list, variable) => list.some(item =>
  t.m.Atom.eqVar.eq(item)(variable));

// Every minted variable bound by `pick`; `requests` the use set.
const bound = (variables, pick) => t.witness(variables.map(
  (variable, index) => [variable, pick(variable, index)]));

test('T4a (Tr): bindings outside requests never change build', () => {
  let nonVacuous = 0;
  for (const seed of seeds) {
    const { e, variables, random } = sealedTerm(seed);
    const requested = t.requested(e);
    const images = variables.map((variable, index) =>
      imageOf(random, variable, isRow(variables, variable), index));
    const first = bound(variables, (_, index) => images[index]);
    const second = bound(variables, (variable, index) =>
      (has(requested, variable) ? images[index] : t.free(90 + index)));
    const only = t.witness(variables.filter(variable =>
      has(requested, variable)).map(variable =>
      [variable, images[variables.indexOf(variable)]]));
    const result = t.build(e, first);
    assert.deepStrictEqual(t.build(e, second), result, `seed ${seed}`);
    assert.deepStrictEqual(t.build(e, only), result, `seed ${seed}`);
    if (requested.length > 0 && requested.length < variables.length)
      nonVacuous += 1;
  }
  assert.ok(nonVacuous > 100, `${nonVacuous} cases read some, not all`);
});

test('T4b (Def): requests bound at their sorts never fault', () => {
  let reads = 0;
  for (const seed of seeds) {
    const { e, variables, random } = sealedTerm(seed);
    const requested = t.requested(e);
    const w = t.witness(requested.map(variable => [variable,
      imageOf(random, variable, isRow(variables, variable),
        variables.indexOf(variable))]));
    const result = t.build(e, w);
    assert.ok(result instanceof t.m.Either.Right,
      `seed ${seed}: ${result.value0?.constructor.name}`);
    reads += requested.length;
    // Removing one requested binding gives Unbound for some variable.
    if (requested.length > 0) {
      const missing = t.build(e, t.witness(requested.slice(1).map(
        variable => [variable, t.free(0)])));
      assert.equal(missing.value0.constructor.name, 'Unbound',
        `seed ${seed}`);
    }
  }
  assert.ok(reads > 300, `${reads} reads`);
});

// Two Elab values agree: the same uses, the same run on each witness.
const same = (left, right, witnesses, label) => {
  assert.deepStrictEqual(t.arrayOf(left.uses), t.arrayOf(right.uses), label);
  for (const w of witnesses)
    assert.deepStrictEqual(left.run(w.bindings), right.run(w.bindings),
      label);
};

// A generated term itself, before `seal`: a `Gen` is a newtype over
// `Either`, so its compiled value is the `Right` holding the term.
const rawTerm = seed => {
  const random = rng(seed);
  let variables = [];
  const made = t.gen.bind(mint, minted => {
    variables = minted;
    return termOf(random, minted);
  });
  return { term: made.value0.value, variables, random };
};

test('T9: identity, composition, homomorphism, interchange', () => {
  const { elab } = t;
  const compose = f => g => x => f(g(x));
  for (const seed of seeds.slice(0, 100)) {
    const { term, variables, random } = rawTerm(seed);
    const v = t.m.Elab.readType(t.site.node(['law', 0]))(variables[0]);
    const w = t.m.Elab.readRow(t.site.node(['law', 1]))(variables[handles]);
    const witnesses = [0, 1].map(() => bound(variables, (variable, index) =>
      imageOf(random, variable, isRow(variables, variable), index)));
    const u = elab.map(x => y => ['u', x, y], term);
    const k = elab.map(x => y => ['k', y, x], w);
    same(elab.apply(elab.pure(x => x), term), term, witnesses, 'identity');
    same(elab.apply(elab.apply(elab.apply(elab.pure(compose), u),
      elab.map(x => y => [x, y], w)), v),
    elab.apply(u, elab.apply(elab.map(x => y => [x, y], w), v)),
    witnesses, 'composition');
    same(elab.apply(elab.pure(x => ['h', x]), elab.pure(seed)),
      elab.pure(['h', seed]), witnesses, 'homomorphism');
    same(elab.apply(k, elab.pure(seed)),
      elab.apply(elab.pure(f => f(seed)), k), witnesses, 'interchange');
  }
});
