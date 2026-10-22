import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCorpus } from './r0-corpus.mjs';
import { corpusRuns, familyRuns, families, measuringCompiler }
  from './r0-exhausted-support.mjs';

// Tranche 1, Task 0.2 (dossier §18.69 Q1): is `Exhausted` a genuine
// budget? Its bound, P · (|Λ| + 1) + 1 passes (RowMerge/Improve.purs),
// is the theorem of docs/plans/2026-10-19-row-merge-rules.md §5, an
// argued upper bound. The rule, fixed before running: if no run of the
// domain (test/r0-exhausted-support.mjs) reaches the bound, `Exhausted`
// is a broken invariant, a fault (Task 2.1 maps it); if one does, the
// argument is refuted and the author decides. The ratio is the rescan's
// counter `found.passes` (passes that changed the state) over its
// bound: the theorem allows at most P · (|Λ| + 1) changing passes, so
// under it the ratio stays below 1; at 1 the theorem is broken, one
// pass before the compiler's own check (passes > bound) fires.
let work;
let compiler;
before(async () => {
  work = mkdtempSync(join(tmpdir(), 'waxwing-r0-exhausted-'));
  compiler = await measuringCompiler(work);
});
after(() => rmSync(work, { recursive: true, force: true }));

const judged = (t, summary) => {
  t.diagnostic(JSON.stringify(summary));
  assert.ok(summary.passes > 0, 'no pass was recorded: nothing measured');
  assert.ok(summary.ratio < 1,
    `a run reached the bound: ${JSON.stringify(summary.worst)}`);
};

for (const [name, generate] of families) {
  test(`no run reaches the bound: ${name}, seeds 1-2000`, t => {
    judged(t, familyRuns(compiler, generate));
  });
}

test('no run reaches the bound: the R0 corpus, compiled', async t => {
  judged(t, corpusRuns(compiler, await loadCorpus()));
});
