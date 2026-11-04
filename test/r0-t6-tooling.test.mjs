import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refusalClasses, t6Cases, wrongT6Cases } from './r0-t6-cases.mjs';
import { isDefect } from './r0-rt8-account.mjs';

// T6 (dossier §18.161 (4)): RT8 reads an intended decline as a decline,
// heuristic candidates included, and keeps each defect a defect; the
// window reports an RT8 defect rather than aborting or relabelling it.
// The cases are in test/r0-t6-cases.mjs (shared with the regression
// probe, test/regression-r0-t6.mjs).
test('T6: every case finds its expected class', () => {
  assert.deepEqual(wrongT6Cases(), []);
  assert.ok(t6Cases().length > 40);
});

// The table names every `CheckRefusal` constructor the compiler has, read
// from its corefn, so a new constructor has no class until it is named.
// The corefn is the last build's: after a source change without a
// rebuild it is stale, and this test reads the old constructors.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const constructorsOf = (module, typeName) => JSON.parse(readFileSync(
  join(root, 'output', module, 'corefn.json'), 'utf8')).decls
  .flatMap(decl => (decl.bindType === 'Rec' ? decl.binds : [decl]))
  .filter(bind => bind.expression?.type === 'Constructor'
    && bind.expression.typeName === typeName)
  .map(bind => bind.identifier);

test('T6: the table names each CheckRefusal constructor once', () => {
  const found = constructorsOf('Domain.Verdict.Search', 'CheckRefusal');
  assert.ok(found.length >= 11, `only ${found.length} constructors`);
  assert.deepEqual(Object.keys(refusalClasses).sort(), [...found].sort());
});

// Fix round 1 (C1, I2): `RequirementOpen` and `NotCertifiable` decline
// and are never a defect; a `RecordDefect` is a generation defect under
// either claim and either of today's results; every other refusal of a
// ClaimsComplete candidate is a defect.
test('T6: declines and defects split as RT8 reads them', () => {
  const declining = ['NotCertifiable', 'RequirementOpen'];
  for (const [refusal, classes] of Object.entries(refusalClasses)) {
    const decline = declining.includes(refusal);
    assert.equal(isDefect(classes[0]), !decline, refusal);
    if (decline) assert.ok(!classes.some(isDefect), refusal);
  }
  assert.ok(refusalClasses.RecordDefect.every(found =>
    found.startsWith('DEFECT: generation defect')));
});
