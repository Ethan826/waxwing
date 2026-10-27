import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalOf, stableStringify } from './r0-canonical.mjs';
import { erase, nodesOf } from './r0-marked-erase.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';

// R0 amin tranche 1, Task 3: every node's marked type, recorded in
// `effects.nodes`, erases to its recorded type. Over the declarations the
// problem pin covers (test/r0-problem-pin-run.mjs): `nodes` has exactly
// the paths of `types`, and at each `erase(nodes(p))` (test/
// r0-marked-erase.mjs) equals `types(p)` in canonical form. The first
// ten mismatches are reported. Corpus-wide, hence serial.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

const keyed = pairs => new Map(pairs.map(([path, value]) =>
  [stableStringify(path), value]));

const mismatchesOf = (at, problem) => {
  const types = keyed(canonicalOf(problem).types);
  const nodes = keyed(nodesOf(Recorded.fields(problem).effects.nodes));
  const found = [];
  for (const [path, ty] of types) {
    if (!nodes.has(path)) { found.push(`${at} ${path}: no node`); continue; }
    const erased = stableStringify(erase(nodes.get(path)));
    if (erased !== stableStringify(ty))
      found.push(`${at} ${path}: erased ${erased}, types`
        + ` ${stableStringify(ty)}`);
  }
  for (const path of nodes.keys())
    if (!types.has(path)) found.push(`${at} ${path}: not in types`);
  return found;
};

const survey = async () => {
  let declarations = 0;
  let paths = 0;
  const mismatches = [];
  for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
    const program = programOf(source);
    if (program === null) continue;
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const problem = Elaborating.problem(result.value0);
      declarations += 1;
      paths += canonicalOf(problem).types.length;
      mismatches.push(...mismatchesOf(`${origin}#${decl.name}`, problem));
    }
  }
  return { declarations, paths, mismatches };
};

const found = await survey();

test('erasing every node\'s marked type gives its recorded type', () => {
  assert.ok(found.declarations > 2500, `${found.declarations} declarations`);
  assert.ok(found.paths > 100000, `${found.paths} paths`);
  assert.deepEqual(found.mismatches.slice(0, 10), [],
    `${found.mismatches.length} mismatches`);
});
