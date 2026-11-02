import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { corpusPackages, effectPinExtras } from './r0-t2-diff-corpus.mjs';
import { diffRunner, gapSites, label, scope } from './r0-t2-diff-run.mjs';
import { caps } from './r0-t2-diff-forge.mjs';

// Tranche 2 Task 15 (design §F, §I Task 10; dossier §18.151, §18.155):
// the corpus differential between the A2 validator and the independent
// M-B collector (test/r0-a2-mb-collector.mjs), marks only. Over the
// corpus loader's honest packages (readEffects), each package and its
// mark forgeries (test/r0-t2-diff-forge.mjs: one position term, or one
// label mark inside an effect binding, moved one covering step on
// N ⊑ J S ⊑ M; capped per package, deterministic) are judged by both
// on the mark obligations (prerequisites, then `judgeObligations`; the
// M-B graph pinned under every valuation of the rigid marks). No row
// forgery (dropped or duplicated label, moved tail) runs here: the M-B
// collector is not an oracle for row semantics (§18.151). Corpus-
// observed bounded agreement on marks; not soundness, not row
// semantics. A disagreement is a stop for the author (§18.155): neither
// side is presumed correct, and neither is adjusted here.
// One runner per denominator: the corpus loader's packages, then the
// effect pin's sources whose text the corpus loader does not hold.
const tally = async read => {
  const runner = await diffRunner(load);
  const found = await read(load);
  found.packages.forEach(runner.add);
  return { runner, out: { ...runner.total(), faults: found.faults,
    sources: found.sources, pinned: found.pinned } };
};

const agrees = out => {
  assert.deepEqual(out.vacuous, []);
  assert.deepEqual(out.apart, []);
  assert.deepEqual(out.disagreements, []);
};

test(`${label}: the corpus loader's packages agree`, async t => {
  const { runner, out } = await tally(corpusPackages);
  for (const line of runner.report(out)) t.diagnostic(line);
  agrees(out);
  // Floors: the counts observed on this corpus on 2026-11-02, guarding
  // against an empty or term-free run, not derived bounds. A drop is
  // explained, never silently re-pinned.
  assert.equal(out.packages, 2812);
  assert.ok(out.forgeries.position >= 420, 'position forgeries');
  assert.ok(out.forgeries.binding >= 663, 'binding forgeries');
  assert.ok(out.agreements.accepted >= 2808, 'accepted');
  assert.ok(out.agreements.bothAccept >= 284, 'both accept');
  assert.ok(out.agreements.markRefused >= 769, 'mark refusals');
  for (const site of ['E2 AtCallback', 'E2 AtStage', 'E2 AtApply',
    'E2 AtPipe'])
    assert.ok(out.exercised.has(site), site);
});

test(`${label}: the effect pin's other sources agree`, async t => {
  const { runner, out } = await tally(effectPinExtras);
  t.diagnostic(`${label}: effect pin: ${out.pinned} sources, ${
    out.sources} not held by the corpus loader`);
  for (const line of runner.report(out)) t.diagnostic(line);
  agrees(out);
  assert.equal(out.sources, 4);
  assert.equal(out.packages, 8);
});

test(`${label}: report scope`, async () => {
  const fresh = await diffRunner(load);
  assert.equal(fresh.total().packages, 0);
  assert.match(scope, /not row semantics \(no row forgery runs\)/);
  assert.match(caps.rule, /^at most \d+ positions and \d+ binding labels/);
  assert.deepEqual(gapSites, ['E2 AtCallback', 'E2 AtStage', 'E2 AtApply',
    'E2 AtPipe', 'E2 AtDeferredRow']);
  for (const line of fresh.report(fresh.total()))
    assert.ok(line.startsWith(`${label}: `), line);
});
