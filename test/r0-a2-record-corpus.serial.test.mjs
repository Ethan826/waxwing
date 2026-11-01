import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effectsFile, healthyBuild, sourcesOf }
  from './r0-effects-pin-run.mjs';
import { load } from './r0-generate-support.mjs';

// A2 Task 3, "the corpus records no defect": over the effect pin's
// corpus (every declaration of every resolving source), `recordDefect`
// (spec §4.1) finds nothing. A corpus-level observation of today's
// generation, not a property of every program. Corpus-wide, hence
// serial. Check 4 (companions, dossier §18.148 (2)) is among the checks;
// the owners it reads are counted, so it is not passed vacuously.
const Record = await load('Features.Check.Strategy.Effects.Record');

const ownerKinds = ['Install', 'HandlerLit', 'Defer'];
const countOwners = (owners, problem) => {
  for (const placed of problem.effects.obligations) {
    const kind = placed.value.constructor.name;
    if (ownerKinds.includes(kind)) owners[kind] = (owners[kind] ?? 0) + 1;
  }
};

const tally = async () => {
  const build = await healthyBuild();
  const found = { declarations: 0, faults: 0, defects: [], owners: {} };
  for (const { origin, source } of await sourcesOf()) {
    const program = build.program(source);
    if (program === null) continue;
    const { tables, signatures } = build.Inputs.generationInputs(program);
    for (const decl of program.functions) {
      found.declarations += 1;
      const result = build.Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') {
        found.faults += 1;
        continue;
      }
      const problem = build.Elaborating.problem(result.value0);
      countOwners(found.owners, problem);
      const defect = Record.recordDefect(problem);
      if (defect.constructor.name === 'Just')
        found.defects.push(`${origin}#${decl.name}`
          + ` check ${defect.value0.check}`);
    }
  }
  return found;
};

test('the corpus records no defect', async () => {
  const found = await tally();
  // Observed 2026-11-01: 3071 declarations, no generation fault, the
  // effect pin's count.
  const pin = JSON.parse(readFileSync(effectsFile, 'utf8'));
  assert.equal(found.declarations, 3071);
  assert.equal(found.declarations, pin.declarations);
  assert.equal(found.faults, 0);
  assert.deepEqual(found.defects.slice(0, 10), []);
  for (const kind of ownerKinds)
    assert.ok((found.owners[kind] ?? 0) > 0, `${kind}: ${found.owners[kind]}`);
  console.log(`owners read by check 4: ${JSON.stringify(found.owners)}`);
});
