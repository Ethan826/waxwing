import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCorpus } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { corpusHash, inertFixture, pinnedEntries, repinProcedure, traceRun }
  from './r0-t2-trace-inert.mjs';

// Tranche 2 Task 7 (design §C.4, §I Task 3d; dossier §18.155 (4)): the
// production counterpart of the research hook's evidence (H3).
// test/fixtures/r0/t2-trace-inert.json pins, per corpus-loader
// declaration, the SHA-256 of `recheck`'s outcome less its trace (the
// checked declaration and the final `State` less `trace`, or the
// refusal), computed with the no-collection baseline: the fixture's
// `commit` with scripts/r0-t2-trace-removal.mjs applied. Today's
// compiler, collecting, must give the same digest for every declaration:
// collection adds no constraint and changes no decision, corpus-observed.
// The test reads no git history and builds nothing. The problem,
// first-diagnostic (Go included), effect, census, window, RT8 and shadow
// fixtures are their own serial tests.
//
// Re-pin (a reviewed change), only when the corpus manifest or the
// checker's decisions legitimately move: commit src, run
//   node scripts/r0-t2-trace-inert-pin.mjs <scratch dir outside the
//   worktree>
// which builds the baseline there (every removal edit must match once,
// and the baseline's trace must be empty), writes the fixture with the
// commit and the manifest's hash, and removes the build; then review the
// digest diff: a digest that moves without a decision change in src is a
// stop. A recorder added later needs its removal edit first.
const fixture = JSON.parse(readFileSync(inertFixture, 'utf8'));
const run = await traceRun(load, await loadCorpus());

test('the fixture was pinned on today\'s corpus manifest', () => {
  assert.equal(fixture.corpusManifest, corpusHash(),
    `the corpus moved since the inertness pin; re-pin: ${repinProcedure}`);
});

test('recheck less its trace is the baseline\'s, per declaration', () => {
  assert.deepEqual(run.repeated, []);
  assert.deepEqual(Object.keys(run.digests).sort(),
    Object.keys(fixture.digests).sort());
  const moved = Object.keys(run.digests).filter(key =>
    run.digests[key] !== fixture.digests[key]);
  assert.deepEqual(moved, []);
});

// Coverage: the finished traces' entry counts per kind, pinned in
// test/r0-t2-trace-inert.mjs, and the raw traces' (finish keeps every
// entry).
test('the trace\'s entry counts per kind are pinned', () => {
  assert.deepEqual(run.counts, pinnedEntries);
  assert.deepEqual(run.collected, pinnedEntries);
});
