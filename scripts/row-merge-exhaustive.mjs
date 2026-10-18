// R005 Tranche B Task 4: a whole exhaustive domain (A or B, Task 0's,
// test/row-merge-domains.mjs) through the compiler's row solver, every
// problem in every order, judged against the independent oracle as
// test/row-merge-domains.test.mjs judges its sample (S, H, L, C2,
// property E, the measure bounds, no occurs on a tail; placeholders
// counted by order). Not part of verify: domain A is about 19 million
// runs. Needs a built output/. Exit 1 on any defect.
// Usage: node scripts/row-merge-exhaustive.mjs [A|B] [workers]
import { Worker, isMainThread, parentPort, workerData }
  from 'node:worker_threads';
import { cpus } from 'node:os';
import { everyOrder, problems } from '../test/row-merge-domains.mjs';
import { DEFECTS, judge, newTally } from '../test/row-merge-judge.mjs';

const add = (into, tally) => {
  for (const [key, value] of Object.entries(tally)) {
    if (key === 'examples') into.examples.push(...value);
    else if (key === 'skippedByOrder') {
      for (const [order, n] of Object.entries(value)) {
        into.skippedByOrder[order] = (into.skippedByOrder[order] ?? 0) + n;
      }
    } else into[key] += value;
  }
};

if (isMainThread) {
  const name = process.argv[2] ?? 'A';
  const workers = Number(process.argv[3] ?? cpus().length);
  const started = Date.now();
  const total = newTally();
  let done = 0;
  for (let w = 0; w < workers; w++) {
    const worker = new Worker(new URL(import.meta.url),
      { workerData: { name, w, workers } });
    worker.on('message', tally => {
      add(total, tally);
      if (++done < workers) return;
      const { examples, ...counts } = total;
      console.log(JSON.stringify({ domain: name, ...counts,
        seconds: Math.round((Date.now() - started) / 1000) }, null, 1));
      examples.slice(0, 5).forEach(e => console.log(JSON.stringify(e)));
      const bad = DEFECTS.filter(k => total[k] > 0);
      console.log(bad.length ? `DEFECTS: ${bad.join(', ')}` : 'defects: none');
      process.exitCode = bad.length ? 1 : 0;
    });
    worker.on('error', error => {
      console.error(error);
      process.exitCode = 1;
    });
  }
} else {
  const { name, w, workers } = workerData;
  const tally = newTally();
  for (const p of problems(name, { w, stride: workers })) {
    judge(p, everyOrder(p.cs), tally, { state: true });
  }
  parentPort.postMessage(tally);
}
