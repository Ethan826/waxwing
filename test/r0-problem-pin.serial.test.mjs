import test from 'node:test';
import assert from 'node:assert/strict';
import { pinCommand, pinnedProblems, problemTable, problemsFile }
  from './r0-problem-pin-run.mjs';

// R0 Task 7.1b: every corpus declaration's recorded problem is the one
// pinned in test/fixtures/r0/problems.json, byte for byte (canonical
// bytes, entry arrays in recorded order). The pin was taken from Task
// 3.2's generator before D1's port, so the port changed no problem, and
// RT1, RT8, the window and the census read what they read before.
// The pin also covers RT8's and the window's inline probes (added after
// the port, corpus digests unchanged). Corpus-wide, hence serial.
const pinned = pinnedProblems();
const found = await problemTable();

test('every corpus problem equals its pinned digest', () => {
  assert.ok(found.programs > 900, `${found.programs} programs`);
  assert.ok(found.declarations > 2500, `${found.declarations} declarations`);
  const moved = Object.keys({ ...pinned.digests, ...found.digests })
    .filter(origin => pinned.digests[origin] !== found.digests[origin]);
  assert.deepEqual(moved.slice(0, 10), [],
    `${moved.length} programs' problems moved from ${problemsFile};`
    + ` if reviewed, re-pin with ${pinCommand}`);
  assert.equal(found.declarations, pinned.declarations);
});
