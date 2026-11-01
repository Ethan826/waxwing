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
// serial.
const Record = await load('Features.Check.Strategy.Effects.Record');

const tally = async () => {
  const build = await healthyBuild();
  const found = { declarations: 0, faults: 0, defects: [] };
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
      const defect = Record.recordDefect(
        build.Elaborating.problem(result.value0));
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
});
