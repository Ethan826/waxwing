import test from 'node:test';
import assert from 'node:assert/strict';
import { effectsTable, healthyBuild, movedKeys, pinCommand, effectsFile,
  pinnedEffects, sourcesOf } from './r0-effects-pin-run.mjs';

// Amin tranche 1, Task 14 Step 1: every corpus declaration's recorded
// `effects` encoding equals the digest pinned in
// test/fixtures/r0/effects.json. The atoms are pinned separately
// (r0-problem-pin.serial.test.mjs); this pin is the effect problem the
// validator will read. The test only reads the pin: it is written by
// scripts/r0-effects-pin.mjs, on a reviewed change, never by a test.
// Corpus-wide, hence serial.
const pinned = pinnedEffects();
const found = await effectsTable(await healthyBuild(), await sourcesOf());

test('every corpus effect problem equals its pinned digest', () => {
  assert.ok(found.programs > 900, `${found.programs} programs`);
  assert.ok(found.declarations > 2500, `${found.declarations} declarations`);
  const { added, removed, changed } = movedKeys(pinned.digests,
    found.digests);
  const moved = [...added, ...removed, ...changed];
  assert.deepEqual(moved.slice(0, 10), [],
    `effect problems moved from ${effectsFile} (added ${added.length}, `
    + `removed ${removed.length}, changed ${changed.length}); if `
    + `reviewed, re-pin with ${pinCommand}`);
  assert.equal(found.declarations, pinned.declarations);
  assert.equal(found.programs, pinned.programs);
});
