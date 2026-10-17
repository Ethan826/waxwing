// Every problem within a small bound, each in every constraint order,
// through the solver and against the oracle (the plan's Task 0; the
// arguments are docs/plans/2026-10-17-open-row-merge-rules.md). Bound:
// labels a, b; one rigid R with every lacks hypothesis; metas m0-m2; two
// equations between rows of at most one field and two tails (repeats
// allowed), plus nothing, one `lacks` or one `dis` of two tails.
// Problems equal up to renaming metas or labels are run once.
// Checks, on every run: H (refused => no solution); S (accepted => the
// default solution satisfies every constraint); L (it is the least);
// E (not refused => the state's solutions, read through the bindings,
// are exactly the problem's: the rewrites preserve solutions); D (the
// default satisfies the state when nothing waits with a constant); C1;
// C2 (one verdict class for all orders); the measure bounds of design
// §2.7 (fresh metas <= |P|.|K|, state changes <= the measure); and that
// one-tail problems never commit, defer or wait quietly. Counts how
// often each rule fired and each kind of refusal. Domain B (one label, no
// rigid, four metas) adds the quiet equations domain A cannot form.
// Usage: node exhaustive.mjs [A|B] [workers]
import { Worker, isMainThread, parentPort, workerData }
  from 'node:worker_threads';
import { cpus } from 'node:os';
import { problems, runProblem, newTally, merge } from './exhaustive-run.mjs';

if (isMainThread) {
  const name = process.argv[2] ?? 'A';
  const workers = Number(process.argv[3] ?? cpus().length);
  const started = Date.now();
  const total = newTally();
  let done = 0;
  for (let w = 0; w < workers; w++) {
    const worker = new Worker(new URL(import.meta.url),
      { workerData: { name, w, workers } });
    worker.on('message', t => {
      merge(total, t);
      if (++done === workers) report(total, started);
    });
    worker.on('error', e => {
      console.error(e);
      process.exitCode = 1;
    });
  }
} else {
  const tally = newTally();
  const { name, w, workers } = workerData;
  for (const p of problems(name, w, workers)) {
    runProblem(p, tally);
  }
  parentPort.postMessage(tally);
}

function report(t, started) {
  const examples = t.examples;
  delete t.examples;
  t.seconds = Math.round((Date.now() - started) / 1000);
  t.domain = process.argv[2] ?? 'A';
  console.log(JSON.stringify(t, null, 1));
  examples.slice(0, 8).forEach(e => console.log(JSON.stringify(e)));
  const defects = ['dishonest', 'solvedViolates', 'notLeast', 'unsound',
    'equivFail', 'defaultFail', 'c1fail', 'c3fail', 'orderDiff',
    'freshOver', 'versionOver', 'oneTailNotForced', 'crash'];
  const bad = defects.filter(k => t[k] > 0);
  console.log(bad.length ? `DEFECTS: ${bad.join(', ')}` : 'defects: none');
  process.exitCode = bad.length ? 1 : 0;
}
