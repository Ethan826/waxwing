import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';
import { rigidFindings } from './r0-signature-rigids.mjs';
import { shape } from './regression-r0-amin-support.mjs';

// R0 amin tranche 1, Task 23: over the corpus, every rigid effect-row
// variable and rigid mark the recorded signature names (nested handler
// types included) is in `effectRigids` and `rigidMarks`. The converse is
// counted and reported: a-min statements section 3 defines `rigidMarks`
// as the declaration's own `nofail(k)` variables, which Resolve collects
// from its signature (`signatureMarkVariables`), so every mark listed is
// named; section 10 gives `effectRigids` no definition beyond being
// listed, so its converse is observed here, not required. Corpus-wide,
// hence serial.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

const survey = async () => {
  const found = { declarations: 0, rigids: 0, marks: 0, unlistedRigids: [],
    unlistedMarks: [], unnamedRigids: [], unnamedMarks: [] };
  for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
    const program = programOf(source);
    if (program === null) continue;
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const { effects } = Recorded.fields(Elaborating.problem(
        result.value0));
      found.declarations += 1;
      found.rigids += effects.effectRigids.length;
      found.marks += effects.rigidMarks.length;
      const findings = rigidFindings(`${origin}#${decl.name}`,
        shape(effects));
      for (const name of Object.keys(findings))
        found[name].push(...findings[name]);
    }
  }
  return found;
};

const found = await survey();

test('the signature names no rigid the problem does not list', () => {
  console.log(`rigids: ${found.declarations} declarations, `
    + `${found.rigids} effectRigids, ${found.marks} rigidMarks; converse `
    + `gaps: ${found.unnamedRigids.length} effectRigids, `
    + `${found.unnamedMarks.length} rigidMarks`);
  assert.ok(found.declarations > 2500, `${found.declarations} declarations`);
  assert.ok(found.rigids >= 2500, `${found.rigids} effectRigids`);
  assert.ok(found.marks >= 12, `${found.marks} rigidMarks`);
  assert.deepEqual(found.unlistedRigids.slice(0, 10), [],
    `${found.unlistedRigids.length} unlisted rigids`);
  assert.deepEqual(found.unlistedMarks.slice(0, 10), [],
    `${found.unlistedMarks.length} unlisted marks`);
});

test('every listed rigid mark is named by the signature', () => {
  assert.deepEqual(found.unnamedMarks.slice(0, 10), [],
    `${found.unnamedMarks.length} unnamed marks`);
});
