import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runGoBatch } from './go-batch.mjs';
import { checked } from './support.mjs';
import {
  aroundBoth, boxCrash, boxOwnFailure, boxPlain, clauseDefer, consoleCleanup,
  a1Control, copies, count, forwardingFailFree, pass, probe, q1Nofail, unmarked
} from './fx008-defer-programs.mjs';
import { cases as cleanupCases } from './fx-cleanup-programs.mjs';

// FX008 Task 9: programs the mark check accepts keep their meaning. One Go
// batch, exact stdout, status 0.
const migrated = cleanupCases.find(
  ([name]) => name === 'a defer performing a non-Fail effect');
const runs = [
  ['a nofail signature under a fail-free handler', migrated[1] + migrated[2],
    '2\n1\n'],
  ['I1: a local lambda under two handlers', probe('design-review/p1'),
    '2\n1\n9\n'],
  ['I1: one handler value installed under two rows',
    probe('design-review/p2'), '11\n9\n'],
  ['I2 and N5 with nofail', q1Nofail, '101\n101\n0\n9\n'],
  ['around under a fail-free and a failing outer', aroundBoth, '101\n9\n'],
  ['a fail-free forwarding clause under a defer', forwardingFailFree, '2\n'],
  ['Console cleanup', consoleCleanup, '2\n1\n'],
  ['a defer inside a clause follows the outer frame', clauseDefer, '2\n'],
  ['a recursive nofail function', count, '1\n2\n3\n'],
  ['a recursive nofail(k) function', pass, '0\n'],
  ['a generic pass-through under a fail-free handler', a1Control, '5\n'],
  ['a local lambda takes copies of its first context', copies, '1\n5\n1\n'],
  ['a handler in a constructor field keeps its mark', boxPlain, '']
];
const batch = runGoBatch(import.meta.url,
  runs.map(([name, source]) => [name, source]));
for (const [name, , stdout] of runs) {
  test(name, () => {
    const { status, stdout: printed, stderr } = batch.result(name);
    assert.deepEqual({ status, stdout: printed, stderr },
      { status: 0, stdout, stderr: '' });
  });
}

test('a constructor field handler may handle its own failure or crash', () => {
  checked(boxOwnFailure);
  checked(boxCrash);
});

// Review Focus 4: marks do not reach the Go. `pass` compiles to what its
// unmarked program does; `count`'s unmarked program is rejected now (its
// defer needs the mark), so its Go hash is the base commit ff0c6d1's.
const unmarkedCount = '7645778dead1962466ca8154f8d9e3288148d00db418c17fe1671edbb022e061';
test('recursive nofail(k) functions emit the unmarked Go', () => {
  assert.equal(checked(pass), checked(unmarked(pass)));
});
test('a recursive nofail function emits the unmarked Go', () => {
  const digest = createHash('sha256').update(checked(count)).digest('hex');
  assert.equal(digest, unmarkedCount);
});
