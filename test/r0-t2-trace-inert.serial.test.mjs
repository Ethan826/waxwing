import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCorpus } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { pinnedEntries, traceRun } from './r0-t2-trace-inert.mjs';

// Tranche 2 Task 7 (design §C.4, §I Task 3d; dossier §18.155 (4)): the
// production counterpart of the research hook's evidence (H3).
// test/fixtures/r0/t2-trace-inert.json pins, per corpus-loader
// declaration, the SHA-256 of `recheck`'s outcome less its trace (the
// checked declaration and the final `State` less `trace`, or the
// refusal), computed with the compiler built at the fixture's `commit`,
// the last commit before collection, over today's pinned corpus
// (scripts/r0-t2-trace-inert-pin.mjs). Today's compiler, collecting,
// must give the same digest for every declaration: collection adds no
// constraint and changes no decision, corpus-observed. Generated once;
// the test reads no git history and builds nothing. The pin, the
// first-diagnostic (Go included), effect, census, window, RT8 and shadow
// fixtures are their own serial tests.
const fixture = JSON.parse(readFileSync(
  'test/fixtures/r0/t2-trace-inert.json', 'utf8'));
const run = await traceRun(load, await loadCorpus());

test('recheck less its trace is the pre-trace build\'s, per declaration',
  () => {
    assert.deepEqual(run.repeated, []);
    assert.deepEqual(Object.keys(run.digests).sort(),
      Object.keys(fixture.digests).sort());
    const moved = Object.keys(run.digests).filter(key =>
      run.digests[key] !== fixture.digests[key]);
    assert.deepEqual(moved, []);
  });

// Coverage: the finished traces' entry counts per kind, pinned in
// test/r0-t2-trace-inert.mjs.
test('the trace\'s entry counts per kind are pinned', () => {
  assert.deepEqual(run.counts, pinnedEntries);
});
